import mongoose from "mongoose";

let connectionPromise: Promise<void> | null = null;

export async function connectDatabase(): Promise<void> {
  if (mongoose.connection.readyState === 1) return;

  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error("MONGO_URI is not set. Add it to the project-root .env file.");
  }

  if (!connectionPromise) {
    const pendingConnection = mongoose
      .connect(uri, { serverSelectionTimeoutMS: 8_000 })
      .then(() => {
        console.log("Connected to MongoDB");
      });
    connectionPromise = pendingConnection;
  }

  const pendingConnection = connectionPromise;
  try {
    await pendingConnection;
  } finally {
    if (connectionPromise === pendingConnection) {
      connectionPromise = null;
    }
  }
}