const mongoose = require('mongoose');

const IncubatorSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  capacity: { type: Number, default: 5 },
  usedSlots: { type: Number, default: 0 },
  eggs: { type: [String], default: [] },
  purchasedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.models.Incubator || mongoose.model('Incubator', IncubatorSchema);

