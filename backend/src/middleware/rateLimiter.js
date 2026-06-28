const rateLimit = require('express-rate-limit');

const gameLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Demasiados pedidos de jogo. Abranda um pouco!' },
});

// Limitar tentativas de login/registo (protege contra brute-force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20,
  message: { error: 'Demasiadas tentativas. Aguarda 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { gameLimiter, authLimiter };
