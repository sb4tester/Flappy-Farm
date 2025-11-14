const UserState = require('../models/UserState');

async function getOrCreate(uid) {
  let doc = await UserState.findOne({ uid }).lean().exec();
  if (!doc) {
    // Backfill from legacy User collection if available
    try {
      const User = require('../models/User');
      const legacy = await User.findOne({ uid }).lean().exec();
      const seed = {
        uid,
        food: legacy && typeof legacy.food === 'number' ? legacy.food : 0,
        coin_balance: legacy && typeof legacy.coin_balance === 'number' ? legacy.coin_balance : 0,
        farmName: legacy && legacy.farmName ? legacy.farmName : null,
        usdtWallet: legacy && legacy.usdtWallet ? legacy.usdtWallet : null,
      };
      const created = await UserState.create(seed);
      doc = created.toObject();
    } catch (e) {
      // Fallback minimal create
      const created = await UserState.create({ uid, food: 0, coin_balance: 0 });
      doc = created.toObject();
    }
  }
  // If doc exists but both balances are zero, attempt a one-time gentle backfill from legacy User
  // This helps users whose UserState was created without migrating prior values
  if (doc && ((doc.food || 0) === 0) && ((doc.coin_balance || 0) === 0)) {
    try {
      const User = require('../models/User');
      const legacy = await User.findOne({ uid }).lean().exec();
      const update = {};
      if (legacy) {
        if (typeof legacy.food === 'number' && legacy.food > 0) update.food = legacy.food;
        if (typeof legacy.coin_balance === 'number' && legacy.coin_balance > 0) update.coin_balance = legacy.coin_balance;
        if (Object.keys(update).length > 0) {
          await UserState.updateOne({ uid }, { $set: update }).exec();
          doc = await UserState.findOne({ uid }).lean().exec();
        }
      }
    } catch (e) {
      // ignore backfill errors; non-fatal
    }
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
