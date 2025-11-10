const { connectMongo } = require('../db/mongo');
const eggRepo = require('../repositories/eggRepo');
const userRepo = require('../repositories/userRepo');
const transactionRepo = require('../repositories/transactionRepo');

exports.getEggs = async (req, res) => {
  const uid = req.user.uid;
  try {
    await connectMongo();
    const eggs = await eggRepo.listByUser(uid);
    res.json({ eggs: eggs.map(e => ({ id: String(e._id), ...e })) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.sellEggs = async (req, res) => {
  const uid = req.user.uid;
  const { type } = req.body;
  const quantityReq = Number(req.body?.quantity || 0);
  if (!type) return res.status(400).json({ error: 'Missing egg type' });
  try {
    await connectMongo();
    const count = await eggRepo.countByUserAndType(uid, type);
    if (count === 0) return res.json({ success: true, sold: 0, gained: 0 });
    const qty = quantityReq > 0 ? Math.min(count, Math.floor(quantityReq)) : count;
    let pricePer = 0;
    if (type === 'normal') pricePer = 0.1;
    if (type === 'copper' || type === 'bronze') pricePer = 10;
    if (type === 'silver') pricePer = 100;
    if (type === 'gold') pricePer = 1000;
    const sold = qty;
    // Normal eggs: pay exact 0.1 coin per egg (one decimal precision)
    const gained = (type === 'normal')
      ? Number((sold * 0.1).toFixed(1))
      : sold * pricePer;
    await eggRepo.deleteByUserAndTypeLimit(uid, type, sold);
    let afterBalance = null;
    if (gained > 0) {
      afterBalance = await userRepo.incCoins(uid, gained);
      try {
        await transactionRepo.createTransaction({
          userId: uid,
          type: 'SELL_EGG',
          amountCoin: gained,
          meta: { eggType: type, quantity: sold }
        });
      } catch (e) {
        // non-fatal if transaction log fails
        console.warn('SELL_EGG transaction log failed:', e && e.message ? e.message : e);
      }
    }
    res.json({ success: true, sold, gained, balanceAfter: afterBalance });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Optional: claimEgg via Mongo-based service can be added later
