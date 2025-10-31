const walletService = require('../services/walletService');
const { db, admin } = require('../firebase');

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
    // Record a deposit transaction for visibility in Deposit page
    const userRef = db.collection('users').doc(req.user.uid);
    await userRef.collection('transactions').add({
      type: 'deposit',
      amount: coins,
      metadata: { usdtAmount, bonusPercent: bonus, channel: 'wallet.deposit' },
      createdAt: admin.firestore.Timestamp.now()
    });
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
    const uid = req.user.uid;
    const limit = Math.max(1, Math.min(parseInt(req.query.limit || '50', 10), 200));
    // Avoid composite index requirement by not ordering in Firestore; sort in memory instead.
    const MAX_FETCH = Math.max(limit, 200);
    const snap = await db
      .collection('users')
      .doc(uid)
      .collection('transactions')
      .where('type', '==', 'deposit')
      .limit(MAX_FETCH)
      .get();

    const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    all.sort((a, b) => {
      const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?._seconds ? a.createdAt._seconds * 1000 : 0);
      const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?._seconds ? b.createdAt._seconds * 1000 : 0);
      return tb - ta;
    });
    res.json({ transactions: all.slice(0, limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
