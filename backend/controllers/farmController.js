const { db, admin } = require('../firebase');
const { CHICKEN_SELLBACK_PRICE, CHICKEN_FOOD_COST, CHICKEN_FOOD_COST_PER_UNIT } = require('../config/constants');
const chickenService = require('../services/chickenService');
const { addTickets } = require('../services/luckyDrawService');

async function getChickens(req, res) {
  const uid = req.user.uid;
  const snap = await db.collection('users').doc(uid).collection('chickens').get();
  const now = admin.firestore.Timestamp.now();
  const batch = db.batch();
  let updatedCount = 0;

  // ตรวจสอบอายุไก่และอัพเดทสถานะ
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

  // อัพเดท lastFed เป็น birthDate ถ้า lastFed เป็น null
  snap.docs.forEach(doc => {
    const chicken = doc.data();
    if (!chicken.lastFed) {
      batch.update(doc.ref, { lastFed: chicken.birthDate });
      updatedCount++;
    }
  });

  // เพิ่ม logic ตรวจสอบ lastFed ถ้าเกิน 24 ชั่วโมงให้เปลี่ยนเป็น hungry, ถ้าเกิน 72 ชั่วโมงให้เปลี่ยนเป็น dead
  snap.docs.forEach(doc => {
    const chicken = doc.data();
    const lastFed = chicken.lastFed || chicken.birthDate; // ใช้ birthDate ถ้า lastFed เป็น null
    const hoursSinceLastFed = (now.toDate() - lastFed.toDate()) / (1000 * 60 * 60);
    if (hoursSinceLastFed > 72) {
      batch.update(doc.ref, { status: 'dead', weight: 0 });
      updatedCount++;
    } else if (hoursSinceLastFed > 24) {
      batch.update(doc.ref, { status: 'hungry' });
      updatedCount++;
    }
  });

  // ถ้ามีไก่ที่ต้องอัพเดทสถานะ
  if (updatedCount > 0) {
    await batch.commit();
  }

  // ดึงข้อมูลไก่ล่าสุด
  const updatedSnap = await db.collection('users').doc(uid).collection('chickens').get();
  const chickens = updatedSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  res.json({ chickens });
}

// Helper function to get mother tier prices from DB
async function getMotherTierPricesData() {
  const doc = await db.collection('promotions').doc('motherTierPrice').get();
  return doc.data() ? doc.data().tiers : [];
}

// Helper function to get total chickens sold count from DB
async function getChickenSoldCount() {
  const doc = await db.collection('promotions').doc('statistics').get();
  return doc.data() ? doc.data().totalChickenPurchase || 0 : 0;
}

async function buyMother(req, res) {
  const uid = req.user.uid;
  const { quantity, packageType } = req.body; 

  if (!quantity || quantity <= 0) {
    return res.status(400).json({ error: 'Invalid quantity' });
  }

  const userRef = db.collection('users').doc(uid);
  const userSnap = await userRef.get();
  const user = userSnap.data() || {};
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
  if ((user.coin_balance || 0) < priceToDeduct) {
    return res.status(400).json({ error: 'Not enough coins' });
  }

  // Deduct coins
  await userRef.update({ coin_balance: admin.firestore.FieldValue.increment(-priceToDeduct) });

  // Add chickens using chickenService
  await chickenService.buyMother(uid, quantity); 

  // ✅ Add tickets for Lucky Draw if buying package
  if (packageType === 'bronze' || packageType === 'silver' || packageType === 'gold') {
    await addTickets(uid, packageType, 1); // ซื้อ 1 แพ็ค = 1 สิทธิ์
  }

  // Update total chicken purchase statistics
  const statsRef = db.collection('promotions').doc('statistics');
  await statsRef.update({
    totalChickenPurchase: admin.firestore.FieldValue.increment(quantity)
  });

  res.json({ success: true, boughtQuantity: quantity, pricePaid: priceToDeduct });
}

