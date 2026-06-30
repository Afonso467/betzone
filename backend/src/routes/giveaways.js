const express = require('express');
const r = express.Router();
const { getGiveaways, enterGiveaway, claimFreePoints, getClaimStatus } = require('../controllers/marketController');
const { authenticate, optionalAuth } = require('../middleware/auth');

// Rotas fixas primeiro, para nunca serem capturadas pelo padrão dinâmico /:id/enter
r.get('/claim-status',  authenticate, getClaimStatus);
r.post('/claim',        authenticate, claimFreePoints);
r.get('/',               optionalAuth, getGiveaways);
r.post('/:id/enter',     authenticate, enterGiveaway);
module.exports = r;
