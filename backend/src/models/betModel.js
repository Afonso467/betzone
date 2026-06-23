const { pool } = require('../config/database');

const BetModel = {
  // Criar um boletim de aposta (simples = 1 seleção, múltipla = 2+ seleções)
  async createSlip({ userId, stake, combinedOdds, potentialWin, selections }) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [slipRes] = await conn.query(
        `INSERT INTO bet_slips (user_id, stake, combined_odds, potential_win, status, placed_at)
         VALUES (?, ?, ?, ?, 'pending', NOW())`,
        [userId, stake, combinedOdds, potentialWin]
      );
      const slipId = slipRes.insertId;
      for (const sel of selections) {
        await conn.query(
          `INSERT INTO bet_selections (bet_slip_id, fixture_id, fixture_label, market, selection, selection_label, odds, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
          [slipId, sel.fixtureId, sel.fixtureLabel, sel.market || '1x2', sel.selection, sel.selectionLabel, sel.odds]
        );
      }
      await conn.commit();
      return slipId;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  async getSlipById(slipId, userId) {
    const [slips] = await pool.query(
      'SELECT * FROM bet_slips WHERE id = ? AND user_id = ?',
      [slipId, userId]
    );
    if (!slips.length) return null;
    const [selections] = await pool.query(
      'SELECT * FROM bet_selections WHERE bet_slip_id = ?',
      [slipId]
    );
    return { ...slips[0], selections };
  },

  async getUserSlips(userId, status = null) {
    let q = `SELECT * FROM bet_slips WHERE user_id = ?`;
    const params = [userId];
    if (status) { q += ' AND status = ?'; params.push(status); }
    q += ' ORDER BY placed_at DESC LIMIT 50';
    const [slips] = await pool.query(q, params);
    for (const slip of slips) {
      const [selections] = await pool.query(
        'SELECT * FROM bet_selections WHERE bet_slip_id = ?',
        [slip.id]
      );
      slip.selections = selections;
    }
    return slips;
  },

  async settleSlip(slipId, status, cashoutValue = null) {
    await pool.query(
      `UPDATE bet_slips SET status = ?, cashout_value = ?, settled_at = NOW() WHERE id = ?`,
      [status, cashoutValue, slipId]
    );
  },

  async updateSelectionStatus(selectionId, status) {
    await pool.query('UPDATE bet_selections SET status = ? WHERE id = ?', [status, selectionId]);
  },

  // Todas as seleções PENDENTES que apontam para um jogo específico —
  // usado quando o admin define o resultado final, para resolver as apostas.
  async getPendingSelectionsByFixture(fixtureId) {
    const [rows] = await pool.query(
      `SELECT bs.*, slip.user_id, slip.status AS slip_status, slip.id AS slip_id
       FROM bet_selections bs
       JOIN bet_slips slip ON bs.bet_slip_id = slip.id
       WHERE bs.fixture_id = ? AND bs.status = 'pending' AND slip.status = 'pending'`,
      [String(fixtureId)]
    );
    return rows;
  },

  // Todas as seleções (de qualquer estado) de um boletim — para verificar
  // se TODAS já foram decididas antes de fechar o boletim como ganho/perdido
  async getSelectionsBySlip(slipId) {
    const [rows] = await pool.query('SELECT * FROM bet_selections WHERE bet_slip_id = ?', [slipId]);
    return rows;
  },
};

module.exports = BetModel;
