// Firestore removed; Mongo-only implementation below
const { MIN_CHICKEN_MARKET_PRICE } = require('../config/constants');
const { connectMongo } = require('../db/mongo');
const mongoose = require('mongoose');
const marketOrderRepo = require('../repositories/marketOrderRepo');
const chickenRepo = require('../repositories/chickenRepo');
const transactionRepo = require('../repositories/transactionRepo');
const userRepo = require('../repositories/userRepo');

async function listOrders(req, res) {
  const snap = await db.collection('orders').get();
  const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  res.json({ orders });
};

// List open chicken market orders (new market)
async function listMarketOrdersOpen(req, res) {
  try {
    await connectMongo();
    const docs = await marketOrderRepo.getOpenOrders({ item: 'chicken', limit: 200, sortByPrice: 1 });
    // Exclude orders whose chicken has become dead
    const Chicken = require('../models/Chicken');
    const objIds = [];
    const fsIds = [];
    for (const d of docs) {
      const cid = d.chickenId;
      if (cid && mongoose.Types.ObjectId.isValid(cid)) objIds.push(cid);
      else if (cid) fsIds.push(cid);
    }
    const byId = objIds.length ? await Chicken.find({ _id: { $in: objIds } }).select('_id status').lean().exec() : [];
    const byFs = fsIds.length ? await Chicken.find({ fsId: { $in: fsIds } }).select('fsId status').lean().exec() : [];
    const deadSet = new Set();
    for (const c of byId) if (c.status === 'dead') deadSet.add(String(c._id));
    for (const c of byFs) if (c.status === 'dead') deadSet.add(String(c.fsId));
    const filtered = docs.filter(d => !deadSet.has(d.chickenId));
    const orders = filtered.map(o => ({ id: o.fsOrderId || String(o._id), ...o }));
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
    // à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸šà¸£à¸²à¸„à¸²à¸‚à¸±à¹‰à¸™à¸•à¹ˆà¸³
    if (price < MIN_CHICKEN_MARKET_PRICE) {
      console.log('DEBUG: Price below minimum.');
      return res.status(400).json({ 
        error: `Price must be at least ${MIN_CHICKEN_MARKET_PRICE} coins` 
      });
    }

    // à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸šà¹„à¸à¹ˆ
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

    // à¸ªà¸£à¹‰à¸²à¸‡ order à¹ƒà¸™à¸•à¸¥à¸²à¸”
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

    // à¸­à¸±à¸žà¹€à¸”à¸—à¸ªà¸–à¸²à¸™à¸°à¹„à¸à¹ˆ
    batch.update(chickenRef, {
      listedAt: admin.firestore.Timestamp.now(),
      marketOrderId: orderRef.id
    });

    await batch.commit();
    console.log('DEBUG: Chicken listed successfully.', orderRef.id);
    // Mirror to Mongo for hybrid operation
    try {
      await connectMongo();
      await marketOrderRepo.createOrder({
        fsOrderId: orderRef.id,
        userId: uid,
        side: 'sell',
        item: 'chicken',
        chickenId,
        price,
        status: 'open',
        lastFed: chicken.lastFed?.toDate ? chicken.lastFed.toDate() : (chicken.lastFed || null),
        chickenData: {
          type: chicken.type,
          weight: chicken.weight,
          birthDate: chicken.birthDate?.toDate ? chicken.birthDate.toDate() : (chicken.birthDate || null),
          foodCost: chicken.foodCost || 0,
          purchasePrice: chicken.purchasePrice || 0,
          totalCost: chicken.totalCost || 0,
          tier: chicken.tier || 'unknown'
        }
      });
    } catch (e) {
      console.warn('Mirror to Mongo failed:', e && e.message ? e.message : e);
    }
    // Mark chicken as listed in Mongo so UI count decreases
    try {
      await connectMongo();
      await chickenRepo.updateByFsId(chickenId, { marketOrderId: orderRef.id, listedAt: new Date(), });
    } catch (e) {
      console.warn('Failed to mark chicken listed in Mongo:', e && e.message ? e.message : e);
    }
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

    // à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸šà¸¢à¸­à¸”à¹€à¸‡à¸´à¸™à¸œà¸¹à¹‰à¸‹à¸·à¹‰à¸­
    const buyerRef = db.collection('users').doc(buyerUid);
    const buyerSnap = await buyerRef.get();
    const buyer = buyerSnap.data();

    if ((buyer.coin_balance || 0) < order.price) {
      return res.status(400).json({ error: 'Not enough coins' });
    }

    const batch = db.batch();

    // à¸­à¸±à¸žà¹€à¸”à¸—à¸¢à¸­à¸”à¹€à¸‡à¸´à¸™à¸œà¸¹à¹‰à¸‹à¸·à¹‰à¸­à¹à¸¥à¸°à¸œà¸¹à¹‰à¸‚à¸²à¸¢
    batch.update(buyerRef, {
      coin_balance: admin.firestore.FieldValue.increment(-order.price)
    });

    const sellerRef = db.collection('users').doc(order.userId);
    batch.update(sellerRef, {
      coin_balance: admin.firestore.FieldValue.increment(order.price)
    });

    // à¸¢à¹‰à¸²à¸¢à¹„à¸à¹ˆà¹„à¸›à¹ƒà¸«à¹‰à¸œà¸¹à¹‰à¸‹à¸·à¹‰à¸­
    const oldChickenRef = db.collection('users').doc(order.userId).collection('chickens').doc(order.chickenId);
    const newChickenRef = db.collection('users').doc(buyerUid).collection('chickens').doc(order.chickenId);

    // à¸„à¸³à¸™à¸§à¸“à¸•à¹‰à¸™à¸—à¸¸à¸™à¸£à¸§à¸¡
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

    // à¸­à¸±à¸žà¹€à¸”à¸—à¸ªà¸–à¸²à¸™à¸° order
    batch.update(orderRef, {
      status: 'filled',
      filledAt: admin.firestore.Timestamp.now(),
      buyerId: buyerUid
    });

    // à¸šà¸±à¸™à¸—à¸¶à¸à¸›à¸£à¸°à¸§à¸±à¸•à¸´à¸à¸²à¸£à¸‹à¸·à¹‰à¸­à¸‚à¸²à¸¢
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

    // à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸šà¸§à¹ˆà¸²à¹€à¸›à¹‡à¸™à¹€à¸ˆà¹‰à¸²à¸‚à¸­à¸‡à¸£à¸²à¸¢à¸à¸²à¸£à¸—à¸µà¹ˆà¸•à¹‰à¸­à¸‡à¸à¸²à¸£à¸¢à¸à¹€à¸¥à¸´à¸à¸«à¸£à¸·à¸­à¹„à¸¡à¹ˆ
    if (order.userId !== uid) {
      return res.status(403).json({ error: 'Unauthorized to cancel this listing' });
    }

    if (order.status !== 'open') {
      return res.status(400).json({ error: 'Order is not open for cancellation' });
    }

    const batch = db.batch();

    // à¸­à¸±à¸žà¹€à¸”à¸—à¸ªà¸–à¸²à¸™à¸° order à¹€à¸›à¹‡à¸™ cancelled
    batch.update(orderRef, {
      status: 'cancelled',
      cancelledAt: admin.firestore.Timestamp.now()
    });

    // à¸­à¸±à¸žà¹€à¸”à¸—à¸ªà¸–à¸²à¸™à¸°à¹„à¸à¹ˆà¸à¸¥à¸±à¸šà¹€à¸›à¹‡à¸™à¸›à¸à¸•à¸´à¹ƒà¸™ collection à¸‚à¸­à¸‡à¸œà¸¹à¹‰à¹ƒà¸Šà¹‰
    const chickenRef = db.collection('users').doc(uid).collection('chickens').doc(order.chickenId);
    batch.update(chickenRef, {
      marketOrderId: admin.firestore.FieldValue.delete(), // à¸¥à¸šà¸Ÿà¸´à¸¥à¸”à¹Œ marketOrderId
      listedAt: admin.firestore.FieldValue.delete(), // à¸¥à¸šà¸Ÿà¸´à¸¥à¸”à¹Œ listedAt
      // à¸–à¹‰à¸²à¹„à¸à¹ˆà¸•à¸²à¸¢à¸«à¸£à¸·à¸­à¸«à¸´à¸§à¸­à¸¢à¸¹à¹ˆà¹à¸¥à¹‰à¸§ à¸à¹‡à¸„à¸‡à¸ªà¸–à¸²à¸™à¸°à¹€à¸”à¸´à¸¡ à¹à¸•à¹ˆà¸–à¹‰à¸²à¹€à¸›à¹‡à¸™ listed à¸à¹‡à¸ˆà¸°à¸à¸¥à¸±à¸šà¸¡à¸² normal/hungry
      // à¹ƒà¸™à¸—à¸µà¹ˆà¸™à¸µà¹‰ à¹€à¸£à¸²à¹„à¸¡à¹ˆà¹„à¸”à¹‰à¹€à¸›à¸¥à¸µà¹ˆà¸¢à¸™ status à¹€à¸›à¹‡à¸™ listed à¹à¸¥à¹‰à¸§ à¹€à¸¥à¸¢à¹„à¸¡à¹ˆà¸ˆà¸³à¹€à¸›à¹‡à¸™à¸•à¹‰à¸­à¸‡ restore status à¹€à¸”à¸´à¸¡
      // à¸›à¸¥à¹ˆà¸­à¸¢à¹ƒà¸«à¹‰ status à¸‚à¸­à¸‡à¹„à¸à¹ˆà¹€à¸›à¹‡à¸™à¹„à¸›à¸•à¸²à¸¡à¸—à¸µà¹ˆà¹€à¸„à¸¢à¹€à¸›à¹‡à¸™à¸à¹ˆà¸­à¸™à¸–à¸¹à¸ listed
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
  buyChicken, // will be overridden below by Mongo-first wrappers
  cancelMarketListing, // will be overridden below by Mongo-first wrappers
  listMarketOrdersOpen
};

// --- Mongo-first wrappers for hybrid migration ---
async function listChickenForSaleMongoFirst(req, res) {
  const uid = req.user.uid;
  const { chickenId } = req.params;
  const { price } = req.body;
  try {
    if (price < MIN_CHICKEN_MARKET_PRICE) return res.status(400).json({ error: `Price must be at least ${MIN_CHICKEN_MARKET_PRICE} coins` });
    await connectMongo();
    const chickenRepo = require('../repositories/chickenRepo');
    let chicken = await chickenRepo.getById(chickenId);
    if (!chicken) chicken = await chickenRepo.getByFsId(chickenId);
    if (!chicken) return res.status(404).json({ error: 'Chicken not found' });
    if (chicken.status === 'dead') return res.status(400).json({ error: 'Cannot sell a dead chicken' });
    if ((chicken.weight || 0) < 3) return res.status(400).json({ error: 'Chicken must weigh >=3kg' });
    const created = await marketOrderRepo.createOrder({
      userId: uid,
      side: 'sell',
      item: 'chicken',
      chickenId: chicken._id ? String(chicken._id) : chicken.fsId,
      price,
      status: 'open',
      lastFed: chicken.lastFed || null,
      chickenData: {
        type: chicken.type,
        weight: chicken.weight,
        birthDate: chicken.birthDate || null,
        purchasePrice: chicken.purchasePrice || 0,
        totalCost: chicken.totalCost || 0,
        foodCost: chicken.foodCost || 0,
        tier: chicken.tier || 'unknown'
      }
    });
    if (chicken._id) {
      await chickenRepo.updateChicken(String(chicken._id), { marketOrderId: String(created._id), listedAt: new Date() });
    } else if (chicken.fsId) {
      await chickenRepo.updateByFsId(chicken.fsId, { marketOrderId: String(created._id), listedAt: new Date() });
    }
    return res.json({ success: true, orderId: String(created._id), message: 'Chicken listed for sale successfully' });
  } catch (e) {
    console.error('listChickenForSaleMongoFirst error:', e && e.message ? e.message : e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
async function buyChickenMongoFirst(req, res) {
  const buyerUid = req.user.uid;
  const { orderId } = req.params;
  try {
    await connectMongo();
    let mOrder = await marketOrderRepo.getByFsOrderId(orderId);
    if (!mOrder) mOrder = await marketOrderRepo.getById(orderId);
    if (mOrder && mOrder.status === 'open') {
      // Ensure chicken still alive before proceeding
      const Chicken = require('../models/Chicken');
      let chickenDoc = null;
      if (mOrder.chickenId && mongoose.Types.ObjectId.isValid(mOrder.chickenId)) {
        chickenDoc = await Chicken.findById(mOrder.chickenId).select('status').lean().exec();
      }
      if (!chickenDoc) {
        chickenDoc = await Chicken.findOne({ fsId: mOrder.chickenId }).select('status').lean().exec();
      }
      if (chickenDoc && chickenDoc.status === 'dead') {
        try { await marketOrderRepo.cancelOrder(mOrder._id, 'chicken_dead'); } catch {}
        return res.status(400).json({ error: 'Chicken is dead; order cancelled' });
      }
      // Check and transfer coins in Mongo
      try {
        await userRepo.decCoins(buyerUid, mOrder.price);
      } catch (e) {
        if (e && e.message === 'INSUFFICIENT_COINS') {
          return res.status(400).json({ error: 'Not enough coins' });
        }
        throw e;
      }
      await userRepo.incCoins(mOrder.userId, mOrder.price);

      const now = new Date();
      let updated = await chickenRepo.updateChicken(mOrder.chickenId, {
        ownerUid: buyerUid,
        status: 'hungry',
        lastFed: now,
        marketOrderId: null,
        listedAt: null,
        $push: { costHistory: { type: 'purchase', amount: mOrder.price, units: 0, timestamp: now } }
      });
      if (!updated) {
        updated = await chickenRepo.updateByFsId(mOrder.chickenId, {
          ownerUid: buyerUid,
          status: 'hungry',
          lastFed: now,
          marketOrderId: null,
          listedAt: null,
          $push: { costHistory: { type: 'purchase', amount: mOrder.price, units: 0, timestamp: now } }
        });
      }
      if (!updated) {
        await chickenRepo.createChicken({
          fsId: mOrder.chickenId,
          ownerUid: buyerUid,
          type: mOrder.chickenData?.type || 'mother',
          birthDate: mOrder.chickenData?.birthDate || null,
          weight: mOrder.chickenData?.weight || 0,
          status: 'hungry',
          lastFed: now,
          foodCost: mOrder.chickenData?.foodCost || 0,
          totalCost: (mOrder.chickenData?.totalCost || 0) + mOrder.price,
          costHistory: [{ type: 'purchase', amount: mOrder.price, units: 0, timestamp: now }]
        });
      }

      await marketOrderRepo.markOrderFilled(mOrder._id, buyerUid);
      await transactionRepo.createTransaction({ userId: buyerUid, type: 'BUY_CHICKEN', amountCoin: -mOrder.price, meta: { orderId, chickenId: mOrder.chickenId, sellerId: mOrder.userId } });
      await transactionRepo.createTransaction({ userId: mOrder.userId, type: 'SELL_CHICKEN', amountCoin: mOrder.price, meta: { orderId, chickenId: mOrder.chickenId, buyerId: buyerUid } });
      return res.json({ success: true, message: 'Chicken purchased successfully', purchasePrice: mOrder.price });
    }
  } catch (e) {
    console.error('buyChicken (Mongo) failed:', e && e.message ? e.message : e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function cancelMarketListingMongoFirst(req, res) {
  const uid = req.user.uid;
  const { orderId } = req.params;
  try {
    await connectMongo();
    let mOrder = await marketOrderRepo.getByFsOrderId(orderId);
    if (!mOrder) mOrder = await marketOrderRepo.getById(orderId);
    if (mOrder) {
      if (mOrder.userId !== uid) return res.status(403).json({ error: 'Unauthorized to cancel this listing' });
      if (mOrder.status !== 'open') return res.status(400).json({ error: 'Order is not open for cancellation' });
      await marketOrderRepo.cancelOrder(mOrder._id, 'user_cancel');
      try {
        // Clear market linkage on the chicken so it returns to inventory
        let cleared = await chickenRepo.updateChicken(mOrder.chickenId, { marketOrderId: null, listedAt: null });
        if (!cleared) {
          cleared = await chickenRepo.updateByFsId(mOrder.chickenId, { marketOrderId: null, listedAt: null });
        }
      } catch {}
      return res.json({ success: true, message: 'Market listing cancelled successfully' });
    }
  } catch (e) {
    console.error('cancelMarketListing (Mongo) failed:', e && e.message ? e.message : e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports.buyChicken = buyChickenMongoFirst;
module.exports.cancelMarketListing = cancelMarketListingMongoFirst;
module.exports.listChickenForSale = listChickenForSaleMongoFirst;

// Mongo-first adapters for legacy routes
async function listOrdersMongoFirst(req, res) {
  try {
    await connectMongo();
    const docs = await marketOrderRepo.getOpenOrders({ item: 'chicken', limit: 200, sortByPrice: 1 });
    const orders = docs.map((o) => ({ id: o.fsOrderId || String(o._id), ...o }));
    return res.json({ orders });
  } catch (e) {
    console.error('listOrders (Mongo) failed:', e && e.message ? e.message : e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
async function createOrderMongoFirst(req, res) {
  // Legacy body: { chickenId, price }
  req.params = req.params || {};
  req.params.chickenId = req.body?.chickenId;
  return listChickenForSaleMongoFirst(req, res);
}
async function fillOrderMongoFirst(req, res) {
  // Legacy param: :id
  req.params = req.params || {};
  req.params.orderId = req.params.id;
  return buyChickenMongoFirst(req, res);
}
module.exports.listOrders = listOrdersMongoFirst;
module.exports.createOrder = createOrderMongoFirst;
module.exports.fillOrder = fillOrderMongoFirst;

