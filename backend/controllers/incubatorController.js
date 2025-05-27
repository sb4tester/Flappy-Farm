const { db, admin } = require('../firebase');

const INCUBATOR_PRICE = 10; // ราคาเครื่องฟักไข่ 10 coins
const INCUBATOR_CAPACITY = 5; // จำนวน slot ที่ฟักได้

const buyIncubator = async (req, res) => {
  try {
    const userId = req.user.uid;

    // Get user from Firestore
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();

    // Check if user has enough coins
    if (userData.coin_balance < INCUBATOR_PRICE) {
      return res.status(400).json({ error: 'Not enough coins' });
    }

    // Update user's coin balance and create incubator using transaction
    await db.runTransaction(async (transaction) => {
      // Update user document
      transaction.update(userRef, {
        coin_balance: userData.coin_balance - INCUBATOR_PRICE
      });

      // Create incubator in subcollection
      const incubatorRef = userRef.collection('incubators').doc();
      transaction.set(incubatorRef, {
        purchasedAt: admin.firestore.FieldValue.serverTimestamp(),
        capacity: INCUBATOR_CAPACITY,
        usedSlots: 0,
        eggs: []
      });

      // Create transaction record
      const transactionRef = userRef.collection('transactions').doc();
      transaction.set(transactionRef, {
        type: 'buyIncubator',
        amount: -INCUBATOR_PRICE, // จำนวน coin ที่ใช้ (ติดลบเพราะเป็นการใช้จ่าย)
        metadata: {
          incubatorId: incubatorRef.id,
          capacity: INCUBATOR_CAPACITY
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    // Get updated user data
    const updatedUserDoc = await userRef.get();
    const updatedUserData = updatedUserDoc.data();

    res.json({
      success: true,
      data: {
        coin_balance: updatedUserData.coin_balance
      }
    });
  } catch (error) {
    console.error('Error buying incubator:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const hatchEggs = async (req, res) => {
  const uid = req.user.uid;
  const { eggIds } = req.body;
  if (!Array.isArray(eggIds) || eggIds.length === 0) {
    return res.status(400).json({ error: 'Missing eggIds' });
  }
  const userRef = db.collection('users').doc(uid);
  // find available incubator
  const incSnap = await userRef.collection('incubators').where('usedSlots', '<', 5).limit(1).get();
  if (incSnap.empty) return res.status(400).json({ error: 'No available incubator slots' });
  const incDoc = incSnap.docs[0];
  const available = 5 - incDoc.data().usedSlots;
  if (eggIds.length > available) {
    return res.status(400).json({ error: 'Too many eggs', available });
  }
  // delete eggs and add chickens
  const batch = db.batch();
  eggIds.forEach(id => {
    const eggRef = userRef.collection('eggs').doc(id);
    batch.delete(eggRef);
    const newChickRef = userRef.collection('chickens').doc();
    batch.set(newChickRef, {
      type: 'chick',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastFed: null,
      feedStreak: 0,
      weight: 0.5
    });
  });
  // update incubator usedSlots
  batch.update(incDoc.ref, { usedSlots: admin.firestore.FieldValue.increment(eggIds.length) });
  await batch.commit();
  res.json({ success: true, hatched: eggIds.length });
};

const listIncubators = async (req, res) => {
  try {
    const userId = req.user.uid;

    // Get user's incubators from Firestore
    const incubatorsRef = db.collection('users').doc(userId).collection('incubators');
    const incubatorsSnap = await incubatorsRef.get();

    const incubators = [];
    incubatorsSnap.forEach(doc => {
      incubators.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json({
      success: true,
      data: incubators
    });
  } catch (error) {
    console.error('Error listing incubators:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  buyIncubator,
  hatchEggs,
  listIncubators
};
