const { pool } = require('../config/database');

const GameModel = {
  // Registar resultado de um jogo (Otimizado com conn)
  async createMatch({ userId, gameType, betAmount, winAmount, multiplier, result, meta = {} }, conn = pool) {
    const [res] = await conn.query(
      `INSERT INTO matches (user_id, game_type, bet_amount, win_amount, multiplier, result, meta, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [userId, gameType, betAmount, winAmount || 0, multiplier || 1, result, JSON.stringify(meta)]
    );
    return res.insertId;
  },

  // Histórico de jogos de um utilizador (Fora de transações)
  async getHistory(userId, limit = 20, offset = 0) {
    const [rows] = await pool.query(
      `SELECT id, game_type, bet_amount, win_amount, multiplier, result, meta, created_at
       FROM matches WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
    return rows;
  },

  // Estatísticas agregadas (Fora de transações)
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

  // Partida ativa de Mines (Otimizado com conn)
  async createMinesSession({ userId, betAmount, minePositions, totalCells = 25 }, conn = pool) {
    const [res] = await conn.query(
      `INSERT INTO game_sessions (user_id, game_type, bet_amount, state, meta, created_at)
       VALUES (?, 'mines', ?, 'active', ?, NOW())`,
      [userId, betAmount, JSON.stringify({ minePositions, revealed: [], totalCells })]
    );
    return res.insertId;
  },

  // Obter sessão de Mines (Otimizado com conn)
  async getMinesSession(sessionId, userId, conn = pool) {
    const [rows] = await conn.query(
      `SELECT * FROM game_sessions WHERE id = ? AND user_id = ? AND game_type = 'mines' AND state = 'active'`,
      [sessionId, userId]
    );
    if (!rows.length) return null;
    const s = rows[0];
    
    s.meta = typeof s.meta === 'string' ? JSON.parse(s.meta) : s.meta;
    return s;
  },

  // Atualizar jogada de Mines (Otimizado com conn)
  async updateMinesSession(sessionId, revealed, conn = pool) {
    const [rows] = await conn.query('SELECT meta FROM game_sessions WHERE id = ?', [sessionId]);
    if (!rows.length) return;
    const meta = typeof rows[0].meta === 'string' ? JSON.parse(rows[0].meta) : rows[0].meta;
    meta.revealed = revealed;
    
    await conn.query(
      'UPDATE game_sessions SET meta = ?, updated_at = NOW() WHERE id = ?',
      [JSON.stringify(meta), sessionId]
    );
  },

  // Fechar sessão de Mines (Otimizado com conn)
  async closeMinesSession(sessionId, state = 'finished', conn = pool) {
    await conn.query(
      'UPDATE game_sessions SET state = ?, updated_at = NOW() WHERE id = ?',
      [state, sessionId]
    );
  },

  // Transação financeira (Otimizado com conn)
  async createTransaction({ userId, type, amount, balanceBefore, balanceAfter, refId = null, description = '' }, conn = pool) {
    await conn.query(
      `INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, ref_id, description, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [userId, type, amount, balanceBefore, balanceAfter, refId, description]
    );
  },
};

module.exports = GameModel;