const express = require('express');
const router = express.Router();
const promotionsController = require('../controllers/promotionsController');

router.get('/mother-tier-price', promotionsController.getMotherTierPrice);
router.get('/statistics', promotionsController.getStatistics);

module.exports = router; 