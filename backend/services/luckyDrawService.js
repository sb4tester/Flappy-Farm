const { connectMongo } = require('../db/mongo');
const ticketRepo = require('../repositories/ticketRepo');

async function addTickets(uid, packageType, quantity=1) {
  const pools = [];
  if (packageType === 'bronze') pools.push('bronze');
  if (packageType === 'silver') pools.push('silver', 'bronze');
  if (packageType === 'gold') pools.push('gold', 'silver', 'bronze');

  await connectMongo();
  await ticketRepo.addTickets(uid, pools, quantity);
}

// Add tickets by explicit counts per pool (no cascading)
async function addTicketsByPoolCounts(uid, { gold = 0, silver = 0, bronze = 0 } = {}) {
  await connectMongo();
  if (gold > 0)   await ticketRepo.addTickets(uid, ['gold'], gold);
  if (silver > 0) await ticketRepo.addTickets(uid, ['silver'], silver);
  if (bronze > 0) await ticketRepo.addTickets(uid, ['bronze'], bronze);
}

// Pure helper: compute ticket counts from quantity using 300/100/30 rule
function computeTicketsFromQuantity(quantity) {
  const q = Math.max(0, parseInt(quantity, 10) || 0);
  const gold = Math.floor(q / 300);
  let rem = q % 300;
  const silver = Math.floor(rem / 100);
  rem = rem % 100;
  const bronze = Math.floor(rem / 30);
  return { gold, silver, bronze };
}

module.exports = { addTickets, addTicketsByPoolCounts, computeTicketsFromQuantity };
