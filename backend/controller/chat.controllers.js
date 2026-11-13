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
      .populate("groupAdmin", "username name avatar")
      .sort({ updatedAt: -1 });

    res.status(200).json(chats || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 2. CREATE OR GET CHAT (1-on-1)
export const createOrGetChat = async (req, res) => {
  try {
    const { myId, recipientId } = req.body;

    if (!myId || !recipientId) {
      return res.status(400).json({ error: "Both myId and recipientId are required" });
    }

    if (String(myId) === String(recipientId)) {
      return res.status(400).json({ error: "Cannot create chat with yourself" });
    }

    // Check if 1-on-1 chat already exists
    let chat = await Chat.findOne({
      isGroup: { $ne: true },
      members: { $all: [myId, recipientId], $size: 2 },
    }).populate("members", "username name avatar about isOnline lastSeen blockedUsers");

    if (!chat) {
      chat = new Chat({
        members: [myId, recipientId],
        isGroup: false,
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

// 2.1 CREATE GROUP CHAT
export const createGroupChat = async (req, res) => {
  try {
    const { name, description, avatar, adminId, members } = req.body;

    if (!name || !adminId || !members || !Array.isArray(members) || members.length < 1) {
      return res.status(400).json({ error: "Group name, admin, and at least one member are required." });
    }

    const memberSet = new Set(members.map(String));
    memberSet.add(String(adminId));
    const allMembers = Array.from(memberSet);

    const group = new Chat({
      members: allMembers,
      isGroup: true,
      groupName: name.trim(),
      groupDescription: description ? description.trim() : "",
      groupAvatar:
        avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name.trim())}`,
      groupAdmin: adminId,
      messages: [
        {
          sender: "System",
          text: `Group "${name.trim()}" created. Welcome!`,
          system: true,
          mediaType: "system",
        },
      ],
      lastMessage: `Group "${name.trim()}" created.`,
      lastMessageAt: new Date(),
    });

    await group.save();

    const populated = await Chat.findById(group._id)
      .populate("members", "username name avatar about isOnline lastSeen")
      .populate("groupAdmin", "username name avatar");

    res.status(201).json(populated);
  } catch (err) {
    console.error("Create group error:", err);
    res.status(500).json({ error: err.message });
  }
};

// 2.2 UPDATE GROUP INFO / MEMBERS
export const updateGroupInfo = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { name, description, avatar, newMembers, removeMemberId } = req.body;

    const chat = await Chat.findById(chatId);
    if (!chat || !chat.isGroup) {
      return res.status(404).json({ error: "Group not found" });
    }

    if (name) chat.groupName = name.trim();
    if (description !== undefined) chat.groupDescription = description.trim();
    if (avatar) chat.groupAvatar = avatar;

    if (newMembers && Array.isArray(newMembers)) {
      const set = new Set(chat.members.map(String));
      newMembers.forEach((m) => set.add(String(m)));
      chat.members = Array.from(set);
    }

    if (removeMemberId) {
      chat.members = chat.members.filter((m) => String(m) !== String(removeMemberId));
    }

    await chat.save();

    const updated = await Chat.findById(chatId)
      .populate("members", "username name avatar about isOnline lastSeen")
      .populate("groupAdmin", "username name avatar");

    res.status(200).json(updated);
  } catch (err) {
    console.error("Update group error:", err);
    res.status(500).json({ error: err.message });
  }
};

// 3. SEND MESSAGE (supports text, media, voice, replies)
export const sendMessage = async (req, res) => {
  try {
    const { chatId, sender, senderId, recipientId, text, mediaUrl, mediaType, fileName, fileSize, system, replyTo, isViewOnce } = req.body;

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
      replyTo: replyTo || null,
      isViewOnce: !!isViewOnce,
      viewOnceOpened: false,
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
    let { userId, readerUsername } = req.body;

    if (!chatId || !userId) {
      return res.status(400).json({ error: "chatId and userId are required" });
    }

    if (!readerUsername) {
      const u = await User.findById(userId).select("username");
      if (u) readerUsername = u.username;
    }

    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ error: "Chat not found" });

    const now = new Date();
    let modified = false;

    chat.messages.forEach((msg) => {
      // Must NOT be from the reader (only mark partner's messages as seen)
      const isFromReader =
        (msg.senderId && String(msg.senderId) === String(userId)) ||
        (readerUsername && msg.sender === readerUsername);

      if (!isFromReader && !msg.seen) {
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

// 5. PIN MESSAGE
export const pinMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { messageId } = req.body;

    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ error: "Chat not found" });

    const message = chat.messages.id(messageId);
    if (!message) return res.status(404).json({ error: "Message not found" });

    chat.pinnedMessage = message;
    await chat.save();

    res.status(200).json({ success: true, pinnedMessage: message });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 6. UNPIN MESSAGE
export const unpinMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ error: "Chat not found" });

    chat.pinnedMessage = null;
    await chat.save();

    res.status(200).json({ success: true, message: "Message unpinned" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 7. CLEAR CHAT HISTORY
export const clearChatHistory = async (req, res) => {
  try {
    const { chatId } = req.params;
    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ error: "Chat not found" });

    chat.messages = [];
    chat.pinnedMessage = null;
    chat.lastMessage = "Chat cleared";
    chat.lastMessageAt = new Date();
    await chat.save();

    res.status(200).json({ success: true, message: "Chat history cleared" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 8. ADD / TOGGLE REACTION
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

// 9. DELETE A MESSAGE
export const deleteMessage = async (req, res) => {
  try {
    const { chatId, messageId } = req.params;
    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ error: "Chat not found" });

    chat.messages = chat.messages.filter((m) => m._id.toString() !== messageId);
    if (chat.pinnedMessage && chat.pinnedMessage._id?.toString() === messageId) {
      chat.pinnedMessage = null;
    }
    await chat.save();

    res.status(200).json({ success: true, messageId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 10. DELETE CHAT
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

// 11. SEARCH USERS
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

// 12. MARK VIEW ONCE AS OPENED
export const markViewOnceOpened = async (req, res) => {
  try {
    const { chatId, messageId } = req.params;
    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ error: "Chat not found" });

    const msg = chat.messages.id(messageId);
    if (!msg) return res.status(404).json({ error: "Message not found" });

    msg.viewOnceOpened = true;
    msg.viewOnceOpenedAt = new Date();
    await chat.save();

    res.status(200).json({ success: true, messageId, viewOnceOpened: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
