const crypto = require('crypto');

// ── RNG seguro do servidor ───────────────────────────────────────────────────

// Gera um float entre 0 e 1 criptograficamente seguro
function secureRandom() {
  const buf = crypto.randomBytes(4);
  return buf.readUInt32BE(0) / 0xFFFFFFFF;
}

// Gerar posições aleatórias de minas num grid
function generateMinePositions(totalCells, mineCount) {
  const positions = new Set();
  while (positions.size < mineCount) {
    positions.add(Math.floor(secureRandom() * totalCells));
  }
  return [...positions];
}

// Calcular multiplicador do Mines com base nas células seguras reveladas
function calcMinesMultiplier(safeRevealed, totalCells, mineCount) {
  if (safeRevealed === 0) return 1;
  let prob = 1;
  for (let i = 0; i < safeRevealed; i++) {
    prob *= (totalCells - mineCount - i) / (totalCells - i);
  }
  // 3% de house edge
  return Math.max(1, parseFloat((0.97 / prob).toFixed(4)));
}

// Ponto de crash: distribuição exponencial enviesada para house edge
function generateCrashPoint() {
  const houseEdge = 0.04; // 4%
  const r = secureRandom();
  if (r < houseEdge) return 1.00; // crash imediato (edge case)
  return parseFloat(Math.max(1.00, 0.99 / (1 - r)).toFixed(2));
}

// Escolher item de caixa com base nas probabilidades
function rollCaseItem(items) {
  const total = items.reduce((s, i) => s + parseFloat(i.chance), 0);
  let r = secureRandom() * total;
  for (const item of items) {
    r -= parseFloat(item.chance);
    if (r <= 0) return item;
  }
  return items[0];
}

// ── XP e Níveis ──────────────────────────────────────────────────────────────
const XP_REWARDS = {
  mines_safe:     15,
  mines_cashout:  50,
  coinflip_win:   30,
  crash_cashout:  40,
  blackjack_win:  40,
  blackjack_bj:   60,
  case_open:      20,
  bet_win:        35,
  giveaway_enter: 10,
};

function xpForLevel(level) {
  return Math.pow(level, 2) * 100;
}

function levelFromXp(xp) {
  return Math.floor(1 + Math.sqrt(xp / 100));
}

// Deck de blackjack embaralhado
function createShuffledDeck() {
  const suits  = ['♠', '♥', '♦', '♣'];
  const values = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
  const deck   = suits.flatMap(s => values.map(v => ({ s, v, red: s === '♥' || s === '♦' })));
  // Fisher-Yates
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(secureRandom() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function cardValue(card) {
  if (['J','Q','K'].includes(card.v)) return 10;
  if (card.v === 'A') return 11;
  return parseInt(card.v);
}

function handTotal(hand) {
  let total = hand.reduce((s, c) => s + cardValue(c), 0);
  let aces  = hand.filter(c => c.v === 'A').length;
  while (total > 21 && aces-- > 0) total -= 10;
  return total;
}

module.exports = {
  secureRandom,
  generateMinePositions,
  calcMinesMultiplier,
  generateCrashPoint,
  rollCaseItem,
  XP_REWARDS,
  xpForLevel,
  levelFromXp,
  createShuffledDeck,
  cardValue,
  handTotal,
};
