const { connectMongo } = require('../db/mongo');
const chickenRepo = require('../repositories/chickenRepo');
const eggRepo = require('../repositories/eggRepo');

// Helpers for UTC day logic
function dateKeyUTC(d = new Date()) { return d.toISOString().slice(0, 10); }
function keyToDate(key) { return new Date(`${key}T00:00:00.000Z`); }
function daysBetweenKeysUTC(aKey, bKey) {
  const a = keyToDate(aKey).getTime();
  const b = keyToDate(bKey).getTime();
  return Math.floor((a - b) / (24 * 60 * 60 * 1000));
}

// 00:00 UTC spawn eggs only
async function spawnDailyEggs() {
  console.log('Spawning daily eggs via Mongo...');
  await connectMongo();
  const Chicken = require('../models/Chicken');
  const owners = await Chicken.distinct('ownerUid').exec();
  const todayKey = dateKeyUTC(new Date());
  for (const uid of owners) {
    try {
      const chickens = await chickenRepo.getChickensByOwner(uid);
      const eligible = chickens.filter(c => c.type === 'mother' && (c.feedCount || 0) >= 3 && c.status === 'normal');
      const eggs = eligible.map(c => ({
        userId: uid,
        type: 'normal',
        chickenId: String(c._id || c.fsId || ''),
        special: false,
        source: 'daily',
        key: `daily_${todayKey}_${c._id || c.fsId}`
      }));
      if (eggs.length > 0) {
        try { await eggRepo.bulkCreateEggs(eggs); } catch (e) {}
      }
    } catch (e) {
      console.warn('spawnDailyEggs user failed', uid, e && e.message ? e.message : e);
    }
  }
  console.log('Spawn daily eggs completed');
}

// 00:30 UTC set non-dead chickens to hungry, but do NOT override if already fed today (UTC)
async function resetMorningStatuses() {
  console.log('Morning reset: setting eligible chickens to hungry (UTC-day aware)...');
  await connectMongo();
  const Chicken = require('../models/Chicken');
  const todayKey = dateKeyUTC(new Date());
  try {
    // Fetch minimal fields to decide per-chicken safely (idempotent and fallback-safe)
    const chickens = await Chicken.find({ status: { $ne: 'dead' } })
      .select('_id status lastFed weight')
      .lean()
      .exec();
    let modified = 0;
    for (const ch of chickens) {
      try {
        const lastFed = ch.lastFed ? new Date(ch.lastFed) : null;
        const lastFedKey = lastFed ? dateKeyUTC(lastFed) : null;
        if (lastFedKey === todayKey) continue; // already fed today; don't override
        if (ch.status !== 'hungry') {
          await chickenRepo.updateChicken(ch._id, { status: 'hungry' });
          modified++;
        }
      } catch {}
    }
    console.log('Morning reset completed. Updated:', modified);
  } catch (e) {
    console.error('Morning reset failed:', e && e.message ? e.message : e);
  }
}

// 12:00 UTC end-of-day evaluation based on UTC dates
async function endOfDayStatusUpdate() {
  console.log('EOD status update (UTC) started...');
  await connectMongo();
  const Chicken = require('../models/Chicken');
  const todayKey = dateKeyUTC(new Date());
  const chickens = await Chicken.find({}).lean().exec();
  for (const ch of chickens) {
    try {
      if (ch.status === 'dead') continue;
      if (ch.lastEodKey === todayKey) continue; // already processed today (idempotent)
      const lastFed = ch.lastFed ? new Date(ch.lastFed) : null;
      const lastFedKey = lastFed ? dateKeyUTC(lastFed) : null;
      let update = {};

      if (!lastFedKey) {
        update = { status: 'dead', weight: 0 };
      } else {
        const daysSince = daysBetweenKeysUTC(todayKey, lastFedKey);
        if (daysSince >= 3) {
          update = { status: 'dead', weight: 0 };
        } else if (lastFedKey === todayKey) {
          if (ch.status !== 'normal') update = { status: 'normal' };
        } else {
          const newWeight = Math.max(0, (ch.weight || 0) - 0.1);
          if (newWeight === 0) {
            update = { status: 'dead', weight: 0 };
          } else {
            update = { status: 'hungry', weight: newWeight };
          }
        }
      }

      // Stamp lastEodKey to make this operation idempotent across multiple triggers.
      // Use atomic conditional update to avoid race between cron and fallback.
      if (Object.keys(update).length > 0) {
        const setFields = { ...update, lastEodKey: todayKey };
        await Chicken.updateOne({ _id: ch._id, lastEodKey: { $ne: todayKey } }, { $set: setFields }).exec();
      }
    } catch (e) {
      console.warn('EOD update failed for chicken', ch._id, e && e.message ? e.message : e);
    }
  }
  console.log('EOD status update completed');
}

module.exports = { spawnDailyEggs, resetMorningStatuses, endOfDayStatusUpdate };
