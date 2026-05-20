import mongoose from "mongoose";
const { Schema } = mongoose;

const userSchema = new Schema(
  {
    userName: {
      type: String,
      required: [true],
      trim: true,
    },
    email: {
      type: String,
      required: [true],
      unique: [true],
      trim: true,
    },

    password: {
      type: String,
      required: [true],
      trim: true,
    },
    confirmPassword: {
      type: String,
      required: [true],
      trim: true,
    },
    otp: {
      type: Number,
    },
    isVerify: {
      type: Boolean,
      default: false,
    },
    registrationOtp: {
      type: String,
    },
    otpExpiry: {
      type: Date,
      index: { expires: 0, partialFilterExpression: { isVerify: false } },
    },
    phone: {
      type: String,
    },
    country: {
      type: String,
    },

    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },

    image: {
      type: String,
    },
    license:{
      type:String,
    },

    refreshToken: {
      type: String,
    },
    role: {
      type: String,
      enum: ["consumer", "serviceProvider"],
      default: "consumer",
    },
    isApprovedByAdmin: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["active", "blocked"],
      default: "active",
    },
    dateOfBirth: {
      type: String,
    },

    // Profile setup fields
    shopOrBusinessName: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
    },

    isFoundedMember: {
      type: Boolean,
      default: false,
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
    },
    subscriptionExpiry: {
      type: Date,
    },
    isTrialUsed: {
      type: Boolean,
      default: false,
    },
    isBusinessCreated: {
      type: Boolean,
      default: false,
    },
    

    // stripeAccountId: { type: String },
    // isStripeConnected: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("User", userSchema);
