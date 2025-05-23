const eggService = require('../services/eggService');

exports.getEggs = async (req, res) => {
  try {
    const eggs = await eggService.listEggs(req.user.uid);
    res.json({ eggs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.sellEggs = async (req, res) => {
  try {
    const { type, quantity } = req.body;
    const result = await eggService.sellEggs(req.user.uid, type, quantity);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
};
