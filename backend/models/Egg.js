const mongoose = require('mongoose');

const EggSchema = new mongoose.Schema({
  userId: { type: String, index: true, required: true },
  // Accept both 'bronze' and 'copper' for backward/forward compatibility
  type: { type: String, enum: ['normal', 'bronze', 'copper', 'silver', 'gold'], required: true },
  chickenId: { type: String, default: null },
  special: { type: Boolean, default: false },
  source: { type: String, default: 'daily' },
  createdAt: { type: Date, default: Date.now },
  key: { type: String, index: true, unique: true, sparse: true },
}, { timestamps: true });

EggSchema.index({ userId: 1, type: 1, createdAt: -1 });

module.exports = mongoose.models.Egg || mongoose.model('Egg', EggSchema);
