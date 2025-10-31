// Reset the deposit listener state so the next run re-initializes
// using the current .env settings (e.g., INITIAL_BACKSCAN)
require('dotenv').config();
const { admin, db } = require('../firebase');

(async () => {
  try {
    const ref = db.collection('listenerState').doc('depositListener');
    const snap = await ref.get();
    if (!snap.exists) {
      console.log('listenerState/depositListener does not exist; nothing to reset.');
    } else {
      await ref.delete();
      console.log('Deleted listenerState/depositListener.');
    }
    console.log('Done. Next scanner run will re-initialize (backscan/window from .env).');
    process.exit(0);
  } catch (e) {
    console.error('Reset failed:', e && e.message ? e.message : e);
    process.exit(1);
  }
})();

