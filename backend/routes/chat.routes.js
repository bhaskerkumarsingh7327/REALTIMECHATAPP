import express from "express";
import {
  getMyChats,
  createOrGetChat,
  createGroupChat,
  updateGroupInfo,
  sendMessage,
  markChatAsSeen,
  pinMessage,
  unpinMessage,
  clearChatHistory,
  addReaction,
  deleteMessage,
  deleteChat,
  searchUsers,
} from "../controller/chat.controllers.js";

const router = express.Router();

router.get("/search", searchUsers);
router.get("/", getMyChats);
router.post("/", createOrGetChat);
router.post("/group", createGroupChat);
router.put("/group/:chatId", updateGroupInfo);
router.post("/message", sendMessage);
router.post("/:chatId/seen", markChatAsSeen);
router.post("/:chatId/pin", pinMessage);
router.post("/:chatId/unpin", unpinMessage);
router.post("/:chatId/clear", clearChatHistory);
router.post("/reaction", addReaction);
router.delete("/:chatId/message/:messageId", deleteMessage);
router.delete("/:chatId", deleteChat);

export default router;
