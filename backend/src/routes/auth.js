const express = require('express');
const r = express.Router();
const { register, login, me, changePassword } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

r.post('/register', authLimiter, register);
r.post('/login',    authLimiter, login);
r.get('/me',         authenticate, me);
r.put('/password',   authenticate, changePassword);

module.exports = r;
