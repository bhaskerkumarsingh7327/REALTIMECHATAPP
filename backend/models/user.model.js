import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    avatar: { type: String, default: "" },
    about: { type: String, default: "Hey there! I am using PulseChat." },
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;
