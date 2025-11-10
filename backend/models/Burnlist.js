const mongoose = require('mongoose');

const BurnlistSchema = new mongoose.Schema({
  ownerUid: { type: String, required: true, index: true },
  chickenRefId: { type: String, default: null }, // Chicken _id or fsId (string)
  price: { type: Number, default: 0 },
  reason: { type: String, default: 'system_sell' },
  source: { type: String, default: 'system' },
  soldAt: { type: Date, default: Date.now },
  chickenData: { type: Object, default: {} },
}, { timestamps: true });

module.exports = mongoose.models.Burnlist || mongoose.model('Burnlist', BurnlistSchema);

