const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/verifyToken');
const walletController = require('../controllers/walletController');

router.get('/balance',   verifyToken, walletController.getBalance);
router.post('/deposit',  verifyToken, walletController.deposit);
router.post('/withdraw', verifyToken, walletController.withdraw);
router.get('/deposit-address', verifyToken, walletController.getDepositAddress);
router.get('/transactions/deposit', verifyToken, walletController.getDepositTransactions);

module.exports = router;
