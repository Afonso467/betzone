const express = require('express');
const r = express.Router();
const { getStoreItems, getInventory } = require('../controllers/marketController');
r.get('/',          getStoreItems);
r.get('/inventory', getInventory);
module.exports = r;
