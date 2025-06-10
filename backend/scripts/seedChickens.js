require('dotenv').config();
const admin = require('../firebase');
const db = admin.firestore();

async function seed() {
  const userId = 'TEST_USER_UID';
  const chickens = [
    {
      type: 'mother',
      birthDate: admin.firestore.Timestamp.fromDate(new Date('2025-01-01')),
      lastFed: admin.firestore.Timestamp.fromDate(new Date()),
      weight: 1.5,
      status: 'alive',
      specialSale: false
    }
  ];
  const batch = db.batch();
  chickens.forEach((c, i) => {
    const ref = db.collection('users').doc(userId).collection('chickens').doc(`c${i+1}`);
    batch.set(ref, c);
  });
  await batch.commit();
  console.log('Seed complete');
}

seed().catch(console.error);
