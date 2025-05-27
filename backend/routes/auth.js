// routes/auth.js - แก้ไข routes
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// ย้าย register route มาไว้ก่อน module.exports
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.post('/register', authController.register);

module.exports = router;