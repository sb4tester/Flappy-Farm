const mongoose = require('mongoose');

let connectingPromise = null;

async function connectMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');

  // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  if (mongoose.connection.readyState === 1) return mongoose;
  if (connectingPromise) return connectingPromise;

  connectingPromise = mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    maxPoolSize: 10,
  }).then((m) => {
    console.log('MongoDB connected');
    return m;
  }).finally(() => {
    connectingPromise = null;
  });

  return connectingPromise;
}

module.exports = { connectMongo };

