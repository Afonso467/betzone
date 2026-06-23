-- NovaCrates — Migrations completas
-- Executar com: node migrations/run.js  ou  mysql -u root -p novacrates < migrations/schema.sql

CREATE DATABASE IF NOT EXISTS defaultdb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE defaultdb;

-- ── Utilizadores (sem autenticação — apenas perfis de jogo) ──────────────────
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(30)  NOT NULL UNIQUE,
  avatar        VARCHAR(10)  DEFAULT '🎮',
  points        INT UNSIGNED  NOT NULL DEFAULT 500,
  xp            INT UNSIGNED  NOT NULL DEFAULT 0,
  xp_next       INT UNSIGNED  NOT NULL DEFAULT 400,
  level         SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  wins          INT UNSIGNED  NOT NULL DEFAULT 0,
  losses        INT UNSIGNED  NOT NULL DEFAULT 0,
  active        TINYINT(1)    NOT NULL DEFAULT 1,
  created_at    DATETIME NOT NULL,
  updated_at    DATETIME,
  INDEX idx_username (username),
  INDEX idx_xp      (xp DESC)
) ENGINE=InnoDB;

-- ── Sessões de jogo (estado temporário — ex: Mines ativo) ────────────────────
CREATE TABLE IF NOT EXISTS game_sessions (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  game_type  ENUM('mines','crash','blackjack') NOT NULL,
  bet_amount DECIMAL(12,2) NOT NULL,
  state      ENUM('active','finished','cashed_out','lost') NOT NULL DEFAULT 'active',
  meta       JSON,
  created_at DATETIME NOT NULL,
  updated_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_active (user_id, state)
) ENGINE=InnoDB;

-- ── Partidas/jogadas (histórico completo) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS matches (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  game_type   VARCHAR(30)  NOT NULL,
  bet_amount  INT NOT NULL,
  win_amount  INT NOT NULL DEFAULT 0,
  multiplier  DECIMAL(10,4) NOT NULL DEFAULT 1,
  result      ENUM('win','loss','push') NOT NULL,
  meta        JSON,
  created_at  DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_game (user_id, game_type),
  INDEX idx_created   (created_at DESC)
) ENGINE=InnoDB;

-- ── Transações financeiras (auditoria) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id        INT UNSIGNED NOT NULL,
  type           ENUM('bet','win','purchase','sale') NOT NULL,
  amount         INT NOT NULL,
  balance_before INT NOT NULL,
  balance_after  INT NOT NULL,
  ref_id         INT UNSIGNED,
  description    VARCHAR(255),
  created_at     DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_type (user_id, type),
  INDEX idx_created   (created_at DESC)
) ENGINE=InnoDB;

-- ── Skins ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS skins (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  wear         VARCHAR(40),
  rarity       ENUM('Consumer','Industrial','Mil-Spec','Restricted','Classified','Covert','Special') NOT NULL,
  points_value INT UNSIGNED NOT NULL DEFAULT 0,
  emoji        VARCHAR(10)  DEFAULT '🔫',
  color        VARCHAR(20)  DEFAULT '#9ca3af',
  active       TINYINT(1)   NOT NULL DEFAULT 1,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_rarity (rarity),
  INDEX idx_points (points_value DESC)
) ENGINE=InnoDB;

