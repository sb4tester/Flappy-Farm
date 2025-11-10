const { connectMongo } = require('../db/mongo');
const chickenRepo = require('../repositories/chickenRepo');
const marketOrderRepo = require('../repositories/marketOrderRepo');
const userRepo = require('../repositories/userRepo');
const { CHICKEN_FOOD_COST_PER_UNIT } = require('../config/constants');

const FEED_GAIN = 0.1;

module.exports = {
  listChickens: async (userId) => {
    await connectMongo();
    const docs = await chickenRepo.getChickensByOwner(userId);
    const now = new Date();
    return docs.map((d) => {
      const birthDate = d.birthDate ? new Date(d.birthDate) : null;
      const lastFed = d.lastFed ? new Date(d.lastFed) : null;
      const ageInDays = birthDate ? Math.floor((now - birthDate) / (1000 * 60 * 60 * 24)) : null;
      return {
        id: d.fsId || String(d._id),
        type: d.type,
        birthDate: birthDate ? birthDate.toISOString().split('T')[0] : null,
        lastFed: lastFed ? lastFed.toISOString().split('T')[0] : null,
        weight: d.weight,
        status: d.status,
        ageInDays,
        specialSale: d.specialSale || false,
        feedCount: d.feedCount || 0,
        canLayEgg: d.canLayEgg || false,
        eggs: d.eggs || 0,
      };
    });
  },

  buyMother: async (userId, qty) => {
    if (qty <= 0) throw new Error('Invalid quantity');
    await connectMongo();
    const now = new Date();
    const Chicken = require('../models/Chicken');
    const payload = Array.from({ length: qty }).map(() => ({
      ownerUid: userId,
      type: 'mother',
      birthDate: now,
      lastFed: now,
      weight: 3.0,
      status: 'hungry',
      specialSale: false,
      feedCount: 0,
      canLayEgg: false,
      eggs: 0,
    }));
    await Chicken.insertMany(payload);
    return { bought: qty };
  },

  feedChicken: async (userId, chickenId, units = 1) => {
    await connectMongo();
    const Chicken = require('../models/Chicken');
    const chicken = await Chicken.findOne({ _id: chickenId, ownerUid: userId }).lean().exec();
    if (!chicken) throw new Error('Chicken not found');
    if (chicken.status === 'dead') throw new Error('Cannot feed a dead chicken');

    // Check and decrement user food
    await userRepo.decFood(userId, units);

    const now = new Date();
    const weightGain = FEED_GAIN * units;
    const foodCost = CHICKEN_FOOD_COST_PER_UNIT * units;
    const update = {
      lastFed: now,
      status: 'normal',
      $inc: {
        weight: weightGain,
        foodCost: foodCost,
        totalCost: foodCost,
        feedCount: units,
      },
      $push: {
        costHistory: { type: 'food', amount: foodCost, units, timestamp: now },
      },
    };
    const res = await Chicken.findByIdAndUpdate(chickenId, update, { new: true }).lean().exec();
    return { id: chickenId, weight: res ? res.weight : (chicken.weight || 0) + weightGain };
  },

  sellChicken: async (userId, chickenId) => {
    await connectMongo();
    const Chicken = require('../models/Chicken');
    const doc = await Chicken.findOne({ _id: chickenId, ownerUid: userId }).lean().exec();
    if (!doc) throw new Error('Chicken not found');
    if (doc.status === 'dead') throw new Error('Cannot sell a dead chicken');
    await Chicken.deleteOne({ _id: chickenId }).exec();
    return { soldId: chickenId };
  },

  checkListedChickens: async () => {
    await connectMongo();
    const Chicken = require('../models/Chicken');
    const threeDaysAgo = new Date(Date.now() - 72 * 60 * 60 * 1000);
    const toCancel = await Chicken.find({ status: 'listed', lastFed: { $lt: threeDaysAgo } }).lean().exec();
    let processed = 0;
    for (const c of toCancel) {
      await Chicken.updateOne({ _id: c._id }, { $set: { status: 'dead', weight: 0, diedAt: new Date(), deathReason: 'market_starvation' } }).exec();
      if (c.marketOrderId) {
        try { await marketOrderRepo.cancelOrder(c.marketOrderId, 'chicken_died'); } catch (e) {}
      }
      processed++;
    }
    return { success: true, processedCount: processed };
  },
};

