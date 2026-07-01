const UserModel   = require('../models/userModel');
const GameModel   = require('../models/gameModel');
const { InventoryModel } = require('../models/index');
const { asyncHandler, createError } = require('../middleware/errorHandler');
const {
  generateMinePositions, calcMinesMultiplier,
  generateCrashPoint, rollCaseItem,
  spinRoulette, rouletteColor, checkRouletteBet,
  rollDice, calcDiceMultiplier, checkDice,
  dropPlinko,
  evaluatePokerHand, POKER_HANDS,
  spinSlots,
  XP_REWARDS, createShuffledDeck, handTotal,
} = require('../utils/rng');

// Cada utilizador tem a sua própria conta — userId vem do token JWT
// (req.user.id, carregado pelo middleware authenticate).
// Moeda única da plataforma: PONTOS (sem saldo monetário/€)

async function getUser(userId) {
  const user = await UserModel.findById(userId);
  if (!user) {
    const err = new Error('Utilizador não encontrado');
    err.status = 404;
    throw err;
  }
  return user;
}

// Debitar pontos (aposta). Lança erro 400 se não houver pontos suficientes.
async function debit(userId, points, desc) {
  const user = await getUser(userId);
  if (user.points < points) throw createError('Pontos insuficientes', 400);
  await UserModel.adjustPoints(userId, -points);
  await GameModel.createTransaction({
    userId, type: 'bet', amount: -points,
    balanceBefore: user.points,
    balanceAfter: user.points - points,
    description: desc,
  });
}

// Creditar pontos (ganho)
async function credit(userId, points, desc) {
  const user = await getUser(userId);
  await UserModel.adjustPoints(userId, points);
  await GameModel.createTransaction({
    userId, type: 'win', amount: points,
    balanceBefore: user.points,
    balanceAfter: user.points + points,
    description: desc,
  });
}

// ── MINES ─────────────────────────────────────────────────────────────────────
const minesStart = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { betPoints, mineCount = 3 } = req.body;
  if (mineCount < 1 || mineCount > 24) throw createError('Minas inválidas (1-24)', 400);
  await debit(userId, betPoints, `Mines — ${betPoints} pts`);
  const positions = generateMinePositions(25, mineCount);
  const sessionId = await GameModel.createMinesSession({ userId, betAmount: betPoints, minePositions: positions });
  res.json({ sessionId });
});

const minesReveal = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { sessionId, cellIndex } = req.body;
  const session = await GameModel.getMinesSession(sessionId, userId);
  if (!session) throw createError('Sessão não encontrada', 404);
  const { minePositions, revealed, totalCells } = session.meta;
  if (revealed.includes(cellIndex)) throw createError('Célula já revelada', 400);
  if (minePositions.includes(cellIndex)) {
    await GameModel.closeMinesSession(sessionId, 'lost');
    await GameModel.createMatch({ userId, gameType: 'mines', betAmount: session.bet_amount, winAmount: 0, multiplier: 0, result: 'loss' });
    await UserModel.incrementLosses(userId);
    return res.json({ hit: true, minePositions });
  }
  const newRevealed = [...revealed, cellIndex];
  await GameModel.updateMinesSession(sessionId, newRevealed);
  await UserModel.addXP(userId, XP_REWARDS.mines_safe);
  const multiplier = calcMinesMultiplier(newRevealed.length, totalCells, minePositions.length);
  const potentialWin = Math.round(session.bet_amount * multiplier);
  res.json({ hit: false, multiplier, potentialWin, revealed: newRevealed });
});

