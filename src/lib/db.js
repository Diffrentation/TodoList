import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGODB_URI environment variable inside .env.local"
  );
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    };

    cached.promise = mongoose
      .connect(MONGODB_URI, opts)
      .then((mongoose) => {
        console.log("✅ MongoDB connected successfully");
        return mongoose;
      })
      .catch((error) => {
        console.error("❌ MongoDB connection error:", error.message);

        if (error.message.includes("ECONNREFUSED")) {
          console.error("\n📝 MongoDB Connection Troubleshooting:");
          console.error("   1. Make sure MongoDB is running on your machine");
          console.error(
            "   2. Or use MongoDB Atlas (cloud) - update MONGODB_URI in .env.local"
          );
          console.error("   3. Check SETUP.md for detailed instructions\n");
        } else if (
          error.message.includes("whitelist") ||
          error.message.includes("IP") ||
          error.message.includes("network")
        ) {
          console.error("\n🔒 MongoDB Atlas IP Whitelist Error:");
          console.error(
            "   Your IP address is not whitelisted in MongoDB Atlas."
          );
          console.error("\n   Quick Fix:");
          console.error("   1. Go to: https://cloud.mongodb.com/");
          console.error("   2. Select your cluster → 'Network Access'");
          console.error("   3. Click 'Add IP Address'");
          console.error(
            "   4. Click 'Add Current IP Address' (or use 0.0.0.0/0 for development)"
          );
          console.error("   5. Wait 1-2 minutes for changes to take effect");
          console.error("   6. Try connecting again\n");
          console.error(
            "   📖 See MONGODB_SETUP.md for detailed instructions\n"
          );
        }

        cached.promise = null;
        throw error;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectDB;
