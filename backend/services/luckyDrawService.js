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

module.exports = { addTickets };
