// services/eggService.js
const admin = require('../firebase');
const PRICE = {
  normal:  0.1,   // 10 ใบ = 1 coin ⇒ 1 ใบ = 0.1 coin
  bronze: 10,
  silver:100,
  gold: 1000
};

module.exports = {
  listEggs: async (userId) => {
    const db = admin.firestore();
    const snap = await db.collection('users').doc(userId).collection('eggs').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  sellEggs: async (userId, type, qty) => {
    if (!PRICE[type]) throw new Error('Invalid egg type');
    if (qty <= 0) throw new Error('Invalid quantity');

    const db = admin.firestore();
    const userRef = db.collection('users').doc(userId);
    const eggsCol = userRef.collection('eggs');
    const txs = [];

    // ตรวจว่า user มีไข่พอไหม
    const snap = await eggsCol.where('type', '==', type).limit(qty).get();
    if (snap.size < qty) throw new Error('Not enough eggs');

    // ลบเอกสารไข่ที่ขาย
    snap.docs.forEach(doc => txs.push(() => doc.ref.delete()));

    // คำนวณ coin ได้
    const coinsEarned = PRICE[type] * qty;

    // เพิ่ม coin บน user document
    txs.push(async () => {
      await userRef.update({
        coin_balance: admin.firestore.FieldValue.increment(coinsEarned)
      });
    });

    // บันทึก transaction
    txs.push(async () => {
      await userRef.collection('transactions').add({
        type: 'earn',
        amount: coinsEarned,
        metadata: { item: 'egg', eggType: type, quantity: qty },
        createdAt: admin.firestore.Timestamp.now()
      });
    });

    // รัน batch/delete/update
    const batch = db.batch();
    // delete และ update แยก batch ไม่ได้ผสมกัน ต้องใช้ transaction หรือหลาย batch
    snap.docs.forEach(doc => batch.delete(doc.ref));
    batch.update(userRef, {
      coin_balance: admin.firestore.FieldValue.increment(coinsEarned)
    });
    // แค่บันทึก transaction ทีหลัง
    await batch.commit();
    await userRef.collection('transactions').add({
      type: 'earn',
      amount: coinsEarned,
      metadata: { item: 'egg', eggType: type, quantity: qty },
      createdAt: admin.firestore.Timestamp.now()
    });

    return { sold: qty, type, coinsEarned };
  },
  claimEgg: async (userId, totalSpent) => {
    const db = admin.firestore();
    const userRef = db.collection('users').doc(userId);
    const eggsCol = userRef.collection('eggs');

    // Determine eligible egg type
    let type = 'normal';
    const roll = Math.random();
    if (totalSpent >= 3000 && roll < 0.001) type = 'gold';       // 0.1%
    else if (totalSpent >= 1000 && roll < 0.01) type = 'silver'; // 1%
    else if (totalSpent >= 300 && roll < 0.05) type = 'bronze';  // 5%

    // Save egg
    await eggsCol.add({
      type,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return type;
  }
};