async function feedChicken(req, res) {
  const uid = req.user.uid;
  const { id } = req.params;
  const { units = 1 } = req.body; // จำนวน unit ที่ต้องการให้อาหาร

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

    // ตรวจสอบยอดเงินผู้เล่น
    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();
    const user = userSnap.data();

    const foodCost = CHICKEN_FOOD_COST_PER_UNIT * units;
    if ((user.coin_balance || 0) < foodCost) {
      return res.status(400).json({ error: 'Not enough coins' });
    }

    const now = admin.firestore.Timestamp.now();
    const batch = db.batch();

    // อัพเดทข้อมูลไก่
    const newTotalCost = (chicken.totalCost || 0) + foodCost;
    const weightGain = 0.1 * units; // น้ำหนักเพิ่มขึ้นตามจำนวน unit

    batch.update(chickenRef, {
      lastFed: now,
      status: 'normal',
      weight: (chicken.weight || 0) + weightGain,
      foodCost: (chicken.foodCost || 0) + foodCost,
      totalCost: newTotalCost,
      costHistory: admin.firestore.FieldValue.arrayUnion({
        type: 'food',
        amount: foodCost,
        units: units,
        timestamp: now
      })
    });

    // อัพเดทยอดเงินผู้เล่น
    batch.update(userRef, {
      coin_balance: admin.firestore.FieldValue.increment(-foodCost)
    });

    // บันทึกประวัติการให้อาหาร
    const transactionRef = db.collection('users').doc(uid).collection('transactions').doc();
    batch.set(transactionRef, {
      type: 'feedChicken',
      amount: -foodCost,
      chickenId: id,
      metadata: {
        foodCost,
        units,
        newTotalCost,
        weightGain
      },
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
  const totalFoodCost = foodCostPerChicken * chickenIds.length;

  try {
    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();
    const user = userSnap.data();

    if ((user.coin_balance || 0) < totalFoodCost) {
      return res.status(400).json({ error: 'Not enough coins' });
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
        costHistory: admin.firestore.FieldValue.arrayUnion({
          type: 'food',
          amount: foodCostPerChicken,
          units,
          timestamp: now
        })
      });

      // เพิ่มบันทึก transaction แยกทีหลังถ้าอยากละเอียด
      chickensFed++;
      totalCharged += foodCostPerChicken;
    }

    if (chickensFed === 0) {
      return res.status(400).json({ error: 'No valid chickens to feed' });
    }

    batch.update(userRef, {
      coin_balance: admin.firestore.FieldValue.increment(-totalCharged)
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
    console.error('ERROR: req.user หรือ req.user.uid หายไปใน sellChicken controller. (เป็นไปได้ว่า token ไม่ถูกต้อง)');
    return res.status(401).json({ error: 'Authentication required: User data missing in request.' });
  }
  const uid = req.user.uid;
  const { type } = req.query;
  const quantity = parseInt(req.body.quantity || '1', 10); // รองรับ quantity

  if (quantity <= 0 || quantity > 100) {
    return res.status(400).json({ error: 'Quantity must be between 1-100' });
  }

  try {
    if (type === 'system') {
      const userRef = db.collection('users').doc(uid);

      // 1) ดึงแม่ไก่ที่ขายได้จำนวนตาม quantity
      const chickensSnap = await userRef
        .collection('chickens')
        .where('type', '==', 'mother')
        .where('feedCount', '>=', 3)
        .where('status', 'in', ['normal', 'hungry'])
        .limit(quantity)
        .get(); 

      if (chickensSnap.size < quantity) {
        return res.status(400).json({ error: `คุณมีแม่ไก่ไม่พอ ต้องการขาย ${quantity} ตัว แต่มีแค่ ${chickensSnap.size} ตัว` });
      }

      const batch = db.batch();
      const now = admin.firestore.Timestamp.now();
      const sellPrice = CHICKEN_SELLBACK_PRICE; // สมมติว่า import ค่านี้จาก config
      let totalProfit = 0;
      let totalCost = 0;

      chickensSnap.docs.forEach((doc) => {
        const chickenData = doc.data();
        const chickenId = doc.id;

        const profit = sellPrice - (chickenData.totalCost || 0);
        totalProfit += profit;
        totalCost += chickenData.totalCost || 0;

        // บันทึกใน burnlist
        const burnlistRef = db.collection('burnlist').doc(chickenId);
        batch.set(burnlistRef, {
          ...chickenData,
          id: chickenId,
          burnedAt: now,
          reason: 'sold_to_system'
        });

        // ลบไก่ออกจาก collection ผู้ใช้
        batch.delete(doc.ref);
      });

      // อัพเดทยอดเงิน user
      const totalSellPrice = sellPrice * quantity;
      batch.update(userRef, {
        coin_balance: admin.firestore.FieldValue.increment(totalSellPrice)
      });

      // บันทึกประวัติการขาย
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
        message: `ขายแม่ไก่ ${quantity} ตัวให้ระบบสำเร็จ`,
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


// เพิ่มฟังก์ชันตรวจสอบอายุไก่
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

  // อัพเดท lastFed เป็น birthDate ถ้า lastFed เป็น null
  snap.docs.forEach(doc => {
    const chicken = doc.data();
    if (!chicken.lastFed) {
      batch.update(doc.ref, { lastFed: chicken.birthDate });
      updatedCount++;
    }
  });

  // เพิ่ม logic ตรวจสอบ lastFed ถ้าเกิน 24 ชั่วโมงให้เปลี่ยนเป็น hungry, ถ้าเกิน 72 ชั่วโมงให้เปลี่ยนเป็น dead
  snap.docs.forEach(doc => {
    const chicken = doc.data();
    const lastFed = chicken.lastFed || chicken.birthDate; // ใช้ birthDate ถ้า lastFed เป็น null
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
