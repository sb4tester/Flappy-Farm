const express = require('express');
const { rentIncubator, hatchEggs } = require('../controllers/incubatorController');
const router = express.Router();

router.post('/rent', rentIncubator);
router.post('/hatch', hatchEggs);

module.exports = router;
