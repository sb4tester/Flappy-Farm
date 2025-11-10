const Promotion = require('../models/Promotion');

async function getMotherTierPrice() {
  const doc = await Promotion.findOne({ key: 'motherTierPrice' }).lean().exec();
  return doc ? (doc.tiers || []) : [];
}

async function setMotherTierPrice(tiers) {
  await Promotion.updateOne({ key: 'motherTierPrice' }, { $set: { tiers } }, { upsert: true }).exec();
}

module.exports = { getMotherTierPrice, setMotherTierPrice };

