// Firestore removed; use Mongo repos only
const { CHICKEN_SELLBACK_PRICE, CHICKEN_FOOD_COST, CHICKEN_FOOD_COST_PER_UNIT } = require('../config/constants');
const chickenService = require('../services/chickenService');
const { addTickets } = require('../services/luckyDrawService');
const { connectMongo } = require('../db/mongo');
const chickenRepo = require('../repositories/chickenRepo');
const transactionRepo = require('../repositories/transactionRepo');
const userRepo = require('../repositories/userRepo');

async function getChickens(req, res) {
  const uid = req.user.uid;
  // Mongo-backed chickens: prefer Mongo if available
  try {
    await connectMongo();
    const docs = await chickenRepo.getActiveChickensByOwner(uid);
    const chickens = docs.map(c => ({ id: c.fsId || String(c._id), ...c }));
    return res.json({ chickens });
  } catch (e) {
    console.warn('Mongo getChickens failed, falling back to Firestore:', e && e.message ? e.message : e);
  }
  const snap = await db.collection('users').doc(uid).collection('chickens').get();
  const now = admin.firestore.Timestamp.now();
  const batch = db.batch();
  let updatedCount = 0;

  // à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸šà¸­à¸²à¸¢à¸¸à¹„à¸à¹ˆà¹à¸¥à¸°à¸­à¸±à¸žà¹€à¸”à¸—à¸ªà¸–à¸²à¸™à¸°
  snap.docs.forEach(doc => {
    const chicken = doc.data();
    if (chicken.type === 'mother' && (chicken.status === 'normal' || chicken.status === 'hungry')) {
      const birthDate = chicken.birthDate.toDate();
      const ageInDays = Math.floor((now.toDate() - birthDate) / (1000 * 60 * 60 * 24));
      
      if (ageInDays >= 104) {
        batch.update(doc.ref, { status: 'dead', weight: 0 });
        updatedCount++;
      }
    }
  });

  // à¸­à¸±à¸žà¹€à¸”à¸— lastFed à¹€à¸›à¹‡à¸™ birthDate à¸–à¹‰à¸² lastFed à¹€à¸›à¹‡à¸™ null
  snap.docs.forEach(doc => {
    const chicken = doc.data();
    if (!chicken.lastFed) {
      batch.update(doc.ref, { lastFed: chicken.birthDate });
      updatedCount++;
    }
  });

  // à¹€à¸žà¸´à¹ˆà¸¡ logic à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸š lastFed à¸–à¹‰à¸²à¹€à¸à¸´à¸™ 24 à¸Šà¸±à¹ˆà¸§à¹‚à¸¡à¸‡à¹ƒà¸«à¹‰à¹€à¸›à¸¥à¸µà¹ˆà¸¢à¸™à¹€à¸›à¹‡à¸™ hungry, à¸–à¹‰à¸²à¹€à¸à¸´à¸™ 72 à¸Šà¸±à¹ˆà¸§à¹‚à¸¡à¸‡à¹ƒà¸«à¹‰à¹€à¸›à¸¥à¸µà¹ˆà¸¢à¸™à¹€à¸›à¹‡à¸™ dead
  snap.docs.forEach(doc => {
    const chicken = doc.data();
    const lastFed = chicken.lastFed || chicken.birthDate; // à¹ƒà¸Šà¹‰ birthDate à¸–à¹‰à¸² lastFed à¹€à¸›à¹‡à¸™ null
    const hoursSinceLastFed = (now.toDate() - lastFed.toDate()) / (1000 * 60 * 60);
    if (hoursSinceLastFed > 72) {
      batch.update(doc.ref, { status: 'dead', weight: 0 });
      updatedCount++;
    } else if (hoursSinceLastFed > 24) {
      batch.update(doc.ref, { status: 'hungry' });
      updatedCount++;
    }
  });

  // à¸–à¹‰à¸²à¸¡à¸µà¹„à¸à¹ˆà¸—à¸µà¹ˆà¸•à¹‰à¸­à¸‡à¸­à¸±à¸žà¹€à¸”à¸—à¸ªà¸–à¸²à¸™à¸°
  if (updatedCount > 0) {
    await batch.commit();
  }

  // à¸”à¸¶à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹„à¸à¹ˆà¸¥à¹ˆà¸²à¸ªà¸¸à¸”
  const updatedSnap = await db.collection('users').doc(uid).collection('chickens').get();
  const chickens = updatedSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  res.json({ chickens });
}

