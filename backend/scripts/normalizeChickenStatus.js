// Normalize Chicken status to only: normal, hungry, dead
// - alive -> normal
// - listed/sold/burned -> keep record but map to normal (listing handled by marketOrderId; sold/burned shouldn't exist on Chicken now)
// Usage: node scripts/normalizeChickenStatus.js
require('dotenv').config();
const { connectMongo } = require('../db/mongo');
const Chicken = require('../models/Chicken');

(async () => {
  try {
    await connectMongo();
    const allowed = new Set(['normal','hungry','dead']);
    let updated = 0;

    const cursor = Chicken.find({}).cursor();
    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
      const s = (doc.status || '').toString();
      let target = null;
      if (s === 'alive') target = 'normal';
      else if (!allowed.has(s)) target = 'normal';
      if (target && target !== s) {
        await Chicken.updateOne({ _id: doc._id }, { $set: { status: target } }).exec();
        updated++;
      }
    }
    console.log(`Normalized chicken statuses: ${updated}`);
    process.exit(0);
  } catch (e) {
    console.error('Normalization failed:', e && e.message ? e.message : e);
    process.exit(1);
  }
})();

