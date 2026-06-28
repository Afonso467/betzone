const express = require('express');
const r = express.Router();
const { minesStart, minesReveal, minesCashout, coinflip, crashJoin, crashCashout, blackjackDeal, blackjackAction, caseOpen, getCasesWithItems, getUserState } = require('../controllers/gameController');
const { gameLimiter } = require('../middleware/rateLimiter');
const { authenticate } = require('../middleware/auth');

r.use(authenticate, gameLimiter);
r.get('/state',               getUserState);
r.post('/mines/start',        minesStart);
r.post('/mines/reveal',       minesReveal);
r.post('/mines/cashout',      minesCashout);
r.post('/coinflip',           coinflip);
r.post('/crash/join',         crashJoin);
r.post('/crash/cashout',      crashCashout);
r.post('/blackjack/deal',     blackjackDeal);
r.post('/blackjack/action',   blackjackAction);
r.get('/cases',                getCasesWithItems);
r.post('/cases/open',         caseOpen);
module.exports = r;
