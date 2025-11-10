const mongoose = require('mongoose');

const ListenerStateSchema = new mongoose.Schema({
  key: { type: String, unique: true, required: true },
  lastScannedBlock: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now },
  mode: { type: String, default: 'backscan' },
  error: { type: String, default: null },
}, { timestamps: true });

module.exports = mongoose.models.ListenerState || mongoose.model('ListenerState', ListenerStateSchema);

