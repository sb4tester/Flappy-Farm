const { db, admin } = require('../firebase');

exports.buyIncubator = async (req, res) => {
  const uid = req.user.uid;
  const userRef = db.collection('users').doc(uid);
  const userSnap = await userRef.get();
  const user = userSnap.data() || {};
  const price = 10;
  if ((user.coin_balance || 0) < price) {
    return res.status(400).json({ error: 'Not enough coins' });
  }
  await userRef.update({ coin_balance: admin.firestore.FieldValue.increment(-price) });
  // add incubator record
  await userRef.collection('incubators').add({
    purchasedAt: admin.firestore.FieldValue.serverTimestamp(),
    usedSlots: 0
  });
  res.json({ success: true });
};

exports.hatchEggs = async (req, res) => {
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
