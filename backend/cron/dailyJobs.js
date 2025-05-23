const cron = require('node-cron');
const chickenService = require('../services/chickenService');
module.exports = {
  start: () => {
    cron.schedule('0 0 * * *', async () => {
      console.log('Running daily jobs');
      // TODO: implement decreaseWeightAndCheckDeaths, produceEggs, flagOldChickens
    });
  }
};
