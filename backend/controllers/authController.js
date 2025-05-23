const { admin, db } = require('../firebase');

exports.login = async (req, res) => {
  const { idToken, referrer } = req.body;
  if (!idToken) return res.status(400).json({ error: 'Missing idToken' });
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;
    // Ensure user doc exists
    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      await userRef.set({
        coin_balance: 0,
        food: 0,
        referrer: referrer || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    res.json({ uid });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

exports.logout = async (req, res) => {
  // No server-side token invalidation needed for Firebase
  res.json({ success: true });
};
