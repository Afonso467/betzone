const UserModel   = require('../models/userModel');
const GameModel   = require('../models/gameModel');
const { InventoryModel } = require('../models/index');
const { asyncHandler, createError } = require('../middleware/errorHandler');
const { pool } = require('../config/database'); 
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

// Função auxiliar para obter dados atualizados de um utilizador dentro ou fora de uma transação
async function getUser(userId, conn = pool) {
  const [rows] = await conn.query(
    `SELECT id, username, email, avatar, points, xp, xp_next, level, wins, losses, active, last_claim_at, created_at
     FROM users WHERE id = ?`,
    [userId]
  );
  if (!rows[0]) throw createError('Utilizador não encontrado', 404);
  return rows[0];
}

// ── MINES ─────────────────────────────────────────────────────────────────────
const minesStart = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { betPoints, mineCount = 3 } = req.body;
  if (mineCount < 1 || mineCount > 24) throw createError('Minas inválidas (1-24)', 400);
  if (!betPoints || betPoints < 1) throw createError('Aposta mínima de 1 ponto', 400);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const user = await getUser(userId, conn);
    if (user.points < betPoints) throw createError('Pontos insuficientes', 400);

    // Debitar imediatamente ao carregar no botão
    await UserModel.adjustPoints(userId, -betPoints, conn);
    await GameModel.createTransaction({
      userId, type: 'bet', amount: -betPoints,
      balanceBefore: user.points,
      balanceAfter: user.points - betPoints,
      description: `Mines — ${betPoints} pts`,
    }, conn);

    const positions = generateMinePositions(25, mineCount);
    const sessionId = await GameModel.createMinesSession({ userId, betAmount: betPoints, minePositions: positions }, conn);

    const finalUser = await getUser(userId, conn);
    await conn.commit();
    res.json({ sessionId, points: finalUser.points }); // 🛠️ Retorna o saldo deduzido para a UI atualizar na hora
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

const minesReveal = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { sessionId, cellIndex } = req.body;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const session = await GameModel.getMinesSession(sessionId, userId, conn);
    if (!session) throw createError('Sessão não encontrada', 404);

    const { minePositions, revealed, totalCells } = session.meta;
    if (revealed.includes(cellIndex)) throw createError('Célula já revelada', 400);

    // Bateu numa mina (Perdeu tudo)
    if (minePositions.includes(cellIndex)) {
      await GameModel.closeMinesSession(sessionId, 'lost', conn);
      await GameModel.createMatch({ userId, gameType: 'mines', betAmount: session.bet_amount, winAmount: 0, multiplier: 0, result: 'loss' }, conn);
      await UserModel.incrementLosses(userId, conn);

      const finalUser = await getUser(userId, conn);
      await conn.commit();
      return res.json({ hit: true, minePositions, points: finalUser.points }); // 🛠️ Retorna saldo atualizado
    }

    // Célula Segura
    const newRevealed = [...revealed, cellIndex];
    await GameModel.updateMinesSession(sessionId, newRevealed, conn);
    await UserModel.addXP(userId, XP_REWARDS.mines_safe, conn);

    const multiplier = calcMinesMultiplier(newRevealed.length, totalCells, minePositions.length);
    const potentialWin = Math.round(session.bet_amount * multiplier);

    const finalUser = await getUser(userId, conn);
    await conn.commit();
    res.json({ hit: false, multiplier, potentialWin, revealed: newRevealed, points: finalUser.points });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

