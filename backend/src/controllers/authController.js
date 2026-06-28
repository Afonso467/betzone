const bcrypt = require('bcrypt');
const { sign } = require('../config/jwt');
const UserModel = require('../models/userModel');
const { asyncHandler, createError } = require('../middleware/errorHandler');

const ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;

// Validações simples (sem depender de express-validator, que não está instalado)
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidUsername = (username) => /^[a-zA-Z0-9_]{3,20}$/.test(username);

// ── POST /api/auth/register ──────────────────────────────────────────────────
const register = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    throw createError('Username, email e password são obrigatórios', 400);
  }
  if (!isValidUsername(username)) {
    throw createError('Username deve ter 3-20 caracteres (letras, números, _)', 400);
  }
  if (!isValidEmail(email)) {
    throw createError('Email inválido', 400);
  }
  if (password.length < 6) {
    throw createError('Password deve ter no mínimo 6 caracteres', 400);
  }

  if (await UserModel.findByEmail(email)) {
    throw createError('Já existe uma conta com este email', 400);
  }
  if (await UserModel.findByUsername(username)) {
    throw createError('Username já está em uso', 400);
  }

  const passwordHash = await bcrypt.hash(password, ROUNDS);
  const id = await UserModel.create({ username, email, passwordHash });
  const user = await UserModel.findById(id);

  const token = sign({ userId: id });
  res.status(201).json({ message: 'Conta criada com sucesso!', token, user });
});

// ── POST /api/auth/login ─────────────────────────────────────────────────────
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw createError('Email e password são obrigatórios', 400);
  }

  const userWithPassword = await UserModel.findByEmailWithPassword(email);
  if (!userWithPassword) {
    throw createError('Credenciais inválidas', 401);
  }

  const valid = await bcrypt.compare(password, userWithPassword.password_hash);
  if (!valid) {
    throw createError('Credenciais inválidas', 401);
  }

  const token = sign({ userId: userWithPassword.id });
  const user = await UserModel.findById(userWithPassword.id);
  res.json({ message: 'Login efetuado com sucesso!', token, user });
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
const me = asyncHandler(async (req, res) => {
  // req.user já foi carregado pelo middleware authenticate
  res.json({ user: req.user });
});

// ── PUT /api/auth/password ───────────────────────────────────────────────────
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    throw createError('Password atual e nova password são obrigatórias', 400);
  }
  if (newPassword.length < 6) {
    throw createError('Nova password deve ter no mínimo 6 caracteres', 400);
  }

  const userWithPassword = await UserModel.findByEmailWithPassword(req.user.email);
  const valid = await bcrypt.compare(currentPassword, userWithPassword.password_hash);
  if (!valid) throw createError('Password atual incorreta', 400);

  const newHash = await bcrypt.hash(newPassword, ROUNDS);
  await UserModel.updatePassword(req.user.id, newHash);
  res.json({ message: 'Password alterada com sucesso' });
});

module.exports = { register, login, me, changePassword };
