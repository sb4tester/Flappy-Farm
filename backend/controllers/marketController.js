const admin = require('firebase-admin');
const db = admin.firestore();

exports.listOrders = async (req, res) => {
  try {
    const ordersSnap = await db.collection('marketOrders').get();
    const orders = ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ orders });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createOrder = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { type, targetId, price, quantity } = req.body;
    const newOrder = {
      userId,
      type,
      targetId,
      price,
      quantity,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    const docRef = await db.collection('marketOrders').add(newOrder);
    res.json({ orderId: docRef.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.fillOrder = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { orderId } = req.params;
    // TODO: Implement fill logic: transfer assets between users
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
