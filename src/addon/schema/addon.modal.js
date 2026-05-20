import mongoose from "mongoose";

const addonSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["Consultation", "Review Setup", "Review Strategy"],
      required: true,
    },
    description: {
      type: String,
    },
    standardPrice: {
      type: Number,
      required: true,
    },
    foundingMemberPrice: {
      type: Number,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Addon", addonSchema);
