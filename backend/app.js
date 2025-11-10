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

cron.schedule('0 0 * * *', async () => {
  if (typeof dailyJobs.dailyTaskMongo === 'function') {
    await dailyJobs.dailyTaskMongo();
  } else {
    await dailyJobs.dailyTask();
  }
});

// Spawn eggs daily at 07:00 Asia/Bangkok (cron-based)
cron.schedule('0 7 * * *', async () => {
  await dailyJobs.spawnDailyEggs();
}, { timezone: 'Asia/Bangkok' });

// Fallback scheduler in case timezone handling on host is unreliable
// Checks Bangkok time every minute and triggers once per Bangkok day at 07:00
(function setupBangkokFallbackScheduler() {
  const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000; // UTC+7, no DST
  let lastRunDateBangkok = null; // "YYYY-MM-DD"

  function getBangkokNow() {
    return new Date(Date.now() + BANGKOK_OFFSET_MS);
  }

  function getBangkokDateKey(d) {
    return d.toISOString().slice(0, 10); // safe because we already shifted by +7h
  }

  async function maybeRunDailyEggs() {
    try {
      const nowBkk = getBangkokNow();
      const dateKey = getBangkokDateKey(nowBkk);
      const hour = nowBkk.getUTCHours(); // after shift, UTC hours == Bangkok local hours
      const minute = nowBkk.getUTCMinutes();

      if (hour === 7 && minute === 0 && lastRunDateBangkok !== dateKey) {
        console.log(`[FallbackScheduler] Triggering spawnDailyEggs for ${dateKey} (Asia/Bangkok 07:00)`);
        await dailyJobs.spawnDailyEggs();
        lastRunDateBangkok = dateKey;
      }
    } catch (e) {
      console.error('[FallbackScheduler] Error while spawning daily eggs:', e && e.message ? e.message : e);
    }
  }

  // Kick off loop
  setInterval(maybeRunDailyEggs, 60 * 1000);
})();

// ทุก 7 วัน → lucky draw ไข่ทองแดง
// Removed periodic bronze lucky draw (moved to monthly on 25th)

// ทุก 14 วัน → lucky draw ไข่เงิน
// Removed periodic silver lucky draw (moved to monthly on 25th)

// ทุก 28 วัน → lucky draw ไข่ทอง
// Monthly lucky draw on the 25th (Asia/Bangkok), once per month
cron.schedule('0 0 25 * *', async () => {
  try {
    const { runMonthlyLuckyDraw } = require('./cron/monthlyLuckyDraw');
    await runMonthlyLuckyDraw();
  } catch (e) {
    console.error('[MonthlyLuckyDraw] Error:', e && e.message ? e.message : e);
  }
}, { timezone: 'Asia/Bangkok' });

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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.API_PORT || process.env.PORT || 5000;

// On-chain deposit scanner every 1 minute (Asia/Bangkok)
cron.schedule('*/1 * * * *', async () => {
  try {
    const { scanDepositsOnce } = require('./depositScanner');
    await scanDepositsOnce();
  } catch (e) {
    console.error('Deposit scanner error:', e && e.message ? e.message : e);
  }
}, { timezone: 'Asia/Bangkok' });
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));



