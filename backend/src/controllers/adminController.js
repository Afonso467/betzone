const UserModel = require('../models/userModel');
const GameModel = require('../models/gameModel');
const BetModel  = require('../models/betModel');
const ManualFixtureModel = require('../models/manualFixtureModel');
const { pool } = require('../config/database');
const { asyncHandler, createError } = require('../middleware/errorHandler');
const { toFixtureDTO } = require('./betController');

// ── POST /api/admin/fixtures ──────────────────────────────────────────────────
const createFixture = asyncHandler(async (req, res) => {
  const { competition, roundLabel, homeTeam, awayTeam, homeLogo, awayLogo, kickoffAt, oddsHome, oddsDraw, oddsAway } = req.body;

  const required = { competition, homeTeam, awayTeam, homeLogo, awayLogo, kickoffAt, oddsHome, oddsDraw, oddsAway };
  for (const [key, val] of Object.entries(required)) {
    if (val === undefined || val === null || val === '') {
      throw createError(`Campo "${key}" é obrigatório`, 400);
    }
  }
  if (oddsHome < 1 || oddsDraw < 1 || oddsAway < 1) {
    throw createError('As odds têm de ser pelo menos 1.00', 400);
  }

  const id = await ManualFixtureModel.create({
    competition, roundLabel, homeTeam, awayTeam, homeLogo, awayLogo,
    kickoffAt, oddsHome, oddsDraw, oddsAway,
  });
  const fixture = await ManualFixtureModel.getById(id);
  res.status(201).json({ message: 'Jogo criado com sucesso', fixture: toFixtureDTO(fixture) });
});

// ── GET /api/admin/fixtures ───────────────────────────────────────────────────
const listFixtures = asyncHandler(async (req, res) => {
  const fixtures = await ManualFixtureModel.getAll();
  res.json({ fixtures: fixtures.map(toFixtureDTO) });
});

// ── PUT /api/admin/fixtures/:id ───────────────────────────────────────────────
const updateFixture = asyncHandler(async (req, res) => {
  const fixture = await ManualFixtureModel.getById(req.params.id);
  if (!fixture) throw createError('Jogo não encontrado', 404);
  if (fixture.status === 'finished') throw createError('Não é possível editar um jogo já terminado', 400);

  await ManualFixtureModel.update(req.params.id, req.body);
  const updated = await ManualFixtureModel.getById(req.params.id);
  res.json({ message: 'Jogo atualizado', fixture: toFixtureDTO(updated) });
});

// ── DELETE /api/admin/fixtures/:id ────────────────────────────────────────────
const deleteFixture = asyncHandler(async (req, res) => {
  const fixture = await ManualFixtureModel.getById(req.params.id);
  if (!fixture) throw createError('Jogo não encontrado', 404);
  await ManualFixtureModel.remove(req.params.id);
  res.json({ message: 'Jogo removido' });
});

// ── POST /api/admin/fixtures/:id/status ───────────────────────────────────────
// Permite ao admin marcar manualmente o jogo como "live" antes da hora,
// ou "cancelled" (cancela e devolve os pontos apostados).
const setFixtureStatus = asyncHandler(async (req, res) => {
  const { status } = req.body; // 'scheduled' | 'live' | 'cancelled'
  const fixture = await ManualFixtureModel.getById(req.params.id);
  if (!fixture) throw createError('Jogo não encontrado', 404);

  if (status === 'cancelled') {
    await refundPendingBets(fixture.id);
  }
  await ManualFixtureModel.setStatus(req.params.id, status);
  const updated = await ManualFixtureModel.getById(req.params.id);
  res.json({ message: 'Estado do jogo atualizado', fixture: toFixtureDTO(updated) });
});

