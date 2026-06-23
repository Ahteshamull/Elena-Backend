import mongoose from "mongoose";

const { Schema } = mongoose;

const bookingSchema = new Schema(
  {
    chefId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    eventLocation: {
      type: String,
      required: true,
      trim: true,
    },
    eventDate: {
      type: Date,
      required: true,
    },
    arrivalTime: {
      type: String,
      required: true,
      trim: true,
    },
    numberOfGuests: {
      type: Number,
      required: true,
    },
    totalAmount: {
      type: Number,
      default: 0,
    },
    minimumFee: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Booking", bookingSchema);
