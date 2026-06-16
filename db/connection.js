import mongoose from "mongoose";

export async function connectDB() {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("MONGO_URI environment variable is not set");
  }

  await mongoose.connect(mongoUri, { dbName: "checkin" });
  console.log("Connected to MongoDB");
}
