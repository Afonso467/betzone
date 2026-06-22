const rateLimit = require('express-rate-limit');

const gameLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Demasiados pedidos de jogo. Abranda um pouco!' },
});

module.exports = { gameLimiter };
