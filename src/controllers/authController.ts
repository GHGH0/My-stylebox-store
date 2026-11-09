import bcrypt from "bcryptjs";
import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import UserModel from "../models/User";

interface RegisterBody {
  name?: unknown;
  email?: unknown;
  password?: unknown;
}

interface LoginBody {
  email?: unknown;
  password?: unknown;
}

interface UpdateCredentialsBody {
  email?: unknown;
  currentPassword?: unknown;
  newPassword?: unknown;
}

function isDuplicateEmailError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

export const register: RequestHandler = async (req, res, next) => {
  const { name, email, password } = req.body as RegisterBody;

  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string" ||
    !name.trim() ||
    !email.trim() ||
    password.length < 8
  ) {
    res.status(400).json({
      message: "Name and email are required; password must be at least 8 characters.",
    });
    return;
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await UserModel.findOne({ email: normalizedEmail });

    if (existingUser) {
      res.status(409).json({ message: "An account with this email already exists." });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await UserModel.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: "customer",
    });

    res.status(201).json({
      message: "Account created successfully.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    if (isDuplicateEmailError(error)) {
      res.status(409).json({ message: "An account with this email already exists." });
      return;
    }

    next(error);
  }
};

export const login: RequestHandler = async (req, res, next) => {
  const { email, password } = req.body as LoginBody;

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email.trim() ||
    !password
  ) {
    res.status(400).json({ message: "Email and password are required." });
    return;
  }

  try {
    const user = await UserModel.findOne({
      email: email.trim().toLowerCase(),
    }).select("+password");

    if (!user || !(await bcrypt.compare(password, user.password))) {
      res.status(401).json({ message: "Invalid email or password." });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error("JWT_SECRET is not set");
    }

    const token = jwt.sign(
      { role: user.role },
      jwtSecret,
      { subject: user.id, expiresIn: "1h" },
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateAdminCredentials: RequestHandler = async (req, res, next) => {
  const authenticatedUser = req.authUser;
  if (!authenticatedUser || authenticatedUser.role !== "admin") {
    res.status(403).json({ message: "Administrator access is required." });
    return;
  }

  const { email, currentPassword, newPassword } = req.body as UpdateCredentialsBody;
  if (
    typeof email !== "string" ||
    typeof currentPassword !== "string" ||
    typeof newPassword !== "string" ||
    !email.trim() ||
    !currentPassword ||
    newPassword.length < 8
  ) {
    res.status(400).json({
      message: "A valid email, current password, and new password of at least 8 characters are required.",
    });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    res.status(400).json({ message: "Enter a valid email address." });
    return;
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    next(new Error("JWT_SECRET is not set"));
    return;
  }

  try {
    const user = await UserModel.findById(authenticatedUser.id).select("+password");
    if (!user || user.role !== "admin") {
      res.status(403).json({ message: "Administrator account is unavailable." });
      return;
    }

    if (!(await bcrypt.compare(currentPassword, user.password))) {
      res.status(401).json({ message: "The current password is incorrect." });
      return;
    }

    const existingUser = await UserModel.findOne({
      email: normalizedEmail,
      _id: { $ne: user._id },
    });
    if (existingUser) {
      res.status(409).json({ message: "An account with this email already exists." });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    const token = jwt.sign(
      { role: user.role },
      jwtSecret,
      { subject: user.id, expiresIn: "1h" },
    );

    user.email = normalizedEmail;
    user.password = hashedPassword;
    await user.save();

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    if (isDuplicateEmailError(error)) {
      res.status(409).json({ message: "An account with this email already exists." });
      return;
    }

    next(error);
  }
};
