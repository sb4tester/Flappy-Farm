const { db } = require('../firebase');

exports.getMotherTierPrice = async (req, res) => {
  try {
    const doc = await db.collection('promotions').doc('motherTierPrice').get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found' });
    res.json(doc.data());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getStatistics = async (req, res) => {
  try {
    const doc = await db.collection('promotions').doc('statistics').get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found' });
    res.json(doc.data());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}; 