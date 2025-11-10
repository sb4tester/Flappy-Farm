const { distributeCommission } = require('./referralController');
const { connectMongo } = require('../db/mongo');
const transactionRepo = require('../repositories/transactionRepo');
const userRepo = require('../repositories/userRepo');

exports.deposit = async (req, res) => {
  const uid = req.user.uid;
  const { amount } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
  // calculate bonus
  const tiers = [
    { threshold: 100000, bonus: 15 },
    { threshold: 10000, bonus: 10 },
    { threshold: 1000, bonus: 5 }
  ];
  const tier = tiers.find(t => amount >= t.threshold) || { bonus: 0 };
  const coins = Math.floor(amount * (1 + tier.bonus/100));
  await connectMongo();
  await userRepo.incCoins(uid, coins);
  // Append transaction ledger in Mongo
  await transactionRepo.createTransaction({
    userId: uid,
    type: 'DEPOSIT',
    amountCoin: coins,
    amountUSDT: amount,
    meta: { channel: 'finance.deposit' }
  });
  // distribute referral commission
  await distributeCommission(uid, amount);
  res.json({ success: true, coins });
};
