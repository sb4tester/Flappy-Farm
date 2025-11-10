const { connectMongo } = require('../db/mongo');
const userRepo = require('../repositories/userRepo');
const User = require('../models/User');

// get tree up to 5 levels
async function getChildren(uid, level) {
  if (level > 5) return [];
  await connectMongo();
  const children = await User.find({ referredBy: uid }).lean().exec();
  const result = [];
  for (const u of children) {
    const child = { uid: u.uid, children: [] };
    child.children = await getChildren(u.uid, level + 1);
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
  await connectMongo();
  let currentUid = uid;
  for (let i = 0; i < rates.length; i++) {
    const user = await User.findOne({ uid: currentUid }).lean().exec();
    if (!user || !user.referredBy) break;
    const parent = user.referredBy;
    const commission = Math.floor(amount * (rates[i]/100));
    await userRepo.incCoins(parent, commission);
    currentUid = parent;
  }
};

exports.handleReferralAction = async (req, res) => {
  // Deprecated: use distributeCommission in deposit
  res.json({ success: true });
};
