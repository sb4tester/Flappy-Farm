const chickenService = require('../services/chickenService');

exports.getChickens = async (req, res) => {
  try {
    const list = await chickenService.listChickens(req.user.uid);
    res.json({ chickens: list });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.buyMother = async (req, res) => {
  try {
    const { quantity } = req.body;
    if (!quantity || quantity <= 0) return res.status(400).json({ error: 'Invalid quantity' });
    const result = await chickenService.buyMother(req.user.uid, quantity);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.feedChicken = async (req, res) => {
  try {
    const { chickenId } = req.params;
    const result = await chickenService.feedChicken(req.user.uid, chickenId);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
};

exports.sellChicken = async (req, res) => {
  try {
    const { chickenId } = req.params;
    const result = await chickenService.sellChicken(req.user.uid, chickenId);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
};
