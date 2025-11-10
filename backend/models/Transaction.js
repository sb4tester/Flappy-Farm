const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  type: { type: String, required: true },
  amountCoin: { type: Number, default: 0 },
  amountUSDT: { type: Number, default: null },
  balanceBefore: { type: Number, default: null },
  balanceAfter: { type: Number, default: null },
  meta: { type: Object, default: {} }
}, { timestamps: true });

module.exports = mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);

