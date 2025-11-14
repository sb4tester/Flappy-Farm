const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/verifyToken');
const debugController = require('../controllers/debugController');

router.get('/whoami', verifyToken, debugController.whoami);

module.exports = router;

