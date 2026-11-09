import { model, Schema, Types } from "mongoose";
import type { ProductSize } from "./Product";

export type OrderStatus = "Pending" | "Delivered" | "Order Cancelled";

export interface OrderItem {
  product: Types.ObjectId;
  quantity: number;
  color: string;
  size: ProductSize;
}

export interface Order {
  user: Types.ObjectId;
  items: OrderItem[];
  totalAmount: number;
  shippingAddress: string;
  phone: string;
  status: OrderStatus;
}

const orderItemSchema = new Schema<OrderItem>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      validate: Number.isInteger,
    },
    color: { type: String, required: true, trim: true },
    size: { type: String, enum: ["S", "M", "L"], required: true },
  },
  { _id: false },
);

const orderSchema = new Schema<Order>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: (items: OrderItem[]) => items.length > 0,
    },
    totalAmount: { type: Number, required: true, min: 0 },
    shippingAddress: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["Pending", "Delivered", "Order Cancelled"],
      default: "Pending",
      required: true,
    },
  },
  { timestamps: true },
);

const OrderModel = model<Order>("Order", orderSchema);

export default OrderModel;
