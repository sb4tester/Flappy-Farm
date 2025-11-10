const { connectMongo } = require('../db/mongo');
const ticketRepo = require('../repositories/ticketRepo');
const eggRepo = require('../repositories/eggRepo');

async function drawWinners(pool) {
  console.log(`[LuckyDraw] Drawing winners in ${pool} pool...`);
  await connectMongo();
  const ticket = await ticketRepo.findRandomUnused(pool);
  if (!ticket) {
    console.log(`[LuckyDraw] No tickets in ${pool} pool.`);
    return;
  }
  await eggRepo.createEgg({ userId: ticket.userId, type: pool, special: true, source: 'luckyDraw' });
  await ticketRepo.markUsed(ticket._id);
  console.log(`[LuckyDraw] Winner in ${pool} pool: user ${ticket.userId}`);
}

module.exports = { drawWinners };
