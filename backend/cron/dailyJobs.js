const { connectMongo } = require('../db/mongo');
const chickenRepo = require('../repositories/chickenRepo');
const eggRepo = require('../repositories/eggRepo');

async function spawnDailyEggs() {
  console.log('Spawning daily eggs via Mongo...');
  await dailyTaskMongo();
}

// New Mongo-based daily task (Mongo-only)
async function dailyTaskMongo() {
  console.log('Mongo daily task started...');
  const now = new Date();
  await connectMongo();
  const Chicken = require('../models/Chicken');
  const owners = await Chicken.distinct('ownerUid').exec();
  for (const uid of owners) {
    try {
      const chickens = await chickenRepo.getChickensByOwner(uid);
      for (const ch of chickens) {
        const lastFed = ch.lastFed ? new Date(ch.lastFed) : null;
        if (!lastFed) continue;
        const hoursSinceLastFed = (now - lastFed) / (1000*60*60);
        const update = {};
        if (hoursSinceLastFed > 72 && ch.status !== 'dead') { update.status = 'dead'; update.weight = 0; }
        else if (hoursSinceLastFed > 24 && ch.status !== 'hungry') { update.status = 'hungry'; }
        else if (hoursSinceLastFed <= 24 && ch.status !== 'normal') { update.status = 'normal'; }
        // Decrease weight only if the chicken has been hungry for >24 hours
        // and is currently (or will be set to) 'hungry'. Avoid calendar-day based deduction.
        if (hoursSinceLastFed > 24 && (ch.status === 'hungry' || update.status === 'hungry')) {
          update.weight = Math.max(0, (ch.weight || 0) - 0.1);
          if (update.weight === 0) update.status = 'dead';
        }
        if (Object.keys(update).length > 0) await chickenRepo.updateChicken(ch._id, update);
      }
      const eligible = chickens.filter(c => c.type === 'mother' && (c.feedCount || 0) >= 3 && c.status === 'normal');
      const dateKey = now.toISOString().slice(0, 10);
      const eggs = eligible.map(c => ({ userId: uid, type: 'normal', chickenId: String(c._id || c.fsId || ''), special: false, source: 'daily', key: `daily_${dateKey}_${c._id || c.fsId}` }));
      if (eggs.length > 0) { try { await eggRepo.bulkCreateEggs(eggs); } catch (e) {} }
    } catch (e) {
      console.warn('dailyTaskMongo user failed', uid, e && e.message ? e.message : e);
    }
  }
  console.log('Mongo daily task completed');
}

module.exports = { dailyTaskMongo, spawnDailyEggs };
