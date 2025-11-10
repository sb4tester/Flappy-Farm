const Stats = require('../models/Stats');

async function getStats() {
  return Stats.findOne({ key: 'statistics' }).lean().exec();
}

async function incTotalChickenPurchase(delta) {
  const res = await Stats.findOneAndUpdate(
    { key: 'statistics' },
    { $inc: { totalChickenPurchase: delta } },
    { upsert: true, new: true }
  ).lean().exec();
  return res.totalChickenPurchase || 0;
}

module.exports = { getStats, incTotalChickenPurchase };