const minesCashout = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { sessionId } = req.body;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const session = await GameModel.getMinesSession(sessionId, userId, conn);
    if (!session) throw createError('Sessão não encontrada', 404);

    const { minePositions, revealed, totalCells } = session.meta;
    if (!revealed.length) throw createError('Revela pelo menos uma célula', 400);

    const multiplier = calcMinesMultiplier(revealed.length, totalCells, minePositions.length);
    const winPoints   = Math.round(session.bet_amount * multiplier);

    await GameModel.closeMinesSession(sessionId, 'cashed_out', conn);
    
    // Creditar o prémio total acumulado
    const userBefore = await getUser(userId, conn);
    await UserModel.adjustPoints(userId, winPoints, conn);
    await GameModel.createTransaction({
      userId, type: 'win', amount: winPoints,
      balanceBefore: userBefore.points,
      balanceAfter: userBefore.points + winPoints,
      description: `Mines cashout — ${multiplier}x`,
    }, conn);

    await GameModel.createMatch({ userId, gameType: 'mines', betAmount: session.bet_amount, winAmount: winPoints, multiplier, result: 'win' }, conn);
    await UserModel.addXP(userId, XP_REWARDS.mines_cashout, conn);
    await UserModel.incrementWins(userId, conn);

    const finalUser = await getUser(userId, conn);
    await conn.commit();
    res.json({ winPoints, multiplier, points: finalUser.points });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

// ── COINFLIP ──────────────────────────────────────────────────────────────────
const coinflip = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { betPoints, choice } = req.body;
  if (!['heads', 'tails'].includes(choice)) throw createError('Escolha inválida', 400);
  if (!betPoints || betPoints < 1) throw createError('Aposta inválida', 400);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    let user = await getUser(userId, conn);
    if (user.points < betPoints) throw createError('Pontos insuficientes', 400);

    // 1. Debitar imediatamente ao clicar no botão
    await UserModel.adjustPoints(userId, -betPoints, conn);
    await GameModel.createTransaction({
      userId, type: 'bet', amount: -betPoints,
      balanceBefore: user.points,
      balanceAfter: user.points - betPoints,
      description: `Coinflip — ${betPoints} pts`,
    }, conn);

    const result = Math.random() < 0.5 ? 'heads' : 'tails';
    const won = result === choice;
    let winPoints = 0;

    if (won) {
      winPoints = Math.round(betPoints * 1.94);
      // 2. Se ganhar, ganha tudo (Aposta devolvida + Lucro líquido já calculados no multiplicador)
      const current = await getUser(userId, conn);
      await UserModel.adjustPoints(userId, winPoints, conn);
      await GameModel.createTransaction({
        userId, type: 'win', amount: winPoints,
        balanceBefore: current.points,
        balanceAfter: current.points + winPoints,
        description: `Coinflip vitória`,
      }, conn);

      await UserModel.addXP(userId, XP_REWARDS.coinflip_win, conn);
      await UserModel.incrementWins(userId, conn);
    } else {
      await UserModel.incrementLosses(userId, conn);
    }

    await GameModel.createMatch({ userId, gameType: 'coinflip', betAmount: betPoints, winAmount: winPoints, multiplier: won ? 1.94 : 0, result: won ? 'win' : 'loss', meta: { choice, result } }, conn);
    
    const finalUser = await getUser(userId, conn);
    await conn.commit();
    res.json({ result, won, winPoints, points: finalUser.points });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

// ── CRASH ─────────────────────────────────────────────────────────────────────
const crashJoin = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { betPoints } = req.body;
  if (!betPoints || betPoints < 1) throw createError('Aposta inválida', 400);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const user = await getUser(userId, conn);
    if (user.points < betPoints) throw createError('Pontos insuficientes', 400);

    // Perde logo os pontos ao entrar na ronda
    await UserModel.adjustPoints(userId, -betPoints, conn);
    await GameModel.createTransaction({
      userId, type: 'bet', amount: -betPoints,
      balanceBefore: user.points,
      balanceAfter: user.points - betPoints,
      description: `Crash — ${betPoints} pts`,
    }, conn);

    const crashPoint = generateCrashPoint();
    
    const finalUser = await getUser(userId, conn);
    await conn.commit();
    res.json({ crashPoint, betPoints, points: finalUser.points }); // 🛠️ Envia saldo atualizado para o front tirar os pontos do ecrã
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

