const express = require('express');
const cors = require('cors');
require('./firebase'); // initialize Firebase
const verifyToken = require('./middlewares/verifyFirebaseToken');

// Start scheduled jobs
const dailyJobs = require('./cron/dailyJobs');
dailyJobs.start();

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => res.json({ status: 'OK' }));

// Controllers
const farmController = require('./controllers/farmController');
const walletController = require('./controllers/walletController');
const eggsController = require('./controllers/eggsController');

// Routes
app.get('/farm/chickens', verifyToken, farmController.getChickens);
app.post('/farm/buy-mother', verifyToken, farmController.buyMother);
app.post('/farm/feed/:chickenId', verifyToken, farmController.feedChicken);
app.delete('/farm/sell/:chickenId', verifyToken, farmController.sellChicken);

app.get('/wallet/balance', verifyToken, walletController.getBalance);
app.post('/wallet/deposit', verifyToken, walletController.deposit);
app.post('/wallet/withdraw', verifyToken, walletController.withdraw);

app.get('/eggs', verifyToken, eggsController.getEggs);
app.post('/eggs/sell', verifyToken, eggsController.sellEggs);

// TODO: incubator, market, referral

const PORT = process.env.API_PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
