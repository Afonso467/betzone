const express = require('express');
const r = express.Router();
const { placeBet, getMyBets } = require('../controllers/betController');
const { gameLimiter } = require('../middleware/rateLimiter');

r.use(gameLimiter);
r.post('/place', placeBet);
r.get('/mine',   getMyBets);

module.exports = r;
