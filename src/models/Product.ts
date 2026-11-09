import { model, Schema } from "mongoose";

export type ProductSize = "S" | "M" | "L";
export type ProductAudience = "women" | "men" | "unisex";

export interface Product {
  title: string;
  description: string;
  price: number;
  images: string[];
  category: string;
  audience: ProductAudience;
  sizes: ProductSize[];
  colors: string[];
  stock: number;
}

const productSchema = new Schema<Product>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    images: { type: [String], default: [] },
    category: { type: String, required: true, trim: true },
    audience: {
      type: String,
      enum: ["women", "men", "unisex"],
      default: "unisex",
      required: true,
    },
    sizes: {
      type: [String],
      enum: ["S", "M", "L"],
      default: [],
    },
    colors: { type: [String], default: [] },
    stock: { type: Number, required: true, min: 0, default: 0 },
  },
  { timestamps: true },
);

const ProductModel = model<Product>("Product", productSchema);

export default ProductModel;
