const jwt = require('jsonwebtoken');

const SECRET  = process.env.JWT_SECRET     || 'dev_secret_change_in_prod';
const EXPIRES = process.env.JWT_EXPIRES_IN || '7d';

// Gera token JWT com payload do utilizador
function sign(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES });
}

// Verifica e decodifica token; lança erro se inválido/expirado
function verify(token) {
  return jwt.verify(token, SECRET);
}

module.exports = { sign, verify };
