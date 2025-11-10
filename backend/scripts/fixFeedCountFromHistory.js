// Fix feedCount for all chickens by summing food units in costHistory (Mongo-only)
require('dotenv').config();

const { CHICKEN_FOOD_COST_PER_UNIT } = require('../config/constants');
const { connectMongo } = require('../db/mongo');
const Chicken = require('../models/Chicken');

function toUnits(entry) {
  if (!entry) return 0;
  if (Number.isFinite(entry.units)) return Number(entry.units) || 0;
  if (Number.isFinite(entry.amount)) {
    const units = entry.amount / CHICKEN_FOOD_COST_PER_UNIT;
    // Guard against float noise
    return Math.round(units);
  }
  return 0;
}

(async function run() {
  try {
    console.log('[fix-feedcount] Start (Mongo)');
    await connectMongo();
    let chickensUpdated = 0;
    let chickensScanned = 0;

    const cursor = Chicken.find({}).cursor();
    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
      const data = doc.toObject();
      chickensScanned++;
      const history = Array.isArray(data.costHistory) ? data.costHistory : [];
      const sumUnits = history.filter(h => h && h.type === 'food').reduce((acc, h) => acc + toUnits(h), 0);
      const current = Number(data.feedCount || 0);
      if (sumUnits !== current) {
        await Chicken.updateOne({ _id: doc._id }, { $set: { feedCount: sumUnits } }).exec();
        chickensUpdated++;
        console.log(`[fix-feedcount] ${data.ownerUid}/${data._id}: ${current} -> ${sumUnits}`);
      }
    }
    console.log('[fix-feedcount] Done', { chickensScanned, chickensUpdated });
    process.exit(0);
  } catch (e) {
    console.error('[fix-feedcount] Error:', e && e.message ? e.message : e);
    process.exit(1);
  }
})();
