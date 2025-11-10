const UserState = require('../models/UserState');

async function getOrCreate(uid) {
  let doc = await UserState.findOne({ uid }).lean().exec();
  if (!doc) {
    doc = await UserState.create({ uid, food: 0 });
    doc = doc.toObject();
  }
  return doc;
}

async function getFood(uid) {
  const doc = await getOrCreate(uid);
  return doc.food || 0;
}

async function incFood(uid, delta) {
  const res = await UserState.findOneAndUpdate(
    { uid },
    { $inc: { food: delta } },
    { upsert: true, new: true }
  ).lean().exec();
  return res.food || 0;
}

async function decFood(uid, amount) {
  // Ensure not negative
  const res = await UserState.findOneAndUpdate(
    { uid, food: { $gte: amount } },
    { $inc: { food: -amount } },
    { upsert: true, new: true }
  ).lean().exec();
  if (!res) throw new Error('NOT_ENOUGH_FOOD');
  return res.food || 0;
}

module.exports = { getOrCreate, getFood, incFood, decFood };
async function getCoins(uid) {
  const doc = await getOrCreate(uid);
  return doc.coin_balance || 0;
}

async function incCoins(uid, delta) {
  const res = await UserState.findOneAndUpdate(
    { uid },
    { $inc: { coin_balance: delta } },
    { upsert: true, new: true }
  ).lean().exec();
  return res.coin_balance || 0;
}

async function decCoins(uid, amount) {
  const res = await UserState.findOneAndUpdate(
    { uid, coin_balance: { $gte: amount } },
    { $inc: { coin_balance: -amount } },
    { upsert: true, new: true }
  ).lean().exec();
  if (!res) throw new Error('INSUFFICIENT_COINS');
  return res.coin_balance || 0;
}

module.exports.getCoins = getCoins;
module.exports.incCoins = incCoins;
module.exports.decCoins = decCoins;
