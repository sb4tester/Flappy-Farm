const { connectMongo } = require('../db/mongo');
const userRepo = require('../repositories/userRepo');

module.exports = {
  getBalance: async (userId) => {
    await connectMongo();
    return userRepo.getCoins(userId);
  },
  deposit: async (userId, usdtAmount, bonusPercent) => {
    await connectMongo();
    const coins = usdtAmount * (1 + bonusPercent / 100);
    await userRepo.incCoins(userId, coins);
    return coins;
  },
  withdraw: async (userId, coinAmount, usdtRate = 1) => {
    await connectMongo();
    await userRepo.decCoins(userId, coinAmount);
    return coinAmount / usdtRate;
  }
};
