const { connectMongo } = require('../db/mongo');
const promotionRepo = require('../repositories/promotionRepo');
const statsRepo = require('../repositories/statsRepo');

exports.getMotherTierPrice = async (req, res) => {
  try {
    await connectMongo();
    const tiers = await promotionRepo.getMotherTierPrice();
    res.json({ type: 'motherTierPrice', tiers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getStatistics = async (req, res) => {
  try {
    await connectMongo();
    const stats = await statsRepo.getStats();
    if (!stats) return res.status(404).json({ error: 'Not found' });
    res.json({ totalChickenPurchase: stats.totalChickenPurchase || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}; 
