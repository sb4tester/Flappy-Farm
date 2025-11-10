const mongoose = require('mongoose');

const UserStateSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true, index: true },
  food: { type: Number, default: 0 },
  coin_balance: { type: Number, default: 0 },
  farmName: { type: String, default: null },
  usdtWallet: { type: String, default: null, index: true },
  twoFactorEnabled: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.models.UserState || mongoose.model('UserState', UserStateSchema);
