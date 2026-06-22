const { pool } = require('../config/database');

const ManualFixtureModel = {
  async create(data) {
    const [res] = await pool.query(
      `INSERT INTO manual_fixtures
         (competition, round_label, home_team, away_team, home_logo, away_logo,
          kickoff_at, odds_home, odds_draw, odds_away, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', NOW())`,
      [
        data.competition, data.roundLabel || null, data.homeTeam, data.awayTeam,
        data.homeLogo, data.awayLogo, data.kickoffAt,
        data.oddsHome, data.oddsDraw, data.oddsAway,
      ]
    );
    return res.insertId;
  },

  async getAll() {
    const [rows] = await pool.query(
      `SELECT * FROM manual_fixtures WHERE status != 'cancelled' ORDER BY kickoff_at ASC`
    );
    return rows;
  },

  async getById(id) {
    const [rows] = await pool.query('SELECT * FROM manual_fixtures WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async update(id, data) {
    const fields = [];
    const values = [];
    const allowed = ['competition', 'roundLabel', 'homeTeam', 'awayTeam', 'homeLogo', 'awayLogo', 'kickoffAt', 'oddsHome', 'oddsDraw', 'oddsAway', 'status'];
    const colMap = {
      competition: 'competition', roundLabel: 'round_label', homeTeam: 'home_team', awayTeam: 'away_team',
      homeLogo: 'home_logo', awayLogo: 'away_logo', kickoffAt: 'kickoff_at',
      oddsHome: 'odds_home', oddsDraw: 'odds_draw', oddsAway: 'odds_away', status: 'status',
    };
    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`${colMap[key]} = ?`);
        values.push(data[key]);
      }
    }
    if (!fields.length) return;
    await pool.query(
      `UPDATE manual_fixtures SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`,
      [...values, id]
    );
  },

  // Define o resultado final do jogo (1, X ou 2) e o marca como terminado
  async setResult(id, { goalsHome, goalsAway, result }) {
    await pool.query(
      `UPDATE manual_fixtures
       SET goals_home = ?, goals_away = ?, result = ?, status = 'finished', settled_at = NOW(), updated_at = NOW()
       WHERE id = ?`,
      [goalsHome, goalsAway, result, id]
    );
  },

  async setStatus(id, status) {
    await pool.query('UPDATE manual_fixtures SET status = ?, updated_at = NOW() WHERE id = ?', [status, id]);
  },

  async remove(id) {
    await pool.query('DELETE FROM manual_fixtures WHERE id = ?', [id]);
  },
};

module.exports = ManualFixtureModel;
