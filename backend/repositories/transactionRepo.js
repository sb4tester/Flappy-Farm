const Transaction = require('../models/Transaction');

async function createTransaction(data) {
  const doc = await Transaction.create(data);
  return doc.toObject();
}

async function getTransactionsByUser(userId, { limit = 50, skip = 0 } = {}) {
  return Transaction.find({ userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean()
    .exec();
}

module.exports = {
  createTransaction,
  getTransactionsByUser,
};

