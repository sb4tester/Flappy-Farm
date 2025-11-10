const mongoose = require('mongoose');

const LuckyRunSchema = new mongoose.Schema({
  cycle: { type: String, unique: true, required: true }, // e.g., YYYYMM
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.models.LuckyRun || mongoose.model('LuckyRun', LuckyRunSchema);

