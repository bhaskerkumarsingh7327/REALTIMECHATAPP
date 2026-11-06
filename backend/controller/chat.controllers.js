import Chat from "../models/chat.model.js";
import User from "../models/user.model.js";

// 1. GET ALL CHATS FOR A USER
export const getMyChats = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const chats = await Chat.find({ members: userId })
      .populate("members", "username name avatar about isOnline lastSeen blockedUsers")
      .sort({ updatedAt: -1 });

    res.status(200).json(chats || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 2. CREATE OR GET CHAT
export const createOrGetChat = async (req, res) => {
  try {
    const { myId, recipientId } = req.body;

    if (!myId || !recipientId) {
      return res.status(400).json({ error: "Both myId and recipientId are required" });
    }

    if (String(myId) === String(recipientId)) {
      return res.status(400).json({ error: "Cannot create chat with yourself" });
    }

    // Check if chat already exists
    let chat = await Chat.findOne({
      members: { $all: [myId, recipientId] },
    }).populate("members", "username name avatar about isOnline lastSeen blockedUsers");

    if (!chat) {
      chat = new Chat({
        members: [myId, recipientId],
        messages: [],
      });
      await chat.save();
      chat = await Chat.findById(chat._id).populate(
        "members",
        "username name avatar about isOnline lastSeen blockedUsers"
      );
    }

    res.status(200).json(chat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 3. SEND MESSAGE
export const sendMessage = async (req, res) => {
  try {
    const { chatId, sender, senderId, recipientId, text, mediaUrl, mediaType, fileName, fileSize, system } = req.body;

    if (!chatId || !sender) {
      return res.status(400).json({ error: "chatId and sender are required" });
    }

    // Block check: Verify recipient hasn't blocked sender
    if (recipientId && senderId && !system) {
      const recipient = await User.findById(recipientId);
      if (recipient?.blockedUsers?.some((id) => String(id) === String(senderId))) {
        return res.status(403).json({ error: "Message cannot be delivered. You are blocked by this user." });
      }
    }

    const newMessage = {
      sender,
      senderId: senderId || null,
      text: text || "",
      mediaUrl: mediaUrl || "",
      mediaType: mediaType || (mediaUrl ? "image" : "text"),
      fileName: fileName || "",
      fileSize: fileSize || "",
      system: !!system,
      seen: false,
      seenAt: null,
      createdAt: new Date(),
      reactions: [],
    };

    const previewText = system
      ? text
      : text || (mediaType === "audio" ? "🎵 Voice message" : mediaType === "image" ? "📷 Photo" : "📎 File");

    const updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      {
        $push: { messages: newMessage },
        $set: {
          lastMessage: previewText,
          lastMessageAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!updatedChat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    const savedMsg = updatedChat.messages[updatedChat.messages.length - 1];
    res.status(201).json(savedMsg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. MARK CHAT AS SEEN (Read Receipts)
export const markChatAsSeen = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { userId } = req.body;

    if (!chatId || !userId) {
      return res.status(400).json({ error: "chatId and userId are required" });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ error: "Chat not found" });

    const now = new Date();
    let modified = false;

    chat.messages.forEach((msg) => {
      // Mark as seen if message was sent by other party and is not yet seen
      if (msg.senderId && String(msg.senderId) !== String(userId) && !msg.seen) {
        msg.seen = true;
        msg.seenAt = now;
        modified = true;
      }
    });

    if (modified) {
      await chat.save();
    }

    res.status(200).json({ success: true, seenAt: now, modified });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 5. CLEAR CHAT HISTORY
export const clearChatHistory = async (req, res) => {
  try {
    const { chatId } = req.params;
    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ error: "Chat not found" });

    chat.messages = [];
    chat.lastMessage = "Chat cleared";
    chat.lastMessageAt = new Date();
    await chat.save();

    res.status(200).json({ success: true, message: "Chat history cleared" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 6. ADD / TOGGLE REACTION
export const addReaction = async (req, res) => {
  try {
    const { chatId, messageId, emoji, username, userId } = req.body;
    if (!chatId || !messageId || !emoji || !username) {
      return res.status(400).json({ error: "Missing reaction details" });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ error: "Chat not found" });

    const message = chat.messages.id(messageId);
    if (!message) return res.status(404).json({ error: "Message not found" });

    const existingIndex = message.reactions.findIndex(
      (r) => r.username === username && r.emoji === emoji
    );

    if (existingIndex > -1) {
      message.reactions.splice(existingIndex, 1);
    } else {
      message.reactions = message.reactions.filter((r) => r.username !== username);
      message.reactions.push({ emoji, username, userId });
    }

    await chat.save();
    res.status(200).json({ success: true, reactions: message.reactions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 7. DELETE A MESSAGE
export const deleteMessage = async (req, res) => {
  try {
    const { chatId, messageId } = req.params;
    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ error: "Chat not found" });

    chat.messages = chat.messages.filter((m) => m._id.toString() !== messageId);
    await chat.save();

    res.status(200).json({ success: true, messageId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 8. DELETE CHAT
export const deleteChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const chat = await Chat.findByIdAndDelete(chatId);

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    res.status(200).json({ success: true, message: "Chat deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 9. SEARCH USERS
export const searchUsers = async (req, res) => {
  try {
    const { query, myId } = req.query;
    if (!query || !query.trim()) {
      return res.status(200).json([]);
    }

    const trimmed = query.trim();
    const users = await User.find({
      _id: { $ne: myId },
      $or: [
        { username: { $regex: trimmed, $options: "i" } },
        { name: { $regex: trimmed, $options: "i" } },
        { email: { $regex: trimmed, $options: "i" } },
      ],
    })
      .select("username name avatar about isOnline lastSeen blockedUsers _id")
      .limit(15);

    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
