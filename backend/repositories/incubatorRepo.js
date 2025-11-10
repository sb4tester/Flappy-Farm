const Incubator = require('../models/Incubator');

async function create(userId, capacity = 5) {
  const doc = await Incubator.create({ userId, capacity, usedSlots: 0, eggs: [] });
  return doc.toObject();
}

async function findAvailable(userId) {
  return Incubator.findOne({ userId, $expr: { $lt: ["$usedSlots", "$capacity"] } }).lean().exec();
}

async function incUsedSlots(id, delta) {
  return Incubator.findByIdAndUpdate(id, { $inc: { usedSlots: delta } }, { new: true }).lean().exec();
}

async function listByUser(userId) {
  return Incubator.find({ userId }).sort({ createdAt: -1 }).lean().exec();
}

module.exports = { create, findAvailable, incUsedSlots, listByUser };

