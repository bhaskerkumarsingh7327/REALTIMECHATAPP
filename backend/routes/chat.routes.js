// import express from "express";
// import { getMessages, addChat, sendMessage, deleteChat } from "../controller/chat.controllers.js";

// const router = express.Router();
// router.get("/", getMessages);
// router.post("/", addChat);
// router.post("/message", sendMessage);
// router.delete("/:chatId", deleteChat);

// export default router;
import express from "express";
import {
  getMyChats,
  createOrGetChat,
  sendMessage,
  deleteChat,
  searchUsers,
} from "../controller/chat.controllers.js";

const router = express.Router();

router.get("/search", searchUsers); // Search users route
router.get("/", getMyChats);         // Get all my chats
router.post("/", createOrGetChat);   // Create/Get chat
router.post("/message", sendMessage); 
router.delete("/:chatId", deleteChat);

export default router;