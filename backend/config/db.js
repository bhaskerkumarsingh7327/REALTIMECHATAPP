import mongoose from "mongoose";

const connectDb = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGO_URL || "mongodb://127.0.0.1:27017/realtimechatapp";
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`⚠️ MongoDB Connection Warning: ${error.message}`);
    console.log("ℹ️ Server will continue running. Retrying MongoDB connection in background...");
    // Try reconnecting in 10 seconds without crashing the server
    setTimeout(connectDb, 10000);
  }
};

export default connectDb;
