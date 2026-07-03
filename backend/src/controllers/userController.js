const UserModel = require('../models/userModel');
const { asyncHandler, createError } = require('../middleware/errorHandler');

// ── PUT /api/users/profile ────────────────────────────────────────────────────
const updateProfile = asyncHandler(async (req, res) => {
  const { username, avatar } = req.body;
  const updateData = {};

  // 1. Só valida e adiciona o username se ele tiver sido enviado no body
  if (username !== undefined && username !== null && username.trim() !== '') {
    const existing = await UserModel.findByUsername(username);
    if (existing && existing.id !== req.user.id) {
      throw createError('Username já está em uso', 400);
    }
    updateData.username = username;
  }

  // 2. Só adiciona o avatar se ele tiver sido enviado no body
  if (avatar !== undefined && avatar !== null) {
    updateData.avatar = avatar;
  }

  // 3. Se por acaso nenhum dado válido foi enviado, retorna o perfil atual sem erro
  if (Object.keys(updateData).length === 0) {
    const current = await UserModel.findById(req.user.id);
    return res.json({ message: 'Nenhuma alteração realizada', user: current });
  }

  // 4. Executa a atualização apenas com as propriedades que existem de facto
  await UserModel.update(req.user.id, updateData);
  
  const updated = await UserModel.findById(req.user.id);
  res.json({ message: 'Perfil updated', user: updated });
});

module.exports = { updateProfile };