const crashCashout = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { betPoints, multiplier, crashPoint } = req.body;
  if (multiplier >= crashPoint) throw createError('Já fez crash', 400);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const winPoints = Math.round(betPoints * multiplier);
    
    // 🛠️ CORRIGIDO: Lendo de dentro da transação ativa para evitar quebra de histórico
    const userBefore = await getUser(userId, conn);

    await UserModel.adjustPoints(userId, winPoints, conn);
    await GameModel.createTransaction({
      userId, type: 'win', amount: winPoints,
      balanceBefore: userBefore.points,
      balanceAfter: userBefore.points + winPoints,
      description: `Crash cashout — ${multiplier}x`,
    }, conn);

    await GameModel.createMatch({ userId, gameType: 'crash', betAmount: betPoints, winAmount: winPoints, multiplier, result: 'win' }, conn);
    await UserModel.addXP(userId, XP_REWARDS.crash_cashout, conn);
    await UserModel.incrementWins(userId, conn);

    const finalUser = await getUser(userId, conn);
    await conn.commit();
    res.json({ winPoints, points: finalUser.points });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

// ── BLACKJACK ─────────────────────────────────────────────────────────────────
const blackjackDeal = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { betPoints } = req.body;
  if (!betPoints || betPoints < 1) throw createError('Aposta inválida', 400);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const user = await getUser(userId, conn);
    if (user.points < betPoints) throw createError('Pontos insuficientes', 400);

    // Deduz imediatamente ao dar as cartas
    await UserModel.adjustPoints(userId, -betPoints, conn);
    await GameModel.createTransaction({
      userId, type: 'bet', amount: -betPoints,
      balanceBefore: user.points,
      balanceAfter: user.points - betPoints,
      description: `Blackjack — ${betPoints} pts`,
    }, conn);

    const deck = createShuffledDeck();
    const playerHand = [deck[0], deck[2]];
    const dealerHand = [deck[1], deck[3]];
    const isBlackjack = handTotal(playerHand) === 21;

    if (isBlackjack) {
      const winPoints = Math.round(betPoints * 2.5);
      const current = await getUser(userId, conn);
      await UserModel.adjustPoints(userId, winPoints, conn);
      await GameModel.createTransaction({
        userId, type: 'win', amount: winPoints,
        balanceBefore: current.points,
        balanceAfter: current.points + winPoints,
        description: `Blackjack natural win`,
      }, conn);
      await UserModel.addXP(userId, XP_REWARDS.blackjack_bj, conn);
      await UserModel.incrementWins(userId, conn);
      await GameModel.createMatch({ userId, gameType: 'blackjack', betAmount: betPoints, winAmount: winPoints, multiplier: 2.5, result: 'win' }, conn);
    }

    const finalUser = await getUser(userId, conn);
    await conn.commit();
    res.json({ playerHand, dealerHand, deck: deck.slice(4), betPoints, isBlackjack, points: finalUser.points });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

const blackjackAction = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { action, playerHand, dealerHand, deck, betPoints } = req.body;
  let ph = [...playerHand], dh = [...dealerHand], d = [...deck];
  let result = null, winPoints = 0, multiplier = 0;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    if (action === 'hit') {
      ph.push(d.shift());
      if (handTotal(ph) > 21) result = 'bust';
    } else if (action === 'stand' || action === 'double') {
      if (action === 'double') {
        const user = await getUser(userId, conn);
        if (user.points < betPoints) throw createError('Pontos insuficientes para Double', 400);

        // Deduz a aposta extra do Double na hora
        await UserModel.adjustPoints(userId, -betPoints, conn);
        await GameModel.createTransaction({
          userId, type: 'bet', amount: -betPoints,
          balanceBefore: user.points,
          balanceAfter: user.points - betPoints,
          description: `Blackjack double`,
        }, conn);
        ph.push(d.shift());
      }

      while (handTotal(dh) < 17) dh.push(d.shift());
      const pv = handTotal(ph), dv = handTotal(dh);
      const bet = action === 'double' ? betPoints * 2 : betPoints;

      if (pv > 21)                    result = 'bust';
      else if (pv === 21 && ph.length === 2) { result = 'blackjack'; multiplier = 2.5; winPoints = Math.round(bet * 2.5); }
      else if (dv > 21 || pv > dv)          { result = 'win';       multiplier = 2;   winPoints = Math.round(bet * 2); }
      else if (pv === dv)                    { result = 'push';                        winPoints = bet; }
      else                                     result = 'loss';

      if (winPoints > 0) {
        const current = await getUser(userId, conn);
        await UserModel.adjustPoints(userId, winPoints, conn);
        await GameModel.createTransaction({
          userId, type: 'win', amount: winPoints,
          balanceBefore: current.points,
          balanceAfter: current.points + winPoints,
          description: `Blackjack ${result}`,
        }, conn);
      }

      if (result === 'win' || result === 'blackjack') {
        await UserModel.addXP(userId, result === 'blackjack' ? XP_REWARDS.blackjack_bj : XP_REWARDS.blackjack_win, conn);
        await UserModel.incrementWins(userId, conn);
      } else if (result === 'loss' || result === 'bust') {
        await UserModel.incrementLosses(userId, conn);
      }
      await GameModel.createMatch({ userId, gameType: 'blackjack', betAmount: action === 'double' ? betPoints * 2 : betPoints, winAmount: winPoints, multiplier, result: winPoints > 0 ? 'win' : 'loss' }, conn);
    }

    const finalUser = await getUser(userId, conn);
    await conn.commit();
    res.json({ playerHand: ph, dealerHand: dh, deck: d, result, winPoints, points: finalUser.points });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

