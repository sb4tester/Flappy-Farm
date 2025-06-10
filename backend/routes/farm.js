const express = require('express');
const router = express.Router();
const { getChickens, buyMother, feedChicken, sellChicken, checkChickenAge } = require('../controllers/farmController');
const admin = require('firebase-admin');
const db = admin.firestore();

router.get('/chickens', getChickens);
router.post('/buy-mother', buyMother);
router.post('/feed/:id', feedChicken);
router.post('/sell', sellChicken);
router.post('/check-age', checkChickenAge);

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
router.post('/feed-multiple', async (req, res) => {
  try {
    const userId = req.user.uid;
    const { chickenIds } = req.body;
    
    if (!Array.isArray(chickenIds)) {
      return res.status(400).json({ error: 'Invalid chicken IDs' });
    }

    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    const foodRequired = chickenIds.length * 10; // 10 หน่วยต่อไก่

    if (userData.food < foodRequired) {
      return res.status(400).json({ error: 'Not enough food' });
    }

    const batch = db.batch();
    
    // อัพเดทอาหารของผู้ใช้
    batch.update(userRef, {
      food: admin.firestore.FieldValue.increment(-foodRequired)
    });

    // อัพเดทสถานะไก่แต่ละตัว
    for (const chickenId of chickenIds) {
      const chickenRef = userRef.collection('chickens').doc(chickenId);
      batch.update(chickenRef, {
        lastFed: admin.firestore.FieldValue.serverTimestamp(),
        status: 'full'
      });
    }

    await batch.commit();
    res.json({ message: 'Chickens fed successfully' });
  } catch (error) {
    console.error('Error feeding chickens:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

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
