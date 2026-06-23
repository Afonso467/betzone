const express = require('express');
const r = express.Router();
const {
  createFixture, listFixtures, updateFixture, deleteFixture,
  setFixtureStatus, setFixtureResult,
} = require('../controllers/adminController');
const { requireAdmin } = require('../middleware/adminAuth');

// Todas as rotas de admin exigem a password correta no header x-admin-password
r.use(requireAdmin);

r.get('/fixtures',                 listFixtures);
r.post('/fixtures',                createFixture);
r.put('/fixtures/:id',             updateFixture);
r.delete('/fixtures/:id',          deleteFixture);
r.post('/fixtures/:id/status',     setFixtureStatus);
r.post('/fixtures/:id/result',     setFixtureResult);

module.exports = r;
