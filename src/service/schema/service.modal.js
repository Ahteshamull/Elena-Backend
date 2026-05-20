import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
  {
    selectBusiness: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    serviceName: {
      type: String,
      required: true,
    },
    serviceType: {
      type: String,
      required: true,
    },
    servicePrice: {
      type: Number,
      required: true,
    },
    serviceDuration: {
      type: String,
      required: true,
    },
    serviceImages: [
      {
        type: String,
        required: true,
      },
    ],
    serviceStatus: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    availability: [
      {
        date: { type: String, required: true },
        availableSeats: { type: String, required: true },
        slots: [
          {
            from: { type: String, required: true },
            to: { type: String, required: true },
          },
        ],
      },
    ],

    isBooking: {
      type: Boolean,
      default: false,
    },

    serviceProviderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

const serviceModel = mongoose.model("service", serviceSchema);

export default serviceModel;
