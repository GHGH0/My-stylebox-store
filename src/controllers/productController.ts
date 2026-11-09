import type { RequestHandler } from "express";
import { Types } from "mongoose";
import ProductModel from "../models/Product";

const productFields = [
  "title",
  "description",
  "price",
  "images",
  "category",
  "audience",
  "sizes",
  "colors",
  "stock",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export const createProduct: RequestHandler = async (req, res, next) => {
  try {
    const product = await ProductModel.create(req.body);
    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
};

export const updateProduct: RequestHandler = async (req, res, next) => {
  const productId = req.params.id;
  if (typeof productId !== "string" || !Types.ObjectId.isValid(productId)) {
    res.status(400).json({ message: "Invalid product ID." });
    return;
  }

  const body: unknown = req.body;
  if (!isRecord(body)) {
    res.status(400).json({ message: "Product details are required." });
    return;
  }

  const hasAllFields = productFields.every((field) =>
    Object.prototype.hasOwnProperty.call(body, field),
  );
  const validProduct =
    hasAllFields &&
    typeof body.title === "string" &&
    Boolean(body.title.trim()) &&
    typeof body.description === "string" &&
    Boolean(body.description.trim()) &&
    typeof body.category === "string" &&
    Boolean(body.category.trim()) &&
    typeof body.price === "number" &&
    Number.isFinite(body.price) &&
    body.price >= 0 &&
    typeof body.stock === "number" &&
    Number.isInteger(body.stock) &&
    body.stock >= 0 &&
    (body.audience === "women" ||
      body.audience === "men" ||
      body.audience === "unisex") &&
    isStringArray(body.images) &&
    isStringArray(body.colors) &&
    isStringArray(body.sizes) &&
    body.sizes.every((size) => ["S", "M", "L"].includes(size));

  if (!validProduct) {
    res.status(400).json({ message: "Product details are invalid." });
    return;
  }

  const update = Object.fromEntries(
    productFields.map((field) => [field, body[field]]),
  );

  try {
    const product = await ProductModel.findByIdAndUpdate(productId, update, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      res.status(404).json({ message: "Product not found." });
      return;
    }

    res.json(product);
  } catch (error) {
    next(error);
  }
};

export const getAllProducts: RequestHandler = async (_req, res, next) => {
  try {
    const audience = _req.query.audience;
    if (
      audience !== undefined &&
      audience !== "women" &&
      audience !== "men" &&
      audience !== "unisex"
    ) {
      res.status(400).json({ message: "Audience must be women, men, or unisex." });
      return;
    }

    const productQuery =
      audience === "women" || audience === "men"
        ? ProductModel.find().or([
              { audience },
              { audience: "unisex" },
              { audience: { $exists: false } },
            ])
        : audience === "unisex"
          ? ProductModel.find({ audience: "unisex" })
          : ProductModel.find();

    const products = await productQuery.sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    next(error);
  }
};

export const getProductById: RequestHandler = async (req, res, next) => {
  const productId = req.params.id;
  if (typeof productId !== "string" || !Types.ObjectId.isValid(productId)) {
    res.status(400).json({ message: "Invalid product ID." });
    return;
  }

  try {
    const product = await ProductModel.findById(productId);
    if (!product) {
      res.status(404).json({ message: "Product not found." });
      return;
    }

    res.json(product);
  } catch (error) {
    next(error);
  }
};

export const deleteProduct: RequestHandler = async (req, res, next) => {
  const productId = req.params.id;
  if (typeof productId !== "string" || !Types.ObjectId.isValid(productId)) {
    res.status(400).json({ message: "Invalid product ID." });
    return;
  }

  try {
    const product = await ProductModel.findByIdAndDelete(productId);
    if (!product) {
      res.status(404).json({ message: "Product not found." });
      return;
    }

    res.json({ message: "Product deleted successfully." });
  } catch (error) {
    next(error);
  }
};
