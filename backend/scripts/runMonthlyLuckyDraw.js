// Manual script to run monthly lucky draw
require('dotenv').config();

const { runMonthlyLuckyDraw } = require('../cron/monthlyLuckyDraw');

function parseArgs(argv) {
  const opts = {};
  for (const a of argv.slice(2)) {
    if (a === '--force') opts.force = true;
    else if (a.startsWith('--month=')) opts.month = a.split('=')[1];
  }
  return opts;
}

(async function run() {
  try {
    const opts = parseArgs(process.argv);
    console.log('[monthly-lucky] Running with opts:', opts);
    const res = await runMonthlyLuckyDraw(opts);
    console.log('[monthly-lucky] Done:', res);
    process.exit(0);
  } catch (e) {
    console.error('[monthly-lucky] Error:', e && e.message ? e.message : e);
    process.exit(1);
  }
})();

