const { db, admin } = require('../firebase');
const FEED_GAIN = 0.1;

module.exports = {
  listChickens: async (userId) => {
    const db = admin.firestore();
    const snapshot = await db.collection('users').doc(userId).collection('chickens').get();
    const now = admin.firestore.Timestamp.now();
    const batch = db.batch();
    let updatedCount = 0;

    snapshot.docs.forEach(doc => {
      const chicken = doc.data();
      if (!chicken.lastFed) {
        batch.update(doc.ref, { lastFed: chicken.birthDate });
        updatedCount++;
      }
    });

    snapshot.docs.forEach(doc => {
      const chicken = doc.data();
      const lastFed = chicken.lastFed || chicken.birthDate;
      const hoursSinceLastFed = (now.toDate() - lastFed.toDate()) / (1000 * 60 * 60);
      if (hoursSinceLastFed > 72) {
        batch.update(doc.ref, { status: 'dead', weight: 0 });
        updatedCount++;
      } else if (hoursSinceLastFed > 24) {
        batch.update(doc.ref, { status: 'hungry' });
        updatedCount++;
      }
    });

    if (updatedCount > 0) {
      await batch.commit();
    }

    const updatedSnapshot = await db.collection('users').doc(userId).collection('chickens').get();
    return updatedSnapshot.docs.map(doc => {
      const d = doc.data();
      const birthDate = d.birthDate.toDate();
      const ageInDays = Math.floor((now.toDate() - birthDate) / (1000 * 60 * 60 * 24));
      
      return {
        id: doc.id,
        type: d.type,
        birthDate: birthDate.toISOString().split('T')[0],
        lastFed: d.lastFed ? d.lastFed.toDate().toISOString().split('T')[0] : null,
        weight: d.weight,
        status: d.status,
        ageInDays,
        specialSale: d.specialSale || false,
        feedCount: d.feedCount || 0,
        canLayEgg: d.canLayEgg || false,
        eggs: d.eggs || 0
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
        weight: 3.0,
        status: 'hungry',
        specialSale: false,
        feedCount: 0,
        canLayEgg: false,
        eggs: 0
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
    if (data.status !== 'hungry') throw new Error('Cannot feed a chicken  not hungry');
    const newWeight = (data.weight || 0) + FEED_GAIN;
    await ref.update({
      lastFed: admin.firestore.Timestamp.now(),
      weight: newWeight,
      feedCount: admin.firestore.FieldValue.increment(1),
    });
    return { id: chickenId, weight: newWeight };
  },
  sellChicken: async (userId, chickenId) => {
    const db = admin.firestore();
    const ref = db.collection('users').doc(userId).collection('chickens').doc(chickenId);
    const snap = await ref.get();
    if (!snap.exists) throw new Error('Chicken not found');
    if (snap.data().status !== 'normal' || snap.data().status !== 'hungry') throw new Error('Cannot sell a dead chicken');
    await ref.delete();
    return { soldId: chickenId };
  },
  checkListedChickens: async () => {
    try {
      const now = admin.firestore.Timestamp.now();
      const threeDaysAgo = new admin.firestore.Timestamp(now.seconds - (72 * 60 * 60), 0);

      // ดึงไก่ที่อยู่ในตลาดและไม่ได้ให้อาหารมา 72 ชั่วโมง
      const listedChickens = await db.collectionGroup('chickens')
        .where('status', '==', 'listed')
        .where('lastFed', '<', threeDaysAgo)
        .get();

      const batch = db.batch();
      let count = 0;

      for (const doc of listedChickens.docs) {
        // อัพเดทสถานะไก่เป็นตาย
        batch.update(doc.ref, {
          status: 'dead',
          weight: 0,
          diedAt: now,
          deathReason: 'market_starvation'
        });

        // อัพเดทสถานะ order เป็นยกเลิก
        if (doc.data().marketOrderId) {
          const orderRef = db.collection('marketOrders').doc(doc.data().marketOrderId);
          batch.update(orderRef, {
            status: 'cancelled',
            cancelledAt: now,
            cancelReason: 'chicken_died'
          });
        }

        count++;
        if (count >= 500) { // Firebase batch limit
          await batch.commit();
          batch = db.batch();
          count = 0;
        }
      }

      if (count > 0) {
        await batch.commit();
      }

      return { success: true, processedCount: count };
    } catch (error) {
      console.error('Error checking listed chickens:', error);
      throw error;
    }
  },
};
