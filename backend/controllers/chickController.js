
const { db } = require('../firebase');

// ให้อาหารลูกไก่
exports.feedChick = async (req, res) => {
  const { chickId } = req.params;
  const uid = req.user.uid;

  try {
    const chickRef = db.collection('chicks').doc(chickId);
    const chickSnap = await chickRef.get();
    if (!chickSnap.exists) {
      return res.status(404).json({ error: 'Chick not found' });
    }

    const chick = chickSnap.data();
    if (chick.owner !== uid) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // เพิ่มน้ำหนัก 0.3 กก. ต่อการให้อาหาร 1 ครั้ง
    const newWeight = (chick.weight || 0) + 0.3;
    await chickRef.update({ weight: newWeight, lastFed: new Date() });

    res.json({ message: 'Chick fed successfully', newWeight });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ขายลูกไก่
exports.sellChick = async (req, res) => {
  const { chickId } = req.params;
  const uid = req.user.uid;

  try {
    const chickRef = db.collection('chicks').doc(chickId);
    const chickSnap = await chickRef.get();
    if (!chickSnap.exists) {
      return res.status(404).json({ error: 'Chick not found' });
    }

    const chick = chickSnap.data();
    if (chick.owner !== uid) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if ((chick.weight || 0) < 3) {
      return res.status(400).json({ error: 'Chick must be at least 3 kg to sell' });
    }

    // ให้เหรียญขั้นต่ำ 7 coin
    const userRef = db.collection('users').doc(uid);
    await userRef.update({ coin: admin.firestore.FieldValue.increment(7) });

    // ลบ chick หลังขาย
    await chickRef.delete();

    res.json({ message: 'Chick sold for 7 coins' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// ดึงรายชื่อลูกไก่ทั้งหมดของผู้ใช้
exports.getUserChicks = async (req, res) => {
  const uid = req.user.uid;
  try {
    const snap = await db.collection('chicks').where('owner', '==', uid).get();
    const chicks = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(chicks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
