const cron = require('node-cron');
const { db, admin } = require('../firebase');

async function dailyTask() {
  const now = admin.firestore.Timestamp.now();
  const usersSnap = await db.collection('users').get();
  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;
    const chickensRef = db.collection('users').doc(uid).collection('chickens');
    const chickensSnap = await chickensRef.get();
    for (const doc of chickensSnap.docs) {
      const data = doc.data();
      // weight loss & death
      if (data.lastFed) {
        const diff = Math.floor((now.toDate() - data.lastFed.toDate()) / (1000*60*60*24));
        if (diff > 0) {
          const newWeight = (data.weight || 0) - diff * 0.1;
          if (diff > 3 || newWeight <= 0) {
            // remove chicken
            await doc.ref.delete();
            continue;
          }
          await doc.ref.update({ weight: newWeight });
        }
      }
      // special sale for age >= 3 years
      if (data.createdAt) {
        const ageDays = Math.floor((now.toDate() - data.createdAt.toDate()) / (1000*60*60*24));
        if (ageDays >= 365*3) {
          await doc.ref.update({ specialSale: true });
        }
      }
    }
  }
}

cron.schedule('0 0 * * *', dailyTask);
