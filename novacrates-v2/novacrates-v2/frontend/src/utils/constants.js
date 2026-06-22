// Constantes de jogo
export const MINE_COUNTS = [1, 2, 3, 5, 10, 15, 20];
export const RARITY_COLORS = {
  Consumer:   '#9ca3af',
  Industrial: '#6baed6',
  'Mil-Spec':  '#4d79ff',
  Restricted: '#b44dff',
  Classified: '#ff4da6',
  Covert:     '#ff4d4d',
  Special:    '#ffd700',
};
export const RARITY_BG = {
  Consumer:   '#374151',
  Industrial: '#1e3a5f',
  'Mil-Spec':  '#1a237e',
  Restricted: '#2d0a4e',
  Classified: '#4a0030',
  Covert:     '#4a0000',
  Special:    '#3d2b00',
};

// Formata pontos — única moeda da plataforma (ex: "1.250 pts")
export const formatPoints = (n) =>
  `${new Intl.NumberFormat('pt-PT').format(Math.round(n))} pts`;

// Formata número com separador de milhar
export const formatNumber = (n) =>
  new Intl.NumberFormat('pt-PT').format(n);

// Tempo restante humanizado
export function timeLeft(dateStr) {
  const diff = new Date(dateStr) - new Date();
  if (diff <= 0) return 'Expirado';
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// XP para próximo nível
export const xpForLevel = (level) => Math.pow(level + 1, 2) * 100;
