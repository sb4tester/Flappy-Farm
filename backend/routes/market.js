const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/verifyToken');
const {
  listOrders,
  createOrder,
  fillOrder,
  listChickenForSale,
  buyChicken,
  cancelMarketListing,
  listMarketOrdersOpen
} = require('../controllers/marketController');

// ถ้าต้องการยืนยัน token
router.use(verifyToken);

// Old market routes
router.get('/orders', listOrders);
router.post('/order', createOrder);
router.post('/fill/:orderId', fillOrder);

// Chicken market routes
router.post('/chicken/:chickenId/list', listChickenForSale);
router.post('/chicken/:orderId/buy', buyChicken);
router.delete('/chicken/:orderId/cancel', cancelMarketListing);
router.get('/chicken/listings', listMarketOrdersOpen);

module.exports = router; 