// Helper functions now from Mongo repositories
const promotionRepo = require('../repositories/promotionRepo');
const statsRepo = require('../repositories/statsRepo');
async function getMotherTierPricesData() {
  await connectMongo();
  return promotionRepo.getMotherTierPrice();
}
async function getChickenSoldCount() {
  await connectMongo();
  const stats = await statsRepo.getStats();
  return stats ? (stats.totalChickenPurchase || 0) : 0;
}

async function buyMother(req, res) {
  const uid = req.user.uid;
  const { quantity, packageType } = req.body; 

  if (!quantity || quantity <= 0) {
    return res.status(400).json({ error: 'Invalid quantity' });
  }

  await connectMongo();
  await userRepo.getOrCreate(uid);
  const userCoins = await userRepo.getCoins(uid);
  let priceToDeduct = 0;

  if (packageType) {
    // Handle package purchases (backend enforces correct quantity and price)
    switch (packageType) {
      case 'bronze':
        if (quantity !== 30) {
          console.warn(`Frontend sent quantity ${quantity} for Bronze package, expected 30.`);
          return res.status(400).json({ error: 'Mismatched quantity for Bronze package.' });
        }
        priceToDeduct = 300;
        break;
      case 'silver':
        if (quantity !== 100) {
          console.warn(`Frontend sent quantity ${quantity} for Silver package, expected 100.`);
          return res.status(400).json({ error: 'Mismatched quantity for Silver package.' });
        }
        priceToDeduct = 1000;
        break;
      case 'gold':
        if (quantity !== 300) {
          console.warn(`Frontend sent quantity ${quantity} for Gold package, expected 300.`);
          return res.status(400).json({ error: 'Mismatched quantity for Gold package.' });
        }
        priceToDeduct = 3000;
        break;
      default:
        return res.status(400).json({ error: 'Invalid package type' });
    }
  } else {
    // Handle individual chicken purchases based on current total chickens sold
    const currentChickenSold = await getChickenSoldCount();
    const tiers = await getMotherTierPricesData();
    
    let effectivePricePerChicken = 0;
    const nextChickenCount = currentChickenSold + 1;
    const foundTier = tiers.find(tier => nextChickenCount >= tier.minId && nextChickenCount <= tier.maxId);

    if (foundTier) {
      effectivePricePerChicken = foundTier.priceUsd;
    } else {
      effectivePricePerChicken = tiers[tiers.length - 1]?.priceUsd || 10; // Default to 10 if no tiers
    }
    
    priceToDeduct = effectivePricePerChicken * quantity;
  }

  // Check if user has enough coins
  if ((userCoins || 0) < priceToDeduct) {
    return res.status(400).json({ error: 'Not enough coins' });
  }

  // Deduct coins (Mongo)
  try { await userRepo.decCoins(uid, priceToDeduct); } catch (e) { return res.status(400).json({ error: 'Not enough coins' }); }

  // Add chickens using Mongo repository instead of Firestore subcollection
  try {
    await connectMongo();
    for (let i = 0; i < quantity; i++) {
      const ch = await chickenRepo.createChicken({
        ownerUid: uid,
        type: 'mother',
        birthDate: new Date(),
        weight: 3.0,
        status: 'hungry',
        canLayEgg: true,
        eggs: 0,
        lastFed: new Date(),
        foodCost: 0,
        totalCost: (priceToDeduct || 0) / quantity,
        feedCount: 0,
      });
      // Mirror to Firestore to keep legacy feed endpoints working during migration
      try {
        const fsId = String(ch._id);
        await db.collection('users').doc(uid).collection('chickens').doc(fsId).set({
          type: 'mother',
          birthDate: admin.firestore.Timestamp.now(),
          lastFed: admin.firestore.Timestamp.now(),
          weight: 3.0,
          status: 'hungry',
          canLayEgg: true,
          eggs: 0,
          foodCost: 0,
          totalCost: (priceToDeduct || 0) / quantity,
          createdAt: admin.firestore.Timestamp.now()
        }, { merge: true });
      } catch (e) {
        console.warn('Mirror to Firestore (buyMother) failed:', e && e.message ? e.message : e);
      }
    }
    // Record ledger transaction in Mongo
    await transactionRepo.createTransaction({
      userId: uid,
      type: 'BUY_MOTHER',
      amountCoin: -(priceToDeduct || 0),
      meta: { quantity, packageType: packageType || null }
    });
  } catch (e) {
    console.error('Failed creating chickens in Mongo:', e);
  }

  // âœ… Add tickets for Lucky Draw if buying package
  if (packageType === 'bronze' || packageType === 'silver' || packageType === 'gold') {
    await addTickets(uid, packageType, 1); // à¸‹à¸·à¹‰à¸­ 1 à¹à¸žà¹‡à¸„ = 1 à¸ªà¸´à¸—à¸˜à¸´à¹Œ
  }

  // Update total chicken purchase statistics
  await statsRepo.incTotalChickenPurchase(quantity);

  res.json({ success: true, boughtQuantity: quantity, pricePaid: priceToDeduct });
}

