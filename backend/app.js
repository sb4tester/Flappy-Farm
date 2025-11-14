// app.js - แก้ไขการ setup
const express = require('express');
const cors = require('cors');
require('dotenv').config(); // ← เพิ่ม dotenv
const admin = require('firebase-admin');
const farmRoutes = require('./routes/farm');

const verifyToken = require('./middlewares/verifyToken');
const farmController = require('./controllers/farmController');
const eggsController = require('./controllers/eggsController');
const marketController = require('./controllers/marketController');
const financeController = require('./controllers/financeController');
const referralController = require('./controllers/referralController');
const promotionsRoutes = require('./routes/promotions');
const foodRoutes = require('./routes/food');
const incubatorRoutes = require('./routes/incubator');
const marketRoutes = require('./routes/market'); // เพิ่มบรรทัดนี้
const cron = require('node-cron');
const dailyJobs = require('./cron/dailyJobs');
const { drawWinners } = require('./cron/luckyDraw');
const { connectMongo } = require('./db/mongo');

// Removed midnight dailyTask; logic moved to explicit 07:30 and 19:00 jobs

// Spawn eggs daily at 00:00 UTC (== 07:00 Asia/Bangkok)
cron.schedule('0 0 * * *', async () => {
  await dailyJobs.spawnDailyEggs();
}, { timezone: 'UTC' });

// Catch-up guard (UTC-aware) — checks every 5 minutes
// - 00:30 UTC reset: after 00:35 UTC if not yet done today
// - 12:00 UTC EOD: after 12:05 UTC if not yet done today
// Note: main cron runs in UTC; this guard only ensures missed runs get executed
(function setupUtcCatchupGuard() {
  let lastResetDateUTC = null; // key: YYYY-MM-DD (UTC)
  let lastEodDateUTC = null;   // key: YYYY-MM-DD (UTC)

  function getUtcDateKey(d) {
    return new Date(d.getTime()).toISOString().slice(0, 10);
  }

  async function maybeRunUtcCatchups() {
    try {
      const now = new Date();
      const dateKey = getUtcDateKey(now);
      const hour = now.getUTCHours();
      const minute = now.getUTCMinutes();

      // Catch-up after 00:35 UTC if reset not yet done today
      const passedResetWindow = (hour > 0) || (hour === 0 && minute >= 35);
      if (passedResetWindow && lastResetDateUTC !== dateKey) {
        if (typeof dailyJobs.resetMorningStatuses === 'function') {
          console.log(`[CatchupGuard] resetMorningStatuses for ${dateKey} (>00:35 UTC)`);
          await dailyJobs.resetMorningStatuses();
        }
        lastResetDateUTC = dateKey;
      }

      // Catch-up after 12:05 UTC if EOD not yet done today
      const passedEodWindow = (hour > 12) || (hour === 12 && minute >= 5);
      if (passedEodWindow && lastEodDateUTC !== dateKey) {
        if (typeof dailyJobs.endOfDayStatusUpdate === 'function') {
          console.log(`[CatchupGuard] endOfDayStatusUpdate for ${dateKey} (>12:05 UTC)`);
          await dailyJobs.endOfDayStatusUpdate();
        }
        lastEodDateUTC = dateKey;
      }
    } catch (e) {
      console.error('[CatchupGuard] Error while running UTC catch-ups:', e && e.message ? e.message : e);
    }
  }

  // Kick off loop
  setInterval(maybeRunUtcCatchups, 5 * 60 * 1000);
})();

// ทุก 7 วัน → lucky draw ไข่ทองแดง
// Removed periodic bronze lucky draw (moved to monthly on 25th)

// ทุก 14 วัน → lucky draw ไข่เงิน
// Removed periodic silver lucky draw (moved to monthly on 25th)

// ทุก 28 วัน → lucky draw ไข่ทอง
// Monthly lucky draw on the 25th Bangkok midnight corresponds to 17:00 UTC on the previous (24th) day.
// Schedule at 17:00 UTC on the 24th to match 00:00 BKK on the 25th.
cron.schedule('0 17 24 * *', async () => {
  try {
    const { runMonthlyLuckyDraw } = require('./cron/monthlyLuckyDraw');
    await runMonthlyLuckyDraw();
  } catch (e) {
    console.error('[MonthlyLuckyDraw] Error:', e && e.message ? e.message : e);
  }
}, { timezone: 'UTC' });

// Morning reset at 00:30 UTC (== 07:30 Asia/Bangkok): set all non-dead chickens to hungry
cron.schedule('30 0 * * *', async () => {
  try {
    if (typeof dailyJobs.resetMorningStatuses === 'function') {
      await dailyJobs.resetMorningStatuses();
    }
  } catch (e) {
    console.error('[MorningReset] Error:', e && e.message ? e.message : e);
  }
}, { timezone: 'UTC' });

// End-of-day evaluation at 12:00 UTC (== 19:00 Asia/Bangkok)
cron.schedule('0 12 * * *', async () => {
  try {
    if (typeof dailyJobs.endOfDayStatusUpdate === 'function') {
      await dailyJobs.endOfDayStatusUpdate();
    }
  } catch (e) {
    console.error('[EndOfDayStatus] Error:', e && e.message ? e.message : e);
  }
}, { timezone: 'UTC' });

const app = express();
app.use(cors());
app.use(express.json());

// Ensure MongoDB is connected on startup
connectMongo().catch((e) => {
  console.error('MongoDB connection failed at startup:', e && e.message ? e.message : e);
  process.exit(1);
});

// ใช้ auth routes เท่านั้น ลบ duplicate routes
app.use('/auth', require('./routes/auth'));

// Protected routes
app.get('/farm/chickens', verifyToken, farmController.getChickens);
app.post('/farm/buy-mother', verifyToken, farmController.buyMother);
app.post('/farm/feed/:id', verifyToken, farmController.feedChicken);
app.post('/chickens/sell', verifyToken, farmController.sellChicken);

app.get('/eggs', verifyToken, eggsController.getEggs);
app.post('/eggs/sell', verifyToken, eggsController.sellEggs);

// Market routes - เก่า (เก็บไว้เพื่อ backward compatibility)
app.get('/market/orders', verifyToken, marketController.listOrders);
app.post('/market/order', verifyToken, marketController.createOrder);
app.post('/market/fill/:id', verifyToken, marketController.fillOrder);

app.post('/finance/deposit', verifyToken, financeController.deposit);

app.get('/referrals/tree', verifyToken, referralController.getReferralTree);
app.post('/referrals/action', verifyToken, referralController.handleReferralAction);

app.use('/user', require('./routes/user'));

// Wallet routes
app.use('/wallet', require('./routes/wallet'));

app.use('/promotions', promotionsRoutes);

// Food routes
app.use('/food', foodRoutes);

// Incubator routes
app.use('/incubator', incubatorRoutes);

// Market routes - ใหม่ (เพิ่มบรรทัดนี้)
app.use('/api/market', marketRoutes);

// Routes
app.use('/api/farm', farmRoutes);
app.use('/debug', require('./routes/debug'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.API_PORT || process.env.PORT || 5000;

// On-chain deposit scanner every 1 minute (UTC)
cron.schedule('*/1 * * * *', async () => {
  try {
    const { scanDepositsOnce } = require('./depositScanner');
    await scanDepositsOnce();
  } catch (e) {
    console.error('Deposit scanner error:', e && e.message ? e.message : e);
  }
}, { timezone: 'UTC' });
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));



