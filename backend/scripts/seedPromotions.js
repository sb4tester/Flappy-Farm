require('dotenv').config();
const { db } = require('../firebase');

async function seedMotherTierPrice() {
  const docRef = db.collection('promotions').doc('motherTierPrice');
  await docRef.set({
    type: 'motherTierPrice',
    tiers: [
      { minId: 1, maxId: 100000, priceUsd: 10 },
      { minId: 100001, maxId: 200000, priceUsd: 20 },
      { minId: 200001, maxId: 300000, priceUsd: 30 },
      { minId: 300001, maxId: 400000, priceUsd: 40 },
      { minId: 400001, maxId: 500000, priceUsd: 50 },
      { minId: 500001, maxId: 600000, priceUsd: 60 },
      { minId: 600001, maxId: 700000, priceUsd: 70 },
      { minId: 700001, maxId: 800000, priceUsd: 80 },
      { minId: 800001, maxId: 1000000, priceUsd: 80 }
    ]
  });
  console.log('✅ Seeded motherTierPrice');
}

async function seedStatistics() {
  const docRef = db.collection('promotions').doc('statistics');
  await docRef.set({
    totalChickenPurchase: 0
  }, { merge: true });
  console.log('✅ Seeded statistics (totalChickenPurchase = 0)');
}

Promise.all([
  seedMotherTierPrice(),
  seedStatistics()
]).then(() => process.exit()); 