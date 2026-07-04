const { pool } = require('../config/database');

const UserModel = {
  // Criar utilizador novo com password já encriptada (bcrypt feito no controller)
  async create({ username, email, passwordHash, avatar = '🎮' }) {
    const [result] = await pool.query(
      `INSERT INTO users (username, email, password_hash, avatar, points, xp, level, wins, losses, active, created_at)
       VALUES (?, ?, ?, ?, 500, 0, 1, 0, 0, 1, NOW())`,
      [username, email, passwordHash, avatar]
    );
    return result.insertId;
  },

  // 🛠️ CORRIGIDO: Agora aceita conn para ler o saldo atualizado de dentro da transação do jogo!
  async findById(id, conn = pool) {
    const [rows] = await conn.query(
      `SELECT id, username, email, avatar, points, xp, xp_next, level, wins, losses, active, last_claim_at, created_at
       FROM users WHERE id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  // Versão completa (com password_hash) — só usada internamente no login
  async findByEmailWithPassword(email) {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE email = ? AND active = 1',
      [email]
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

  async findByEmail(email) {
    const [rows] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
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
    
    // 🛠️ CORREÇÃO: Passar o array de valores linear combinando os campos com o ID no fim
    await pool.query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
      [...values, id] // Em vez de ...[values, id]
    );
  },

  async updatePassword(id, passwordHash) {
    await pool.query(
      'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
      [passwordHash, id]
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

  // Resgate de pontos grátis a cada X minutos. Tudo numa única query atómica
  async claimFreePoints(id, amount, cooldownMinutes) {
    const [result] = await pool.query(
      `UPDATE users
       SET points = points + ?, last_claim_at = NOW(), updated_at = NOW()
       WHERE id = ?
         AND (last_claim_at IS NULL OR last_claim_at <= NOW() - INTERVAL ? MINUTE)`,
      [amount, id, cooldownMinutes]
    );
    return result.affectedRows > 0; // false = ainda estava em cooldown
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