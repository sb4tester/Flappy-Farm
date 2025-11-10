const { connectMongo } = require('../db/mongo');
const userRepo = require('../repositories/userRepo');
const transactionRepo = require('../repositories/transactionRepo');
const incubatorRepo = require('../repositories/incubatorRepo');
const chickenRepo = require('../repositories/chickenRepo');

const INCUBATOR_PRICE = 10;
const INCUBATOR_CAPACITY = 5;

const buyIncubator = async (req, res) => {
  try {
    const userId = req.user.uid;
    await connectMongo();
    try { await userRepo.decCoins(userId, INCUBATOR_PRICE); } catch (e) { return res.status(400).json({ error: 'Not enough coins' }); }
    const inc = await incubatorRepo.create(userId, INCUBATOR_CAPACITY);
    await transactionRepo.createTransaction({ userId, type: 'BUY_INCUBATOR', amountCoin: -INCUBATOR_PRICE, meta: { incubatorId: inc._id ? String(inc._id) : null, capacity: INCUBATOR_CAPACITY } });
    const coins = await userRepo.getCoins(userId);
    res.json({ success: true, data: { coin_balance: coins } });
  } catch (error) {
    console.error('Error buying incubator:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const hatchEggs = async (req, res) => {
  const uid = req.user.uid;
  const { eggIds } = req.body;
  if (!Array.isArray(eggIds) || eggIds.length === 0) {
    return res.status(400).json({ error: 'Missing eggIds' });
  }
  try {
    await connectMongo();
    const inc = await incubatorRepo.findAvailable(uid);
    if (!inc) return res.status(400).json({ error: 'No available incubator slots' });
    const available = (inc.capacity || 5) - (inc.usedSlots || 0);
    if (eggIds.length > available) {
      return res.status(400).json({ error: 'Too many eggs', available });
    }
    let hatched = 0;
    for (const id of eggIds) {
      await chickenRepo.createChicken({ ownerUid: uid, type: 'baby', birthDate: new Date(), lastFed: null, weight: 0.5, status: 'alive', specialSale: false });
      hatched++;
    }
    await incubatorRepo.incUsedSlots(inc._id, hatched);
    res.json({ success: true, hatched });
  } catch (error) {
    console.error('Error hatching eggs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const listIncubators = async (req, res) => {
  try {
    const userId = req.user.uid;
    await connectMongo();
    const incubators = await incubatorRepo.listByUser(userId);
    res.json({ success: true, data: incubators.map(i => ({ id: String(i._id), ...i })) });
  } catch (error) {
    console.error('Error listing incubators:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { buyIncubator, hatchEggs, listIncubators };
