const UserModel = require('../models/userModel');
const GameModel = require('../models/gameModel');
const { InventoryModel, SkinModel, CaseModel, GiveawayModel, LeaderboardModel } = require('../models/index');
const { asyncHandler, createError } = require('../middleware/errorHandler');
const { XP_REWARDS } = require('../utils/rng');

const getSkins = asyncHandler(async (req, res) => {
  const { search = '', rarity = '', limit = 50, offset = 0 } = req.query;
  const skins = await SkinModel.getAll({ search, rarity, limit: +limit, offset: +offset });
  res.json({ skins });
});

const getSkin = asyncHandler(async (req, res) => {
  const skin = await SkinModel.findById(req.params.id);
  if (!skin) throw createError('Skin não encontrada', 404);
  res.json({ skin });
});

// Comprar skin do Market — custo e tudo em pontos
const buySkin = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const skin = await SkinModel.findById(req.params.id);
  if (!skin) throw createError('Skin não encontrada', 404);
  const user = await UserModel.findById(userId);
  if (user.points < skin.points_value) throw createError('Pontos insuficientes', 400);
  await UserModel.adjustPoints(userId, -skin.points_value);
  await InventoryModel.add(userId, skin.id);
  const updated = await UserModel.findById(userId);
  res.json({ message: `Compraste: ${skin.name}`, skin, points: updated.points });
});

// Vender skin do inventário — devolve 85% do valor em pontos
const sellSkin = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { inventoryId } = req.body;
  const inventory = await InventoryModel.getByUser(userId);
  const item = inventory.find(i => i.inventory_id === parseInt(inventoryId));
  if (!item) throw createError('Item não encontrado no inventário', 404);
  const sellPoints = Math.round((item.points_value || 0) * 0.85);
  await InventoryModel.remove(inventoryId, userId);
  await UserModel.adjustPoints(userId, sellPoints);
  const updated = await UserModel.findById(userId);
  res.json({ message: `Vendeste: ${item.name}`, sellPoints, points: updated.points });
});

const getCases = asyncHandler(async (req, res) => {
  const cases = await CaseModel.getAll();
  res.json({ cases });
});

const getGiveaways = asyncHandler(async (req, res) => {
  const giveaways = await GiveawayModel.getActive();
  const userId = req.user?.id;
  if (userId) {
    for (const g of giveaways) {
      g.entered = await GiveawayModel.hasEntered(g.id, userId);
    }
  }
  res.json({ giveaways });
});

const enterGiveaway = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const giveaway = await GiveawayModel.findById(id);
  if (!giveaway) throw createError('Giveaway não encontrado', 404);
  if (new Date(giveaway.ends_at) < new Date()) throw createError('Giveaway expirado', 400);
  const already = await GiveawayModel.hasEntered(id, userId);
  if (already) throw createError('Já participas neste giveaway', 400);
  await GiveawayModel.enter(id, userId);
  await UserModel.addXP(userId, XP_REWARDS.giveaway_enter);
  const count = await GiveawayModel.getEntryCount(id);
  res.json({ message: 'Inscrito! Boa sorte! 🍀', participants: count });
});

const getLeaderboard = asyncHandler(async (req, res) => {
  const players = await LeaderboardModel.getTop(50);
  const userId = req.user?.id;
  const rank = userId ? await LeaderboardModel.getUserRank(userId) : null;
  res.json({ players, userRank: rank });
});

const getInventory = asyncHandler(async (req, res) => {
  const inventory = await InventoryModel.getByUser(req.user.id);
  res.json({ inventory });
});

// Loja — agora vende apenas caixas, tudo pago em pontos (sem pacotes de € → pontos)
const getStoreItems = asyncHandler(async (req, res) => {
  const cases = await CaseModel.getAll();
  res.json({ cases });
});

module.exports = { getSkins, getSkin, buySkin, sellSkin, getCases, getGiveaways, enterGiveaway, getLeaderboard, getInventory, getStoreItems };
