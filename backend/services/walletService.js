// services/walletService.js

// Destructure ให้ตรงกับ export ของ firebase.js
const { admin, db } = require('../firebase');

module.exports = {
  /**
   * คืนค่า coin_balance ของ user จาก collection users
   */
  getBalance: async (userId) => {
    const snap = await db.collection('users').doc(userId).get();
    return snap.exists
      ? snap.data().coin_balance || 0
      : 0;
  },

  /**
   * ฝาก USDT เข้ากระเป๋า (usdtAmount)
   * คำนวณโบนัสตาม bonusPercent แล้วอัพเดต field coin_balance
   * คืนค่าเป็นจำนวนเหรียญ (coins) ที่เพิ่มให้
   */
  deposit: async (userId, usdtAmount, bonusPercent) => {
    const coins = usdtAmount * (1 + bonusPercent / 100);
    const userRef = db.collection('users').doc(userId);

    await db.runTransaction(async (tx) => {
      const doc = await tx.get(userRef);
      const prev = doc.exists ? doc.data().coin_balance || 0 : 0;
      tx.set(userRef, { coin_balance: prev + coins }, { merge: true });
    });

    return coins;
  },

  /**
   * ถอนเหรียญ (coinAmount) แลกเป็น USDT ตามอัตรา usdtRate
   * ตรวจยอดให้พอ และอัพเดต coin_balance ใน transaction เดียว
   * คืนค่าเป็นจำนวน USDT ที่ได้
   */
  withdraw: async (userId, coinAmount, usdtRate = 1) => {
    const userRef = db.collection('users').doc(userId);
    const usdtOut = coinAmount / usdtRate;

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      const prev = snap.exists ? snap.data().coin_balance || 0 : 0;
      if (prev < coinAmount) throw new Error('Insufficient coins');
      tx.set(userRef, { coin_balance: prev - coinAmount }, { merge: true });
    });

    return usdtOut;
  }
};
