import { Router } from "express";
import {
  login,
  register,
  updateAdminCredentials,
} from "../controllers/authController";
import { authenticate, requireAdmin } from "../middleware/auth";

const authRoutes = Router();

authRoutes.post("/register", register);
authRoutes.post("/login", login);
authRoutes.put("/credentials", authenticate, requireAdmin, updateAdminCredentials);

export default authRoutes;
