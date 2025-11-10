const LuckyRun = require('../models/LuckyRun');

async function ensureRun(cycle) {
  try {
    await LuckyRun.create({ cycle });
    return { created: true };
  } catch (e) {
    if (e && e.code === 11000) return { created: false }; // duplicate key
    throw e;
  }
}

module.exports = { ensureRun };

