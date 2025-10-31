const { admin, db } = require('../firebase');

async function createNormalEggs(uid) {
  const now = admin.firestore.Timestamp.now();
  // spawn happens via 07:00 Asia/Bangkok cron

  const chickensSnap = await db.collection('users').doc(uid).collection('chickens')
    .where('type', '==', 'mother')
    .where('feedCount', '>=', 3)
    .where('status', '==', 'normal')
    .get();

  let createdEggs = 0;
  const dateKey = now.toDate().toISOString().slice(0, 10); // YYYY-MM-DD

  for (const doc of chickensSnap.docs) {
    const eggId = `daily_${dateKey}_${doc.id}`;
    const eggRef = db.collection('users').doc(uid).collection('eggs').doc(eggId);
    try {
      await eggRef.create({
        type: 'normal',
        chickenId: doc.id,
        createdAt: now,
        special: false,
        source: 'daily'
      });
      createdEggs++;
    } catch (e) {
      if (!(e && e.code === 6)) {
        throw e;
      }
    }
  }

  console.log(`Eggs created for user ${uid}: ${createdEggs}`);
}

async function dailyTask() {
  console.log('🚀 Daily task started...');
  const now = admin.firestore.Timestamp.now();
  const usersSnap = await db.collection('users').get();

  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;
    const chickensRef = db.collection('users').doc(uid).collection('chickens');
    const chickensSnap = await chickensRef.get();

    for (const doc of chickensSnap.docs) {
      const data = doc.data();
      const lastFed = data.lastFed?.toDate();
      const createdAt = data.createdAt?.toDate();

      if (!lastFed) continue;

      const hoursSinceLastFed = (now.toDate() - lastFed) / (1000*60*60);
      let updates = {};

      // เช็คและอัปเดตสถานะหิว/ตาย
      if (hoursSinceLastFed > 72 && data.status !== 'dead') {
        updates.status = 'dead';
        updates.weight = 0;
      } else if (hoursSinceLastFed > 24 && data.status !== 'hungry') {
        updates.status = 'hungry';
      } else if (hoursSinceLastFed <= 24 && data.status !== 'normal') {
        updates.status = 'normal';
      }

      // ลดน้ำหนักวันละ 0.1 kg ถ้าไม่ได้ให้อาหารในวันนั้น
      if (lastFed < new Date(new Date().setHours(0,0,0,0))) {
        updates.weight = (data.weight || 0) - 0.1;
        if (updates.weight <= 0) {
          updates.status = 'dead';
          updates.weight = 0;
        }
      }

      if (Object.keys(updates).length > 0) {
        await doc.ref.update(updates);
      }

      // เช็คอายุ 3 ปี → เปลี่ยนสถานะ specialSale
      if (createdAt) {
        const ageDays = Math.floor((now.toDate() - createdAt) / (1000*60*60*24));
        if (ageDays >= 365*3) {
          await doc.ref.update({ specialSale: true });
        }
      }

      // ถ้าแม่ไก่ตายและมี marketOrder → ยกเลิก order
      if (updates.status === 'dead' && data.marketOrderId) {
        const orderRef = db.collection('marketOrders').doc(data.marketOrderId);
        await orderRef.update({
          status: 'cancelled',
          cancelledAt: now,
          cancelReason: 'chicken_died'
        });
      }
    }

    // ✅ หลังอัปเดตสถานะไก่ → สร้างไข่ตามเงื่อนไข
    // await createNormalEggs(uid); // moved to 07:00 Asia/Bangkok cron
  }
  console.log('✅ Daily task completed');
}

async function spawnDailyEggs() {
  console.log('Spawning daily eggs for all users...');
  const usersSnap = await db.collection('users').get();
  for (const userDoc of usersSnap.docs) {
    await createNormalEggs(userDoc.id);
  }
  console.log('Finished spawning daily eggs.');
}

module.exports = { dailyTask, spawnDailyEggs };

