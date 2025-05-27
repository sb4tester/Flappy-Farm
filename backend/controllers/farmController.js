const { db, admin } = require('../firebase');

exports.getChickens = async (req, res) => {
  const uid = req.user.uid;
  const snap = await db.collection('users').doc(uid).collection('chickens').get();
  const chickens = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  res.json({ chickens });
};

exports.buyMother = async (req, res) => {
  const uid = req.user.uid;
  const userRef = db.collection('users').doc(uid);
  const userSnap = await userRef.get();
  const user = userSnap.data() || {};
  const price = 10;
  if ((user.coin_balance || 0) < price) {
    return res.status(400).json({ error: 'Not enough coins' });
  }
  await userRef.update({ coin_balance: admin.firestore.FieldValue.increment(-price) });
  await userRef.collection('chickens').add({
    type: 'mother',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    lastFed: null,
    feedStreak: 0,
    weight: 1.0,
  });
  const statsRef = db.collection('promotions').doc('statistics');
  await statsRef.update({
    totalChickenPurchase: admin.firestore.FieldValue.increment(1)
  });
  res.json({ success: true });
};

exports.feedChicken = async (req, res) => {
  const uid = req.user.uid;
  const { id } = req.params;
  const chickenRef = db.collection('users').doc(uid).collection('chickens').doc(id);
  const snap = await chickenRef.get();
  if (!snap.exists) return res.status(404).json({ error: 'Chicken not found' });
  const chicken = snap.data();
  const now = admin.firestore.Timestamp.now();
  // weight gain per feed
  await chickenRef.update({ weight: (chicken.weight || 0) + 0.1 });
  // calculate streak
  let streak = 1;
  if (chicken.lastFed) {
    const lastFed = chicken.lastFed.toDate();
    const diff = Math.floor((Date.now() - lastFed) / (1000*60*60*24));
    streak = (diff === 1) ? (chicken.feedStreak || 0) + 1 : 1;
  }
  await chickenRef.update({ lastFed: now, feedStreak: streak });
  // spawn egg if streak >=3
  if (streak >= 3) {
    await db.collection('users').doc(uid).collection('eggs').add({
      type: 'normal',
      createdAt: now
    });
  }
  res.json({ success: true });
};

exports.sellChicken = async (req, res) => {
  const uid = req.user.uid;
  const { chickenId } = req.body;
  if (!chickenId) return res.status(400).json({ error: 'Missing chickenId' });
  const chickenRef = db.collection('users').doc(uid).collection('chickens').doc(chickenId);
  const snap = await chickenRef.get();
  if (!snap.exists) return res.status(404).json({ error: 'Chicken not found' });
  const chick = snap.data();
  const now = admin.firestore.Timestamp.now();
  const ageDays = Math.floor((now.toDate() - chick.createdAt.toDate()) / (1000*60*60*24));
  let price = 0;
  if (ageDays >= 365*3) price = 1000;
  else if (chick.weight >= 3) price = 7;
  else return res.status(400).json({ error: 'Chicken not sellable' });
  // update balance & remove chicken
  const userRef = db.collection('users').doc(uid);
  await userRef.update({ coin_balance: admin.firestore.FieldValue.increment(price) });
  await chickenRef.delete();
  res.json({ success: true, price });
};