-- ── Caixas ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cases (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  description VARCHAR(255),
  price       INT UNSIGNED NOT NULL DEFAULT 250,
  emoji       VARCHAR(10)  DEFAULT '📦',
  theme_color VARCHAR(20)  DEFAULT '#F59E0B',
  active      TINYINT(1)   NOT NULL DEFAULT 1,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ── Itens de cada caixa (probabilidades) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS case_items (
  id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  case_id  INT UNSIGNED NOT NULL,
  skin_id  INT UNSIGNED NOT NULL,
  chance   DECIMAL(10,6) NOT NULL, -- percentagem (ex: 79.92)
  FOREIGN KEY (case_id) REFERENCES cases(id)  ON DELETE CASCADE,
  FOREIGN KEY (skin_id) REFERENCES skins(id)  ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── Inventário dos utilizadores ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  skin_id     INT UNSIGNED NOT NULL,
  acquired_at DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (skin_id) REFERENCES skins(id),
  INDEX idx_user (user_id)
) ENGINE=InnoDB;

-- ── Giveaways ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS giveaways (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title             VARCHAR(150) NOT NULL,
  description       TEXT,
  emoji             VARCHAR(10) DEFAULT '🎁',
  category          VARCHAR(50),
  value             DECIMAL(10,2) DEFAULT 0,
  prize_skin_id     INT UNSIGNED,
  prize_points      INT UNSIGNED DEFAULT 0,
  participant_count INT UNSIGNED NOT NULL DEFAULT 0,
  ends_at           DATETIME NOT NULL,
  active            TINYINT(1) NOT NULL DEFAULT 1,
  winner_id         INT UNSIGNED,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (prize_skin_id) REFERENCES skins(id),
  FOREIGN KEY (winner_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- ── Participações em giveaways ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS giveaway_entries (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  giveaway_id INT UNSIGNED NOT NULL,
  user_id     INT UNSIGNED NOT NULL,
  entered_at  DATETIME NOT NULL,
  FOREIGN KEY (giveaway_id) REFERENCES giveaways(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)     REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_entry (giveaway_id, user_id)
) ENGINE=InnoDB;

-- ── Boletins de aposta (suporta aposta simples e múltipla) ───────────────────
-- Um "bet_slip" é o boletim completo. Se tiver 1 seleção é "simples",
-- se tiver 2+ é "múltipla" (odds multiplicadas entre si).
CREATE TABLE IF NOT EXISTS bet_slips (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       INT UNSIGNED NOT NULL,
  stake         INT UNSIGNED NOT NULL,           -- aposta em pontos
  combined_odds DECIMAL(10,3) NOT NULL,          -- produto das odds de todas as seleções
  potential_win INT UNSIGNED NOT NULL,           -- stake * combined_odds (na altura da aposta)
  status        ENUM('pending','won','lost','cashed_out','void') NOT NULL DEFAULT 'pending',
  cashout_value INT UNSIGNED,                    -- valor pago se o utilizador fez cashout
  placed_at     DATETIME NOT NULL,
  settled_at    DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_status (user_id, status)
) ENGINE=InnoDB;

-- ── Seleções dentro de um boletim (cada jogo escolhido) ──────────────────────
CREATE TABLE IF NOT EXISTS bet_selections (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  bet_slip_id     INT UNSIGNED NOT NULL,
  fixture_id      VARCHAR(40) NOT NULL,           -- ID do jogo em manual_fixtures (ou "demo-...")
  fixture_label   VARCHAR(200) NOT NULL,          -- ex: "Benfica vs Porto"
  market          VARCHAR(40) NOT NULL DEFAULT '1x2', -- tipo de mercado (1x2, over/under, etc.)
  selection       VARCHAR(60) NOT NULL,           -- ex: "home", "draw", "away"
  selection_label VARCHAR(100) NOT NULL,          -- ex: "Benfica" (nome legível)
  odds            DECIMAL(6,2) NOT NULL,          -- odd no momento da aposta
  status          ENUM('pending','won','lost','void') NOT NULL DEFAULT 'pending',
  FOREIGN KEY (bet_slip_id) REFERENCES bet_slips(id) ON DELETE CASCADE,
  INDEX idx_slip (bet_slip_id)
) ENGINE=InnoDB;

-- ── Cache persistente de jogos/odds da API-Football ──────────────────────────
-- Guarda o resultado normalizado de cada fixture na base de dados, para que
-- o cache sobreviva a reinícios do servidor e poupe pedidos à API externa.
-- Um job/poll separado atualiza apenas os jogos "live" com mais frequência;
-- os restantes só são re-pedidos quando expiram (campo expires_at).
-- ── Jogos criados manualmente pelo admin ──────────────────────────────────────
-- Substitui a dependência da API externa. O admin cria o jogo com nomes,
-- logos (URL de imagem) e odds; mais tarde define o resultado final, o que
-- resolve automaticamente todas as apostas pendentes sobre esse jogo.
CREATE TABLE IF NOT EXISTS manual_fixtures (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  competition  VARCHAR(150) NOT NULL,           -- ex: "FIFA World Cup 2026"
  round_label  VARCHAR(150),                    -- ex: "Grupo H, 2.ª jornada"
  home_team    VARCHAR(100) NOT NULL,
  away_team    VARCHAR(100) NOT NULL,
  home_logo    VARCHAR(500) NOT NULL,           -- URL da bandeira/badge
  away_logo    VARCHAR(500) NOT NULL,
  kickoff_at   DATETIME NOT NULL,               -- data/hora do jogo
  odds_home    DECIMAL(6,2) NOT NULL,
  odds_draw    DECIMAL(6,2) NOT NULL,
  odds_away    DECIMAL(6,2) NOT NULL,
  status       ENUM('scheduled','live','finished','cancelled') NOT NULL DEFAULT 'scheduled',
  goals_home   SMALLINT UNSIGNED,
  goals_away   SMALLINT UNSIGNED,
  result       ENUM('home','draw','away'),      -- preenchido quando o admin define o resultado
  settled_at   DATETIME,
  created_at   DATETIME NOT NULL,
  updated_at   DATETIME,
  INDEX idx_status   (status),
  INDEX idx_kickoff  (kickoff_at)
) ENGINE=InnoDB;

-- ── Notificações ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  title      VARCHAR(150) NOT NULL,
  body       TEXT,
  type       ENUM('info','success','warning','error') NOT NULL DEFAULT 'info',
  read_at    DATETIME,
  created_at DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_unread (user_id, read_at)
) ENGINE=InnoDB;

-- ── Conquistas ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS achievements (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  key_name    VARCHAR(60) NOT NULL UNIQUE,
  title       VARCHAR(100) NOT NULL,
  description TEXT,
  emoji       VARCHAR(10),
  xp_reward   INT UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_achievements (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id        INT UNSIGNED NOT NULL,
  achievement_id INT UNSIGNED NOT NULL,
  unlocked_at    DATETIME NOT NULL,
  FOREIGN KEY (user_id)        REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (achievement_id) REFERENCES achievements(id),
  UNIQUE KEY uq_achievement (user_id, achievement_id)
) ENGINE=InnoDB;
