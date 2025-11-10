require('dotenv').config();
const { connectMongo } = require('../db/mongo');
const Chicken = require('../models/Chicken');

async function updateDeadWeights() {
  try {
    await connectMongo();
    const res = await Chicken.updateMany(
      { status: 'dead', weight: { $ne: 0 } },
      { $set: { weight: 0 } }
    ).exec();
    const totalUpdated = res.modifiedCount || 0;
    console.log(`[update-dead] Updated documents: ${totalUpdated}`);
    process.exit(0);
  } catch (err) {
    console.error('Failed to update dead chicken weights:', err && err.message ? err.message : err);
    process.exit(1);
  }
}

updateDeadWeights();
