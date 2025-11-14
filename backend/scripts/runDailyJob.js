// Run one of: eggs | reset | eod
require('dotenv').config();

const { spawnDailyEggs, resetMorningStatuses, endOfDayStatusUpdate } = require('../cron/dailyJobs');

const job = (process.argv[2] || '').toLowerCase();

async function run() {
  try {
    if (job === 'eggs') {
      await spawnDailyEggs();
    } else if (job === 'reset') {
      await resetMorningStatuses();
    } else if (job === 'eod') {
      await endOfDayStatusUpdate();
    } else {
      console.log('Usage: node backend/scripts/runDailyJob.js <eggs|reset|eod>');
      process.exit(2);
    }
    console.log(`[runDailyJob] Completed: ${job}`);
    process.exit(0);
  } catch (e) {
    console.error('[runDailyJob] Error:', e && e.message ? e.message : e);
    process.exit(1);
  }
}

run();

