import mongoose from "mongoose";
const { Schema } = mongoose;

const pendingUserSchema = new Schema(
  {
    userName: {
      type: String,
      required: [true],
      trim: true,
    },
    email: {
      type: String,
      required: [true],
      trim: true,
    },
    password: {
      type: String,
      required: [true],
    },
    confirmPassword: {
      type: String,
      required: [true],
    },
    phone: {
      type: String,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },
    role: {
      type: String,
      enum: ["user", "chef"],
      default: "user",
    },
    registrationOtp: {
      type: String,
    },
    otpExpiry: {
      type: Date,
      index: { expires: 0 },
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("PendingUser", pendingUserSchema);
