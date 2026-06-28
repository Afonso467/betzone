const { verify } = require('../config/jwt');
const UserModel = require('../models/userModel');

// Valida o token JWT e carrega o utilizador (req.user) em todas as rotas protegidas.
async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token em falta ou formato inválido' });
  }

  const token = header.split(' ')[1];
  try {
    const payload = verify(token);

    // Confirmar que o utilizador ainda existe e está ativo
    const user = await UserModel.findById(payload.userId);
    if (!user || !user.active) {
      return res.status(401).json({ error: 'Utilizador não encontrado ou desativado' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Sessão expirada, faz login novamente' });
    }
    return res.status(401).json({ error: 'Token inválido' });
  }
}

// Middleware opcional — carrega req.user se houver token válido, mas não
// bloqueia o pedido se não houver (usado em rotas públicas que ficam
// "melhoradas" quando o utilizador está autenticado, ex: leaderboard).
async function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return next();
  const token = header.split(' ')[1];
  try {
    const payload = verify(token);
    const user = await UserModel.findById(payload.userId);
    if (user && user.active) req.user = user;
  } catch (_) {
    // token inválido/expirado — segue sem autenticação, não bloqueia
  }
  next();
}

module.exports = { authenticate, optionalAuth };
