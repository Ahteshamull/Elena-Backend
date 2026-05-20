import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "service",
      required: true,
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    serviceProviderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    bookingDate: {
      type: String,
      required: true,
    },
    from: {
      type: String, // Slot start time
      required: true,
    },
    to: {
      type: String, // Slot end time
      required: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    notes: {
      type: String,
      default: "",
    },
    seatNumber: {
      type: String, // Optional: if you want to track specific seat
      default: "1",
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true },
);

// Auto-cancel and remove pending bookings after 6 hours
bookingSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 21600, partialFilterExpression: { status: "pending" } },
);

const bookingModel = mongoose.model("Booking", bookingSchema);

export default bookingModel;
