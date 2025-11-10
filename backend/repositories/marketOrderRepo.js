const MarketOrder = require('../models/MarketOrder');

async function createOrder(data) {
  const doc = await MarketOrder.create(data);
  return doc.toObject();
}

async function getById(id) {
  return MarketOrder.findById(id).lean().exec();
}

async function getByFsOrderId(fsOrderId) {
  return MarketOrder.findOne({ fsOrderId }).lean().exec();
}

async function getOpenOrders(filterOptions = {}) {
  const { item = 'chicken', limit = 50, skip = 0, sortByPrice = 1 } = filterOptions;
  return MarketOrder.find({ status: 'open', item })
    .sort({ price: sortByPrice })
    .skip(skip)
    .limit(limit)
    .lean()
    .exec();
}

async function getUserOrders(userId, filterOptions = {}) {
  const { status, limit = 50, skip = 0 } = filterOptions;
  const query = { userId };
  if (status) query.status = status;
  return MarketOrder.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean()
    .exec();
}

async function markOrderFilled(orderId, buyerId) {
  return MarketOrder.findByIdAndUpdate(orderId, { status: 'filled', buyerId, filledAt: new Date() }, { new: true })
    .lean()
    .exec();
}

async function cancelOrder(orderId, reason = null) {
  return MarketOrder.findByIdAndUpdate(orderId, { status: 'cancelled', cancelledAt: new Date(), cancelReason: reason }, { new: true })
    .lean()
    .exec();
}

module.exports = {
  createOrder,
  getById,
  getByFsOrderId,
  getOpenOrders,
  getUserOrders,
  markOrderFilled,
  cancelOrder,
};
