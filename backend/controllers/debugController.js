const { connectMongo } = require('../db/mongo');

function redactMongoUri(uri = '') {
  try {
    // Avoid leaking credentials: keep scheme and host, hide user/pass and query
    const u = new URL(uri.replace(/^mongodb\+srv:/, 'http:').replace(/^mongodb:/, 'http:'));
    const host = u.host;
    // crude db extraction from pathname
    const path = u.pathname || '/';
    const db = (path.startsWith('/') ? path.slice(1) : path) || '';
    return `${host}${db ? '/' + db : ''}`;
  } catch {
    return '(redacted)';
  }
}

exports.whoami = async (req, res) => {
  try {
    const uid = req.user && req.user.uid;
    await connectMongo();
    const UserState = require('../models/UserState');
    const User = require('../models/User');

    const state = await UserState.findOne({ uid }).lean().exec();
    const legacy = await User.findOne({ uid }).lean().exec();

    res.json({
      uid,
      mongo: { target: redactMongoUri(process.env.MONGODB_URI || '') },
      state: state ? {
        exists: true,
        coin_balance: typeof state.coin_balance === 'number' ? state.coin_balance : null,
        food: typeof state.food === 'number' ? state.food : null,
        updatedAt: state.updatedAt || null,
      } : { exists: false },
      legacy: legacy ? {
        exists: true,
        coin_balance: typeof legacy.coin_balance === 'number' ? legacy.coin_balance : null,
        food: typeof legacy.food === 'number' ? legacy.food : null,
        updatedAt: legacy.updatedAt || null,
      } : { exists: false }
    });
  } catch (e) {
    res.status(500).json({ error: e && e.message ? e.message : String(e) });
  }
};

