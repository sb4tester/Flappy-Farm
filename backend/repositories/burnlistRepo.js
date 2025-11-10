const Burnlist = require('../models/Burnlist');

async function addToBurnlist(doc) {
  const created = await Burnlist.create(doc);
  return created.toObject();
}

module.exports = { addToBurnlist };

