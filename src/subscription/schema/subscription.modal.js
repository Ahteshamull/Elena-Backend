import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    planName: {
      type: String,
      required: true,
      enum: ["Bronze", "Silver", "Gold", "Platinum", "Founding Member"],
    },
    billingCycle: {
      type: String,
      enum: ["monthly", "yearly"],
      required: true,
      default: "monthly",
    },
    price: {
      type: Number,
      required: true,
    },
    recurringPrice: {
      type: Number,
      default: 0,
    },
    discountPrice: {
      type: Number,
    },
    discountPercentage: {
      type: Number,
    },
    trialDays: {
      type: Number,
      default: 0,
    },
    maxServices: {
      type: Number,
      default: -1, // -1 for unlimited
    },
    maxBookings: {
      type: Number,
      default: -1, // -1 for unlimited
    },
    features: {
      type: [String],
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true },
);

export default mongoose.model("Subscription", subscriptionSchema);
