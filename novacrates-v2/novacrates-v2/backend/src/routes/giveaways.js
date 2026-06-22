const express = require('express');
const r = express.Router();
const { getGiveaways, enterGiveaway } = require('../controllers/marketController');
r.get('/',           getGiveaways);
r.post('/:id/enter', enterGiveaway);
module.exports = r;
