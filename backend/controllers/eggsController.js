const { db, admin } = require('../firebase');

exports.getEggs = async (req, res) => {
  const uid = req.user.uid;
  const snap = await db.collection('users').doc(uid).collection('eggs').get();
  const eggs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  res.json({ eggs });
};

exports.sellEggs = async (req, res) => {
  const uid = req.user.uid;
  const { type } = req.body;
  if (!type) return res.status(400).json({ error: 'Missing egg type' });
  const userRef = db.collection('users').doc(uid);
  const eggsRef = userRef.collection('eggs');
  const snap = await eggsRef.where('type', '==', type).get();
  if (snap.empty) return res.json({ success: true, sold: 0, gained: 0 });
  let pricePer = 0;
  if (type === 'normal') pricePer = 0.1;
  if (type === 'copper') pricePer = 10;
  if (type === 'silver') pricePer = 100;
  if (type === 'gold') pricePer = 1000;
  const sold = snap.size;
  const gained = type === 'normal'
    ? Math.floor(sold/10) * 1
    : sold * pricePer;
  // delete eggs
  const batch = db.batch();
  snap.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
  // update balance
  await userRef.update({ coin_balance: admin.firestore.FieldValue.increment(gained) });
  res.json({ success: true, sold, gained });
};

const { claimEgg } = require('../services/eggService');

exports.claimEgg = async (req, res) => {
  const uid = req.user.uid;

  try {
    const userSnap = await db.collection('users').doc(uid).get();
    const user = userSnap.data();
    const totalSpent = user?.totalChickenPurchase || 0;

    const eggType = await claimEgg(uid, totalSpent);
    res.json({ message: 'Egg claimed', eggType });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
