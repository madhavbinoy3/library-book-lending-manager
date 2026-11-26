const mongoose = require('mongoose');

/**
 * Connect to MongoDB Atlas using the MONGO_URI environment variable.
 */
async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri || uri.includes('<username>') || uri.includes('<password>')) {
    console.warn(
      'Warning: MONGO_URI is not configured with real credentials yet. Update backend/.env with your MongoDB Atlas URI.'
    );
  }

  const conn = await mongoose.connect(uri);
  console.log(`MongoDB connected: ${conn.connection.host}`);
  return conn;
}

module.exports = connectDB;
