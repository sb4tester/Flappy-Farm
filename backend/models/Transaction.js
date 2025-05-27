const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: ['buyFood', 'buyMother', 'sellChicken', 'sellEgg', 'deposit', 'withdraw']
  },
  amount: {
    type: Number,
    required: true
  },
  cost: {
    type: Number,
    required: true
  },
  description: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Transaction', transactionSchema); 