const Ticket = require('../models/Ticket');

async function addTickets(userId, pools, quantity = 1) {
  const docs = [];
  const now = new Date();
  for (const pool of pools) {
    for (let i = 0; i < quantity; i++) {
      docs.push({ pool, userId, used: false, createdAt: now });
    }
  }
  if (docs.length === 0) return [];
  const created = await Ticket.insertMany(docs, { ordered: false });
  return created.map((d) => d.toObject());
}

async function findRandomUnused(pool) {
  const count = await Ticket.countDocuments({ pool, used: false }).exec();
  if (count === 0) return null;
  const rand = Math.floor(Math.random() * count);
  const ticket = await Ticket.findOne({ pool, used: false }).skip(rand).lean().exec();
  return ticket;
}

async function markUsed(id) {
  await Ticket.findByIdAndUpdate(id, { used: true }).exec();
}

module.exports = { addTickets, findRandomUnused, markUsed };

