const express = require('express');
const { getEggs, sellEggs } = require('../controllers/eggsController');
const router = express.Router();

router.get('/', getEggs);
router.post('/sell', sellEggs);

module.exports = router;
