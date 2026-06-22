const express = require('express');
const r = express.Router();
const { getLeaderboard } = require('../controllers/marketController');
r.get('/', getLeaderboard);
module.exports = r;
