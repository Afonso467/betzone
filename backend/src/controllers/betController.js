const UserModel = require('../models/userModel');
const BetModel  = require('../models/betModel');
const ManualFixtureModel = require('../models/manualFixtureModel');
const { pool } = require('../config/database'); // 🛠️ IMPORTADO: Necessário para gerir a transação global
const { asyncHandler, createError } = require('../middleware/errorHandler');

// Converte uma linha de manual_fixtures para o formato usado no frontend
function toFixtureDTO(f) {
  const now = new Date();
  const kickoff = new Date(f.kickoff_at);
  let status = f.status;
  if (status === 'scheduled' && kickoff <= now) status = 'live';

  return {
    id: f.id,
    competition: f.competition,
    roundLabel: f.round_label,
    home: f.home_team, away: f.away_team,
    homeLogo: f.home_logo, awayLogo: f.away_logo,
    kickoffAt: f.kickoff_at,
    status, // scheduled | live | finished | cancelled
    goalsHome: f.goals_home, goalsAway: f.goals_away,
    result: f.result,
    odds: { home: parseFloat(f.odds_home), draw: parseFloat(f.odds_draw), away: parseFloat(f.odds_away) },
  };
}

// ── GET /api/sports/fixtures (pública) ────────────────────────────────────────
const getFixtures = asyncHandler(async (req, res) => {
  const fixtures = await ManualFixtureModel.getAll();
  res.json({ fixtures: fixtures.map(toFixtureDTO) });
});

// ── POST /api/bets/place ──────────────────────────────────────────────────────
const placeBet = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { stake, selections } = req.body;

  if (!Array.isArray(selections) || selections.length === 0) {
    throw createError('A aposta precisa de pelo menos uma seleção', 400);
  }
  if (!stake || stake < 1) throw createError('Aposta mínima de 1 ponto', 400);

  const fixtureIds = selections.map(s => s.fixtureId);
  if (new Set(fixtureIds).size !== fixtureIds.length) {
    throw createError('Não podes incluir o mesmo jogo duas vezes numa aposta múltipla', 400);
  }

  // 🛠️ 1. Iniciamos uma Conexão e Transação Única para todo o processo
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Validar que todos os jogos existem e ainda aceitam apostas (Lendo de dentro da transação)
    for (const sel of selections) {
      const fixture = await ManualFixtureModel.getById(sel.fixtureId, conn); // 🛠️ Injetado 'conn'
      if (!fixture) throw createError(`Jogo ${sel.fixtureId} não encontrado`, 404);
      if (fixture.status === 'finished' || fixture.status === 'cancelled') {
        throw createError(`O jogo ${fixture.home_team} vs ${fixture.away_team} já não aceita apostas`, 400);
      }
    }

    // Verificar saldo de forma segura dentro da transação
    const user = await UserModel.findById(userId, conn); // 🛠️ Injetado 'conn'
    if (user.points < stake) throw createError('Pontos insuficientes', 400);

    const combinedOdds = selections.reduce((acc, s) => acc * parseFloat(s.odds), 1);
    const potentialWin = Math.round(stake * combinedOdds);

    // Deduzir os pontos usando a transação ativa
    await UserModel.adjustPoints(userId, -stake, conn); // 🛠️ Injetado 'conn'

    // Criar o boletim e as seleções acopladas na mesma transação
    const slipId = await BetModel.createSlip({
      userId, stake, combinedOdds, potentialWin,
      selections: selections.map(s => ({ ...s, fixtureId: String(s.fixtureId) })),
    }, conn); // 🛠️ Injetado 'conn' (o BetModel modificado vai herdar e não duplicar o beginTransaction)

    // Buscar o utilizador atualizado com o saldo pós-aposta antes do commit
    const updated = await UserModel.findById(userId, conn); // 🛠️ Injetado 'conn'

    // Gravar tudo em simultâneo na Base de Dados
    await conn.commit();

    res.status(201).json({
      message: selections.length > 1 ? 'Aposta múltipla colocada!' : 'Aposta colocada!',
      slipId, combinedOdds, potentialWin, points: updated.points,
    });

  } catch (err) {
    // Se algo falhar em qualquer etapa, desfaz TUDO (incluindo o desconto dos pontos)
    await conn.rollback();
    throw err;
  } finally {
    // Libertar obrigatoriamente a conexão de volta para o pool
    conn.release();
  }
});

// ── GET /api/bets/mine ────────────────────────────────────────────────────────
const getMyBets = asyncHandler(async (req, res) => {
  const status = req.query.status || null;
  const slips = await BetModel.getUserSlips(req.user.id, status);
  res.json({ slips });
});

module.exports = { getFixtures, placeBet, getMyBets, toFixtureDTO };