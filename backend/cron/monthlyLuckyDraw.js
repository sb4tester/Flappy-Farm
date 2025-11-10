const { connectMongo } = require('../db/mongo');
const { drawWinners } = require('./luckyDraw');
const luckyRunRepo = require('../repositories/luckyRunRepo');

function toCycleString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}${m}`;
}

async function runMonthlyLuckyDraw(options = {}) {
  const now = new Date();
  const is25th = now.getDate() === 25;
  const force = !!options.force;

  if (!force && !is25th) {
    console.log('[monthly-lucky] Today is not the 25th. Use --force to override.');
    return { skipped: true };
  }

  let targetDate = now;
  if (options.month) {
    const m = String(options.month).trim(); // YYYY-MM
    const [y, mm] = m.split('-').map(Number);
    if (y && mm && mm >= 1 && mm <= 12) {
      targetDate = new Date(Date.UTC(y, mm - 1, 25));
    } else {
      console.warn('[monthly-lucky] Invalid --month format. Expected YYYY-MM. Using current month.');
    }
  }

  const cycle = toCycleString(targetDate);
  await connectMongo();
  const ensured = await luckyRunRepo.ensureRun(cycle);
  if (!ensured.created) {
    console.log(`[monthly-lucky] Already ran for ${cycle}, skipping.`);
    return { skipped: true, cycle };
  }

  for (const pool of ['bronze', 'silver', 'gold']) {
    try {
      await drawWinners(pool);
    } catch (e) {
      console.error(`[monthly-lucky] Error drawing for ${pool}:`, e && e.message ? e.message : e);
    }
  }

  return { cycle, skipped: false };
}

module.exports = { runMonthlyLuckyDraw };
