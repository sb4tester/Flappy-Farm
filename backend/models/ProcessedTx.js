const mongoose = require('mongoose');

const ProcessedTxSchema = new mongoose.Schema({
  _id: { type: String }, // txHash
  userId: { type: String },
  amount: { type: Number },
  confirmedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.models.ProcessedTx || mongoose.model('ProcessedTx', ProcessedTxSchema);

