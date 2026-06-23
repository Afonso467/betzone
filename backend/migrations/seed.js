require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mysql = require('mysql2/promise');

async function seed() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST,
    port:     process.env.DB_PORT,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'novacrates',
    multipleStatements: true,
  });

  // ── Utilizadores de demonstração (moeda única: pontos) ────────────────────
  await conn.query(`
    INSERT IGNORE INTO users (id, username, avatar, points, xp, xp_next, level, wins, losses, active, created_at)
    VALUES
      (1, 'GamerPro',    '🎮', 18900,  3450,  5000,   12, 147, 63,  1, NOW()),
  `);

  // ── Skins para o Skin Market (preço agora em pontos via points_value) ────
  await conn.query(`
    INSERT IGNORE INTO skins (id, name, wear, rarity, points_value, emoji, color) VALUES
      (1,  'AK-47 | Redline',          'Field-Tested',  'Classified', 1200,  '🔫', '#b44dff'),
      (2,  'AWP | Asiimov',            'Battle-Scarred', 'Covert',     890,  '🎯', '#ff4d4d'),
      (3,  'Glock | Fade',             'Factory New',    'Restricted', 3400, '🔫', '#4d79ff'),
      (4,  'Butterfly Knife | Doppler','Minimal Wear',  'Special',   12000, '🔪', '#ffd700'),
      (5,  'M4A1-S | HyperBeast',      'Field-Tested',  'Covert',      670, '⚙️', '#ff4d4d'),
      (6,  'Desert Eagle | Blaze',     'Factory New',    'Restricted', 4300, '🔫', '#4d79ff'),
      (7,  'USP-S | Kill Confirmed',   'Minimal Wear',   'Covert',      980, '🔫', '#ff4d4d'),
      (8,  'P250 | Sand Dune',         'Battle-Scarred', 'Consumer',     12, '🔫', '#9ca3af'),
      (9,  'Nova | Tempest',           'Field-Tested',   'Industrial',   35, '🔧', '#6baed6'),
      (10, 'Tec-9 | Brass',            'Battle-Scarred', 'Mil-Spec',    120, '⚔️', '#4d79ff');
  `);

  // ── Itens EXCLUSIVOS de cada caixa (visual próprio + pontos reais) ────────
  // IDs 100+ para não colidir com as skins do Market (1-10)
  await conn.query(`
    INSERT IGNORE INTO skins (id, name, wear, rarity, points_value, emoji, color) VALUES
      -- Nova Case (caixa básica, barata)
      (101, 'Ferro Enferrujado',     'Battle-Scarred', 'Consumer',     15, '🔪', '#9ca3af'),
      (102, 'Lâmina de Aço',        'Field-Tested',   'Industrial',    40, '🗡️', '#6baed6'),
      (103, 'Punhal Sombrio',       'Minimal Wear',   'Mil-Spec',     120, '🔪', '#4d79ff'),
      (104, 'Garra Carmesim',       'Field-Tested',   'Restricted',   450, '🩸', '#b44dff'),
      (105, 'Fang do Vazio',        'Factory New',    'Classified',  1500, '🦷', '#ff4da6'),
      (106, 'Estrela Cadente',      'Factory New',    'Covert',      4000, '🌠', '#ff4d4d'),
      (107, 'Coração de Dragão',    'Factory New',    'Special',    20000, '🐉', '#ffd700'),

      -- Premium Case (caixa intermédia)
      (110, 'Placa de Bronze',      'Battle-Scarred', 'Consumer',      25, '🛡️', '#9ca3af'),
      (111, 'Elmo de Ferro',        'Field-Tested',   'Industrial',    70, '⛑️', '#6baed6'),
      (112, 'Espada Rúnica',        'Minimal Wear',   'Mil-Spec',     200, '⚔️', '#4d79ff'),
      (113, 'Cajado Arcano',        'Field-Tested',   'Restricted',   750, '🪄', '#b44dff'),
      (114, 'Coroa Esquecida',      'Factory New',    'Classified',  2500, '👑', '#ff4da6'),
      (115, 'Asas de Fênix',        'Factory New',    'Covert',      6500, '🪽', '#ff4d4d'),
      (116, 'Olho do Cosmos',       'Factory New',    'Special',    35000, '👁️', '#ffd700'),

      -- Galaxy Case (caixa temática espacial, cara)
      (120, 'Poeira de Asteroide',  'Battle-Scarred', 'Consumer',      40, '☄️', '#9ca3af'),
      (121, 'Fragmento Lunar',      'Field-Tested',   'Industrial',   100, '🌙', '#6baed6'),
      (122, 'Cristal de Plasma',    'Minimal Wear',   'Mil-Spec',     350, '🔮', '#4d79ff'),
      (123, 'Núcleo Estelar',       'Field-Tested',   'Restricted',  1200, '⭐', '#b44dff'),
      (124, 'Portal Dimensional',   'Factory New',    'Classified',  4000, '🌀', '#ff4da6'),
      (125, 'Supernova',            'Factory New',    'Covert',     10000, '💥', '#ff4d4d'),
      (126, 'Singularidade',        'Factory New',    'Special',    50000, '🕳️', '#ffd700'),

      -- Mythic Case (caixa premium, a mais cara e mais generosa)
      (130, 'Pedra Comum',          'Battle-Scarred', 'Consumer',      80, '🪨', '#9ca3af'),
      (131, 'Cristal Encantado',    'Field-Tested',   'Industrial',   200, '💠', '#6baed6'),
      (132, 'Orbe Mágico',          'Minimal Wear',   'Mil-Spec',     600, '🔵', '#4d79ff'),
      (133, 'Relíquia Ancestral',   'Field-Tested',   'Restricted',  2000, '🏺', '#b44dff'),
      (134, 'Coroa Mítica',         'Factory New',    'Classified',  6000, '👑', '#ff4da6'),
      (135, 'Lâmina Lendária',      'Factory New',    'Covert',     15000, '🗡️', '#ff4d4d'),
      (136, 'Coração do Titã',      'Factory New',    'Special',    80000, '💗', '#ffd700');
  `);

  // ── Caixas disponíveis (preço agora em pontos) ───────────────────────────
  await conn.query(`
    INSERT IGNORE INTO cases (id, name, description, price, emoji, theme_color) VALUES
      (1, 'Nova Case',    'A caixa inicial, ideal para começar. Boas chances de itens comuns.',         250, '📦', '#F59E0B'),
      (2, 'Premium Case', 'Itens de melhor qualidade com chances melhoradas de raridades altas.',        500, '🎁', '#8b5cf6'),
      (3, 'Galaxy Case',  'Tema espacial com recompensas maiores. Para quem busca o extraordinário.',   1000, '🌌', '#3b82f6'),
      (4, 'Mythic Case',  'A caixa mais exclusiva da plataforma. Maiores prémios em pontos!',           2000, '🏆', '#ffd700');
  `);

  // ── Itens de cada caixa (probabilidades — somam 100% cada caixa) ─────────
  await conn.query(`
    INSERT IGNORE INTO case_items (case_id, skin_id, chance) VALUES
      -- Nova Case
      (1, 101, 79.920000),
      (1, 102, 15.980000),
      (1, 103,  3.200000),
      (1, 104,  0.640000),
      (1, 105,  0.128000),
      (1, 106,  0.025600),
      (1, 107,  0.006400),

      -- Premium Case
      (2, 110, 79.920000),
      (2, 111, 15.980000),
      (2, 112,  3.200000),
      (2, 113,  0.640000),
      (2, 114,  0.128000),
      (2, 115,  0.025600),
      (2, 116,  0.006400),

      -- Galaxy Case
      (3, 120, 79.920000),
      (3, 121, 15.980000),
      (3, 122,  3.200000),
      (3, 123,  0.640000),
      (3, 124,  0.128000),
      (3, 125,  0.025600),
      (3, 126,  0.006400),

      -- Mythic Case
      (4, 130, 79.920000),
      (4, 131, 15.980000),
      (4, 132,  3.200000),
      (4, 133,  0.640000),
      (4, 134,  0.128000),
      (4, 135,  0.025600),
      (4, 136,  0.006400);
  `);

  // ── Giveaways ativos (valor agora descrito em pontos) ────────────────────
  await conn.query(`
    INSERT IGNORE INTO giveaways (id, title, description, emoji, category, value, participant_count, ends_at, active) VALUES
      (1, 'AK-47 | Redline FT',     'Ganha esta skin clássica!',      '🔫', 'Skin',       1200, 1240, DATE_ADD(NOW(), INTERVAL 5 DAY),  1),
      (2, '5.000 Pontos NovaCrates','Pontos para gastar na plataforma!','🎁', 'Pontos',    5000, 3890, DATE_ADD(NOW(), INTERVAL 3 DAY),  1),
      (3, 'Butterfly Knife Doppler','A skin mais rara da plataforma!','🔥', 'Skin Rara', 12000,  567, DATE_ADD(NOW(), INTERVAL 10 DAY), 1),
      (4, '20.000 Pontos NovaCrates','Prémio de pontos em destaque!',  '💎', 'Pontos',   20000, 6120, DATE_ADD(NOW(), INTERVAL 2 DAY),  1);
  `);

  // Nota: os jogos para apostas já não vêm de uma tabela seed —
  // são obtidos em tempo real da API-Football (ou dados demo do serviço
  // apiFootball.js enquanto a API_FOOTBALL_KEY não estiver configurada).

  // ── Jogos de exemplo (criados manualmente, como o admin faria) ──────────
  await conn.query(`
    INSERT IGNORE INTO manual_fixtures
      (id, competition, round_label, home_team, away_team, home_logo, away_logo, kickoff_at, odds_home, odds_draw, odds_away, status, created_at)
    VALUES
      (1, 'FIFA World Cup 2026', 'Grupo H, 2.ª jornada', 'Espanha', 'Arábia Saudita',
       'https://flagcdn.com/w160/es.png', 'https://flagcdn.com/w160/sa.png',
       DATE_ADD(NOW(), INTERVAL 6 HOUR), 1.10, 11.00, 21.00, 'scheduled', NOW()),
      (2, 'FIFA World Cup 2026', 'Grupo A, 1.ª jornada', 'Brasil', 'México',
       'https://flagcdn.com/w160/br.png', 'https://flagcdn.com/w160/mx.png',
       DATE_ADD(NOW(), INTERVAL 1 DAY), 1.45, 3.80, 6.50, 'scheduled', NOW()),
      (3, 'Liga Portugal', '15.ª jornada', 'Benfica', 'FC Porto',
       'https://crests.football-data.org/1903.png', 'https://crests.football-data.org/503.png',
       DATE_ADD(NOW(), INTERVAL -2 HOUR), 2.10, 3.30, 3.20, 'live', NOW());
  `);

  // ── Conquistas ────────────────────────────────────────────────────────────
  await conn.query(`
    INSERT IGNORE INTO achievements (key_name, title, description, emoji, xp_reward) VALUES
      ('first_win',     'Primeira Vitória',   'Ganha o teu primeiro jogo',        '🏆',  100),
      ('mines_master',  'Mestre das Minas',   'Faz cashout 10x no Mines',         '💣',  200),
      ('coinflip_lucky','Cara de Sorte',      'Ganha 5 coinflips seguidos',       '🪙',  300),
      ('crash_10x',     'Astronauta',         'Faz cashout acima de 10x no Crash','🚀',  500),
      ('blackjack_bj',  '21 Natural',         'Faz Blackjack natural',            '🃏',  150),
      ('high_roller',   'High Roller',        'Faz uma aposta acima de 10000 pts','💰', 1000);
  `);

  console.log('🌱 Seed concluído! Dados de demonstração inseridos.');
  console.log('   Utilizador principal: id=1, username=GamerPro, 18.900 pontos');
  console.log('   4 caixas disponíveis (pagas em pontos): Nova Case, Premium Case, Galaxy Case, Mythic Case');
  await conn.end();
}

seed().catch(e => { console.error('Seed error:', e); process.exit(1); });
