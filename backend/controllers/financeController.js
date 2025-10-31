const { db, admin } = require('../firebase');
const { distributeCommission } = require('./referralController');

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
  const userRef = db.collection('users').doc(uid);
  await userRef.update({ coin_balance: admin.firestore.FieldValue.increment(coins) });
  // Record transaction so it appears in Deposit history
  await userRef.collection('transactions').add({
    type: 'deposit',
    amount: coins,
    metadata: { usdtAmount: amount, bonusPercent: tier.bonus || 0, channel: 'finance.deposit' },
    createdAt: admin.firestore.Timestamp.now()
  });
  // distribute referral commission
  await distributeCommission(uid, amount);
  res.json({ success: true, coins });
};
