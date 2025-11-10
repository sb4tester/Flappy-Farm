// One-time migration: Firestore -> MongoDB for chickens and marketOrders
require('dotenv').config();
const { admin } = require('../firebase');
const db = admin.firestore();
const { connectMongo } = require('../db/mongo');
const Chicken = require('../models/Chicken');
const MarketOrder = require('../models/MarketOrder');
const Egg = require('../models/Egg');
const Promotion = require('../models/Promotion');
const Stats = require('../models/Stats');
const Ticket = require('../models/Ticket');
const UserState = require('../models/UserState');
const User = require('../models/User');

function tsToDate(v) {
  if (!v) return null;
  if (v.toDate) return v.toDate();
  if (v._seconds) return new Date(v._seconds * 1000);
  return v;
}

async function migrateChickens() {
  const usersSnap = await db.collection('users').get();
  let count = 0;
  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;
    const chickensSnap = await db.collection('users').doc(uid).collection('chickens').get();
    for (const chDoc of chickensSnap.docs) {
      const ch = chDoc.data();
      const exists = await Chicken.findOne({ fsId: chDoc.id }).lean();
      if (exists) continue;
      await Chicken.create({
        fsId: chDoc.id,
        ownerUid: uid,
        type: ch.type || 'mother',
        birthDate: tsToDate(ch.birthDate),
        weight: ch.weight || 0,
        status: ch.status || 'alive',
        canLayEgg: !!ch.canLayEgg,
        eggs: ch.eggs || 0,
        lastFed: tsToDate(ch.lastFed),
        foodCost: ch.foodCost || 0,
        totalCost: ch.totalCost || 0,
        costHistory: Array.isArray(ch.costHistory) ? ch.costHistory.map(e => ({
          type: e.type,
          amount: e.amount,
          units: e.units,
          timestamp: tsToDate(e.timestamp)
        })) : [],
        eggProduction: ch.eggProduction ? {
          totalEggs: ch.eggProduction.totalEggs || 0,
          lastEggDate: tsToDate(ch.eggProduction.lastEggDate),
          productionRate: ch.eggProduction.productionRate || 0
        } : undefined,
        health: ch.health || 0,
        marketOrderId: ch.marketOrderId || null,
        listedAt: tsToDate(ch.listedAt)
      });
      count++;
    }
  }
  console.log(`Migrated chickens: ${count}`);
}

async function migrateMarketOrders() {
  const snap = await db.collection('marketOrders').get();
  let count = 0;
  for (const doc of snap.docs) {
    const o = doc.data();
    const exists = await MarketOrder.findOne({ fsOrderId: doc.id }).lean();
    if (exists) continue;
    await MarketOrder.create({
      fsOrderId: doc.id,
      userId: o.userId,
      side: o.side,
      item: o.item,
      chickenId: o.chickenId,
      price: o.price,
      status: o.status,
      lastFed: tsToDate(o.lastFed),
      chickenData: o.chickenData ? {
        type: o.chickenData.type,
        weight: o.chickenData.weight,
        birthDate: tsToDate(o.chickenData.birthDate),
        purchasePrice: o.chickenData.purchasePrice,
        totalCost: o.chickenData.totalCost,
        foodCost: o.chickenData.foodCost,
        tier: o.chickenData.tier
      } : undefined,
      buyerId: o.buyerId || null,
      filledAt: tsToDate(o.filledAt),
      cancelledAt: tsToDate(o.cancelledAt),
      cancelReason: o.cancelReason || null
    });
    count++;
  }
  console.log(`Migrated marketOrders: ${count}`);
}

async function migrateEggs() {
  const usersSnap = await db.collection('users').get();
  let count = 0;
  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;
    const eggsSnap = await db.collection('users').doc(uid).collection('eggs').get();
    for (const doc of eggsSnap.docs) {
      const e = doc.data();
      const exists = await Egg.findOne({ userId: uid, type: e.type, createdAt: tsToDate(e.createdAt) }).lean();
      if (exists) continue;
      await Egg.create({ userId: uid, type: e.type || 'normal', special: !!e.special, source: e.source || 'legacy', createdAt: tsToDate(e.createdAt) });
      count++;
    }
  }
  console.log(`Migrated eggs: ${count}`);
}

async function migratePromotionsAndStats() {
  const mother = await db.collection('promotions').doc('motherTierPrice').get();
  if (mother.exists) {
    const d = mother.data();
    await Promotion.updateOne({ key: 'motherTierPrice' }, { $set: { tiers: d.tiers || [] } }, { upsert: true });
  }
  const stats = await db.collection('promotions').doc('statistics').get();
  if (stats.exists) {
    const d = stats.data();
    await Stats.updateOne({ key: 'statistics' }, { $set: { totalChickenPurchase: d.totalChickenPurchase || 0 } }, { upsert: true });
  }
  console.log('Migrated promotions and statistics');
}

async function migrateTickets() {
  let count = 0;
  for (const pool of ['bronze','silver','gold']) {
    const snap = await db.collection(`pools/${pool}/tickets`).get();
    for (const doc of snap.docs) {
      const t = doc.data();
      const exists = await Ticket.findOne({ _id: doc.id }).lean();
      if (exists) continue;
      await Ticket.create({ _id: doc.id, pool, userId: t.userId, used: !!t.used, createdAt: tsToDate(t.createdAt) });
      count++;
    }
  }
  console.log(`Migrated tickets: ${count}`);
}

async function migrateUsersToMongoState() {
  const usersSnap = await db.collection('users').get();
  let count = 0;
  for (const userDoc of usersSnap.docs) {
    const u = userDoc.data() || {};
    // Create/merge User and UserState
    try {
      await User.updateOne({ uid: userDoc.id }, { $setOnInsert: { uid: userDoc.id, email: u.email || `${userDoc.id}@example.com` } }, { upsert: true });
    } catch {}
    await UserState.updateOne(
      { uid: userDoc.id },
      { $set: { coin_balance: u.coin_balance || 0, food: u.food || 0, farmName: u.farmName || null, usdtWallet: u.usdtWallet || null } },
      { upsert: true }
    );
    count++;
  }
  console.log(`Migrated users to Mongo state: ${count}`);
}

(async () => {
  try {
    await connectMongo();
    await migrateChickens();
    await migrateMarketOrders();
    await migrateEggs();
    await migratePromotionsAndStats();
    await migrateTickets();
    await migrateUsersToMongoState();
    console.log('Migration completed');
    process.exit(0);
  } catch (e) {
    console.error('Migration failed:', e && e.message ? e.message : e);
    process.exit(1);
  }
})();
