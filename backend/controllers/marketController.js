const { db, admin } = require('../firebase');
const { MIN_CHICKEN_MARKET_PRICE } = require('../config/constants');

async function listOrders(req, res) {
  const snap = await db.collection('orders').get();
  const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  res.json({ orders });
};

// List open chicken market orders (new market)
async function listMarketOrdersOpen(req, res) {
  try {
    const snap = await db.collection('marketOrders').where('status', '==', 'open').get();
    const nowMs = Date.now();
    const orders = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(o => {
        // Hide dead chickens from listings (lastFed > 48h considered dead)
        const lastFed = o.lastFed && o.lastFed.toMillis ? o.lastFed.toMillis() : 0;
        const hours = lastFed ? (nowMs - lastFed) / (1000 * 60 * 60) : Infinity;
        return hours <= 48;
      });
    return res.json({ orders });
  } catch (e) {
    console.error('Error listing market orders:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function createOrder(req, res) {
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

async function fillOrder(req, res) {
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

async function listChickenForSale(req, res) {
  const uid = req.user.uid;
  const { chickenId } = req.params;
  const { price } = req.body;

  console.log('DEBUG: listChickenForSale received request:', { uid, chickenId, price });

  try {
    // ตรวจสอบราคาขั้นต่ำ
    if (price < MIN_CHICKEN_MARKET_PRICE) {
      console.log('DEBUG: Price below minimum.');
      return res.status(400).json({ 
        error: `Price must be at least ${MIN_CHICKEN_MARKET_PRICE} coins` 
      });
    }

    // ตรวจสอบไก่
    const chickenRef = db.collection('users').doc(uid).collection('chickens').doc(chickenId);
    const snap = await chickenRef.get();
    
    if (!snap.exists) {
      console.log('DEBUG: Chicken not found.');
      return res.status(404).json({ error: 'Chicken not found' });
    }

    const chicken = snap.data();
    console.log('DEBUG: Chicken data fetched:', chicken);
    if (chicken.status === 'dead') {
      console.log('DEBUG: Cannot sell a dead chicken.');
      return res.status(400).json({ error: 'Cannot sell a dead chicken' });
    }

    // สร้าง order ในตลาด
    const orderRef = db.collection('marketOrders').doc();
    const batch = db.batch();

    batch.set(orderRef, {
      userId: uid,
      side: 'sell',
      item: 'chicken',
      chickenId,
      price,
      status: 'open',
      createdAt: admin.firestore.Timestamp.now(),
      lastFed: chicken.lastFed,
      chickenData: {
        type: chicken.type,
        weight: chicken.weight,
        birthDate: chicken.birthDate,
        foodCost: chicken.foodCost || 0,
        purchasePrice: chicken.purchasePrice || 0,
        totalCost: chicken.totalCost || 0,
        tier: chicken.tier || 'unknown'
      }
    });

    // อัพเดทสถานะไก่
    batch.update(chickenRef, {
      listedAt: admin.firestore.Timestamp.now(),
      marketOrderId: orderRef.id
    });

    await batch.commit();
    console.log('DEBUG: Chicken listed successfully.', orderRef.id);
    return res.json({ 
      success: true, 
      orderId: orderRef.id,
      message: 'Chicken listed for sale successfully'
    });
  } catch (error) {
    console.error('ERROR: Error listing chicken for sale:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

async function buyChicken(req, res) {
  const buyerUid = req.user.uid;
  const { orderId } = req.params;

  try {
    const orderRef = db.collection('marketOrders').doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderSnap.data();
    if (order.status !== 'open') {
      return res.status(400).json({ error: 'Order is no longer available' });
    }

    // ตรวจสอบยอดเงินผู้ซื้อ
    const buyerRef = db.collection('users').doc(buyerUid);
    const buyerSnap = await buyerRef.get();
    const buyer = buyerSnap.data();

    if ((buyer.coin_balance || 0) < order.price) {
      return res.status(400).json({ error: 'Not enough coins' });
    }

    const batch = db.batch();

    // อัพเดทยอดเงินผู้ซื้อและผู้ขาย
    batch.update(buyerRef, {
      coin_balance: admin.firestore.FieldValue.increment(-order.price)
    });

    const sellerRef = db.collection('users').doc(order.userId);
    batch.update(sellerRef, {
      coin_balance: admin.firestore.FieldValue.increment(order.price)
    });

    // ย้ายไก่ไปให้ผู้ซื้อ
    const oldChickenRef = db.collection('users').doc(order.userId).collection('chickens').doc(order.chickenId);
    const newChickenRef = db.collection('users').doc(buyerUid).collection('chickens').doc(order.chickenId);

    // คำนวณต้นทุนรวม
    const totalCost = order.price + (order.chickenData.foodCost || 0);

    batch.set(newChickenRef, {
      ...order.chickenData,
      status: 'hungry',
      lastFed: order.lastFed,
      owner: buyerUid,
      boughtAt: admin.firestore.Timestamp.now(),
      purchasePrice: order.price,
      totalCost: totalCost,
      costHistory: [
        ...(order.chickenData.costHistory || []),
        {
          type: 'purchase',
          amount: order.price,
          timestamp: admin.firestore.Timestamp.now(),
          marketPrice: order.price,
          tier: order.chickenData.tier
        }
      ]
    });

    batch.delete(oldChickenRef);

    // อัพเดทสถานะ order
    batch.update(orderRef, {
      status: 'filled',
      filledAt: admin.firestore.Timestamp.now(),
      buyerId: buyerUid
    });

    // บันทึกประวัติการซื้อขาย
    const buyerTransactionRef = db.collection('users').doc(buyerUid).collection('transactions').doc();
    batch.set(buyerTransactionRef, {
      type: 'buyChicken',
      amount: -order.price,
      chickenId: order.chickenId,
      metadata: {
        orderId,
        sellerId: order.userId,
        purchasePrice: order.price,
        tier: order.chickenData.tier
      },
      createdAt: admin.firestore.Timestamp.now()
    });

    const sellerTransactionRef = db.collection('users').doc(order.userId).collection('transactions').doc();
    batch.set(sellerTransactionRef, {
      type: 'sellChicken',
      amount: order.price,
      chickenId: order.chickenId,
      metadata: {
        orderId,
        buyerId: buyerUid,
        sellType: 'market',
        originalCost: order.chickenData.totalCost || 0,
        profit: order.price - (order.chickenData.totalCost || 0),
        tier: order.chickenData.tier
      },
      createdAt: admin.firestore.Timestamp.now()
    });

    await batch.commit();
    return res.json({ 
      success: true,
      message: 'Chicken purchased successfully',
      purchasePrice: order.price,
      tier: order.chickenData.tier
    });
  } catch (error) {
    console.error('Error buying chicken:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

async function cancelMarketListing(req, res) {
  const uid = req.user.uid;
  const { orderId } = req.params;

  try {
    const orderRef = db.collection('marketOrders').doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return res.status(404).json({ error: 'Market order not found' });
    }

    const order = orderSnap.data();

    // ตรวจสอบว่าเป็นเจ้าของรายการที่ต้องการยกเลิกหรือไม่
    if (order.userId !== uid) {
      return res.status(403).json({ error: 'Unauthorized to cancel this listing' });
    }

    if (order.status !== 'open') {
      return res.status(400).json({ error: 'Order is not open for cancellation' });
    }

    const batch = db.batch();

    // อัพเดทสถานะ order เป็น cancelled
    batch.update(orderRef, {
      status: 'cancelled',
      cancelledAt: admin.firestore.Timestamp.now()
    });

    // อัพเดทสถานะไก่กลับเป็นปกติใน collection ของผู้ใช้
    const chickenRef = db.collection('users').doc(uid).collection('chickens').doc(order.chickenId);
    batch.update(chickenRef, {
      marketOrderId: admin.firestore.FieldValue.delete(), // ลบฟิลด์ marketOrderId
      listedAt: admin.firestore.FieldValue.delete(), // ลบฟิลด์ listedAt
      // ถ้าไก่ตายหรือหิวอยู่แล้ว ก็คงสถานะเดิม แต่ถ้าเป็น listed ก็จะกลับมา normal/hungry
      // ในที่นี้ เราไม่ได้เปลี่ยน status เป็น listed แล้ว เลยไม่จำเป็นต้อง restore status เดิม
      // ปล่อยให้ status ของไก่เป็นไปตามที่เคยเป็นก่อนถูก listed
    });

    await batch.commit();
    return res.json({ success: true, message: 'Market listing cancelled successfully' });

  } catch (error) {
    console.error('Error cancelling market listing:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  listOrders,
  createOrder,
  fillOrder,
  listChickenForSale,
  buyChicken,
  cancelMarketListing,
  listMarketOrdersOpen
};
