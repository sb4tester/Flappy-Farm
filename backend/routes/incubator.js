const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/verifyToken'); // เอา {} ออก

// ลอง debug ก่อนว่า import ได้หรือไม่
const incubatorController = require('../controllers/incubatorController');
console.log('incubatorController:', incubatorController); // เพิ่มบรรทัดนี้เพื่อ debug
console.log('verifyToken:', typeof verifyToken); // เพิ่มบรรทัดนี้เพื่อ debug verifyToken

// ตรวจสอบว่าแต่ละ function มีอยู่จริงหรือไม่
console.log('buyIncubator:', typeof incubatorController.buyIncubator);
console.log('listIncubators:', typeof incubatorController.listIncubators);
console.log('hatchEggs:', typeof incubatorController.hatchEggs);

router.post('/buy', verifyToken, incubatorController.buyIncubator);
router.post('/hatch', verifyToken, incubatorController.hatchEggs); // เพิ่ม route สำหรับ hatch
router.get('/list', verifyToken, incubatorController.listIncubators);

module.exports = router;