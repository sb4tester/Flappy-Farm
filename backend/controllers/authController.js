// controllers/authController.js - เพิ่ม error handling
const { admin, db } = require('../firebase');

exports.login = async (req, res) => {
  try {
    const { idToken, referrer } = req.body;
    
    if (!idToken) {
      return res.status(400).json({ error: 'ID token is required' });
    }

    console.log('🔐 รับ token:', idToken);
    
    const decoded = await admin.auth().verifyIdToken(idToken);
    console.log("✅ decoded token:", decoded);
    
    const uid = decoded.uid;
    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      await userRef.set({
        email: decoded.email || null,
        referrer: referrer || null,
        coin_balance: 0,
        food: 0,
        totalChickenPurchase: 0,
        totalDeposit: 0,
        chickenCount: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log('✅ user created:', uid);
    } else {
      console.log('ℹ️ user already exists:', uid);
    }

    res.status(200).json({ 
      message: 'login success',
      user: {
        uid: decoded.uid,
        email: decoded.email
      }
    });
  } catch (err) {
    console.error('❌ login failed:', err);
    
    // ตรวจสอบ error type
    let errorMessage = 'Invalid token or internal error';
    if (err.code === 'auth/id-token-expired') {
      errorMessage = 'Token expired';
    } else if (err.code === 'auth/argument-error') {
      errorMessage = 'Invalid token format';
    }
    
    res.status(401).json({ error: errorMessage });
  }
};

exports.logout = async (req, res) => {
  try {
    // No server-side token invalidation needed for Firebase
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    console.error('❌ logout error:', err);
    res.status(500).json({ error: 'Logout failed' });
  }
};

exports.register = async (req, res) => {
  try {
  let { idToken, uid, email, displayName, photoURL, referralCode } = req.body;
   // ถ้า body ไม่มี idToken ให้ไปอ่านจาก Authorization header แทน
   if (!idToken && req.headers.authorization?.startsWith('Bearer ')) {
     idToken = req.headers.authorization.split('Bearer ')[1];
   }
   console.log('💡 Received ID token:', idToken);
    
    if (!idToken || !uid) {
      return res.status(400).json({ error: 'ID token and UID are required' });
    }

    console.log('📝 Register attempt for UID:', uid);
    
    const decoded = await admin.auth().verifyIdToken(idToken);

    if (decoded.uid !== uid) {
      console.log('❌ UID mismatch:', decoded.uid, '!=', uid);
      return res.status(403).json({ error: 'UID mismatch' });
    }

    const userRef = db.collection('users').doc(uid);
    const existingUser = await userRef.get();

    if (!existingUser.exists) {
      const userData = {
        email: email || decoded.email,
        displayName: displayName || null,
        photoURL: photoURL || null,
        referralCode: referralCode || null,
        coin_balance: 0,
        food: 0,
        totalChickenPurchase: 0,
        totalDeposit: 0,
        chickenCount: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      await userRef.set(userData);
      console.log('✅ User registered:', uid);
    } else {
      console.log('ℹ️ User already exists during register:', uid);
    }

    res.json({ 
      message: 'User registered successfully',
      user: {
        uid: decoded.uid,
        email: decoded.email
      }
    });
  } catch (err) {
    console.error('❌ Register error:', err);
    
    let errorMessage = 'Invalid token or internal error';
    if (err.code === 'auth/id-token-expired') {
      errorMessage = 'Token expired';
    } else if (err.code === 'auth/argument-error') {
      errorMessage = 'Invalid token format';
    }
    
    res.status(401).json({ error: errorMessage });
  }
};