// ── CASE OPENING ──────────────────────────────────────────────────────────────
const caseOpen = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { caseId = 1 } = req.body;
  const { CaseModel } = require('../models/index');
  
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const caseData = await CaseModel.findById(caseId, conn);
    if (!caseData) throw createError('Caixa não encontrada', 404);

    const user = await getUser(userId, conn);
    if (user.points < caseData.price) throw createError('Pontos insuficientes', 400);

    // Deduz o preço da caixa na hora
    await UserModel.adjustPoints(userId, -caseData.price, conn);
    await GameModel.createTransaction({
      userId, type: 'bet', amount: -caseData.price,
      balanceBefore: user.points,
      balanceAfter: user.points - caseData.price,
      description: `Case Opening — ${caseData.name}`,
    }, conn);

    const items = await CaseModel.getItems(caseId, conn);
    if (!items.length) throw createError('Caixa sem itens', 500);

    const won = rollCaseItem(items);
    const pointsWon = parseInt(won.points_value) || 0;

    await InventoryModel.add(userId, won.id, conn);
    
    // Se a skin valer pontos diretos, adiciona tudo de volta ao saldo
    if (pointsWon > 0) {
      const current = await getUser(userId, conn);
      await UserModel.adjustPoints(userId, pointsWon, conn);
      await GameModel.createTransaction({
        userId, type: 'win', amount: pointsWon,
        balanceBefore: current.points,
        balanceAfter: current.points + pointsWon,
        description: `Case won points from ${won.name}`,
      }, conn);
    }

    await UserModel.addXP(userId, XP_REWARDS.case_open, conn);
    await GameModel.createMatch({
      userId, gameType: 'case_opening',
      betAmount: caseData.price, winAmount: pointsWon, multiplier: caseData.price > 0 ? pointsWon / caseData.price : 0,
      result: pointsWon >= caseData.price ? 'win' : 'loss',
      meta: { caseId, caseName: caseData.name, wonItem: won.name, rarity: won.rarity, pointsWon },
    }, conn);

    const finalUser = await getUser(userId, conn);
    await conn.commit();
    res.json({ item: won, pointsWon, points: finalUser.points });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

