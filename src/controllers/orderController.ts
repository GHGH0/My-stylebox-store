import type { RequestHandler } from "express";
import { Types } from "mongoose";
import OrderModel from "../models/Order";
import ProductModel from "../models/Product";
import type { ProductSize } from "../models/Product";
import type { OrderStatus } from "../models/Order";

interface CreateOrderItem {
  productId: Types.ObjectId;
  quantity: number;
  color: string;
  size: ProductSize;
}

interface CreateOrderBody {
  items?: unknown;
  shippingAddress?: unknown;
  phone?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isProductSize(value: unknown): value is ProductSize {
  return value === "S" || value === "M" || value === "L";
}

function isOrderStatus(value: unknown): value is OrderStatus {
  return (
    value === "Pending" ||
    value === "Delivered" ||
    value === "Order Cancelled"
  );
}

export const createOrder: RequestHandler = async (req, res, next) => {
  const authenticatedUser = req.authUser;
  if (!authenticatedUser) {
    res.status(401).json({ message: "Authentication is required." });
    return;
  }

  const body: CreateOrderBody = isRecord(req.body) ? req.body : {};
  const items = body.items;
  const shippingAddress = body.shippingAddress;
  const phone = body.phone;

  if (
    !Array.isArray(items) ||
    items.length === 0 ||
    typeof shippingAddress !== "string" ||
    !shippingAddress.trim() ||
    typeof phone !== "string" ||
    !phone.trim()
  ) {
    res.status(400).json({
      message: "Items, shipping address, and phone are required.",
    });
    return;
  }

  const orderItems: CreateOrderItem[] = [];
  for (const item of items) {
    if (!isRecord(item)) {
      res.status(400).json({ message: "Each order item must be an object." });
      return;
    }

    const { productId, quantity, color, size } = item;
    if (
      typeof productId !== "string" ||
      !Types.ObjectId.isValid(productId) ||
      typeof quantity !== "number" ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      typeof color !== "string" ||
      !color.trim() ||
      !isProductSize(size)
    ) {
      res
        .status(400)
        .json({ message: "An order item has invalid product or variant details." });
      return;
    }

    orderItems.push({
      productId: new Types.ObjectId(productId),
      quantity,
      color: color.trim(),
      size,
    });
  }

  try {
    const productIds = [
      ...new Set(orderItems.map((item) => item.productId.toString())),
    ];
    const products = await ProductModel.find({ _id: { $in: productIds } });
    const productsById = new Map(products.map((product) => [product.id, product]));

    let totalAmount = 0;
    for (const item of orderItems) {
      const product = productsById.get(item.productId.toString());
      if (!product) {
        res.status(400).json({ message: "One or more products no longer exist." });
        return;
      }

      if (
        !product.sizes.includes(item.size) ||
        !product.colors.some(
          (productColor) =>
            productColor.toLowerCase() === item.color.toLowerCase(),
        )
      ) {
        res.status(400).json({
          message: `The selected color or size is not available for ${product.title}.`,
        });
        return;
      }

      totalAmount += product.price * item.quantity;
    }

    const order = await OrderModel.create({
      user: authenticatedUser.id,
      items: orderItems.map((item) => ({
        product: item.productId,
        quantity: item.quantity,
        color: item.color,
        size: item.size,
      })),
      totalAmount,
      shippingAddress: shippingAddress.trim(),
      phone: phone.trim(),
    });

    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
};

export const getAllOrders: RequestHandler = async (_req, res, next) => {
  try {
    const orders = await OrderModel.find()
      .populate("user", "name email")
      .populate("items.product", "title price images")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    next(error);
  }
};

export const updateOrderStatus: RequestHandler = async (req, res, next) => {
  const orderId = req.params.id;
  const body: unknown = req.body;
  const status = isRecord(body) ? body.status : undefined;

  if (typeof orderId !== "string" || !Types.ObjectId.isValid(orderId)) {
    res.status(400).json({ message: "Invalid order ID." });
    return;
  }

  if (!isOrderStatus(status)) {
    res.status(400).json({
      message: "Status must be Pending, Delivered, or Order Cancelled.",
    });
    return;
  }

  try {
    const order = await OrderModel.findByIdAndUpdate(
      orderId,
      { status },
      { new: true, runValidators: true },
    );

    if (!order) {
      res.status(404).json({ message: "Order not found." });
      return;
    }

    res.json(order);
  } catch (error) {
    next(error);
  }
};

export const deleteOrder: RequestHandler = async (req, res, next) => {
  const orderId = req.params.id;
  if (typeof orderId !== "string" || !Types.ObjectId.isValid(orderId)) {
    res.status(400).json({ message: "Invalid order ID." });
    return;
  }

  try {
    const order = await OrderModel.findByIdAndDelete(orderId);
    if (!order) {
      res.status(404).json({ message: "Order not found." });
      return;
    }

    res.json({ message: "Order removed successfully." });
  } catch (error) {
    next(error);
  }
};
