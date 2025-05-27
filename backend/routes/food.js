const express = require('express');
const router = express.Router();
const { buyFood } = require('../controllers/foodController');
const verifyToken = require('../middlewares/verifyToken');

// Buy food
router.post('/buy', verifyToken, buyFood);

module.exports = router; 