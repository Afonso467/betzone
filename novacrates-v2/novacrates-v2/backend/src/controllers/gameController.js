const UserModel   = require('../models/userModel');
const GameModel   = require('../models/gameModel');
const { InventoryModel } = require('../models/index');
const { asyncHandler, createError } = require('../middleware/errorHandler');
const {
  generateMinePositions, calcMinesMultiplier,
  generateCrashPoint, rollCaseItem,
  XP_REWARDS, createShuffledDeck, handTotal,
} = require('../utils/rng');

// Sem autenticação — usa sempre o utilizador demo (id=1)
// Moeda única da plataforma: PONTOS (sem saldo monetário/€)
const DEMO_USER_ID = 1;

async function getUser() {
  const user = await UserModel.findById(DEMO_USER_ID);
  if (!user) {
    const err = new Error('Utilizador de demonstração não encontrado. Corre "npm run seed" para criar os dados iniciais.');
    err.status = 500;
    throw err;
  }
  return user;
}

// Debitar pontos (aposta). Lança erro 400 se não houver pontos suficientes.
async function debit(points, desc) {
  const user = await getUser();
  if (user.points < points) throw createError('Pontos insuficientes', 400);
  await UserModel.adjustPoints(DEMO_USER_ID, -points);
  await GameModel.createTransaction({
    userId: DEMO_USER_ID, type: 'bet', amount: -points,
    balanceBefore: user.points,
    balanceAfter: user.points - points,
    description: desc,
  });
}

// Creditar pontos (ganho)
async function credit(points, desc) {
  const user = await getUser();
  await UserModel.adjustPoints(DEMO_USER_ID, points);
  await GameModel.createTransaction({
    userId: DEMO_USER_ID, type: 'win', amount: points,
    balanceBefore: user.points,
    balanceAfter: user.points + points,
    description: desc,
  });
}

// ── MINES ─────────────────────────────────────────────────────────────────────
const minesStart = asyncHandler(async (req, res) => {
  const { betPoints, mineCount = 3 } = req.body;
  if (mineCount < 1 || mineCount > 24) throw createError('Minas inválidas (1-24)', 400);
  await debit(betPoints, `Mines — ${betPoints} pts`);
  const positions = generateMinePositions(25, mineCount);
  const sessionId = await GameModel.createMinesSession({ userId: DEMO_USER_ID, betAmount: betPoints, minePositions: positions });
  res.json({ sessionId });
});

const minesReveal = asyncHandler(async (req, res) => {
  const { sessionId, cellIndex } = req.body;
  const session = await GameModel.getMinesSession(sessionId, DEMO_USER_ID);
  if (!session) throw createError('Sessão não encontrada', 404);
  const { minePositions, revealed, totalCells } = session.meta;
  if (revealed.includes(cellIndex)) throw createError('Célula já revelada', 400);
  if (minePositions.includes(cellIndex)) {
    await GameModel.closeMinesSession(sessionId, 'lost');
    await GameModel.createMatch({ userId: DEMO_USER_ID, gameType: 'mines', betAmount: session.bet_amount, winAmount: 0, multiplier: 0, result: 'loss' });
    await UserModel.incrementLosses(DEMO_USER_ID);
    return res.json({ hit: true, minePositions });
  }
  const newRevealed = [...revealed, cellIndex];
  await GameModel.updateMinesSession(sessionId, newRevealed);
  await UserModel.addXP(DEMO_USER_ID, XP_REWARDS.mines_safe);
  const multiplier = calcMinesMultiplier(newRevealed.length, totalCells, minePositions.length);
  const potentialWin = Math.round(session.bet_amount * multiplier);
  res.json({ hit: false, multiplier, potentialWin, revealed: newRevealed });
});

const minesCashout = asyncHandler(async (req, res) => {
  const { sessionId } = req.body;
  const session = await GameModel.getMinesSession(sessionId, DEMO_USER_ID);
  if (!session) throw createError('Sessão não encontrada', 404);
  const { minePositions, revealed, totalCells } = session.meta;
  if (!revealed.length) throw createError('Revela pelo menos uma célula', 400);
  const multiplier = calcMinesMultiplier(revealed.length, totalCells, minePositions.length);
  const winPoints  = Math.round(session.bet_amount * multiplier);
  await GameModel.closeMinesSession(sessionId, 'cashed_out');
  await credit(winPoints, `Mines cashout — ${multiplier}x`);
  await GameModel.createMatch({ userId: DEMO_USER_ID, gameType: 'mines', betAmount: session.bet_amount, winAmount: winPoints, multiplier, result: 'win' });
  await UserModel.addXP(DEMO_USER_ID, XP_REWARDS.mines_cashout);
  await UserModel.incrementWins(DEMO_USER_ID);
  const user = await getUser();
  res.json({ winPoints, multiplier, points: user.points });
});

// ── COINFLIP ──────────────────────────────────────────────────────────────────
const coinflip = asyncHandler(async (req, res) => {
  const { betPoints, choice } = req.body;
  if (!['heads', 'tails'].includes(choice)) throw createError('Escolha inválida', 400);
  await debit(betPoints, `Coinflip — ${betPoints} pts`);
  const result = Math.random() < 0.5 ? 'heads' : 'tails';
  const won = result === choice;
  let winPoints = 0;
  if (won) {
    winPoints = Math.round(betPoints * 1.94);
    await credit(winPoints, `Coinflip vitória`);
    await UserModel.addXP(DEMO_USER_ID, XP_REWARDS.coinflip_win);
    await UserModel.incrementWins(DEMO_USER_ID);
  } else {
    await UserModel.incrementLosses(DEMO_USER_ID);
  }
  await GameModel.createMatch({ userId: DEMO_USER_ID, gameType: 'coinflip', betAmount: betPoints, winAmount: winPoints, multiplier: won ? 1.94 : 0, result: won ? 'win' : 'loss', meta: { choice, result } });
  const user = await getUser();
  res.json({ result, won, winPoints, points: user.points });
});

