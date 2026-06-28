const express = require('express');
const r = express.Router();
const { updateProfile } = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');

r.put('/profile', authenticate, updateProfile);

module.exports = r;
