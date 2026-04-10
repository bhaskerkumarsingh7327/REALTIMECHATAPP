// import mongoose  from "mongoose";

// const connectDb =async => {
//     try {
//         mongoose.connect(process.env.MONGO_URL)
//         console.log("db connected")
//     } catch (error) {
//         console.log("db error")
//     }
    
// }
  

// export default connectDb;

import mongoose from "mongoose";

const connectDb = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URL || process.env.MONGO_URI);
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ DB connection error: ${error}`);
    process.exit(1);
  }
};

export default connectDb;
