const express = require('express');
const { listOrders, createOrder, fillOrder } = require('../controllers/marketController');
const router = express.Router();

router.get('/orders', listOrders);
router.post('/order', createOrder);
router.post('/fill/:orderId', fillOrder);

module.exports = router;
