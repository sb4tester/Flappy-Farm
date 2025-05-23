const admin = require('../firebase');
const FEED_GAIN = 0.1;

module.exports = {
  listChickens: async (userId) => {
    const db = admin.firestore();
    const snapshot = await db.collection('users').doc(userId).collection('chickens').get();
    return snapshot.docs.map(doc => {
      const d = doc.data();
      return {
        id: doc.id,
        type: d.type,
        birthDate: d.birthDate.toDate().toISOString().split('T')[0],
        lastFed: d.lastFed.toDate().toISOString().split('T')[0],
        weight: d.weight,
        status: d.status,
      };
    });
  },
  buyMother: async (userId, qty) => {
    if (qty <= 0) throw new Error('Invalid quantity');
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();
    const batch = db.batch();
    const col = db.collection('users').doc(userId).collection('chickens');
    for (let i = 0; i < qty; i++) {
      const ref = col.doc();
      batch.set(ref, {
        type: 'mother',
        birthDate: now,
        lastFed: now,
        weight: 0,
        status: 'alive',
      });
    }
    await batch.commit();
    return { bought: qty };
  },
  feedChicken: async (userId, chickenId) => {
    const db = admin.firestore();
    const ref = db.collection('users').doc(userId).collection('chickens').doc(chickenId);
    const snap = await ref.get();
    if (!snap.exists) throw new Error('Chicken not found');
    const data = snap.data();
    if (data.status !== 'alive') throw new Error('Cannot feed a dead chicken');
    const newWeight = (data.weight || 0) + FEED_GAIN;
    await ref.update({
      lastFed: admin.firestore.Timestamp.now(),
      weight: newWeight
    });
    return { id: chickenId, weight: newWeight };
  },
  sellChicken: async (userId, chickenId) => {
    const db = admin.firestore();
    const ref = db.collection('users').doc(userId).collection('chickens').doc(chickenId);
    const snap = await ref.get();
    if (!snap.exists) throw new Error('Chicken not found');
    if (snap.data().status !== 'alive') throw new Error('Cannot sell a dead chicken');
    await ref.delete();
    return { soldId: chickenId };
  },
};
