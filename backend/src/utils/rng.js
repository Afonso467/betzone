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
  dice_win:       25,
  plinko_win:     30,
  poker_win:      40,
  slots_win:      30,
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

// ── DICE (HiLo) ───────────────────────────────────────────────────────────────
// O jogador escolhe um target (1-99) e se quer "over" ou "under".
// Odds calculadas a partir da probabilidade real, com house edge de 1%.
function rollDice() { return Math.floor(secureRandom() * 100) + 1; } // 1-100

function calcDiceMultiplier(target, direction) {
  // Probabilidade de ganhar consoante target e direção
  const chance = direction === 'over' ? (100 - target) / 100 : (target - 1) / 100;
  if (chance <= 0) return 0;
  const HOUSE_EDGE = 0.01; // 1%
  return Math.floor((1 / chance) * (1 - HOUSE_EDGE) * 100) / 100;
}

function checkDice(roll, target, direction) {
  return direction === 'over' ? roll > target : roll < target;
}

// ── PLINKO ────────────────────────────────────────────────────────────────────
// 16 linhas de pinos (pode ser configurado). A bola cai por binomial —
// cada pino é uma decisão esquerda/direita (50/50 justo).
// A posição final determina o multiplicador (maior nas extremidades).
const PLINKO_MULTIPLIERS = {
  8:  [5.6, 2.1, 1.1, 1.0, 0.5, 1.0, 1.1, 2.1, 5.6],
  12: [10, 3, 1.6, 1.4, 1.1, 1.0, 1.1, 1.4, 1.6, 3, 10],
  16: [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1.0, 1.1, 1.2, 1.4, 1.4, 2, 9, 16],
};

function dropPlinko(rows = 16) {
  let position = 0;
  const path = [];
  for (let i = 0; i < rows; i++) {
    const goRight = secureRandom() < 0.5;
    path.push(goRight ? 'R' : 'L');
    if (goRight) position++;
  }
  const multipliers = PLINKO_MULTIPLIERS[rows] || PLINKO_MULTIPLIERS[16];
  const multiplier = multipliers[position] || 1.0;
  return { position, multiplier, path };
}

// ── VÍDEO POKER (Jacks or Better) ─────────────────────────────────────────────
// Payout clássico Jacks or Better:
const POKER_HANDS = {
  'royal-flush':    800,
  'straight-flush': 50,
  'four-of-a-kind': 25,
  'full-house':     9,
  'flush':          6,
  'straight':       4,
  'three-of-a-kind':3,
  'two-pair':       2,
  'jacks-or-better':1,
  'nothing':        0,
};

function evaluatePokerHand(hand) {
  const values = hand.map(c => c.v);
  const suits  = hand.map(c => c.s);

  const valueRank = {'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14};
  const ranks = values.map(v => valueRank[v]).sort((a, b) => a - b);

  const freq = {};
  ranks.forEach(r => { freq[r] = (freq[r] || 0) + 1; });
  const counts = Object.values(freq).sort((a, b) => b - a);

  const isFlush    = new Set(suits).size === 1;
  const isStraight = ranks[4] - ranks[0] === 4 && counts[0] === 1;
  const isRoyalStr = isStraight && ranks[0] === 10;

  if (isFlush && isRoyalStr)     return 'royal-flush';
  if (isFlush && isStraight)     return 'straight-flush';
  if (counts[0] === 4)           return 'four-of-a-kind';
  if (counts[0] === 3 && counts[1] === 2) return 'full-house';
  if (isFlush)                   return 'flush';
  if (isStraight)                return 'straight';
  if (counts[0] === 3)           return 'three-of-a-kind';
  if (counts[0] === 2 && counts[1] === 2) return 'two-pair';
  // Jacks or Better: par de J, Q, K ou A
  if (counts[0] === 2) {
    const pairRank = parseInt(Object.entries(freq).find(([, v]) => v === 2)[0]);
    if (pairRank >= 11) return 'jacks-or-better';
  }
  return 'nothing';
}

// ── SLOTS (3 reels, 9 símbolos) ──────────────────────────────────────────────
const SLOT_SYMBOLS = [
  { id: 'cherry',  emoji: '🍒', weight: 30, multiplier: { 1: 0, 2: 1, 3: 2 } },
  { id: 'lemon',   emoji: '🍋', weight: 25, multiplier: { 1: 0, 2: 1, 3: 3 } },
  { id: 'orange',  emoji: '🍊', weight: 22, multiplier: { 1: 0, 2: 2, 3: 5 } },
  { id: 'grape',   emoji: '🍇', weight: 18, multiplier: { 1: 0, 2: 2, 3: 8 } },
  { id: 'melon',   emoji: '🍈', weight: 14, multiplier: { 1: 0, 2: 3, 3: 10 } },
  { id: 'bell',    emoji: '🔔', weight: 10, multiplier: { 1: 0, 2: 5, 3: 20 } },
  { id: 'star',    emoji: '⭐', weight: 7,  multiplier: { 1: 0, 2: 8, 3: 40 } },
  { id: 'diamond', emoji: '💎', weight: 4,  multiplier: { 1: 0, 2: 15, 3: 100 } },
  { id: 'seven',   emoji: '7️⃣', weight: 2,  multiplier: { 1: 0, 2: 25, 3: 250 } },
];

function spinSlots() {
  const totalWeight = SLOT_SYMBOLS.reduce((s, sym) => s + sym.weight, 0);
  function pickSymbol() {
    let r = secureRandom() * totalWeight;
    for (const sym of SLOT_SYMBOLS) { r -= sym.weight; if (r <= 0) return sym; }
    return SLOT_SYMBOLS[0];
  }
  const reels = [pickSymbol(), pickSymbol(), pickSymbol()];

  // Contar quantos reels têm o mesmo símbolo mais comum
  const freq = {};
  reels.forEach(s => { freq[s.id] = (freq[s.id] || 0) + 1; });
  const [topId, topCount] = Object.entries(freq).sort(([,a],[,b]) => b - a)[0];
  const topSymbol = SLOT_SYMBOLS.find(s => s.id === topId);
  const multiplier = topSymbol.multiplier[topCount] || 0;

  return { reels, multiplier };
}

module.exports = {
  secureRandom,
  generateMinePositions, calcMinesMultiplier,
  generateCrashPoint, rollCaseItem,
  spinRoulette, rouletteColor, checkRouletteBet,
  rollDice, calcDiceMultiplier, checkDice,
  dropPlinko, PLINKO_MULTIPLIERS,
  evaluatePokerHand, POKER_HANDS,
  spinSlots, SLOT_SYMBOLS,
  XP_REWARDS, xpForLevel, levelFromXp,
  createShuffledDeck, cardValue, handTotal,
};