// ── CRASH ─────────────────────────────────────────────────────────────────────
const crashJoin = asyncHandler(async (req, res) => {
  const { betPoints } = req.body;
  await debit(betPoints, `Crash — ${betPoints} pts`);
  const crashPoint = generateCrashPoint();
  res.json({ crashPoint, betPoints });
});

const crashCashout = asyncHandler(async (req, res) => {
  const { betPoints, multiplier, crashPoint } = req.body;
  if (multiplier >= crashPoint) throw createError('Já fez crash', 400);
  const winPoints = Math.round(betPoints * multiplier);
  await credit(winPoints, `Crash cashout — ${multiplier}x`);
  await GameModel.createMatch({ userId: DEMO_USER_ID, gameType: 'crash', betAmount: betPoints, winAmount: winPoints, multiplier, result: 'win' });
  await UserModel.addXP(DEMO_USER_ID, XP_REWARDS.crash_cashout);
  await UserModel.incrementWins(DEMO_USER_ID);
  const user = await getUser();
  res.json({ winPoints, points: user.points });
});

// ── BLACKJACK ─────────────────────────────────────────────────────────────────
const blackjackDeal = asyncHandler(async (req, res) => {
  const { betPoints } = req.body;
  await debit(betPoints, `Blackjack — ${betPoints} pts`);
  const deck = createShuffledDeck();
  const playerHand = [deck[0], deck[2]];
  const dealerHand = [deck[1], deck[3]];
  // Enviamos a mão do dealer completa e real — é o FRONTEND que decide
  // esconder visualmente a 2ª carta (faceDown) enquanto o jogo decorre.
  // Esconder o valor aqui faria o backend perder essa carta para sempre,
  // já que o cliente devolve este mesmo array nas ações seguintes (hit/stand).
  res.json({ playerHand, dealerHand, deck: deck.slice(4), betPoints, isBlackjack: handTotal(playerHand) === 21 });
});

const blackjackAction = asyncHandler(async (req, res) => {
  const { action, playerHand, dealerHand, deck, betPoints } = req.body;
  let ph = [...playerHand], dh = [...dealerHand], d = [...deck];
  let result = null, winPoints = 0, multiplier = 0;

  if (action === 'hit') {
    ph.push(d.shift());
    if (handTotal(ph) > 21) result = 'bust';
  } else if (action === 'stand' || action === 'double') {
    if (action === 'double') {
      await debit(betPoints, `Blackjack double`);
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
    if (winPoints > 0) await credit(winPoints, `Blackjack ${result}`);
    if (result === 'win' || result === 'blackjack') {
      await UserModel.addXP(DEMO_USER_ID, result === 'blackjack' ? XP_REWARDS.blackjack_bj : XP_REWARDS.blackjack_win);
      await UserModel.incrementWins(DEMO_USER_ID);
    } else if (result === 'loss' || result === 'bust') {
      await UserModel.incrementLosses(DEMO_USER_ID);
    }
    await GameModel.createMatch({ userId: DEMO_USER_ID, gameType: 'blackjack', betAmount: action === 'double' ? betPoints*2 : betPoints, winAmount: winPoints, multiplier, result: winPoints > 0 ? 'win' : 'loss' });
  }

  const user = await getUser();
  res.json({ playerHand: ph, dealerHand: dh, deck: d, result, winPoints, points: user.points });
});

// ── CASE OPENING ──────────────────────────────────────────────────────────────
// Nota: o item sorteado (nome/imagem/raridade) é puramente visual/cosmético.
// O ganho real do jogador são os PONTOS associados ao item (points_value).
const caseOpen = asyncHandler(async (req, res) => {
  const { caseId = 1 } = req.body;
  const { CaseModel } = require('../models/index');
  const caseData = await CaseModel.findById(caseId);
  if (!caseData) throw createError('Caixa não encontrada', 404);

  await debit(caseData.price, `Case Opening — ${caseData.name}`);

  const items = await CaseModel.getItems(caseId);
  if (!items.length) throw createError('Caixa sem itens', 500);

  const won = rollCaseItem(items);
  const pointsWon = parseInt(won.points_value) || 0;

  await InventoryModel.add(DEMO_USER_ID, won.id);
  await UserModel.adjustPoints(DEMO_USER_ID, pointsWon);
  await UserModel.addXP(DEMO_USER_ID, XP_REWARDS.case_open);
  await GameModel.createMatch({
    userId: DEMO_USER_ID, gameType: 'case_opening',
    betAmount: caseData.price, winAmount: 0, multiplier: 0,
    result: pointsWon > 0 ? 'win' : 'loss',
    meta: { caseId, caseName: caseData.name, wonItem: won.name, rarity: won.rarity, pointsWon },
  });

  const user = await getUser();
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

// ── USER STATE (pontos, xp, stats) ────────────────────────────────────────────
const getUserState = asyncHandler(async (req, res) => {
  const user = await getUser();
  const stats = await GameModel.getStats(DEMO_USER_ID);
  const history = await GameModel.getHistory(DEMO_USER_ID, 20);
  res.json({ user, stats, history });
});

module.exports = { minesStart, minesReveal, minesCashout, coinflip, crashJoin, crashCashout, blackjackDeal, blackjackAction, caseOpen, getCasesWithItems, getUserState };
