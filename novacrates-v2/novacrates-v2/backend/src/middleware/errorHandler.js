// Tratador global de erros — captura qualquer erro passado via next(err)
function errorHandler(err, req, res, next) {
  const isDev = process.env.NODE_ENV === 'development';
  const status = err.status || err.statusCode || 500;

  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);
  if (isDev) console.error(err.stack);

  res.status(status).json({
    error: err.message || 'Erro interno do servidor',
    ...(isDev && { stack: err.stack }),
  });
}

// Wrapper assíncrono para evitar try/catch repetidos nos controllers
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// Criar erros com status HTTP
function createError(message, status = 500) {
  const err = new Error(message);
  err.status = status;
  return err;
}

module.exports = { errorHandler, asyncHandler, createError };
