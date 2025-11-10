// One-off script to spawn daily eggs immediately (Mongo-only)
require('dotenv').config();

const { dailyTaskMongo } = require('../cron/dailyJobs');

(async function run() {
  try {
    console.log('[spawn-eggs] Spawning daily eggs for all users via Mongo (manual trigger)...');
    await dailyTaskMongo();
    console.log('[spawn-eggs] Done.');
    process.exit(0);
  } catch (e) {
    console.error('[spawn-eggs] Error:', e && e.message ? e.message : e);
    process.exit(1);
  }
})();
