import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import { connectDatabase } from "./config/database";
import authRoutes from "./routes/authRoutes";
import orderRoutes from "./routes/orderRoutes";
import productRoutes from "./routes/productRoutes";

const app = express();
const allowedOrigins = (process.env.ALLOWED_ORIGIN ?? "http://localhost:3001")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json());

app.use("/api", async (_req, _res, next) => {
  try {
    await connectDatabase();
    next();
  } catch (error) {
    next(error);
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/products", productRoutes);

app.get("/health", async (_req, res, next) => {
  try {
    await connectDatabase();
    res.json({ status: "ok", database: "connected" });
  } catch (error) {
    next(error);
  }
});

app.get("/health/ready", async (_req, res, next) => {
  try {
    await connectDatabase();
    res.json({ status: "ready", database: "connected" });
  } catch (error) {
    next(error);
  }
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message =
    error instanceof Error ? error.message : "The request could not be completed.";
  const unavailable =
    message.includes("MONGO_URI") ||
    mongoose.connection.readyState !== 1;

  if (unavailable) {
    res.status(503).json({
      message: "The StyleBox database is unavailable. Check the MONGO_URI setting and database network access.",
    });
    return;
  }

  console.error("API request failed.", error);
  res.status(500).json({ message: "The request could not be completed." });
});

export default app;
