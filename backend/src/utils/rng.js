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

// ── ROLETA EUROPEIA (0-36) ────────────────────────────────────────────────────
// Números vermelhos da roleta europeia padrão (os restantes são pretos, exceto o 0 = verde)
const ROULETTE_RED_NUMBERS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);

function rouletteColor(number) {
  if (number === 0) return 'green';
  return ROULETTE_RED_NUMBERS.has(number) ? 'red' : 'black';
}

// Gira a roleta — devolve o número sorteado (0-36) com RNG seguro do servidor
function spinRoulette() {
  return Math.floor(secureRandom() * 37); // 0 a 36 inclusive
}

// Calcula o multiplicador de pagamento consoante o tipo de aposta, se ganhar.
// Payouts clássicos de casino (incluindo a aposta original — ex: vermelho paga 2x o total).
const ROULETTE_PAYOUTS = {
  color:    2,  // vermelho / preto / verde — verde paga diferente, tratado em baixo
  number:   36, // número exato (pleno)
  parity:   2,  // par / ímpar
};

// Verifica se uma aposta específica ganhou, e devolve o multiplicador de pagamento.
// bet = { type: 'color'|'number'|'parity', value: 'red'|'black'|'green'|0-36|'even'|'odd' }
function checkRouletteBet(bet, winningNumber) {
  const color = rouletteColor(winningNumber);

  if (bet.type === 'color') {
    if (bet.value !== color) return 0;
    // O verde (número 0) tem payout mais alto por ser mais raro (1/37)
    return bet.value === 'green' ? 35 : 2;
  }

  if (bet.type === 'number') {
    return Number(bet.value) === winningNumber ? 36 : 0;
  }

  if (bet.type === 'parity') {
    if (winningNumber === 0) return 0; // 0 não é par nem ímpar nas apostas de paridade
    const isEven = winningNumber % 2 === 0;
    const won = (bet.value === 'even' && isEven) || (bet.value === 'odd' && !isEven);
    return won ? 2 : 0;
  }

  // Dúzia: '1' = 1-12, '2' = 13-24, '3' = 25-36 — paga 3x
  if (bet.type === 'dozen') {
    if (winningNumber === 0) return 0;
    const dozen = Math.ceil(winningNumber / 12).toString();
    return bet.value === dozen ? 3 : 0;
  }

  // Metade: 'low' = 1-18, 'high' = 19-36 — paga 2x
  if (bet.type === 'half') {
    if (winningNumber === 0) return 0;
    const isLow = winningNumber <= 18;
    const won = (bet.value === 'low' && isLow) || (bet.value === 'high' && !isLow);
    return won ? 2 : 0;
  }

  return 0;
}


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
  roulette_win:   35,
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
  spinRoulette,
  rouletteColor,
  checkRouletteBet,
  XP_REWARDS,
  xpForLevel,
  levelFromXp,
  createShuffledDeck,
  cardValue,
  handTotal,
};
