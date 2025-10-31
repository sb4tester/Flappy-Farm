const admin = require('firebase-admin');
const ethers = require('ethers');

exports.getProfile = async (req, res) => {
  try {
    const uid = req.user.uid;
    const userDoc = await admin.firestore().collection('users').doc(uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ uid, ...userDoc.data() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getSettings = async (req, res) => {
  try {
    const userRef = admin.firestore().collection('users').doc(req.user.uid);
    const doc = await userRef.get();
    if (!doc.exists) return res.status(404).send('User not found');

    const { farmName, usdtWallet, twoFactorEnabled } = doc.data();
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
    const db = admin.firestore();

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

    const userRef = db.collection('users').doc(uid);
    const indexRef = (addrLower) => db.collection('walletIndex').doc(addrLower);

    // Perform uniqueness via index collection in a transaction
    await db.runTransaction(async (tx) => {
      const userSnap = await tx.get(userRef);
      const currentData = userSnap.exists ? userSnap.data() : {};
      const prevWalletLower = (currentData.usdtWallet || '').toString().toLowerCase();

      const updateData = {
        farmName,
        twoFactorEnabled: !!twoFactorEnabled,
      };

      if (typeof usdtWallet === 'string') {
        if (normalizedLower) {
          const idxSnap = await tx.get(indexRef(normalizedLower));
          if (!idxSnap.exists) {
            // Fallback duplicate check against existing users in case legacy data lacks index
            const checksummed = ethers.utils.getAddress(usdtWallet);
            const q1 = await db.collection('users').where('usdtWallet', '==', normalizedLower).limit(1).get();
            const q2 = checksummed.toLowerCase() !== normalizedLower
              ? await db.collection('users').where('usdtWallet', '==', checksummed).limit(1).get()
              : { empty: true, docs: [] };
            const dupDoc = !q1.empty ? q1.docs[0] : (!q2.empty ? q2.docs[0] : null);
            if (dupDoc && dupDoc.id !== uid) {
              throw new Error('CONFLICT_WALLET');
            }
            // Attempt to create the index doc atomically; if it already exists due to race, Firestore will throw
            tx.create(indexRef(normalizedLower), { uid });
          } else if (idxSnap.data().uid !== uid) {
            throw new Error('CONFLICT_WALLET');
          }
          // If it existed and belonged to the same uid, ensure it's up to date
          if (idxSnap.exists && idxSnap.data().uid === uid) {
            tx.set(indexRef(normalizedLower), { uid }, { merge: true });
          }
          updateData.usdtWallet = normalizedLower;
          updateData.usdtWalletUpdatedAt = admin.firestore.FieldValue.serverTimestamp();
          if (prevWalletLower && prevWalletLower !== normalizedLower) {
            tx.delete(indexRef(prevWalletLower));
          }
        } else {
          // clearing wallet
          updateData.usdtWallet = admin.firestore.FieldValue.delete();
          updateData.usdtWalletUpdatedAt = admin.firestore.FieldValue.serverTimestamp();
          if (prevWalletLower) {
            tx.delete(indexRef(prevWalletLower));
          }
        }
      }

      tx.set(userRef, updateData, { merge: true });
    });

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
