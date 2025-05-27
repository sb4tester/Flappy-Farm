
const express = require('express');
const router = express.Router();
const { feedChick, sellChick, getUserChicks } = require('../controllers/chickController');
const verifyToken = require('../middlewares/verifyToken');

router.post('/feed/:chickId', verifyToken, feedChick);
router.post('/sell/:chickId', verifyToken, sellChick);

router.get('/', verifyToken, getUserChicks);

module.exports = router;
