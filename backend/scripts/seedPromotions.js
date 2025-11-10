require('dotenv').config();
const { connectMongo } = require('../db/mongo');
const promotionRepo = require('../repositories/promotionRepo');
const statsRepo = require('../repositories/statsRepo');

async function seedMotherTierPrice() {
  await connectMongo();
  const tiers = [
    { minId: 1, maxId: 100000, priceUsd: 10 },
    { minId: 100001, maxId: 200000, priceUsd: 20 },
    { minId: 200001, maxId: 300000, priceUsd: 30 },
    { minId: 300001, maxId: 400000, priceUsd: 40 },
    { minId: 400001, maxId: 500000, priceUsd: 50 },
    { minId: 500001, maxId: 600000, priceUsd: 60 },
    { minId: 600001, maxId: 700000, priceUsd: 70 },
    { minId: 700001, maxId: 800000, priceUsd: 80 },
    { minId: 800001, maxId: 1000000, priceUsd: 80 }
  ];
  await promotionRepo.setMotherTierPrice(tiers);
  console.log('Seeded motherTierPrice (Mongo)');
}

async function seedStatistics() {
  await connectMongo();
  await statsRepo.incTotalChickenPurchase(0); // upsert doc with 0
  console.log('Seeded statistics (Mongo) totalChickenPurchase = 0');
}

(async () => {
  try {
    await seedMotherTierPrice();
    await seedStatistics();
    process.exit(0);
  } catch (e) {
    console.error('seedPromotions failed:', e && e.message ? e.message : e);
    process.exit(1);
  }
})();

