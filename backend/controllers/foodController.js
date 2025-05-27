const admin = require('firebase-admin');

const buyFood = async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.user.uid;

    // Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // Calculate cost (1 coin per 30 food)
    const cost = Math.ceil(amount / 30);

    // Get user from Firestore
    const userRef = admin.firestore().collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();

    // Check if user has enough coins
    if (userData.coin_balance < cost) {
      return res.status(400).json({ error: 'Not enough coins' });
    }

    // Update user's food and coin balance using transaction
    await admin.firestore().runTransaction(async (transaction) => {
      // Update user document
      transaction.update(userRef, {
        food: (userData.food || 0) + amount,
        coin_balance: userData.coin_balance - cost
      });

      // Create transaction record in subcollection
      const transactionRef = userRef.collection('transactions').doc();
      transaction.set(transactionRef, {
        type: 'buyFood',
        amount: -cost, // จำนวน coin ที่ใช้ (ติดลบเพราะเป็นการใช้จ่าย)
        metadata: {
          foodAmount: amount
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    // Get updated user data
    const updatedUserDoc = await userRef.get();
    const updatedUserData = updatedUserDoc.data();

    res.json({
      success: true,
      data: {
        food: updatedUserData.food,
        coin_balance: updatedUserData.coin_balance
      }
    });
  } catch (error) {
    console.error('Error buying food:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  buyFood
}; 