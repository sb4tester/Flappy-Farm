const ethers = require('ethers');
const { connectMongo } = require('../db/mongo');
const User = require('../models/User');
const UserState = require('../models/UserState');

exports.getProfile = async (req, res) => {
  try {
    const uid = req.user.uid;
    await connectMongo();
    const user = await User.findOne({ uid }).lean().exec();
    const state = await UserState.findOne({ uid }).lean().exec();
    if (!user && !state) return res.status(404).json({ error: 'User not found' });
    const food = state?.food || 0;
    const profile = { uid, email: user?.email || null, displayName: user?.displayName || null, photoURL: user?.photoURL || null, farmName: state?.farmName || null, usdtWallet: state?.usdtWallet || null };
    return res.json({ ...profile, food });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getSettings = async (req, res) => {
  try {
    await connectMongo();
    const state = await UserState.findOne({ uid: req.user.uid }).lean().exec();
    if (!state) return res.status(404).send('User not found');
    const { farmName, usdtWallet, twoFactorEnabled } = state;
    res.json({ farmName, usdtWallet, twoFactorEnabled: !!twoFactorEnabled });
  } catch (error) {
    console.error('dY"� getSettings error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const { farmName, twoFactorEnabled } = req.body;
    let { usdtWallet } = req.body;

    const uid = req.user.uid;
    await connectMongo();

    // Normalize and validate wallet if provided
    let normalizedLower = null;
    if (typeof usdtWallet === 'string') {
      usdtWallet = usdtWallet.trim();
      if (usdtWallet) {
        if (!ethers.utils.isAddress(usdtWallet)) {
          return res.status(400).json({ error: 'Invalid wallet address' });
        }
        const checksummed = ethers.utils.getAddress(usdtWallet);
        normalizedLower = checksummed.toLowerCase();
      }
    }

    const existing = await UserState.findOne({ uid }).lean().exec();
    const prevWalletLower = (existing?.usdtWallet || '').toString().toLowerCase();
    const updateData = { farmName, twoFactorEnabled: !!twoFactorEnabled };
    if (typeof usdtWallet === 'string') {
      if (normalizedLower) {
        const dup = await UserState.findOne({ uid: { $ne: uid }, usdtWallet: { $in: [normalizedLower, ethers.utils.getAddress(usdtWallet)] } }).lean().exec();
        if (dup) throw new Error('CONFLICT_WALLET');
        updateData.usdtWallet = normalizedLower;
      } else {
        updateData.usdtWallet = null;
      }
    }
    await UserState.updateOne({ uid }, { $set: updateData }, { upsert: true }).exec();

    res.sendStatus(200);
  } catch (error) {
    const msg = error && (error.message || error.toString());
    const code = error && (error.code || error.status);
    if (msg === 'CONFLICT_WALLET' || code === 6 || /ALREADY_EXISTS/i.test(msg)) {
      return res.status(409).json({ error: 'Wallet address already in use' });
    }
    console.error('dY"� updateSettings error:', error);
    res.status(500).json({ error: msg });
  }
};
