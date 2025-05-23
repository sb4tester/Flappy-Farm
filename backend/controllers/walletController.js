const walletService = require('../services/walletService');

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