// ── ROLEXA / ROLETA ───────────────────────────────────────────────────────────
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
    totalStake += bet.amount;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const user = await getUser(userId, conn);
    if (user.points < totalStake) throw createError('Pontos insuficientes', 400);

    // Deduz o custo total da mesa na hora
    await UserModel.adjustPoints(userId, -totalStake, conn);
    await GameModel.createTransaction({
      userId, type: 'bet', amount: -totalStake,
      balanceBefore: user.points,
      balanceAfter: user.points - totalStake,
      description: `Roleta — ${bets.length} aposta(s), ${totalStake} pts`,
    }, conn);

    const winningNumber = spinRoulette();
    const winningColor   = rouletteColor(winningNumber);

    let totalWon = 0;
    const results = bets.map(bet => {
      const multiplier = checkRouletteBet(bet, winningNumber);
      const winAmount = multiplier > 0 ? bet.amount * multiplier : 0;
      totalWon += winAmount;
      return { ...bet, won: multiplier > 0, multiplier, winAmount };
    });

    // Se houver prémios nas linhas, adiciona o total ao saldo final
    if (totalWon > 0) {
      const current = await getUser(userId, conn);
      await UserModel.adjustPoints(userId, totalWon, conn);
      await GameModel.createTransaction({
        userId, type: 'win', amount: totalWon,
        balanceBefore: current.points,
        balanceAfter: current.points + totalWon,
        description: `Roleta vitória — número ${winningNumber}`,
      }, conn);
      await UserModel.addXP(userId, XP_REWARDS.roulette_win, conn);
      await UserModel.incrementWins(userId, conn);
    } else {
      await UserModel.incrementLosses(userId, conn);
    }

    await GameModel.createMatch({
      userId, gameType: 'roulette',
      betAmount: totalStake, winAmount: totalWon,
      multiplier: totalStake > 0 ? totalWon / totalStake : 0,
      result: totalWon >= totalStake ? 'win' : 'loss',
      meta: { winningNumber, winningColor, bets: results },
    }, conn);

    const finalUser = await getUser(userId, conn);
    await conn.commit();
    res.json({ winningNumber, winningColor, results, totalWon, points: finalUser.points });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

// ── DICE (HiLo) ───────────────────────────────────────────────────────────────
const dice = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { betPoints, target, direction } = req.body;
  if (!['over', 'under'].includes(direction)) throw createError('Direção inválida (over/under)', 400);
  if (target < 2 || target > 98) throw createError('Target deve estar entre 2 e 98', 400);
  if (!betPoints || betPoints < 1) throw createError('Aposta inválida', 400);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const user = await getUser(userId, conn);
    if (user.points < betPoints) throw createError('Pontos insuficientes', 400);

    // Deduz na hora ao rolar
    await UserModel.adjustPoints(userId, -betPoints, conn);
    await GameModel.createTransaction({
      userId, type: 'bet', amount: -betPoints,
      balanceBefore: user.points,
      balanceAfter: user.points - betPoints,
      description: `Dice — ${betPoints} pts`,
    }, conn);

    const roll = rollDice();
    const won  = checkDice(roll, target, direction);
    const multiplier = calcDiceMultiplier(target, direction);
    let winPoints = 0;

    if (won) {
      winPoints = Math.round(betPoints * multiplier);
      const current = await getUser(userId, conn);
      await UserModel.adjustPoints(userId, winPoints, conn);
      await GameModel.createTransaction({
        userId, type: 'win', amount: winPoints,
        balanceBefore: current.points,
        balanceAfter: current.points + winPoints,
        description: `Dice vitória — ${roll} (${direction} ${target})`,
      }, conn);
      await UserModel.addXP(userId, XP_REWARDS.dice_win, conn);
      await UserModel.incrementWins(userId, conn);
    } else {
      await UserModel.incrementLosses(userId, conn);
    }

    await GameModel.createMatch({ userId, gameType: 'dice', betAmount: betPoints, winAmount: winPoints, multiplier: won ? multiplier : 0, result: won ? 'win' : 'loss', meta: { roll, target, direction } }, conn);
    
    const finalUser = await getUser(userId, conn);
    await conn.commit();
    res.json({ roll, won, winPoints, multiplier, points: finalUser.points });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

// ── PLINKO HARDCORE (APENAS 5 BALDES) ─────────────────────────────────────────

