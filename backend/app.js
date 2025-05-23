const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const verifyToken = require('./middlewares/verifyToken');

const authController = require('./controllers/authController');
const farmController = require('./controllers/farmController');
const eggsController = require('./controllers/eggsController');
const incubatorController = require('./controllers/incubatorController');
const marketController = require('./controllers/marketController');
const financeController = require('./controllers/financeController');
const referralController = require('./controllers/referralController');
require('./cron/dailyJobs');

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.post('/auth/login', authController.login);
app.post('/auth/logout', verifyToken, authController.logout);

app.get('/farm/chickens', verifyToken, farmController.getChickens);
app.post('/farm/buy-mother', verifyToken, farmController.buyMother);
app.post('/farm/feed/:id', verifyToken, farmController.feedChicken);
app.post('/chickens/sell', verifyToken, farmController.sellChicken);

app.get('/eggs', verifyToken, eggsController.getEggs);
app.post('/eggs/sell', verifyToken, eggsController.sellEggs);

app.post('/incubator/buy', verifyToken, incubatorController.buyIncubator);
app.post('/incubator/hatch', verifyToken, incubatorController.hatchEggs);

app.get('/market/orders', verifyToken, marketController.listOrders);
app.post('/market/order', verifyToken, marketController.createOrder);
app.post('/market/fill/:id', verifyToken, marketController.fillOrder);

app.post('/finance/deposit', verifyToken, financeController.deposit);

app.get('/referrals/tree', verifyToken, referralController.getReferralTree);
app.post('/referrals/action', verifyToken, referralController.handleReferralAction);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
