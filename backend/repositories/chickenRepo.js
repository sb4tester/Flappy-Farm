const mongoose = require('mongoose');
const Chicken = require('../models/Chicken');

async function getChickensByOwner(ownerUid) {
  return Chicken.find({ ownerUid }).lean().exec();
}

async function getActiveChickensByOwner(ownerUid) {
  // Active = not dead
  return Chicken.find({ ownerUid, status: { $ne: 'dead' } }).lean().exec();
}

async function createChicken(data) {
  const doc = await Chicken.create(data);
  return doc.toObject();
}

function normalizeDeadUpdate(update) {
  if (!update || typeof update !== 'object') return update;
  let isDead = false;
  if (update.status === 'dead') isDead = true;
  if (update.$set && update.$set.status === 'dead') isDead = true;
  if (isDead) {
    if (!update.$set) update.$set = {};
    update.$set.weight = 0;
    if (update.$inc && typeof update.$inc.weight !== 'undefined') {
      // Prevent accidental weight increase/decrease when marking dead
      const { weight, ...restInc } = update.$inc;
      update.$inc = restInc;
    }
  }
  return update;
}

async function updateChicken(chickenId, update) {
  const normalized = normalizeDeadUpdate(update);
  try {
    if (!chickenId || !mongoose.Types.ObjectId.isValid(chickenId)) {
      // Not a valid ObjectId, let caller try fsId path
      return null;
    }
    return await Chicken.findByIdAndUpdate(chickenId, normalized, { new: true }).lean().exec();
  } catch (e) {
    // In case of cast or other errors, do not throw to allow controller fallback
    return null;
  }
}

async function getByFsId(fsId) {
  return Chicken.findOne({ fsId }).lean().exec();
}

async function updateByFsId(fsId, update) {
  const normalized = normalizeDeadUpdate(update);
  return Chicken.findOneAndUpdate({ fsId }, normalized, { new: true }).lean().exec();
}

async function getById(id) {
  try {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    return await Chicken.findById(id).lean().exec();
  } catch {
    return null;
  }
}

async function markChickenSold(chickenId) {
  return Chicken.findByIdAndUpdate(chickenId, { status: 'sold' }, { new: true }).lean().exec();
}

async function markChickenDead(chickenId) {
  return Chicken.findByIdAndUpdate(chickenId, { status: 'dead', weight: 0 }, { new: true }).lean().exec();
}

async function getChickensByOwnerWithStatus(ownerUid, statusFilter) {
  const query = { ownerUid };
  if (!statusFilter || statusFilter === 'active') {
    query.status = { $ne: 'dead' };
  } else if (statusFilter !== 'all') {
    let list = [];
    if (Array.isArray(statusFilter)) {
      list = statusFilter;
    } else if (typeof statusFilter === 'string' && statusFilter.includes(',')) {
      list = statusFilter.split(',').map(s => s.trim()).filter(Boolean);
    } else if (typeof statusFilter === 'string') {
      list = [statusFilter.trim()];
    }
    // Map UI synonyms: 'full' => 'normal', legacy 'alive' => 'normal'
    const mapped = list.flatMap(s => {
      if (s === 'full') return ['normal'];
      if (s === 'alive') return ['normal'];
      return [s];
    });
    query.status = { $in: mapped };
  }
  return Chicken.find(query).lean().exec();
}

async function deleteById(id) {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return { deletedCount: 0 };
  return Chicken.deleteOne({ _id: id }).exec();
}

async function deleteByFsId(fsId) {
  return Chicken.deleteOne({ fsId }).exec();
}

module.exports = {
  getChickensByOwner,
  getActiveChickensByOwner,
  getChickensByOwnerWithStatus,
  createChicken,
  updateChicken,
  getByFsId,
  updateByFsId,
  getById,
  markChickenSold,
  markChickenDead,
  deleteById,
  deleteByFsId,
};
