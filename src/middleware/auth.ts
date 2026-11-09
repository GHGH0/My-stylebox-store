import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import UserModel, { type UserRole } from "../models/User";

declare global {
  namespace Express {
    interface Request {
      authUser?: {
        id: string;
        role: UserRole;
      };
    }
  }
}

export const authenticate: RequestHandler = async (req, res, next) => {
  const authorization = req.get("authorization");
  const [scheme, token] = authorization?.split(" ") ?? [];

  if (scheme !== "Bearer" || !token) {
    res.status(401).json({ message: "Authentication token is required." });
    return;
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    next(new Error("JWT_SECRET is not set"));
    return;
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    const userId =
      typeof payload === "object" && payload !== null ? payload.sub : undefined;

    if (!userId || !Types.ObjectId.isValid(userId)) {
      res.status(401).json({ message: "Invalid authentication token." });
      return;
    }

    const user = await UserModel.findById(userId).select("role");
    if (!user) {
      res.status(401).json({ message: "Authentication user no longer exists." });
      return;
    }

    req.authUser = { id: user.id, role: user.role };
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ message: "Invalid or expired authentication token." });
      return;
    }

    next(error);
  }
};

export const requireAdmin: RequestHandler = (req, res, next) => {
  if (req.authUser?.role !== "admin") {
    res.status(403).json({ message: "Administrator access is required." });
    return;
  }

  next();
};
