require('dotenv').config();
const { admin, db } = require('../firebase');

async function updateDeadWeights() {
  try {
    const usersSnap = await db.collection('users').get();
    let totalUpdated = 0;

    for (const userDoc of usersSnap.docs) {
      const chickensRef = db.collection('users').doc(userDoc.id).collection('chickens');
      const deadSnap = await chickensRef.where('status', '==', 'dead').get();

      let batch = db.batch();
      let countInBatch = 0;

      for (const doc of deadSnap.docs) {
        const data = doc.data();
        const currentWeight = Number(data.weight || 0);
        if (currentWeight !== 0) {
          batch.update(doc.ref, { weight: 0 });
          totalUpdated++;
          countInBatch++;
        }
        if (countInBatch >= 450) { // keep under Firebase limit
          await batch.commit();
          batch = db.batch();
          countInBatch = 0;
        }
      }

      if (countInBatch > 0) {
        await batch.commit();
      }
    }

    console.log(`Updated dead chickens to weight=0: ${totalUpdated}`);
    process.exit(0);
  } catch (err) {
    console.error('Failed to update dead chicken weights:', err);
    process.exit(1);
  }
}

updateDeadWeights();

