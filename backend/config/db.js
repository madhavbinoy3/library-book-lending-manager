const mongoose = require('mongoose');

/**
 * Connect to MongoDB Atlas using the MONGO_URI environment variable.
 */
async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri || uri.includes('<username>') || uri.includes('<password>') || uri.includes('<cluster-url>')) {
    throw new Error(
      'MONGO_URI is not configured with real MongoDB Atlas credentials. Update backend/.env with your Atlas connection string.'
    );
  }

  const conn = await mongoose.connect(uri);
  console.log(`MongoDB connected: ${conn.connection.host}`);
  return conn;
}

module.exports = connectDB;
