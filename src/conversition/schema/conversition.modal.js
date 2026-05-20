import mongoose from "mongoose";
const { Schema } = mongoose;

const conversitionSchema = new Schema({}, { strict: false, timestamps: true });
const Conversation = mongoose.models.Conversation || mongoose.model("Conversation", conversitionSchema);
export default Conversation;
