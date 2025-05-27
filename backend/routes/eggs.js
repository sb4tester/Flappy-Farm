const express = require('express');
const { claimEgg,  getEggs, sellEggs } = require('../controllers/eggsController');
const router = express.Router();

router.get('/', getEggs);
router.post('/sell', sellEggs);

router.post('/claim', verifyToken, claimEgg);

module.exports = router;
