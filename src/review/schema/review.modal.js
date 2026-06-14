import mongoose from "mongoose";

const { Schema } = mongoose;

const ReviewSchema = new Schema(
  {
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    reviewerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    revieweeId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: "reviews",
  },
);

// Create indexes for better query performance
ReviewSchema.index({ bookingId: 1 });
ReviewSchema.index({ reviewerId: 1 });
ReviewSchema.index({ revieweeId: 1 });
ReviewSchema.index({ rating: 1 });

export default mongoose.model("Review", ReviewSchema);