// ── POST /api/admin/fixtures/:id/result ───────────────────────────────────────
// Define o resultado final (golos + 1/X/2) e resolve automaticamente todas
// as apostas pendentes que envolvem este jogo.
const setFixtureResult = asyncHandler(async (req, res) => {
  const { goalsHome, goalsAway } = req.body;
  const fixture = await ManualFixtureModel.getById(req.params.id);
  if (!fixture) throw createError('Jogo não encontrado', 404);
  if (fixture.status === 'finished') throw createError('Este jogo já tem resultado definido', 400);
  if (goalsHome === undefined || goalsAway === undefined || goalsHome < 0 || goalsAway < 0) {
    throw createError('Indica o número de golos de cada equipa (>= 0)', 400);
  }

  const result = goalsHome > goalsAway ? 'home' : (goalsHome < goalsAway ? 'away' : 'draw');
  await ManualFixtureModel.setResult(fixture.id, { goalsHome, goalsAway, result });

  const summary = await resolveBetsForFixture(fixture.id, result);

  const updated = await ManualFixtureModel.getById(fixture.id);
  res.json({
    message: `Resultado definido: ${goalsHome}-${goalsAway} (${result}). ${summary.resolved} seleções resolvidas.`,
    fixture: toFixtureDTO(updated),
    summary,
  });
});

// ── Lógica de resolução automática de apostas ────────────────────────────────

// Marca como 'won'/'lost' todas as seleções pendentes deste jogo, e depois
// verifica cada boletim afetado: se TODAS as seleções desse boletim já têm
// resultado, fecha o boletim (paga se todas ganharam, fecha como perdido
// se pelo menos uma perdeu).
async function resolveBetsForFixture(fixtureId, result) {
  const pendingSelections = await BetModel.getPendingSelectionsByFixture(fixtureId);
  const affectedSlipIds = new Set();

  for (const sel of pendingSelections) {
    const won = sel.selection === result;
    await BetModel.updateSelectionStatus(sel.id, won ? 'won' : 'lost');
    affectedSlipIds.add(sel.slip_id);
  }

  for (const slipId of affectedSlipIds) {
    await trySettleSlip(slipId);
  }

  let wonSlips = 0, lostSlips = 0;
  for (const slipId of affectedSlipIds) {
    const selections = await BetModel.getSelectionsBySlip(slipId);
    const allDecided = selections.every(s => s.status !== 'pending');
    if (allDecided) {
      const allWon = selections.every(s => s.status === 'won');
      if (allWon) wonSlips++; else lostSlips++;
    }
  }

  return { resolved: pendingSelections.length, slipsAffected: affectedSlipIds.size, wonSlips, lostSlips };
}

// Verifica se todas as seleções de um boletim já foram decididas; se sim,
// fecha o boletim como 'won' (paga o potencial) ou 'lost'.
async function trySettleSlip(slipId) {
  const selections = await BetModel.getSelectionsBySlip(slipId);
  const allDecided = selections.every(s => s.status !== 'pending');
  if (!allDecided) return; // ainda há jogos desta múltipla por resolver

  const [rows] = await pool.query('SELECT * FROM bet_slips WHERE id = ?', [slipId]);
  const slip = rows[0];
  if (!slip || slip.status !== 'pending') return;

  const allWon = selections.every(s => s.status === 'won');

  if (allWon) {
    await BetModel.settleSlip(slipId, 'won', null);
    await UserModel.adjustPoints(slip.user_id, slip.potential_win);
    await GameModel.createTransaction({
      userId: slip.user_id, type: 'win', amount: slip.potential_win,
      balanceBefore: 0, balanceAfter: 0,
      description: `Aposta ganha — boletim #${slipId}`,
    });
  } else {
    await BetModel.settleSlip(slipId, 'lost', null);
  }
}

// Cancela um jogo: devolve os pontos apostados a todos com seleções pendentes nele
async function refundPendingBets(fixtureId) {
  const pendingSelections = await BetModel.getPendingSelectionsByFixture(fixtureId);
  const affectedSlipIds = new Set(pendingSelections.map(s => s.slip_id));

  for (const sel of pendingSelections) {
    await BetModel.updateSelectionStatus(sel.id, 'void');
  }
  for (const slipId of affectedSlipIds) {
    const [rows] = await pool.query('SELECT * FROM bet_slips WHERE id = ?', [slipId]);
    const slip = rows[0];
    if (!slip || slip.status !== 'pending') continue;
    await BetModel.settleSlip(slipId, 'void', null);
    await UserModel.adjustPoints(slip.user_id, slip.stake); // devolve a aposta original
  }
}

module.exports = {
  createFixture, listFixtures, updateFixture, deleteFixture,
  setFixtureStatus, setFixtureResult,
};
