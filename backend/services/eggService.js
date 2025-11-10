// services/eggService.js (Mongo-only)
const { connectMongo } = require('../db/mongo');
const eggRepo = require('../repositories/eggRepo');
const userRepo = require('../repositories/userRepo');
const transactionRepo = require('../repositories/transactionRepo');

const PRICE = {
  normal: 0.1,
  bronze: 10,
  silver: 100,
  gold: 1000,
};

module.exports = {
  listEggs: async (userId) => {
    await connectMongo();
    const eggs = await eggRepo.listByUser(userId);
    return eggs.map(e => ({ id: String(e._id), ...e }));
  },

  sellEggs: async (userId, type, qty) => {
    await connectMongo();
    if (!PRICE[type]) throw new Error('Invalid egg type');
    if (qty <= 0) throw new Error('Invalid quantity');

    // Ensure enough eggs exist, then delete exactly qty oldest
    const deleted = await eggRepo.deleteByUserAndTypeLimit(userId, type, qty);
    if (deleted < qty) throw new Error('Not enough eggs');

    const coinsEarned = PRICE[type] * qty;
    await userRepo.incCoins(userId, coinsEarned);
    await transactionRepo.createTransaction({
      userId,
      type: 'EARN',
      amountCoin: coinsEarned,
      amountUSDT: null,
      meta: { item: 'egg', eggType: type, quantity: qty, channel: 'egg.sell' },
    });

    return { sold: qty, type, coinsEarned };
  },

  claimEgg: async (userId, totalSpent) => {
    await connectMongo();
    // Determine eligible egg type
    let type = 'normal';
    const roll = Math.random();
    if (totalSpent >= 3000 && roll < 0.001) type = 'gold';
    else if (totalSpent >= 1000 && roll < 0.01) type = 'silver';
    else if (totalSpent >= 300 && roll < 0.05) type = 'bronze';

    await eggRepo.createEgg({ userId, type, source: 'claim', createdAt: new Date() });
    return type;
  },
};

