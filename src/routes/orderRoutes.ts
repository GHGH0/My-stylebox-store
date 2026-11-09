import { Router } from "express";
import {
  createOrder,
  deleteOrder,
  getAllOrders,
  updateOrderStatus,
} from "../controllers/orderController";
import { authenticate, requireAdmin } from "../middleware/auth";

const orderRoutes = Router();

orderRoutes.post("/", authenticate, createOrder);
orderRoutes.patch("/:id/status", authenticate, requireAdmin, updateOrderStatus);
orderRoutes.delete("/:id", authenticate, requireAdmin, deleteOrder);
orderRoutes.get("/", authenticate, requireAdmin, getAllOrders);

export default orderRoutes;
