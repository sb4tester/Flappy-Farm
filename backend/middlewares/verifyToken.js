const { admin } = require('../firebase');
module.exports = async function verifyToken(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    console.log('DEBUG verifyToken: Missing token or not Bearer format.');
    return res.status(401).json({ error: 'Missing token' });
  }
  const idToken = auth.split(' ')[1];
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    console.log('DEBUG verifyToken: Token decoded successfully for user UID:', decoded.uid);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('DEBUG verifyToken: Token verification failed. Error:', err.message);
    res.status(401).json({ error: 'Invalid token' });
    // Explicitly return to prevent further execution in this middleware for error cases
    return;
  }
};
