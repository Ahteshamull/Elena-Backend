import mongoose from "mongoose";
const { Schema } = mongoose;

const menuSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    menuTitle: {
      type: String,
      required: true,
    },
    menuImage: {
      type: String,
      required: true,
    },
    menuCategory: {
      type: String,
      required: true,
    },
    numberOfCourse: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.models.Menu || mongoose.model("Menu", menuSchema);