// Tabela rigorosa sincronizada com o teu Frontend. Tudo o que não estiver aqui dá 0x (✕).
const HARDCORE_BUCKETS = {
  // 8 linhas: 9 slots (0 a 8). Premiados: pontas (0, 8), intermédios (2, 6) e centro (4)
  8: { 0: 5, 2: 2, 4: 15, 6: 2, 8: 5 },
  
  // 12 linhas: 13 slots (0 a 12). Premiados: pontas (0, 12), intermédios (3, 9) e centro (6)
  12: { 0: 8, 3: 3, 6: 25, 9: 3, 12: 8 },
  
  // 16 linhas: 17 slots (0 a 16). Premiados: pontas (0, 16), intermédios (4, 12) e centro (8)
  16: { 0: 10, 4: 5, 8: 50, 12: 5, 16: 10 }
};

const plinko = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { betPoints, rows = 16 } = req.body;
  const validRows = [8, 12, 16];
  if (!validRows.includes(Number(rows))) throw createError('Linhas inválidas (8, 12 ou 16)', 400);
  if (!betPoints || betPoints < 1) throw createError('Aposta inválida', 400);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const user = await getUser(userId, conn);
    if (user.points < betPoints) throw createError('Pontos insuficientes', 400);

    // Deduz ao largar a bola
    await UserModel.adjustPoints(userId, -betPoints, conn);
    await GameModel.createTransaction({
      userId, type: 'bet', amount: -betPoints,
      balanceBefore: user.points,
      balanceAfter: user.points - betPoints,
      description: `Plinko — ${betPoints} pts`,
    }, conn);

    // 1. O dropPlinko continua a gerar o caminho físico e a posição final (0 até 'rows')
    const plinkoResult = dropPlinko(Number(rows));
    const position = plinkoResult.position;
    const path = plinkoResult.path;

    // 2. 🔥 AJUSTE CRUCIAL: Forçar o multiplicador com base nos 5 baldes novos!
    const activeBucketsMap = HARDCORE_BUCKETS[Number(rows)] || HARDCORE_BUCKETS[16];
    const multiplier = activeBucketsMap[position] !== undefined ? activeBucketsMap[position] : 0; // Se for cinzento, vira 0!

    // 3. Calcular os pontos ganhos reais
    const winPoints = Math.round(betPoints * multiplier);

    // Se o multiplicador for maior que zero (ou seja, caiu num dos 5 baldes válidos)
    if (winPoints > 0) {
      const current = await getUser(userId, conn);
      await UserModel.adjustPoints(userId, winPoints, conn);
      await GameModel.createTransaction({
        userId, type: 'win', amount: winPoints,
        balanceBefore: current.points,
        balanceAfter: current.points + winPoints,
        description: `Plinko prémio — ${multiplier}x`,
      }, conn);
      
      await UserModel.addXP(userId, XP_REWARDS.plinko_win, conn);
      await UserModel.incrementWins(userId, conn);
    } else {
      await UserModel.incrementLosses(userId, conn);
    }

    // Registar a partida com o resultado real
    await GameModel.createMatch({ 
      userId, gameType: 'plinko', 
      betAmount: betPoints, winAmount: winPoints, 
      multiplier, result: multiplier > 0 ? 'win' : 'loss', // 'loss' para multiplicador 0
      meta: { rows, position, path } 
    }, conn);

    const finalUser = await getUser(userId, conn);
    await conn.commit(); 

    // Envia de volta exatamente o multiplicador forçado a 0 e winPoints 0
    res.json({ position, multiplier, path, winPoints, points: finalUser.points });
  } catch (err) {
    await conn.rollback(); 
    throw err;
  } finally {
    conn.release(); 
  }
});

// ── VÍDEO POKER ───────────────────────────────────────────────────────────────
const pokerDeal = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { betPoints } = req.body;
  if (!betPoints || betPoints < 1) throw createError('Aposta inválida', 400);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const user = await getUser(userId, conn);
    if (user.points < betPoints) throw createError('Pontos insuficientes', 400);

    // Deduz as moedas no Deal inicial
    await UserModel.adjustPoints(userId, -betPoints, conn);
    await GameModel.createTransaction({
      userId, type: 'bet', amount: -betPoints,
      balanceBefore: user.points,
      balanceAfter: user.points - betPoints,
      description: `Vídeo Poker — ${betPoints} pts`,
    }, conn);

    const deck = createShuffledDeck();
    const hand = deck.slice(0, 5);
    const rest = deck.slice(5);

    const finalUser = await getUser(userId, conn);
    await conn.commit();
    res.json({ hand, deck: rest, betPoints, points: finalUser.points });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

