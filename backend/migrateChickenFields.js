const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // ปรับ path ให้เหมาะสมกับตำแหน่งใหม่

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrateChickenFields() {
  const usersSnap = await db.collection('users').get();
  let updated = 0, skipped = 0;

  for (const userDoc of usersSnap.docs) {
    const chickensSnap = await db.collection('users').doc(userDoc.id).collection('chickens').get();
    for (const chickenDoc of chickensSnap.docs) {
      const chicken = chickenDoc.data();
      // ตรวจสอบว่ามี field ใหม่หรือยัง
      const needUpdate = (
        chicken.feedCount === undefined ||
        chicken.canLayEgg === undefined ||
        chicken.eggs === undefined
      );
      if (needUpdate) {
        await chickenDoc.ref.update({
          feedCount: chicken.feedCount !== undefined ? chicken.feedCount : 0,
          canLayEgg: chicken.canLayEgg !== undefined ? chicken.canLayEgg : false,
          eggs: chicken.eggs !== undefined ? chicken.eggs : 0
        });
        updated++;
        console.log(`Updated chicken ${chickenDoc.id} of user ${userDoc.id}`);
      } else {
        skipped++;
      }
    }
  }
  console.log(`Migration complete. Updated: ${updated}, Skipped: ${skipped}`);
  process.exit(0);
}

migrateChickenFields().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
}); 