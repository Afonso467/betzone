const express = require('express');
const r = express.Router();
const { getGiveaways, enterGiveaway } = require('../controllers/marketController');
const { authenticate, optionalAuth } = require('../middleware/auth');

r.get('/',           optionalAuth, getGiveaways);
r.post('/:id/enter', authenticate, enterGiveaway);
module.exports = r;
