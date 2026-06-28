const UserModel = require('../models/userModel');
const { asyncHandler, createError } = require('../middleware/errorHandler');

// ── PUT /api/users/profile ────────────────────────────────────────────────────
const updateProfile = asyncHandler(async (req, res) => {
  const { username, avatar } = req.body;

  if (username) {
    const existing = await UserModel.findByUsername(username);
    if (existing && existing.id !== req.user.id) {
      throw createError('Username já está em uso', 400);
    }
  }

  await UserModel.update(req.user.id, { username, avatar });
  const updated = await UserModel.findById(req.user.id);
  res.json({ message: 'Perfil atualizado', user: updated });
});

module.exports = { updateProfile };
