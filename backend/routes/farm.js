
const express = require('express');
const router = express.Router();
const { getChickens, buyMother, feedChicken, sellChicken } = require('../controllers/farmController');

router.get('/chickens', getChickens);
router.post('/buy-mother', buyMother);
router.post('/feed/:chickenId', feedChicken);
router.post('/sell/:chickenId', sellChicken);

module.exports = router;
