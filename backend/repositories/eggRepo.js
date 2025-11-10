const Egg = require('../models/Egg');

async function listByUser(userId) {
  return Egg.find({ userId }).sort({ createdAt: -1 }).lean().exec();
}

async function countByUserAndType(userId, type) {
  return Egg.countDocuments({ userId, type }).exec();
}

async function createEgg(doc) {
  const res = await Egg.create(doc);
  return res.toObject();
}

async function bulkCreateEggs(docs) {
  if (!Array.isArray(docs) || docs.length === 0) return [];
  const created = await Egg.insertMany(docs, { ordered: false });
  return created.map(d => d.toObject());
}

async function deleteByUserAndType(userId, type) {
  const res = await Egg.deleteMany({ userId, type });
  return res.deletedCount || 0;
}

async function deleteByUserAndTypeLimit(userId, type, limit) {
  if (!limit || limit <= 0) return 0;
  const docs = await Egg.find({ userId, type }).sort({ createdAt: 1 }).limit(limit).select('_id').lean().exec();
  if (!docs.length) return 0;
  const ids = docs.map(d => d._id);
  const res = await Egg.deleteMany({ _id: { $in: ids } }).exec();
  return res.deletedCount || 0;
}

module.exports = { listByUser, countByUserAndType, createEgg, bulkCreateEggs, deleteByUserAndType, deleteByUserAndTypeLimit };
