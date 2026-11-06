import mongoose from "mongoose";

const reactionSchema = new mongoose.Schema(
  {
    emoji: { type: String, required: true },
    username: { type: String, required: true },
    userId: { type: String },
  },
  { _id: false }
);

const replyToSchema = new mongoose.Schema(
  {
    messageId: { type: String },
    sender: { type: String },
    text: { type: String },
    mediaType: { type: String },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema({
  sender: { type: String, required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  text: { type: String, default: "" },
  mediaUrl: { type: String, default: "" },
  mediaType: { type: String, default: "text" }, // text, image, audio, video, file, system
  fileName: { type: String, default: "" },
  fileSize: { type: String, default: "" },
  reactions: [reactionSchema],
  replyTo: replyToSchema,
  system: { type: Boolean, default: false },
  seen: { type: Boolean, default: false },
  seenAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

const chatSchema = new mongoose.Schema(
  {
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],
    messages: [messageSchema],
    pinnedMessage: { type: Object, default: null },
    lastMessage: { type: String, default: "" },
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("Chat", chatSchema);
