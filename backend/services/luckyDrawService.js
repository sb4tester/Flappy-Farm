const admin = require('firebase-admin');
const db = admin.firestore();

async function addTickets(uid, packageType, quantity=1) {
  const now = admin.firestore.Timestamp.now();
  const pools = [];
  if (packageType === 'bronze') pools.push('bronze');
  if (packageType === 'silver') pools.push('silver', 'bronze');
  if (packageType === 'gold') pools.push('gold', 'silver', 'bronze');

  for (const pool of pools) {
    const batch = db.batch();
    for (let i=0; i<quantity; i++) {
      const ticketRef = db.collection(`pools/${pool}/tickets`).doc();
      batch.set(ticketRef, {
        userId: uid,
        createdAt: now,
        used: false
      });
    }
    await batch.commit();
  }
}

module.exports = { addTickets };
