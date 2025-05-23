const express = require('express');
const { handleReferralAction } = require('../controllers/referralController');
const router = express.Router();

router.post('/action', handleReferralAction);

module.exports = router;
