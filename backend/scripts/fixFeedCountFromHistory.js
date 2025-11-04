// Fix feedCount for all chickens by summing food units in costHistory
require('dotenv').config();

const { admin, db } = require('../firebase');
const { CHICKEN_FOOD_COST_PER_UNIT } = require('../config/constants');

function toUnits(entry) {
  if (!entry) return 0;
  if (Number.isFinite(entry.units)) return Number(entry.units) || 0;
  if (Number.isFinite(entry.amount)) {
    const units = entry.amount / CHICKEN_FOOD_COST_PER_UNIT;
    // Guard against float noise
    return Math.round(units);
  }
  return 0;
}

(async function run() {
  try {
    console.log('[fix-feedcount] Start');
    const usersSnap = await db.collection('users').get();
    let usersProcessed = 0;
    let chickensUpdated = 0;
    let chickensScanned = 0;

    for (const userDoc of usersSnap.docs) {
      const uid = userDoc.id;
      const chickensRef = db.collection('users').doc(uid).collection('chickens');
      const chickensSnap = await chickensRef.get();

      for (const chDoc of chickensSnap.docs) {
        const data = chDoc.data() || {};
        chickensScanned++;

        const history = Array.isArray(data.costHistory) ? data.costHistory : [];
        const sumUnits = history
          .filter(h => h && h.type === 'food')
          .reduce((acc, h) => acc + toUnits(h), 0);

        const current = Number(data.feedCount || 0);
        if (sumUnits !== current) {
          await chDoc.ref.update({ feedCount: sumUnits, feedCountPatchedAt: admin.firestore.FieldValue.serverTimestamp() });
          chickensUpdated++;
          console.log(`[fix-feedcount] ${uid}/${chDoc.id}: ${current} -> ${sumUnits}`);
        }
      }

      usersProcessed++;
    }

    console.log('[fix-feedcount] Done', { usersProcessed, chickensScanned, chickensUpdated });
    process.exit(0);
  } catch (e) {
    console.error('[fix-feedcount] Error:', e && e.message ? e.message : e);
    process.exit(1);
  }
})();

