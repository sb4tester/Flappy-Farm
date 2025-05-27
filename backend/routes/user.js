const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/verifyToken');
const userController = require('../controllers/userController');

router.get('/profile', verifyToken, userController.getProfile);

module.exports = router;