import mongoose from "mongoose";

const statusSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    mediaUrl: { type: String, default: "" },
    mediaType: { type: String, enum: ["image", "text", "video"], default: "text" },
    text: { type: String, default: "" },
    backgroundColor: { type: String, default: "linear-gradient(135deg, #2563eb, #7c3aed)" },
    views: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        viewedAt: { type: Date, default: Date.now },
      },
    ],
    createdAt: { type: Date, default: Date.now, expires: 86400 }, // 24 hours TTL auto-deletion
  },
  { timestamps: true }
);

export default mongoose.model("Status", statusSchema);

