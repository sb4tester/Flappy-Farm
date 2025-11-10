// Reset the deposit listener state in Mongo so the next run re-initializes
// using the current .env settings (e.g., INITIAL_BACKSCAN)
require('dotenv').config();
const { connectMongo } = require('../db/mongo');

(async () => {
  try {
    await connectMongo();
    const ListenerState = require('../models/ListenerState');
    const res = await ListenerState.deleteOne({ key: 'depositListener' }).exec();
    if (res.deletedCount === 0) {
      console.log('ListenerState { key: "depositListener" } not found; nothing to reset.');
    } else {
      console.log('Deleted ListenerState { key: "depositListener" }.');
    }
    console.log('Done. Next scanner run will re-initialize (backscan/window from .env).');
    process.exit(0);
  } catch (e) {
    console.error('Reset failed:', e && e.message ? e.message : e);
    process.exit(1);
  }
})();
