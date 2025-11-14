const mongoose = require('mongoose');

const CostHistorySchema = new mongoose.Schema({
  type: { type: String },
  amount: { type: Number },
  units: { type: Number },
  timestamp: { type: Date }
}, { _id: false });

const EggProductionSchema = new mongoose.Schema({
  totalEggs: { type: Number },
  lastEggDate: { type: Date },
  productionRate: { type: Number }
}, { _id: false });

const ChickenSchema = new mongoose.Schema({
  fsId: { type: String, index: true },
  ownerUid: { type: String, required: true, index: true },
  type: { type: String, enum: ['mother', 'baby'], required: true },
  birthDate: { type: Date },
  weight: { type: Number },
  status: { type: String, enum: ['normal', 'hungry', 'dead'], default: 'normal' },
  canLayEgg: { type: Boolean },
  eggs: { type: Number },
  feedCount: { type: Number, default: 0 },
  lastFed: { type: Date },
  foodCost: { type: Number },
  totalCost: { type: Number },
  costHistory: { type: [CostHistorySchema], default: [] },
  eggProduction: { type: EggProductionSchema, default: undefined },
  health: { type: Number },
  marketOrderId: { type: String, default: null, index: true },
  listedAt: { type: Date, default: null },
  // Track last end-of-day evaluation (Asia/Bangkok date key: YYYY-MM-DD)
  lastEodKey: { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.models.Chicken || mongoose.model('Chicken', ChickenSchema);
