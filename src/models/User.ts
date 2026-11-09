import { model, Schema } from "mongoose";

export type UserRole = "customer" | "admin";

export interface User {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

const userSchema = new Schema<User>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["customer", "admin"],
      default: "customer",
      required: true,
    },
  },
  { timestamps: true },
);

const UserModel = model<User>("User", userSchema);

export default UserModel;