const minesCashout = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { sessionId } = req.body;
  const session = await GameModel.getMinesSession(sessionId, userId);
  if (!session) throw createError('Sessão não encontrada', 404);
  const { minePositions, revealed, totalCells } = session.meta;
  if (!revealed.length) throw createError('Revela pelo menos uma célula', 400);
  const multiplier = calcMinesMultiplier(revealed.length, totalCells, minePositions.length);
  const winPoints  = Math.round(session.bet_amount * multiplier);
  await GameModel.closeMinesSession(sessionId, 'cashed_out');
  await credit(userId, winPoints, `Mines cashout — ${multiplier}x`);
  await GameModel.createMatch({ userId, gameType: 'mines', betAmount: session.bet_amount, winAmount: winPoints, multiplier, result: 'win' });
  await UserModel.addXP(userId, XP_REWARDS.mines_cashout);
  await UserModel.incrementWins(userId);
  const user = await getUser(userId);
  res.json({ winPoints, multiplier, points: user.points });
});

// ── COINFLIP ──────────────────────────────────────────────────────────────────
const coinflip = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { betPoints, choice } = req.body;
  if (!['heads', 'tails'].includes(choice)) throw createError('Escolha inválida', 400);
  await debit(userId, betPoints, `Coinflip — ${betPoints} pts`);
  const result = Math.random() < 0.5 ? 'heads' : 'tails';
  const won = result === choice;
  let winPoints = 0;
  if (won) {
    winPoints = Math.round(betPoints * 1.94);
    await credit(userId, winPoints, `Coinflip vitória`);
    await UserModel.addXP(userId, XP_REWARDS.coinflip_win);
    await UserModel.incrementWins(userId);
  } else {
    await UserModel.incrementLosses(userId);
  }
  await GameModel.createMatch({ userId, gameType: 'coinflip', betAmount: betPoints, winAmount: winPoints, multiplier: won ? 1.94 : 0, result: won ? 'win' : 'loss', meta: { choice, result } });
  const user = await getUser(userId);
  res.json({ result, won, winPoints, points: user.points });
});

// ── CRASH ─────────────────────────────────────────────────────────────────────
const crashJoin = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { betPoints } = req.body;
  await debit(userId, betPoints, `Crash — ${betPoints} pts`);
  const crashPoint = generateCrashPoint();
  res.json({ crashPoint, betPoints });
});

const crashCashout = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { betPoints, multiplier, crashPoint } = req.body;
  if (multiplier >= crashPoint) throw createError('Já fez crash', 400);
  const winPoints = Math.round(betPoints * multiplier);
  await credit(userId, winPoints, `Crash cashout — ${multiplier}x`);
  await GameModel.createMatch({ userId, gameType: 'crash', betAmount: betPoints, winAmount: winPoints, multiplier, result: 'win' });
  await UserModel.addXP(userId, XP_REWARDS.crash_cashout);
  await UserModel.incrementWins(userId);
  const user = await getUser(userId);
  res.json({ winPoints, points: user.points });
});

// ── BLACKJACK ─────────────────────────────────────────────────────────────────
const blackjackDeal = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { betPoints } = req.body;
  await debit(userId, betPoints, `Blackjack — ${betPoints} pts`);
  const deck = createShuffledDeck();
  const playerHand = [deck[0], deck[2]];
  const dealerHand = [deck[1], deck[3]];
  // Enviamos a mão do dealer completa e real — é o FRONTEND que decide
  // esconder visualmente a 2ª carta (faceDown) enquanto o jogo decorre.
  res.json({ playerHand, dealerHand, deck: deck.slice(4), betPoints, isBlackjack: handTotal(playerHand) === 21 });
});

