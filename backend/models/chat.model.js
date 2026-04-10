// import mongoose from "mongoose";

// const messageSchema = new mongoose.Schema({
//   sender: { type: String, required: true },
//   text: { type: String, required: true },
//   createdAt: { type: Date, default: Date.now },
// });


// const chatSchema = new mongoose.Schema({
//   name: { type: String, required: true },
//   avatar: { type: String, default: "" },
//   userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
//   messages: [messageSchema],
//   createdAt: { type: Date, default: Date.now },
// });

// export default mongoose.model("Chat", chatSchema);
import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  sender: { type: String, required: true },
  text: { type: String, default: "" },
  mediaUrl: { type: String, default: "" },
  mediaType: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

const chatSchema = new mongoose.Schema({
  // dono users ke IDs — shared chat
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],
  messages: [messageSchema],
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Chat", chatSchema);