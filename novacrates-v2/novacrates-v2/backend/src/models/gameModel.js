const { pool } = require('../config/database');

const GameModel = {
  // Registar resultado de um jogo
  async createMatch({ userId, gameType, betAmount, winAmount, multiplier, result, meta = {} }) {
    const [res] = await pool.query(
      `INSERT INTO matches (user_id, game_type, bet_amount, win_amount, multiplier, result, meta, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [userId, gameType, betAmount, winAmount || 0, multiplier || 1, result, JSON.stringify(meta)]
    );
    return res.insertId;
  },

  // Histórico de jogos de um utilizador
  async getHistory(userId, limit = 20, offset = 0) {
    const [rows] = await pool.query(
      `SELECT id, game_type, bet_amount, win_amount, multiplier, result, meta, created_at
       FROM matches WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
    return rows;
  },

  // Estatísticas agregadas
  async getStats(userId) {
    const [rows] = await pool.query(
      `SELECT
         COUNT(*) AS total_games,
         SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) AS wins,
         SUM(CASE WHEN result = 'loss' THEN 1 ELSE 0 END) AS losses,
         SUM(bet_amount) AS total_wagered,
         SUM(win_amount) AS total_won,
         SUM(win_amount - bet_amount) AS net_profit,
         MAX(multiplier) AS best_multiplier
       FROM matches WHERE user_id = ?`,
      [userId]
    );
    return rows[0];
  },

  // Partida ativa de Mines (para permitir múltiplos cliques seguros)
  async createMinesSession({ userId, betAmount, minePositions, totalCells = 25 }) {
    const [res] = await pool.query(
      `INSERT INTO game_sessions (user_id, game_type, bet_amount, state, meta, created_at)
       VALUES (?, 'mines', ?, 'active', ?, NOW())`,
      [userId, betAmount, JSON.stringify({ minePositions, revealed: [], totalCells })]
    );
    return res.insertId;
  },

  async getMinesSession(sessionId, userId) {
    const [rows] = await pool.query(
      `SELECT * FROM game_sessions WHERE id = ? AND user_id = ? AND game_type = 'mines' AND state = 'active'`,
      [sessionId, userId]
    );
    if (!rows.length) return null;
    const s = rows[0];
    s.meta = JSON.parse(s.meta);
    return s;
  },

  async updateMinesSession(sessionId, revealed) {
    // Lemos o meta atual, atualizamos em JS e gravamos de volta.
    // Evita JSON_SET(...CAST(? AS JSON)) que falha em algumas versões do MariaDB.
    const [rows] = await pool.query('SELECT meta FROM game_sessions WHERE id = ?', [sessionId]);
    if (!rows.length) return;
    const meta = typeof rows[0].meta === 'string' ? JSON.parse(rows[0].meta) : rows[0].meta;
    meta.revealed = revealed;
    await pool.query(
      'UPDATE game_sessions SET meta = ?, updated_at = NOW() WHERE id = ?',
      [JSON.stringify(meta), sessionId]
    );
  },

  async closeMinesSession(sessionId, state = 'finished') {
    await pool.query(
      'UPDATE game_sessions SET state = ?, updated_at = NOW() WHERE id = ?',
      [state, sessionId]
    );
  },

  // Transação financeira (auditoria completa)
  async createTransaction({ userId, type, amount, balanceBefore, balanceAfter, refId = null, description = '' }) {
    await pool.query(
      `INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, ref_id, description, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [userId, type, amount, balanceBefore, balanceAfter, refId, description]
    );
  },
};

module.exports = GameModel;
