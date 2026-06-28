const express = require('express');
const r = express.Router();
const { getStoreItems, getInventory } = require('../controllers/marketController');
const { authenticate } = require('../middleware/auth');

r.get('/',          getStoreItems);
r.get('/inventory', authenticate, getInventory);
module.exports = r;
