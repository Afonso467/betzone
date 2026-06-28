const express = require('express');
const r = express.Router();
const { placeBet, getMyBets } = require('../controllers/betController');
const { gameLimiter } = require('../middleware/rateLimiter');
const { authenticate } = require('../middleware/auth');

r.use(authenticate, gameLimiter);
r.post('/place', placeBet);
r.get('/mine',   getMyBets);

module.exports = r;
