const { pool } = require('../config/database');

const BetModel = {
  // Criar um boletim de aposta (Modificado para usar conn dinâmico opcional)
  async createSlip({ userId, stake, combinedOdds, potentialWin, selections }, conn = pool) {
    // Se passarmos "conn" do controller, usamos essa ligação. Caso contrário, tiramos uma nova do pool.
    const mustRelease = conn === pool;
    const finalConn = mustRelease ? await pool.getConnection() : conn;

    try {
      // Só iniciamos transação se formos nós a gerir esta conexão isolada
      if (mustRelease) await finalConn.beginTransaction();

      const [slipRes] = await finalConn.query(
        `INSERT INTO bet_slips (user_id, stake, combined_odds, potential_win, status, placed_at)
         VALUES (?, ?, ?, ?, 'pending', NOW())`,
        [userId, stake, combinedOdds, potentialWin]
      );
      
      const slipId = slipRes.insertId;
      for (const sel of selections) {
        await finalConn.query(
          `INSERT INTO bet_selections (bet_slip_id, fixture_id, fixture_label, market, selection, selection_label, odds, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
          [slipId, sel.fixtureId, sel.fixtureLabel, sel.market || '1x2', sel.selection, sel.selectionLabel, sel.odds]
        );
      }

      if (mustRelease) await finalConn.commit();
      return slipId;
    } catch (err) {
      if (mustRelease) await finalConn.rollback();
      throw err;
    } finally {
      if (mustRelease) finalConn.release();
    }
  },

  // Obter boletim (Otimizado com suporte a conn)
  async getSlipById(slipId, userId, conn = pool) {
    const [slips] = await conn.query(
      'SELECT * FROM bet_slips WHERE id = ? AND user_id = ?',
      [slipId, userId]
    );
    if (!slips.length) return null;
    const [selections] = await conn.query(
      'SELECT * FROM bet_selections WHERE bet_slip_id = ?',
      [slipId]
    );
    return { ...slips[0], selections };
  },

  // Histórico de boletins (Fora de transações complexas)
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

  // Resolver/Liquidar Boletim (Essencial para receber conn ao dar pontos no ganho)
  async settleSlip(slipId, status, cashoutValue = null, conn = pool) {
    await conn.query(
      `UPDATE bet_slips SET status = ?, cashout_value = ?, settled_at = NOW() WHERE id = ?`,
      [status, cashoutValue, slipId]
    );
  },

  // Atualizar seleção individual (Otimizado com conn)
  async updateSelectionStatus(selectionId, status, conn = pool) {
    await conn.query('UPDATE bet_selections SET status = ? WHERE id = ?', [status, selectionId]);
  },

  // Seleções pendentes por jogo para auditoria/resolução do admin (Otimizado com conn)
  async getPendingSelectionsByFixture(fixtureId, conn = pool) {
    const [rows] = await conn.query(
      `SELECT bs.*, slip.user_id, slip.status AS slip_status, slip.id AS slip_id
       FROM bet_selections bs
       JOIN bet_slips slip ON bs.bet_slip_id = slip.id
       WHERE bs.fixture_id = ? AND bs.status = 'pending' AND slip.status = 'pending'`,
      [String(fixtureId)]
    );
    return rows;
  },

  // Seleções de um boletim específico (Otimizado com conn)
  async getSelectionsBySlip(slipId, conn = pool) {
    const [rows] = await conn.query('SELECT * FROM bet_selections WHERE bet_slip_id = ?', [slipId]);
    return rows;
  },
};

module.exports = BetModel;