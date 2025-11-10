// controllers/authController.js - Mongo-only
const { admin } = require('../firebase');
const { connectMongo } = require('../db/mongo');
const User = require('../models/User');
const userRepo = require('../repositories/userRepo');

exports.login = async (req, res) => {
  try {
    const { idToken, referrer } = req.body;
    if (!idToken) return res.status(400).json({ error: 'ID token is required' });

    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    await connectMongo();
    await User.updateOne({ uid }, { $setOnInsert: { uid, email: decoded.email || null, referredBy: referrer || null } }, { upsert: true });
    await userRepo.getOrCreate(uid);

    res.status(200).json({ message: 'login success', user: { uid: decoded.uid, email: decoded.email } });
  } catch (err) {
    console.error('login failed:', err);
    let errorMessage = 'Invalid token or internal error';
    if (err.code === 'auth/id-token-expired') errorMessage = 'Token expired';
    else if (err.code === 'auth/argument-error') errorMessage = 'Invalid token format';
    res.status(401).json({ error: errorMessage });
  }
};

exports.logout = async (req, res) => {
  try {
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Logout failed' });
  }
};

exports.register = async (req, res) => {
  try {
    let { idToken, uid, email, displayName, photoURL, referralCode } = req.body;
    if (!idToken && req.headers.authorization?.startsWith('Bearer ')) {
      idToken = req.headers.authorization.split('Bearer ')[1];
    }
    if (!idToken || !uid) return res.status(400).json({ error: 'ID token and UID are required' });

    const decoded = await admin.auth().verifyIdToken(idToken);
    if (decoded.uid !== uid) return res.status(403).json({ error: 'UID mismatch' });

    await connectMongo();
    await User.updateOne(
      { uid },
      { $setOnInsert: { uid }, $set: { email: email || decoded.email, displayName: displayName || null, photoURL: photoURL || null, referralCode: referralCode || null } },
      { upsert: true }
    );
    await userRepo.getOrCreate(uid);

    res.json({ message: 'User registered successfully', user: { uid: decoded.uid, email: decoded.email } });
  } catch (err) {
    console.error('Register error:', err);
    let errorMessage = 'Invalid token or internal error';
    if (err.code === 'auth/id-token-expired') errorMessage = 'Token expired';
    else if (err.code === 'auth/argument-error') errorMessage = 'Invalid token format';
    res.status(401).json({ error: errorMessage });
  }
};
