const admin = require('../firebase');

module.exports = {
  getBalance: async (userId) => {
    const db = admin.firestore();
    const doc = await db.collection('users').doc(userId).get();
    return doc.exists ? doc.data().coin_balance || 0 : 0;
  },
  deposit: async (userId, usdtAmount, bonusPercent) => {
    const coins = usdtAmount * (1 + bonusPercent / 100);
    const db = admin.firestore();
    const userRef = db.collection('users').doc(userId);
    await db.runTransaction(async tx => {
      const snap = await tx.get(userRef);
      const prev = snap.data()?.coin_balance || 0;
      tx.update(userRef, { coin_balance: prev + coins });
      const txRef = userRef.collection('transactions').doc();
      tx.set(txRef, {
        type: 'deposit',
        amount: coins,
        metadata: { usdtAmount, bonusPercent },
        createdAt: admin.firestore.Timestamp.now()
      });
    });
    return coins;
  },
  withdraw: async (userId, coinAmount, usdtRate) => {
    const usdtAmount = coinAmount * usdtRate;
    const db = admin.firestore();
    const userRef = db.collection('users').doc(userId);
    await db.runTransaction(async tx => {
      const snap = await tx.get(userRef);
      const prev = snap.data()?.coin_balance || 0;
      if (prev < coinAmount) throw new Error('Insufficient coins');
      tx.update(userRef, { coin_balance: prev - coinAmount });
      const txRef = userRef.collection('transactions').doc();
      tx.set(txRef, {
        type: 'withdraw',
        amount: -coinAmount,
        metadata: { usdtAmount },
        createdAt: admin.firestore.Timestamp.now()
      });
    });
    return usdtAmount;
  }
};
