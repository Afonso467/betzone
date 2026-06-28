const express = require('express');
const r = express.Router();
const { getLeaderboard } = require('../controllers/marketController');
const { optionalAuth } = require('../middleware/auth');

r.get('/', optionalAuth, getLeaderboard);
module.exports = r;
