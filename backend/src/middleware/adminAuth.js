// Middleware simples de proteção para rotas de admin.
// Sem sistema de login completo — usa uma password fixa guardada no .env,
// enviada pelo cliente no header "x-admin-password".
function requireAdmin(req, res, next) {
  const provided = req.headers['x-admin-password'];
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected) {
    return res.status(500).json({ error: 'ADMIN_PASSWORD não configurada no servidor' });
  }
  if (!provided || provided !== expected) {
    return res.status(401).json({ error: 'Password de administrador incorreta' });
  }
  next();
}

module.exports = { requireAdmin };
