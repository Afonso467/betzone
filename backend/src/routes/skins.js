const express = require('express');
const r = express.Router();
const { getSkins, getSkin, buySkin, sellSkin } = require('../controllers/marketController');
r.get('/',         getSkins);
r.get('/:id',      getSkin);
r.post('/:id/buy', buySkin);
r.post('/sell',    sellSkin);
module.exports = r;