const blackjackAction = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { action, playerHand, dealerHand, deck, betPoints } = req.body;
  let ph = [...playerHand], dh = [...dealerHand], d = [...deck];
  let result = null, winPoints = 0, multiplier = 0;

  if (action === 'hit') {
    ph.push(d.shift());
    if (handTotal(ph) > 21) result = 'bust';
  } else if (action === 'stand' || action === 'double') {
    if (action === 'double') {
      await debit(userId, betPoints, `Blackjack double`);
      ph.push(d.shift());
    }
    while (handTotal(dh) < 17) dh.push(d.shift());
    const pv = handTotal(ph), dv = handTotal(dh);
    const bet = action === 'double' ? betPoints * 2 : betPoints;
    if (pv > 21)                            result = 'bust';
    else if (pv === 21 && ph.length === 2) { result = 'blackjack'; multiplier = 2.5; winPoints = Math.round(bet * 2.5); }
    else if (dv > 21 || pv > dv)          { result = 'win';       multiplier = 2;   winPoints = Math.round(bet * 2); }
    else if (pv === dv)                    { result = 'push';                         winPoints = bet; }
    else                                     result = 'loss';
    if (winPoints > 0) await credit(userId, winPoints, `Blackjack ${result}`);
    if (result === 'win' || result === 'blackjack') {
      await UserModel.addXP(userId, result === 'blackjack' ? XP_REWARDS.blackjack_bj : XP_REWARDS.blackjack_win);
      await UserModel.incrementWins(userId);
    } else if (result === 'loss' || result === 'bust') {
      await UserModel.incrementLosses(userId);
    }
    await GameModel.createMatch({ userId, gameType: 'blackjack', betAmount: action === 'double' ? betPoints*2 : betPoints, winAmount: winPoints, multiplier, result: winPoints > 0 ? 'win' : 'loss' });
  }

  const user = await getUser(userId);
  res.json({ playerHand: ph, dealerHand: dh, deck: d, result, winPoints, points: user.points });
});

// ── CASE OPENING ──────────────────────────────────────────────────────────────
// Nota: o item sorteado (nome/imagem/raridade) é puramente visual/cosmético.
// O ganho real do jogador são os PONTOS associados ao item (points_value).
const caseOpen = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { caseId = 1 } = req.body;
  const { CaseModel } = require('../models/index');
  const caseData = await CaseModel.findById(caseId);
  if (!caseData) throw createError('Caixa não encontrada', 404);

  await debit(userId, caseData.price, `Case Opening — ${caseData.name}`);

  const items = await CaseModel.getItems(caseId);
  if (!items.length) throw createError('Caixa sem itens', 500);

  const won = rollCaseItem(items);
  const pointsWon = parseInt(won.points_value) || 0;

  await InventoryModel.add(userId, won.id);
  await UserModel.adjustPoints(userId, pointsWon);
  await UserModel.addXP(userId, XP_REWARDS.case_open);
  await GameModel.createMatch({
    userId, gameType: 'case_opening',
    betAmount: caseData.price, winAmount: 0, multiplier: 0,
    result: pointsWon > 0 ? 'win' : 'loss',
    meta: { caseId, caseName: caseData.name, wonItem: won.name, rarity: won.rarity, pointsWon },
  });

  const user = await getUser(userId);
  res.json({ item: won, pointsWon, points: user.points });
});

// ── LISTAR CAIXAS DISPONÍVEIS COM PREVIEW DE ITENS ────────────────────────────
const getCasesWithItems = asyncHandler(async (req, res) => {
  const { CaseModel } = require('../models/index');
  const cases = await CaseModel.getAll();
  for (const c of cases) {
    c.items = await CaseModel.getItems(c.id);
  }
  res.json({ cases });
});

