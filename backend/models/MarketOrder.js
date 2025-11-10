const mongoose = require('mongoose');

const ChickenSnapshotSchema = new mongoose.Schema({
  type: String,
  weight: Number,
  birthDate: Date,
  purchasePrice: Number,
  totalCost: Number,
  foodCost: Number,
  tier: String
}, { _id: false });

const MarketOrderSchema = new mongoose.Schema({
  fsOrderId: { type: String, index: true },
  userId: { type: String, index: true },
  side: { type: String, enum: ['sell', 'buy'], required: true },
  item: { type: String, enum: ['chicken', 'egg', 'chick'], required: true },
  chickenId: { type: String, default: null },
  price: { type: Number, required: true },
  status: { type: String, enum: ['open', 'filled', 'cancelled'], default: 'open', index: true },
  lastFed: { type: Date, default: null },
  chickenData: { type: ChickenSnapshotSchema },
  buyerId: { type: String, default: null },
  filledAt: { type: Date, default: null },
  cancelledAt: { type: Date, default: null },
  cancelReason: { type: String, default: null }
}, { timestamps: true });

MarketOrderSchema.index({ status: 1, item: 1, price: 1 });
MarketOrderSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.models.MarketOrder || mongoose.model('MarketOrder', MarketOrderSchema);