const pokerHold = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { hand, deck, held, betPoints } = req.body;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const finalHand = hand.map((card, i) => held.includes(i) ? card : deck.shift());
    const handName  = evaluatePokerHand(finalHand);
    const multiplier = POKER_HANDS[handName] || 0;
    const winPoints  = Math.round(betPoints * multiplier);

    if (winPoints > 0) {
      const current = await getUser(userId, conn);
      await UserModel.adjustPoints(userId, winPoints, conn);
      await GameModel.createTransaction({
        userId, type: 'win', amount: winPoints,
        balanceBefore: current.points,
        balanceAfter: current.points + winPoints,
        description: `Vídeo Poker — ${handName} (${multiplier}x)`,
      }, conn);
      await UserModel.addXP(userId, XP_REWARDS.poker_win, conn);
      await UserModel.incrementWins(userId, conn);
    } else {
      await UserModel.incrementLosses(userId, conn);
    }

    await GameModel.createMatch({ userId, gameType: 'video_poker', betAmount: betPoints, winAmount: winPoints, multiplier, result: winPoints > 0 ? 'win' : 'loss', meta: { handName, finalHand } }, conn);
    
    const finalUser = await getUser(userId, conn);
    await conn.commit();
    res.json({ finalHand, handName, multiplier, winPoints, points: finalUser.points });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

// ── SLOTS ─────────────────────────────────────────────────────────────────────
const slots = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { betPoints } = req.body;
  if (!betPoints || betPoints < 1) throw createError('Aposta inválida', 400);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const user = await getUser(userId, conn);
    if (user.points < betPoints) throw createError('Pontos insuficientes', 400);

    // Deduz os pontos no spin imediato
    await UserModel.adjustPoints(userId, -betPoints, conn);
    await GameModel.createTransaction({
      userId, type: 'bet', amount: -betPoints,
      balanceBefore: user.points,
      balanceAfter: user.points - betPoints,
      description: `Slots — ${betPoints} pts`,
    }, conn);

    const { reels, multiplier } = spinSlots();
    const winPoints = Math.round(betPoints * multiplier);

    if (winPoints > 0) {
      const current = await getUser(userId, conn);
      await UserModel.adjustPoints(userId, winPoints, conn);
      await GameModel.createTransaction({
        userId, type: 'win', amount: winPoints,
        balanceBefore: current.points,
        balanceAfter: current.points + winPoints,
        description: `Slots — ${multiplier}x`,
      }, conn);
      await UserModel.addXP(userId, XP_REWARDS.slots_win, conn);
      await UserModel.incrementWins(userId, conn);
    } else {
      await UserModel.incrementLosses(userId, conn);
    }

    await GameModel.createMatch({ userId, gameType: 'slots', betAmount: betPoints, winAmount: winPoints, multiplier, result: winPoints > 0 ? 'win' : 'loss', meta: { reels: reels.map(r => r.id) } }, conn);
    
    const finalUser = await getUser(userId, conn);
    await conn.commit();
    res.json({ reels, multiplier, winPoints, points: finalUser.points });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

const getCasesWithItems = asyncHandler(async (req, res) => {
  const { CaseModel } = require('../models/index');
  const cases = await CaseModel.getAll();
  for (const c of cases) {
    c.items = await CaseModel.getItems(c.id);
  }
  res.json({ cases });
});

const getUserState = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const user = await getUser(userId);
  const stats = await GameModel.getStats(userId);
  const history = await GameModel.getHistory(userId, 20);
  res.json({ user, stats, history });
});

module.exports = { minesStart, minesReveal, minesCashout, coinflip, crashJoin, crashCashout, blackjackDeal, blackjackAction, caseOpen, getCasesWithItems, roulette, dice, plinko, pokerDeal, pokerHold, slots, getUserState };