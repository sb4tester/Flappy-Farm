const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/verifyToken');
const { connectMongo } = require('../db/mongo');
const chickenRepo = require('../repositories/chickenRepo');
const eggRepo = require('../repositories/eggRepo');
const {
  getChickens,
  buyMother,
  feedChicken,
  feedMultipleChickens,
  sellChicken,
  checkChickenAge,
  getChickenCost
} = require('../controllers/farmController');

// Core routes
router.get('/chickens', verifyToken, getChickens);
router.post('/buy-mother', verifyToken, buyMother);
router.post('/feed/:chickenId', verifyToken, feedChicken);
router.get('/chicken/:chickenId/cost', verifyToken, getChickenCost);
router.post('/sell', verifyToken, (req, res, next) => { console.log('DEBUG: POST /api/farm/sell quantity=', req.body.quantity, 'type=', req.query.type); next(); }, sellChicken);
router.get('/check-age', verifyToken, checkChickenAge);

// Status (Mongo-based)
router.get('/status', async (req, res) => {
  try {
    const userId = req.user.uid;
    await connectMongo();
    const chickens = await chickenRepo.getChickensByOwner(userId);
    const summary = { totalChickens: 0, hungryChickens: 0, fullChickens: 0, deadChickens: 0, eggsReady: 0 };
    const now = Date.now();
    for (const c of chickens) {
      summary.totalChickens++;
      if (c.status === 'dead') summary.deadChickens++;
      else {
        const lastFed = c.lastFed ? new Date(c.lastFed).getTime() : 0;
        const hours = lastFed ? (now - lastFed) / (1000*60*60) : 999;
        if (hours >= 24) summary.hungryChickens++; else summary.fullChickens++;
      }
    }
    const eggs = await eggRepo.listByUser(userId);
    summary.eggsReady = eggs.length;
    res.json(summary);
  } catch (error) {
    console.error('Error getting farm status (Mongo):', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Feed multiple (Mongo-first controller)
router.post('/feed-multiple', verifyToken, feedMultipleChickens);

// Collect eggs (Mongo-based)
router.post('/collect-eggs', async (req, res) => {
  try {
    const userId = req.user.uid;
    await connectMongo();
    const chickens = await chickenRepo.getChickensByOwner(userId);
    const now = new Date();
    const dateKey = now.toISOString().slice(0,10);
    const eligible = chickens.filter(c => c.type === 'mother' && (c.feedCount || 0) >= 3 && c.status === 'normal');
    const eggs = eligible.map(c => ({ userId, type: 'normal', chickenId: String(c._id || c.fsId || ''), special: false, source: 'collect', key: `collect_${dateKey}_${c._id || c.fsId}` }));
    if (eggs.length > 0) { try { await eggRepo.bulkCreateEggs(eggs); } catch (e) {} }
    res.json({ message: 'Eggs collected successfully', eggsCollected: eggs.length });
  } catch (error) {
    console.error('Error collecting eggs (Mongo):', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
