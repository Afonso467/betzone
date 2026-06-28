const express = require('express');
const r = express.Router();
const { getSkins, getSkin, buySkin, sellSkin } = require('../controllers/marketController');
const { authenticate } = require('../middleware/auth');

// Listar skins é público; comprar/vender exige sessão
r.get('/',         getSkins);
r.get('/:id',      getSkin);
r.post('/:id/buy', authenticate, buySkin);
r.post('/sell',    authenticate, sellSkin);
module.exports = r;
