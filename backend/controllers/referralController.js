const { db, admin } = require('../firebase');

// get tree up to 5 levels
async function getChildren(uid, level) {
  if (level > 5) return [];
  const snap = await db.collection('users').where('referrer', '==', uid).get();
  const result = [];
  for (const doc of snap.docs) {
    const child = { uid: doc.id, children: [] };
    child.children = await getChildren(doc.id, level + 1);
    result.push(child);
  }
  return result;
}

exports.getReferralTree = async (req, res) => {
  const uid = req.user.uid;
  const tree = await getChildren(uid, 1);
  res.json({ tree });
};

// distribute commission for deposit amount
exports.distributeCommission = async (uid, amount) => {
  const rates = [5,4,3,2,1];
  let currentUid = uid;
  for (let i = 0; i < rates.length; i++) {
    const userSnap = await db.collection('users').doc(currentUid).get();
    const user = userSnap.data();
    if (!user || !user.referrer) break;
    const parent = user.referrer;
    const commission = Math.floor(amount * (rates[i]/100));
    await db.collection('users').doc(parent)
      .update({ coin_balance: admin.firestore.FieldValue.increment(commission) });
    currentUid = parent;
  }
};

exports.handleReferralAction = async (req, res) => {
  // Deprecated: use distributeCommission in deposit
  res.json({ success: true });
};
