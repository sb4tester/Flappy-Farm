const { db, admin } = require('../firebase');

exports.getChickens = async (req, res) => {
  const uid = req.user.uid;
  const snap = await db.collection('users').doc(uid).collection('chickens').get();
  const now = admin.firestore.Timestamp.now();
  const batch = db.batch();
  let updatedCount = 0;

  // ตรวจสอบอายุไก่และอัพเดทสถานะ
  snap.docs.forEach(doc => {
    const chicken = doc.data();
    if (chicken.type === 'mother' && chicken.status === 'alive') {
      const birthDate = chicken.birthDate.toDate();
      const ageInDays = Math.floor((now.toDate() - birthDate) / (1000 * 60 * 60 * 24));
      
      if (ageInDays >= 104) {
        batch.update(doc.ref, { status: 'dead' });
        updatedCount++;
      }
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
  
  const now = admin.firestore.Timestamp.now();
  await userRef.collection('chickens').add({
    type: 'mother',
    birthDate: now,
    lastFed: null,
    weight: 1.0,
    status: 'alive',
    specialSale: false,
    health: 100,
    lastHealthCheck: now,
    eggProduction: {
      totalEggs: 0,
      lastEggDate: null,
      productionRate: 1.0  // 1.0 = 100% ของอัตราการผลิตปกติ
    }
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
  
  // ตรวจสอบอายุไก่
  const now = admin.firestore.Timestamp.now();
  const birthDate = chicken.birthDate.toDate();
  const ageInDays = Math.floor((now.toDate() - birthDate) / (1000 * 60 * 60 * 24));
  
  if (chicken.type === 'mother' && ageInDays >= 104) {
    await chickenRef.update({ status: 'dead' });
    return res.status(400).json({ error: 'Chicken has reached maximum age (104 days)' });
  }
  
  if (chicken.status === 'dead') return res.status(400).json({ error: 'Cannot feed a dead chicken' });
  
  // weight gain per feed
  await chickenRef.update({ 
    weight: (chicken.weight || 0) + 0.1,
    lastFed: now,
    status: 'alive'
  });
  
  // --- Logic การออกไข่ใหม่ ---
  if (chicken.type === 'mother') {
    let feedCount = (chicken.feedCount || 0) + 1;
    let canLayEgg = (chicken.canLayEgg || false);
    let eggs = chicken.eggs || 0;
    if (!canLayEgg && feedCount >= 3) {
      canLayEgg = true;
      eggs += 1; // ได้ไข่ฟองแรกทันทีเมื่อครบ 3 ครั้ง
    } else if (canLayEgg) {
      eggs += 1; // หลังจากนั้นให้อาหารทุกครั้งจะได้ไข่ 1 ฟอง
    }
    await chickenRef.update({ feedCount, canLayEgg, eggs });
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

// เพิ่มฟังก์ชันตรวจสอบอายุไก่
exports.checkChickenAge = async (req, res) => {
  const uid = req.user.uid;
  const chickenRef = db.collection('users').doc(uid).collection('chickens');
  const snap = await chickenRef.get();
  const now = admin.firestore.Timestamp.now();
  
  const batch = db.batch();
  let updatedCount = 0;

  snap.docs.forEach(doc => {
    const chicken = doc.data();
    if (chicken.type === 'mother' && chicken.status === 'alive') {
      const birthDate = chicken.birthDate.toDate();
      const ageInDays = Math.floor((now.toDate() - birthDate) / (1000 * 60 * 60 * 24));
      
      if (ageInDays >= 104) {
        batch.update(doc.ref, { status: 'dead' });
        updatedCount++;
      }
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
};