async function feedChicken(req, res) {
  const uid = req.user.uid;
  const id = req.params.id || req.params.chickenId;
  const { units = 1 } = req.body; // à¸ˆà¸³à¸™à¸§à¸™ unit à¸—à¸µà¹ˆà¸•à¹‰à¸­à¸‡à¸à¸²à¸£à¹ƒà¸«à¹‰à¸­à¸²à¸«à¸²à¸£

  try {
    const chickenRef = db.collection('users').doc(uid).collection('chickens').doc(id);
    const chickenSnap = await chickenRef.get();

    if (!chickenSnap.exists) {
      return res.status(404).json({ error: 'Chicken not found' });
    }

    const chicken = chickenSnap.data();
    if (chicken.status === 'dead') {
      return res.status(400).json({ error: 'Cannot feed a dead chicken' });
    }

    // à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸šà¸¢à¸­à¸”à¹€à¸‡à¸´à¸™à¸œà¸¹à¹‰à¹€à¸¥à¹ˆà¸™
    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();
    const user = userSnap.data();

    const foodCost = CHICKEN_FOOD_COST_PER_UNIT * units;
    if ((user.food || 0) < units) {
      return res.status(400).json({ error: 'Not enough food' });
    }

    const now = admin.firestore.Timestamp.now();
    const batch = db.batch();

    // à¸­à¸±à¸žà¹€à¸”à¸—à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹„à¸à¹ˆ
    const newTotalCost = (chicken.totalCost || 0) + foodCost;
    const weightGain = 0.1 * units; // à¸™à¹‰à¸³à¸«à¸™à¸±à¸à¹€à¸žà¸´à¹ˆà¸¡à¸‚à¸¶à¹‰à¸™à¸•à¸²à¸¡à¸ˆà¸³à¸™à¸§à¸™ unit

    batch.update(chickenRef, {
      lastFed: now,
      status: 'normal',
      weight: (chicken.weight || 0) + weightGain,
      foodCost: (chicken.foodCost || 0) + foodCost,
      totalCost: newTotalCost,
      feedCount: admin.firestore.FieldValue.increment(units),
      costHistory: admin.firestore.FieldValue.arrayUnion({
        type: 'food',
        amount: foodCost,
        units: units,
        timestamp: now
      })
    });

    // à¸­à¸±à¸žà¹€à¸”à¸—à¸¢à¸­à¸”à¹€à¸‡à¸´à¸™à¸œà¸¹à¹‰à¹€à¸¥à¹ˆà¸™
    batch.update(userRef, {
      food: admin.firestore.FieldValue.increment(-units)
    });

    // à¸šà¸±à¸™à¸—à¸¶à¸à¸›à¸£à¸°à¸§à¸±à¸•à¸´à¸à¸²à¸£à¹ƒà¸«à¹‰à¸­à¸²à¸«à¸²à¸£
    const feedLogRef = db.collection('users').doc(uid).collection('logs').doc();
    batch.set(feedLogRef, {
      event: 'feedChicken',
      chickenId: id,
      units,
      foodBefore: user.food || 0,
      foodAfter: (user.food || 0) - units,
      foodCostCoinEquivalent: foodCost,
      weightGain,
      createdAt: now
    });

    await batch.commit();
    return res.json({ 
      success: true,
      message: 'Chicken fed successfully',
      foodCost,
      units,
      newTotalCost,
      weightGain
    });
  } catch (error) {
    console.error('Error feeding chicken:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function feedMultipleChickens(req, res) {
  const uid = req.user.uid;
  const { chickenIds, units = 1 } = req.body;

  if (!Array.isArray(chickenIds) || chickenIds.length === 0) {
    return res.status(400).json({ error: 'No chicken IDs provided' });
  }

  const foodCostPerChicken = CHICKEN_FOOD_COST_PER_UNIT * units;
  const totalUnits = units * chickenIds.length;

  try {
    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();
    const user = userSnap.data();

    if ((user.food || 0) < totalUnits) {
      return res.status(400).json({ error: 'Not enough food' });
    }

    const batch = db.batch();
    const now = admin.firestore.Timestamp.now();
    let totalCharged = 0;
    let chickensFed = 0;

    for (const id of chickenIds) {
      const chickenRef = userRef.collection('chickens').doc(id);
      const chickenSnap = await chickenRef.get();
      if (!chickenSnap.exists) continue;

      const chicken = chickenSnap.data();
      if (chicken.status === 'dead') continue;

      const weightGain = 0.1 * units;
      const newWeight = (chicken.weight || 0) + weightGain;
      const newTotalCost = (chicken.totalCost || 0) + foodCostPerChicken;

      batch.update(chickenRef, {
        lastFed: now,
        status: 'normal',
        weight: newWeight,
        foodCost: (chicken.foodCost || 0) + foodCostPerChicken,
        totalCost: newTotalCost,
        feedCount: admin.firestore.FieldValue.increment(units),
        costHistory: admin.firestore.FieldValue.arrayUnion({
          type: 'food',
          amount: foodCostPerChicken,
          units,
          timestamp: now
        })
      });

      // à¹€à¸žà¸´à¹ˆà¸¡à¸šà¸±à¸™à¸—à¸¶à¸ transaction à¹à¸¢à¸à¸—à¸µà¸«à¸¥à¸±à¸‡à¸–à¹‰à¸²à¸­à¸¢à¸²à¸à¸¥à¸°à¹€à¸­à¸µà¸¢à¸”
      chickensFed++;
      totalCharged += foodCostPerChicken;
    }

    if (chickensFed === 0) {
      return res.status(400).json({ error: 'No valid chickens to feed' });
    }

    batch.update(userRef, {
      food: admin.firestore.FieldValue.increment(-totalUnits)
    });

    // Audit log for multi-feed (no balance impact)
    const multiFeedLogRef = userRef.collection('logs').doc();
    batch.set(multiFeedLogRef, {
      event: 'feedMultipleChickens',
      chickenIds,
      unitsPerChicken: units,
      totalUnits,
      foodBefore: user.food || 0,
      foodAfter: (user.food || 0) - totalUnits,
      totalFoodCostCoinEquivalent: totalCharged,
      createdAt: now
    });

    await batch.commit();
    return res.json({
      success: true,
      message: `${chickensFed} chickens fed successfully`,
      totalCharged
    });
  } catch (error) {
    console.error('Error in feedMultipleChickens:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


async function sellChicken(req, res) {
  if (!req.user || !req.user.uid) {
    console.error('ERROR: req.user à¸«à¸£à¸·à¸­ req.user.uid à¸«à¸²à¸¢à¹„à¸›à¹ƒà¸™ sellChicken controller. (à¹€à¸›à¹‡à¸™à¹„à¸›à¹„à¸”à¹‰à¸§à¹ˆà¸² token à¹„à¸¡à¹ˆà¸–à¸¹à¸à¸•à¹‰à¸­à¸‡)');
    return res.status(401).json({ error: 'Authentication required: User data missing in request.' });
  }
  const uid = req.user.uid;
  const { type } = req.query;
  const quantity = parseInt(req.body.quantity || '1', 10); // à¸£à¸­à¸‡à¸£à¸±à¸š quantity

  if (quantity <= 0 || quantity > 100) {
    return res.status(400).json({ error: 'Quantity must be between 1-100' });
  }

  try {
    if (type === 'system') {
      const userRef = db.collection('users').doc(uid);

      // 1) à¸”à¸¶à¸‡à¹à¸¡à¹ˆà¹„à¸à¹ˆà¸—à¸µà¹ˆà¸‚à¸²à¸¢à¹„à¸”à¹‰à¸ˆà¸³à¸™à¸§à¸™à¸•à¸²à¸¡ quantity
      const chickensSnap = await userRef
        .collection('chickens')
        .where('type', '==', 'mother')
        .where('feedCount', '>=', 3)
        .where('status', 'in', ['normal', 'hungry'])
        .limit(quantity)
        .get(); 

      if (chickensSnap.size < quantity) {
        return res.status(400).json({ error: `à¸„à¸¸à¸“à¸¡à¸µà¹à¸¡à¹ˆà¹„à¸à¹ˆà¹„à¸¡à¹ˆà¸žà¸­ à¸•à¹‰à¸­à¸‡à¸à¸²à¸£à¸‚à¸²à¸¢ ${quantity} à¸•à¸±à¸§ à¹à¸•à¹ˆà¸¡à¸µà¹à¸„à¹ˆ ${chickensSnap.size} à¸•à¸±à¸§` });
      }

      const batch = db.batch();
      const now = admin.firestore.Timestamp.now();
      const sellPrice = CHICKEN_SELLBACK_PRICE; // à¸ªà¸¡à¸¡à¸•à¸´à¸§à¹ˆà¸² import à¸„à¹ˆà¸²à¸™à¸µà¹‰à¸ˆà¸²à¸ config
      let totalProfit = 0;
      let totalCost = 0;

      chickensSnap.docs.forEach((doc) => {
        const chickenData = doc.data();
        const chickenId = doc.id;

        const profit = sellPrice - (chickenData.totalCost || 0);
        totalProfit += profit;
        totalCost += chickenData.totalCost || 0;

        // à¸šà¸±à¸™à¸—à¸¶à¸à¹ƒà¸™ burnlist
        const burnlistRef = db.collection('burnlist').doc(chickenId);
        batch.set(burnlistRef, {
          ...chickenData,
          id: chickenId,
          burnedAt: now,
          reason: 'sold_to_system'
        });

        // à¸¥à¸šà¹„à¸à¹ˆà¸­à¸­à¸à¸ˆà¸²à¸ collection à¸œà¸¹à¹‰à¹ƒà¸Šà¹‰
        batch.delete(doc.ref);
      });

      // à¸­à¸±à¸žà¹€à¸”à¸—à¸¢à¸­à¸”à¹€à¸‡à¸´à¸™ user
      const totalSellPrice = sellPrice * quantity;
      batch.update(userRef, {
        coin_balance: admin.firestore.FieldValue.increment(totalSellPrice)
      });

      // à¸šà¸±à¸™à¸—à¸¶à¸à¸›à¸£à¸°à¸§à¸±à¸•à¸´à¸à¸²à¸£à¸‚à¸²à¸¢
      const transactionRef = userRef.collection('transactions').doc();
      batch.set(transactionRef, {
        type: 'sellChicken',
        amount: totalSellPrice,
        quantity,
        metadata: {
          sellType: 'system',
          totalOriginalCost: totalCost,
          totalProfit
        },
        createdAt: now
      });

      await batch.commit();
      return res.json({ 
        success: true,
        message: `à¸‚à¸²à¸¢à¹à¸¡à¹ˆà¹„à¸à¹ˆ ${quantity} à¸•à¸±à¸§à¹ƒà¸«à¹‰à¸£à¸°à¸šà¸šà¸ªà¸³à¹€à¸£à¹‡à¸ˆ`,
        totalSellPrice,
        totalCost,
        totalProfit
      });
    } else {
      return res.status(400).json({ error: 'Market selling not implemented yet' });
    }
  } catch (error) {
    console.error('Error selling chicken:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


// à¹€à¸žà¸´à¹ˆà¸¡à¸Ÿà¸±à¸‡à¸à¹Œà¸Šà¸±à¸™à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸šà¸­à¸²à¸¢à¸¸à¹„à¸à¹ˆ
async function checkChickenAge(req, res) {
  const uid = req.user.uid;
  const chickenRef = db.collection('users').doc(uid).collection('chickens');
  const snap = await chickenRef.get();
  const now = admin.firestore.Timestamp.now();
  
  const batch = db.batch();
  let updatedCount = 0;

  snap.docs.forEach(doc => {
    const chicken = doc.data();
    if (chicken.type === 'mother' && (chicken.status === 'normal' || chicken.status === 'hungry')) {
      const birthDate = chicken.birthDate.toDate();
      const ageInDays = Math.floor((now.toDate() - birthDate) / (1000 * 60 * 60 * 24));
      
      if (ageInDays >= 104) {
        batch.update(doc.ref, { status: 'dead', weight: 0 });
        updatedCount++;
      }
    }
  });

  // à¸­à¸±à¸žà¹€à¸”à¸— lastFed à¹€à¸›à¹‡à¸™ birthDate à¸–à¹‰à¸² lastFed à¹€à¸›à¹‡à¸™ null
  snap.docs.forEach(doc => {
    const chicken = doc.data();
    if (!chicken.lastFed) {
      batch.update(doc.ref, { lastFed: chicken.birthDate });
      updatedCount++;
    }
  });

  // à¹€à¸žà¸´à¹ˆà¸¡ logic à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸š lastFed à¸–à¹‰à¸²à¹€à¸à¸´à¸™ 24 à¸Šà¸±à¹ˆà¸§à¹‚à¸¡à¸‡à¹ƒà¸«à¹‰à¹€à¸›à¸¥à¸µà¹ˆà¸¢à¸™à¹€à¸›à¹‡à¸™ hungry, à¸–à¹‰à¸²à¹€à¸à¸´à¸™ 72 à¸Šà¸±à¹ˆà¸§à¹‚à¸¡à¸‡à¹ƒà¸«à¹‰à¹€à¸›à¸¥à¸µà¹ˆà¸¢à¸™à¹€à¸›à¹‡à¸™ dead
  snap.docs.forEach(doc => {
    const chicken = doc.data();
    const lastFed = chicken.lastFed || chicken.birthDate; // à¹ƒà¸Šà¹‰ birthDate à¸–à¹‰à¸² lastFed à¹€à¸›à¹‡à¸™ null
    const hoursSinceLastFed = (now.toDate() - lastFed.toDate()) / (1000 * 60 * 60);
    if (hoursSinceLastFed > 72) {
      batch.update(doc.ref, { status: 'dead', weight: 0 });
      updatedCount++;
    } else if (hoursSinceLastFed > 24) {
      batch.update(doc.ref, { status: 'hungry' });
      updatedCount++;
    }
  });

  if (updatedCount > 0) {
    await batch.commit();
  }

  res.json({ 
    success: true, 
    updatedCount,
    message: `Updated ${updatedCount} chickens to dead status due to age`
  });
}

async function getChickenCost(req, res) {
  const uid = req.user.uid;
  const { chickenId } = req.params;

  try {
    const chickenRef = db.collection('users').doc(uid).collection('chickens').doc(chickenId);
    const chickenSnap = await chickenRef.get();

    if (!chickenSnap.exists) {
      return res.status(404).json({ error: 'Chicken not found' });
    }

    const chicken = chickenSnap.data();
    const costData = {
      id: chickenId,
      type: chicken.type,
      weight: chicken.weight,
      purchasePrice: chicken.purchasePrice || 0,
      foodCost: chicken.foodCost || 0,
      totalCost: chicken.totalCost || 0,
      costHistory: chicken.costHistory || []
    };

    return res.json(costData);
  } catch (error) {
    console.error('Error getting chicken cost:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  getChickens,
  buyMother,
  feedChicken,
  feedMultipleChickens,
  sellChicken,
  checkChickenAge,
  getChickenCost
};

// --- Mongo-first wrappers for feeding ---
async function feedChickenMongoFirst(req, res) {
  const uid = req.user.uid;
  const id = req.params.id || req.params.chickenId;
  const { units = 1 } = req.body;
  try {
    await connectMongo();
    let ch = await chickenRepo.getById(id);
    if (!ch) ch = await chickenRepo.getByFsId(id);
    if (ch) {
      if (ch.status === 'dead') return res.status(400).json({ error: 'Cannot feed a dead chicken' });
      // Deduct food in Mongo user state
      await userRepo.getOrCreate(uid);
      try {
        await userRepo.decFood(uid, units);
      } catch (e) {
        if (e && e.message === 'NOT_ENOUGH_FOOD') return res.status(400).json({ error: 'Not enough food' });
        throw e;
      }
      const now = new Date();
      const foodCost = CHICKEN_FOOD_COST_PER_UNIT * units;
      const update = {
        $set: { lastFed: now, status: 'normal' },
        $inc: { weight: 0.1 * units, foodCost: foodCost, totalCost: foodCost, feedCount: units },
        $push: { costHistory: { type: 'food', amount: foodCost, units, timestamp: now } }
      };
      if (ch._id) await chickenRepo.updateChicken(ch._id, update); else await chickenRepo.updateByFsId(id, update);
      const updated = ch._id ? await chickenRepo.getById(String(ch._id)) : await chickenRepo.getByFsId(id);
      const foodAfter = await userRepo.getFood(uid);
      return res.json({ success: true, message: 'Chicken fed successfully', data: { chicken: { id: updated?.fsId || String(updated?._id), ...updated }, foodAfter } });
    }
  } catch (e) {
    console.error('feedChicken (Mongo) failed:', e && e.message ? e.message : e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function feedMultipleChickensMongoFirst(req, res) {
  const uid = req.user.uid;
  const { chickenIds, units = 1 } = req.body;
  if (!Array.isArray(chickenIds) || chickenIds.length === 0) return res.status(400).json({ error: 'No chicken IDs provided' });
  const totalUnits = units * chickenIds.length;
  try {
    await connectMongo();
    await userRepo.getOrCreate(uid);
    // try to deduct all food at once atomically
    try {
      await userRepo.decFood(uid, totalUnits);
    } catch (e) {
      if (e && e.message === 'NOT_ENOUGH_FOOD') return res.status(400).json({ error: 'Not enough food' });
      throw e;
    }
    let fed = 0;
    const now = new Date();
    const perFoodCost = CHICKEN_FOOD_COST_PER_UNIT * units;
    for (const cid of chickenIds) {
      let ch = await chickenRepo.getById(cid);
      if (!ch) ch = await chickenRepo.getByFsId(cid);
      if (!ch || ch.status === 'dead') continue;
      const update = {
        $set: { lastFed: now, status: 'normal' },
        $inc: { weight: 0.1 * units, foodCost: perFoodCost, totalCost: perFoodCost, feedCount: units },
        $push: { costHistory: { type: 'food', amount: perFoodCost, units, timestamp: now } }
      };
      if (ch._id) await chickenRepo.updateChicken(ch._id, update); else await chickenRepo.updateByFsId(cid, update);
      fed++;
    }
    if (fed === 0) return res.status(400).json({ error: 'No valid chickens to feed' });
    const foodAfter = await userRepo.getFood(uid);
    return res.json({ success: true, message: `${fed} chickens fed successfully`, data: { foodAfter } });
  } catch (e) {
    console.error('feedMultipleChickens (Mongo) failed:', e && e.message ? e.message : e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports.feedChicken = feedChickenMongoFirst;
module.exports.feedMultipleChickens = feedMultipleChickensMongoFirst;

// Mongo-only getChickens implementation and override
async function getChickensMongoOnly(req, res) {
  const uid = req.user.uid;
  try {
    await connectMongo();
    let status = undefined;
    if (req.query && (req.query.status || req.query.filter || req.query.state)) {
      status = String(req.query.status || req.query.filter || req.query.state);
    } else if (req.body && (req.body.status || req.body.filter || req.body.state)) {
      status = String(req.body.status || req.body.filter || req.body.state);
    }
    const docs = await chickenRepo.getChickensByOwnerWithStatus(uid, status);
    const chickens = docs.map((c) => ({ id: c.fsId || String(c._id), ...c }));
    return res.json({ chickens });
  } catch (e) {
    console.error('getChickens (Mongo) failed:', e && e.message ? e.message : e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
module.exports.getChickens = getChickensMongoOnly;

// Mongo-only system sellback and override
async function sellChickenMongoOnly(req, res) {
  const uid = req.user.uid;
  const { quantity = 1, chickenIds } = req.body || {};
  if ((!quantity || quantity <= 0) && (!Array.isArray(chickenIds) || chickenIds.length === 0)) {
    return res.status(400).json({ error: 'Invalid request: provide quantity or chickenIds' });
  }
  try {
    await connectMongo();
    let selected = [];
    if (Array.isArray(chickenIds) && chickenIds.length > 0) {
      for (const cid of chickenIds) {
        let ch = await chickenRepo.getById(cid);
        if (!ch) ch = await chickenRepo.getByFsId(cid);
        if (ch && ch.ownerUid === uid && ch.status !== 'dead') selected.push(ch);
      }
    } else {
      const all = await chickenRepo.getActiveChickensByOwner(uid);
      const qty = Math.max(1, parseInt(quantity, 10) || 1);
      selected = all.slice(0, qty);
    }
    if (selected.length === 0) return res.status(400).json({ error: 'No eligible chickens to sell' });
    let totalOriginalCost = 0;
    const { addToBurnlist } = require('../repositories/burnlistRepo');
    for (const ch of selected) {
      totalOriginalCost += (ch.totalCost || 0);
      const chickenRefId = ch._id ? String(ch._id) : (ch.fsId || null);
      await addToBurnlist({
        ownerUid: uid,
        chickenRefId,
        price: CHICKEN_SELLBACK_PRICE,
        reason: 'system_sell',
        source: 'system',
        soldAt: new Date(),
        chickenData: {
          type: ch.type,
          weight: ch.weight,
          birthDate: ch.birthDate || null,
          totalCost: ch.totalCost || 0,
          foodCost: ch.foodCost || 0,
          status: ch.status,
        }
      });
      if (ch._id) await chickenRepo.deleteById(String(ch._id));
      else if (ch.fsId) await chickenRepo.deleteByFsId(ch.fsId);
    }
    const totalSellPrice = CHICKEN_SELLBACK_PRICE * selected.length;
    const totalProfit = totalSellPrice - totalOriginalCost;
    await userRepo.incCoins(uid, totalSellPrice);
    await transactionRepo.createTransaction({
      userId: uid,
      type: 'SELL_CHICKEN_SYSTEM',
      amountCoin: totalSellPrice,
      meta: { quantity: selected.length, sellType: 'system', totalOriginalCost, totalProfit }
    });
    return res.json({ success: true, totalSellPrice, totalCost: totalOriginalCost, totalProfit });
  } catch (error) {
    console.error('Error selling chicken (Mongo):', error && error.message ? error.message : error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
module.exports.sellChicken = sellChickenMongoOnly;

// Mongo-only getChickenCost and override
async function getChickenCostMongoOnly(req, res) {
  const { chickenId } = req.params;
  try {
    await connectMongo();
    let chicken = await chickenRepo.getById(chickenId);
    if (!chicken) chicken = await chickenRepo.getByFsId(chickenId);
    if (!chicken) return res.status(404).json({ error: 'Chicken not found' });
    const costData = {
      id: chicken.fsId || String(chicken._id),
      type: chicken.type,
      weight: chicken.weight,
      purchasePrice: chicken.purchasePrice || 0,
      foodCost: chicken.foodCost || 0,
      totalCost: chicken.totalCost || 0,
      costHistory: chicken.costHistory || []
    };
    return res.json(costData);
  } catch (e) {
    console.error('getChickenCost (Mongo) failed:', e && e.message ? e.message : e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
module.exports.getChickenCost = getChickenCostMongoOnly;



