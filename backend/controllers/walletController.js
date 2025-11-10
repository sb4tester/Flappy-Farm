const walletService = require('../services/walletService');
const { connectMongo } = require('../db/mongo');
const transactionRepo = require('../repositories/transactionRepo');

exports.getBalance = async (req, res) => {
  try {
    const balance = await walletService.getBalance(req.user.uid);
    res.json({ coin_balance: balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deposit = async (req, res) => {
  try {
    const { usdtAmount } = req.body;
    let bonus = 0;
    if (usdtAmount >= 100000) bonus = 15;
    else if (usdtAmount >= 10000) bonus = 10;
    else if (usdtAmount >= 1000) bonus = 5;
    const coins = await walletService.deposit(req.user.uid, usdtAmount, bonus);
    await connectMongo();
    await transactionRepo.createTransaction({ userId: req.user.uid, type: 'DEPOSIT', amountCoin: coins, amountUSDT: usdtAmount, meta: { bonusPercent: bonus, channel: 'wallet.deposit' } });
    res.json({ coinsReceived: coins });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.withdraw = async (req, res) => {
  try {
    const { coinAmount } = req.body;
    const USDT_RATE = 1;
    const usdtOut = await walletService.withdraw(req.user.uid, coinAmount, USDT_RATE);
    res.json({ usdtAmount: usdtOut });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getDepositAddress = async (req, res) => {
  try {
    const raw = process.env.SYSTEM_DEPOSIT_ADDRESS || '';
    // Strip inline comments or trailing notes (e.g., "# Hot wallet ...") and whitespace
    const address = raw.split('#')[0].trim();
    // Return 200 with empty address to avoid frontend Promise.all failing
    res.json({ address });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getDepositTransactions = async (req, res) => {
  try {
    // For now, this endpoint can be backed by Mongo Transaction collection (filter type=DEPOSIT)
    const uid = req.user.uid;
    const limit = Math.max(1, Math.min(parseInt(req.query.limit || '50', 10), 200));
    await connectMongo();
    const Transaction = require('../models/Transaction');
    const txs = await Transaction.find({ userId: uid, type: 'DEPOSIT' }).sort({ createdAt: -1 }).limit(limit).lean().exec();
    res.json({ transactions: txs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
