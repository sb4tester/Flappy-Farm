const mongoose = require('mongoose');

const PromotionSchema = new mongoose.Schema({
  key: { type: String, unique: true, required: true },
  tiers: { type: [Object], default: [] },
}, { timestamps: true });

module.exports = mongoose.models.Promotion || mongoose.model('Promotion', PromotionSchema);

