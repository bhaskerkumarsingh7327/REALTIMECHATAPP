import mongoose from "mongoose";

const callLogSchema = new mongoose.Schema(
  {
    caller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    callType: { type: String, enum: ["audio", "video"], default: "audio" },
    status: { type: String, enum: ["completed", "missed", "declined"], default: "completed" },
    duration: { type: Number, default: 0 }, // in seconds
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("CallLog", callLogSchema);
