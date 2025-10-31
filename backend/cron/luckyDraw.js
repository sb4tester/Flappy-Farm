const { admin, db } = require('../firebase');

async function drawWinners(pool) {
  console.log(`🎯 Drawing winners in ${pool} pool...`);
  const ticketsSnap = await db.collection(`pools/${pool}/tickets`)
    .where('used', '==', false)
    .get();

  if (ticketsSnap.empty) {
    console.log(`❗ No tickets in ${pool} pool.`);
    return;
  }

  const tickets = ticketsSnap.docs;
  const randomIndex = Math.floor(Math.random() * tickets.length);
  const winnerTicket = tickets[randomIndex];
  const winnerUid = winnerTicket.data().userId;

  const now = admin.firestore.Timestamp.now();
  const eggRef = db.collection('users').doc(winnerUid).collection('eggs').doc();
  await eggRef.set({
    type: pool,
    createdAt: now,
    special: true,
    source: 'luckyDraw'
  });

  await winnerTicket.ref.update({ used: true });

  console.log(`🎉 Winner in ${pool} pool: user ${winnerUid}`);
}

module.exports = { drawWinners };
