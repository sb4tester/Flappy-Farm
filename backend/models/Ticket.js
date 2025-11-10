const mongoose = require('mongoose');

const TicketSchema = new mongoose.Schema({
  _id: { type: String }, // use Firestore doc ID as string
  pool: { type: String, enum: ['bronze', 'silver', 'gold'], index: true, required: true },
  userId: { type: String, index: true, required: true },
  used: { type: Boolean, default: false, index: true },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

TicketSchema.index({ pool: 1, used: 1, createdAt: -1 });

module.exports = mongoose.models.Ticket || mongoose.model('Ticket', TicketSchema);
