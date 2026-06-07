import mongoose from "mongoose";

const { Schema } = mongoose;

const bookingSchema = new Schema(
  {
    chefId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Chef ID is required"],
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email address is required"],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    eventLocation: {
      type: String,
      required: [true, "Event location is required"],
      trim: true,
    },
    eventDate: {
      type: Date,
      required: [true, "Event date is required"],
    },
    arrivalTime: {
      type: String,
      required: [true, "Arrival time is required"],
      trim: true,
    },
    numberOfGuests: {
      type: Number,
      required: [true, "Number of guests is required"],
    },
    bespokeMenuRate: {
      type: Number,
      default: 0,
    },
    menuSubtotal: {
      type: Number,
      default: 0,
    },
    conciergeServiceFee: {
      type: Number,
      default: 0,
    },
    estimatedTaxes: {
      type: Number,
      default: 0,
    },
    totalAmount: {
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