// ── ROLETA EUROPEIA (0-36) ────────────────────────────────────────────────────
// Suporta várias apostas simultâneas na mesma jogada (igual a um casino real:
// podes apostar em "vermelho" e no número "17" ao mesmo tempo, por exemplo).
// Body: { bets: [{ type: 'color'|'number'|'parity', value: ..., amount: number }] }
const roulette = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { bets } = req.body;

  if (!Array.isArray(bets) || bets.length === 0) {
    throw createError('Precisas de fazer pelo menos uma aposta', 400);
  }

  const VALID_TYPES = ['color', 'number', 'parity', 'dozen', 'half'];
  let totalStake = 0;
  for (const bet of bets) {
    if (!VALID_TYPES.includes(bet.type)) throw createError(`Tipo de aposta inválido: ${bet.type}`, 400);
    if (!bet.amount || bet.amount < 1) throw createError('Cada aposta precisa de um valor mínimo de 1 ponto', 400);
    if (bet.type === 'color' && !['red', 'black', 'green'].includes(bet.value)) {
      throw createError('Cor inválida — usa red, black ou green', 400);
    }
    if (bet.type === 'number' && (bet.value < 0 || bet.value > 36)) {
      throw createError('Número inválido — tem de estar entre 0 e 36', 400);
    }
    if (bet.type === 'parity' && !['even', 'odd'].includes(bet.value)) {
      throw createError('Paridade inválida — usa even ou odd', 400);
    }
    if (bet.type === 'dozen' && !['1', '2', '3'].includes(String(bet.value))) {
      throw createError('Dúzia inválida — usa 1, 2 ou 3', 400);
    }
    if (bet.type === 'half' && !['low', 'high'].includes(bet.value)) {
      throw createError('Metade inválida — usa low ou high', 400);
    }
    totalStake += bet.amount;
  }

  // Debita o total de todas as apostas de uma vez, como uma única transação
  await debit(userId, totalStake, `Roleta — ${bets.length} aposta(s), ${totalStake} pts`);

  const winningNumber = spinRoulette();
  const winningColor  = rouletteColor(winningNumber);

  let totalWon = 0;
  const results = bets.map(bet => {
    const multiplier = checkRouletteBet(bet, winningNumber);
    const winAmount = multiplier > 0 ? bet.amount * multiplier : 0;
    totalWon += winAmount;
    return { ...bet, won: multiplier > 0, multiplier, winAmount };
  });

  if (totalWon > 0) {
    await credit(userId, totalWon, `Roleta vitória — número ${winningNumber}`);
    await UserModel.addXP(userId, XP_REWARDS.roulette_win);
    await UserModel.incrementWins(userId);
  } else {
    await UserModel.incrementLosses(userId);
  }

  await GameModel.createMatch({
    userId, gameType: 'roulette',
    betAmount: totalStake, winAmount: totalWon,
    multiplier: totalStake > 0 ? totalWon / totalStake : 0,
    result: totalWon > 0 ? 'win' : 'loss',
    meta: { winningNumber, winningColor, bets: results },
  });

  const user = await getUser(userId);
  res.json({ winningNumber, winningColor, results, totalWon, points: user.points });
});

// ── USER STATE (pontos, xp, stats) ────────────────────────────────────────────
const getUserState = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const user = await getUser(userId);
  const stats = await GameModel.getStats(userId);
  const history = await GameModel.getHistory(userId, 20);
  res.json({ user, stats, history });
});

// ── DICE (HiLo) ───────────────────────────────────────────────────────────────
const dice = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { betPoints, target, direction } = req.body;
  if (!['over', 'under'].includes(direction)) throw createError('Direção inválida (over/under)', 400);
  if (target < 2 || target > 98) throw createError('Target deve estar entre 2 e 98', 400);
  await debit(userId, betPoints, `Dice — ${betPoints} pts`);
  const roll = rollDice();
  const won  = checkDice(roll, target, direction);
  const multiplier = calcDiceMultiplier(target, direction);
  let winPoints = 0;
  if (won) {
    winPoints = Math.round(betPoints * multiplier);
    await credit(userId, winPoints, `Dice vitória — ${roll} (${direction} ${target})`);
    await UserModel.addXP(userId, XP_REWARDS.dice_win);
    await UserModel.incrementWins(userId);
  } else {
    await UserModel.incrementLosses(userId);
  }
  await GameModel.createMatch({ userId, gameType: 'dice', betAmount: betPoints, winAmount: winPoints, multiplier: won ? multiplier : 0, result: won ? 'win' : 'loss', meta: { roll, target, direction } });
  const user = await getUser(userId);
  res.json({ roll, won, winPoints, multiplier, points: user.points });
});

