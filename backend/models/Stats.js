const mongoose = require('mongoose');

const StatsSchema = new mongoose.Schema({
  key: { type: String, unique: true, required: true },
  totalChickenPurchase: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.models.Stats || mongoose.model('Stats', StatsSchema);

