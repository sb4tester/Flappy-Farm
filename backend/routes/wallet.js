const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/verifyToken');
const walletController = require('../controllers/walletController');

router.get('/balance',   verifyToken, walletController.getBalance);
router.post('/deposit',  verifyToken, walletController.deposit);
router.post('/withdraw', verifyToken, walletController.withdraw);

module.exports = router;
