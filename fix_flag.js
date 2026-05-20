import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/2SEATS";

const fixUserFlag = async () => {
  try {
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    const userId = "6a021e67fad6f5149a131f9c";
    const result = await mongoose.connection.collection("users").updateOne(
      { _id: new mongoose.Types.ObjectId(userId) },
      { $set: { isBusinessCreated: false } }
    );

    console.log("Update result:", result);
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
};

fixUserFlag();
