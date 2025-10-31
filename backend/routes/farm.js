const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/verifyToken');
const {
  getChickens,
  buyMother,
  feedChicken,
  feedMultipleChickens,
  sellChicken,
  checkChickenAge,
  getChickenCost
} = require('../controllers/farmController');
const admin = require('firebase-admin');
const db = admin.firestore();

// ตรวจว่าฟังก์ชันไม่ undefined
console.log('FarmController:', { getChickens, buyMother, feedChicken, feedMultipleChickens, sellChicken, checkChickenAge, getChickenCost });

// Get chickens route
router.get('/chickens', verifyToken, getChickens);

// Buy mother chicken route
router.post('/buy-mother', verifyToken, buyMother);

// Feed chicken route
router.post('/feed/:chickenId', verifyToken, feedChicken);

// Cost routes
router.get('/chicken/:chickenId/cost', verifyToken, getChickenCost);

// Sell chicken route
router.post('/sell', verifyToken, (req, res, next) => {
  console.log('DEBUG: POST /api/farm/sell quantity=', req.body.quantity, 'type=', req.query.type);
  next();
}, sellChicken);


// Check chicken age route
router.get('/check-age', verifyToken, checkChickenAge);

// GET /farm/status - ดึงข้อมูลสรุปฟาร์ม
router.get('/status', async (req, res) => {
  try {
    const userId = req.user.uid;
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const chickensRef = userRef.collection('chickens');
    const chickensSnapshot = await chickensRef.get();
    
    let summary = {
      totalChickens: 0,
      hungryChickens: 0,
      fullChickens: 0,
      deadChickens: 0,
      eggsReady: 0
    };

    chickensSnapshot.forEach(doc => {
      const chicken = doc.data();
      summary.totalChickens++;
      
      if (chicken.status === 'dead') {
        summary.deadChickens++;
      } else {
        const hoursSinceLastFed = (Date.now() - chicken.lastFed.toDate()) / (1000 * 60 * 60);
        if (hoursSinceLastFed >= 24) {
          summary.hungryChickens++;
        } else {
          summary.fullChickens++;
        }
      }

      if (chicken.hasEgg && chicken.eggReadyAt && chicken.eggReadyAt.toDate() <= new Date()) {
        summary.eggsReady++;
      }
    });

    res.json(summary);
  } catch (error) {
    console.error('Error getting farm status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// POST /farm/feed-multiple - ให้อาหารไก่หลายตัว
router.post('/feed-multiple', verifyToken, feedMultipleChickens);

// POST /farm/collect-eggs - เก็บไข่ทั้งหมด
router.post('/collect-eggs', async (req, res) => {
  try {
    const userId = req.user.uid;
    const userRef = db.collection('users').doc(userId);
    
    const chickensRef = userRef.collection('chickens');
    const chickensSnapshot = await chickensRef.where('hasEgg', '==', true)
      .where('eggReadyAt', '<=', new Date())
      .get();

    const batch = db.batch();
    let eggsCollected = 0;

    chickensSnapshot.forEach(doc => {
      const chickenRef = doc.ref;
      batch.update(chickenRef, {
        hasEgg: false,
        eggReadyAt: null
      });

      // เพิ่มไข่ใหม่ในคอลเลคชัน eggs
      const eggRef = userRef.collection('eggs').doc();
      batch.set(eggRef, {
        type: 'normal',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      eggsCollected++;
    });

    await batch.commit();
    res.json({ message: 'Eggs collected successfully', eggsCollected });
  } catch (error) {
    console.error('Error collecting eggs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
