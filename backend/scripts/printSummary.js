// Prints chickens status summary and today's daily eggs count (UTC day)
require('dotenv').config();

const { connectMongo } = require('../db/mongo');

function dateKeyUTC(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

(async function main() {
  try {
    await connectMongo();
    const Chicken = require('../models/Chicken');
    const Egg = require('../models/Egg');

    const total = await Chicken.countDocuments({}).exec();
    const normal = await Chicken.countDocuments({ status: 'normal' }).exec();
    const hungry = await Chicken.countDocuments({ status: 'hungry' }).exec();
    const dead = await Chicken.countDocuments({ status: 'dead' }).exec();

    const todayKey = dateKeyUTC();
    const eggsToday = await Egg.countDocuments({ key: { $regex: `^daily_${todayKey}_` } }).exec();

    console.log('[Summary] UTC date:', todayKey);
    console.log(`[Summary] Chickens: total=${total}, normal=${normal}, hungry=${hungry}, dead=${dead}`);
    console.log(`[Summary] Daily eggs today: ${eggsToday}`);
    process.exit(0);
  } catch (e) {
    console.error('printSummary error:', e && e.message ? e.message : e);
    process.exit(1);
  }
})();