// ── PLINKO ────────────────────────────────────────────────────────────────────
const plinko = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { betPoints, rows = 16 } = req.body;
  const validRows = [8, 12, 16];
  if (!validRows.includes(Number(rows))) throw createError('Linhas inválidas (8, 12 ou 16)', 400);
  await debit(userId, betPoints, `Plinko — ${betPoints} pts`);
  const { position, multiplier, path } = dropPlinko(Number(rows));
  const winPoints = Math.round(betPoints * multiplier);
  if (winPoints > 0) {
    await credit(userId, winPoints, `Plinko — ${multiplier}x`);
    await UserModel.addXP(userId, XP_REWARDS.plinko_win);
    await UserModel.incrementWins(userId);
  } else {
    await UserModel.incrementLosses(userId);
  }
  await GameModel.createMatch({ userId, gameType: 'plinko', betAmount: betPoints, winAmount: winPoints, multiplier, result: winPoints > 0 ? 'win' : 'loss', meta: { rows, position, path } });
  const user = await getUser(userId);
  res.json({ position, multiplier, path, winPoints, points: user.points });
});

// ── VÍDEO POKER ───────────────────────────────────────────────────────────────
// Funciona em 2 fases: deal (recebe 5 cartas) → hold (envia quais guardar, recebe substituições)
const pokerDeal = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { betPoints } = req.body;
  await debit(userId, betPoints, `Vídeo Poker — ${betPoints} pts`);
  const deck = createShuffledDeck();
  const hand = deck.slice(0, 5);
  const rest = deck.slice(5);
  res.json({ hand, deck: rest, betPoints });
});

const pokerHold = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { hand, deck, held, betPoints } = req.body;
  // held = array de índices a guardar (0-4), ex: [0, 2] = guarda 1ª e 3ª cartas
  const finalHand = hand.map((card, i) => held.includes(i) ? card : deck.shift());
  const handName  = evaluatePokerHand(finalHand);
  const multiplier = POKER_HANDS[handName] || 0;
  const winPoints  = Math.round(betPoints * multiplier);
  if (winPoints > 0) {
    await credit(userId, winPoints, `Vídeo Poker — ${handName} (${multiplier}x)`);
    await UserModel.addXP(userId, XP_REWARDS.poker_win);
    await UserModel.incrementWins(userId);
  } else {
    await UserModel.incrementLosses(userId);
  }
  await GameModel.createMatch({ userId, gameType: 'video_poker', betAmount: betPoints, winAmount: winPoints, multiplier, result: winPoints > 0 ? 'win' : 'loss', meta: { handName, finalHand } });
  const user = await getUser(userId);
  res.json({ finalHand, handName, multiplier, winPoints, points: user.points });
});

// ── SLOTS ─────────────────────────────────────────────────────────────────────
const slots = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { betPoints } = req.body;
  await debit(userId, betPoints, `Slots — ${betPoints} pts`);
  const { reels, multiplier } = spinSlots();
  const winPoints = Math.round(betPoints * multiplier);
  if (winPoints > 0) {
    await credit(userId, winPoints, `Slots — ${multiplier}x`);
    await UserModel.addXP(userId, XP_REWARDS.slots_win);
    await UserModel.incrementWins(userId);
  } else {
    await UserModel.incrementLosses(userId);
  }
  await GameModel.createMatch({ userId, gameType: 'slots', betAmount: betPoints, winAmount: winPoints, multiplier, result: winPoints > 0 ? 'win' : 'loss', meta: { reels: reels.map(r => r.id) } });
  const user = await getUser(userId);
  res.json({ reels, multiplier, winPoints, points: user.points });
});

module.exports = { minesStart, minesReveal, minesCashout, coinflip, crashJoin, crashCashout, blackjackDeal, blackjackAction, caseOpen, getCasesWithItems, roulette, dice, plinko, pokerDeal, pokerHold, slots, getUserState };
