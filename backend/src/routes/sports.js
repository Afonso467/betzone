const express = require('express');
const r = express.Router();
const { getFixtures } = require('../controllers/betController');

r.get('/fixtures', getFixtures);

module.exports = r;
