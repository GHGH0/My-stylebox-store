import "dotenv/config";
import mongoose from "mongoose";
import app from "./app";
import { connectDatabase } from "./config/database";

async function connectDatabaseWithRetry(): Promise<void> {
  while (mongoose.connection.readyState !== 1) {
    try {
      await connectDatabase();
    } catch (error) {
      const errorType = error instanceof Error ? error.name : "UnknownError";
      console.error(`MongoDB connection failed (${errorType}). Retrying in 5 seconds.`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

function startServer(): void {
  const port = Number(process.env.PORT) || 3000;
  const server = app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
    void connectDatabaseWithRetry();
  });

  server.on("error", (error: NodeJS.ErrnoException) => {
    console.error(`Failed to listen on port ${port}:`, error.message);
    process.exitCode = 1;
  });
}

startServer();