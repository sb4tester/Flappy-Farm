const { db, admin } = require('../firebase');

exports.listOrders = async (req, res) => {
  const snap = await db.collection('orders').get();
  const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  res.json({ orders });
};

exports.createOrder = async (req, res) => {
  const uid = req.user.uid;
  const { chickenId, price } = req.body;
  if (!chickenId || !price) return res.status(400).json({ error: 'Missing fields' });
  const userRef = db.collection('users').doc(uid);
  const chickRef = userRef.collection('chickens').doc(chickenId);
  const chickSnap = await chickRef.get();
  if (!chickSnap.exists) return res.status(404).json({ error: 'Chicken not found' });
  const chick = chickSnap.data();
  if ((chick.weight || 0) < 3) return res.status(400).json({ error: 'Chicken must weigh >=3kg' });
  // remove chicken
  await chickRef.delete();
  // create order
  await db.collection('orders').add({
    seller: uid,
    chicken: chick,
    price,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
  res.json({ success: true });
};

exports.fillOrder = async (req, res) => {
  const buyer = req.user.uid;
  const { id } = req.params;
  const orderRef = db.collection('orders').doc(id);
  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) return res.status(404).json({ error: 'Order not found' });
  const order = orderSnap.data();
  const buyerRef = db.collection('users').doc(buyer);
  const sellerRef = db.collection('users').doc(order.seller);
  const buyerSnap = await buyerRef.get();
  if ((buyerSnap.data().coin_balance || 0) < order.price) {
    return res.status(400).json({ error: 'Not enough coins' });
  }
  // transfer funds
  await buyerRef.update({ coin_balance: admin.firestore.FieldValue.increment(-order.price) });
  await sellerRef.update({ coin_balance: admin.firestore.FieldValue.increment(order.price) });
  // transfer chicken
  await buyerRef.collection('chickens').add(order.chicken);
  // remove order
  await orderRef.delete();
  res.json({ success: true });
};
