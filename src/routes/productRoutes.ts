import { Router } from "express";
import {
  createProduct,
  deleteProduct,
  getAllProducts,
  getProductById,
  updateProduct,
} from "../controllers/productController";
import { authenticate, requireAdmin } from "../middleware/auth";

const productRoutes = Router();

productRoutes.post("/", authenticate, requireAdmin, createProduct);
productRoutes.get("/", getAllProducts);
productRoutes.put("/:id", authenticate, requireAdmin, updateProduct);
productRoutes.get("/:id", getProductById);
productRoutes.delete("/:id", authenticate, requireAdmin, deleteProduct);

export default productRoutes;
