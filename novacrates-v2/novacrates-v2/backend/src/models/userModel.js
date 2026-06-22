const { pool } = require('../config/database');

const UserModel = {
  // Criar utilizador novo (sem password — não há autenticação)
  async create({ username, avatar = '🎮' }) {
    const [result] = await pool.query(
      `INSERT INTO users (username, avatar, points, xp, level, wins, losses, active, created_at)
       VALUES (?, ?, 500, 0, 1, 0, 0, 1, NOW())`,
      [username, avatar]
    );
    return result.insertId;
  },

  async findById(id) {
    const [rows] = await pool.query(
      `SELECT id, username, avatar, points, xp, xp_next, level, wins, losses, active, created_at
       FROM users WHERE id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async findByUsername(username) {
    const [rows] = await pool.query(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );
    return rows[0] || null;
  },

  async update(id, fields) {
    const allowed = ['username', 'avatar'];
    const updates = Object.entries(fields)
      .filter(([k]) => allowed.includes(k))
      .map(([k]) => `${k} = ?`);
    const values = Object.entries(fields)
      .filter(([k]) => allowed.includes(k))
      .map(([, v]) => v);
    if (!updates.length) return;
    await pool.query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
      [...values, id]
    );
  },

  // Ajustar pontos — única moeda da plataforma.
  // Lança erro 400 "Pontos insuficientes" se o ajuste deixaria o saldo negativo.
  async adjustPoints(id, amount, conn = pool) {
    const [result] = await conn.query(
      'UPDATE users SET points = points + ?, updated_at = NOW() WHERE id = ? AND points + ? >= 0',
      [amount, id, amount]
    );
    if (result.affectedRows === 0) {
      const err = new Error('Pontos insuficientes');
      err.status = 400;
      throw err;
    }
  },

  // Adicionar XP e calcular nível automaticamente
  async addXP(id, amount, conn = pool) {
    await conn.query(
      `UPDATE users SET
         xp = xp + ?,
         level = FLOOR(1 + SQRT((xp + ?) / 100)),
         xp_next = POW(FLOOR(1 + SQRT((xp + ?) / 100)) + 1, 2) * 100,
         updated_at = NOW()
       WHERE id = ?`,
      [amount, amount, amount, id]
    );
  },

  async incrementWins(id, conn = pool) {
    await conn.query('UPDATE users SET wins = wins + 1, updated_at = NOW() WHERE id = ?', [id]);
  },

  async incrementLosses(id, conn = pool) {
    await conn.query('UPDATE users SET losses = losses + 1, updated_at = NOW() WHERE id = ?', [id]);
  },
};

module.exports = UserModel;
