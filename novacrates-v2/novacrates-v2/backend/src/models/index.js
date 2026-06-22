const { pool } = require('../config/database');

// ── Inventário ───────────────────────────────────────────────────────────────
const InventoryModel = {
  async add(userId, skinId, conn = pool) {
    await conn.query(
      'INSERT INTO inventory (user_id, skin_id, acquired_at) VALUES (?, ?, NOW())',
      [userId, skinId]
    );
  },

  async remove(inventoryId, userId, conn = pool) {
    const [res] = await conn.query(
      'DELETE FROM inventory WHERE id = ? AND user_id = ?',
      [inventoryId, userId]
    );
    return res.affectedRows > 0;
  },

  async getByUser(userId) {
    const [rows] = await pool.query(
      `SELECT i.id AS inventory_id, s.id AS skin_id, s.name, s.rarity, s.wear, s.points_value, s.emoji, s.color, i.acquired_at
       FROM inventory i JOIN skins s ON i.skin_id = s.id
       WHERE i.user_id = ? ORDER BY i.acquired_at DESC`,
      [userId]
    );
    return rows;
  },
};

// ── Skins ────────────────────────────────────────────────────────────────────
const SkinModel = {
  async getAll({ search = '', rarity = '', limit = 50, offset = 0 } = {}) {
    let q = 'SELECT * FROM skins WHERE active = 1';
    const params = [];
    if (rarity) { q += ' AND rarity = ?'; params.push(rarity); }
    if (search) { q += ' AND name LIKE ?'; params.push(`%${search}%`); }
    q += ' ORDER BY points_value DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    const [rows] = await pool.query(q, params);
    return rows;
  },

  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM skins WHERE id = ? AND active = 1', [id]);
    return rows[0] || null;
  },
};

// ── Cases ────────────────────────────────────────────────────────────────────
const CaseModel = {
  async getAll() {
    const [rows] = await pool.query('SELECT * FROM cases WHERE active = 1 ORDER BY price');
    return rows;
  },

  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM cases WHERE id = ? AND active = 1', [id]);
    return rows[0] || null;
  },

  async getItems(caseId) {
    const [rows] = await pool.query(
      `SELECT ci.chance, s.* FROM case_items ci JOIN skins s ON ci.skin_id = s.id
       WHERE ci.case_id = ? ORDER BY ci.chance DESC`,
      [caseId]
    );
    return rows;
  },
};

// ── Giveaways ────────────────────────────────────────────────────────────────
const GiveawayModel = {
  async getActive() {
    const [rows] = await pool.query(
      'SELECT * FROM giveaways WHERE active = 1 AND ends_at > NOW() ORDER BY ends_at'
    );
    return rows;
  },

  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM giveaways WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async hasEntered(giveawayId, userId) {
    const [rows] = await pool.query(
      'SELECT id FROM giveaway_entries WHERE giveaway_id = ? AND user_id = ?',
      [giveawayId, userId]
    );
    return rows.length > 0;
  },

  async enter(giveawayId, userId) {
    await pool.query(
      'INSERT INTO giveaway_entries (giveaway_id, user_id, entered_at) VALUES (?, ?, NOW())',
      [giveawayId, userId]
    );
    await pool.query(
      'UPDATE giveaways SET participant_count = participant_count + 1 WHERE id = ?',
      [giveawayId]
    );
  },

  async getEntryCount(giveawayId) {
    const [rows] = await pool.query(
      'SELECT participant_count FROM giveaways WHERE id = ?',
      [giveawayId]
    );
    return rows[0]?.participant_count || 0;
  },
};

// ── Notificações ─────────────────────────────────────────────────────────────
const NotificationModel = {
  async create(userId, { title, body, type = 'info' }) {
    await pool.query(
      'INSERT INTO notifications (user_id, title, body, type, read_at, created_at) VALUES (?, ?, ?, ?, NULL, NOW())',
      [userId, title, body, type]
    );
  },

  async getByUser(userId, limit = 20) {
    const [rows] = await pool.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
      [userId, limit]
    );
    return rows;
  },

  async markAllRead(userId) {
    await pool.query(
      'UPDATE notifications SET read_at = NOW() WHERE user_id = ? AND read_at IS NULL',
      [userId]
    );
  },

  async countUnread(userId) {
    const [rows] = await pool.query(
      'SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND read_at IS NULL',
      [userId]
    );
    return rows[0].count;
  },
};

// ── Leaderboard ──────────────────────────────────────────────────────────────
const LeaderboardModel = {
  async getTop(limit = 50) {
    const [rows] = await pool.query(
      `SELECT u.id, u.username, u.avatar, u.level, u.xp, u.points, u.wins,
              RANK() OVER (ORDER BY u.xp DESC) AS rank
       FROM users u WHERE u.active = 1
       ORDER BY u.xp DESC LIMIT ?`,
      [limit]
    );
    return rows;
  },

  async getUserRank(userId) {
    const [rows] = await pool.query(
      `SELECT rank FROM (
         SELECT id, RANK() OVER (ORDER BY xp DESC) AS rank FROM users WHERE active = 1
       ) r WHERE id = ?`,
      [userId]
    );
    return rows[0]?.rank || null;
  },
};

module.exports = { InventoryModel, SkinModel, CaseModel, GiveawayModel, NotificationModel, LeaderboardModel };
