import mongoose from "mongoose";
const { Schema } = mongoose;

const conversitionSchema = new Schema(
  {
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    lastMessage: {
      text: String,
      senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      createdAt: Date,
    },
    unreadCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Conversation = mongoose.models.Conversation || mongoose.model("Conversation", conversitionSchema);
export default Conversation;
