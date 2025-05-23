const admin = require('firebase-admin');
const db = admin.firestore();

exports.rentIncubator = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { duration } = req.body; // e.g. rental days
    // TODO: Create incubator rental record in Firestore
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.hatchEggs = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { incubatorId } = req.body;
    // TODO: Hatch logic: convert eggs to chickens, update Firestore
    res.json({ chickens: [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
