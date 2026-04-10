// import Chat from "../models/chat.model.js";


// // GET chats for a user
// export const getMessages = async (req, res) => {
//   try {
//     const { userId } = req.query;
//     if (!userId) return res.status(400).json({ error: "userId required" });
//     const chats = await Chat.find({ userId }).sort({ createdAt: 1 });
//     res.json({ chats });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };


// // ADD new chat
// export const addChat = async (req, res) => {
//   try {
//     const { name, avatar, userId } = req.body;
//     if (!name || !userId) return res.status(400).json({ error: "Name and userId required" });

//     const newChat = new Chat({
//       name,
//       avatar: avatar || "",
//       userId,
//       messages: [],
//     });

//     await newChat.save();
//     res.json({ chat: newChat });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

// // SEND new message
// export const sendMessage = async (req, res) => {
//   try {
//     const { chatId, sender, text } = req.body;
//     if (!chatId || !sender || !text) return res.status(400).json({ error: "chatId, sender and text required" });

//     const chat = await Chat.findById(chatId);
//     if (!chat) return res.status(404).json({ error: "Chat not found" });

//     const newMessage = { sender, text };
//     chat.messages.push(newMessage);
//     await chat.save();

//     res.json(newMessage);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

// // DELETE chat
// export const deleteChat = async (req, res) => {
//   try {
//     const { chatId } = req.params;
//     await Chat.findByIdAndDelete(chatId);
//     res.json({ success: true });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };
import Chat from "../models/chat.model.js";
import User from "../models/user.model.js";

// 1. GET MY CHATS
export const getMyChats = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "userId required" });
    
    // Sirf wahi chats nikalna jisme main member hoon
    const chats = await Chat.find({ members: userId })
      .populate("members", "username avatar") 
      .sort({ updatedAt: -1 }); // Taki latest chat upar aaye
      
    res.status(200).json(chats || []); // Hamesha array bhejien
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 2. CREATE or GET CHAT (Yahi function user add karega)
export const createOrGetChat = async (req, res) => {
  try {
    const { myId, recipientId } = req.body;

    if (!myId || !recipientId) {
      return res.status(400).json({ error: "Both user IDs are required" });
    }

    // Check ki kya pehle se in dono ke beech chat hai?
    let chat = await Chat.findOne({
      members: { $all: [myId, recipientId] },
    }).populate("members", "username avatar");

    if (!chat) {
      // Agar nahi hai, toh Nayi Chat create karo (Isse user list mein add ho jayega)
      chat = new Chat({
        members: [myId, recipientId],
        messages: [],
      });
      await chat.save();
      // Populate dobara kyunki naye chat mein data nahi hota
      chat = await Chat.findById(chat._id).populate("members", "username avatar");
    }

    res.status(200).json(chat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 3. SEND MESSAGE
export const sendMessage = async (req, res) => {
  try {
    const { chatId, sender, text, mediaUrl, mediaType } = req.body;
    if (!chatId || !sender) return res.status(400).json({ error: "chatId/sender required" });

    // Message object create karein
    const newMessage = { 
      sender, 
      text: text || "", 
      mediaUrl: mediaUrl || "", 
      mediaType: mediaType || "",
      createdAt: new Date()
    };
    
    // Chat ko update karein aur updatedAt timestamp ko badlein
    const updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      { 
        $push: { messages: newMessage },
        $set: { updatedAt: new Date() } // Taki chat list mein ye upar aa jaye
      },
      { new: true }
    );

    if (!updatedChat) return res.status(404).json({ error: "Chat not found" });

    res.json(newMessage);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. SEARCH USERS
export const searchUsers = async (req, res) => {
  try {
    const { query, myId } = req.query;
    if (!query) return res.status(200).json([]); // Query nahi toh khali array

    const users = await User.find({
      _id: { $ne: myId }, // Apne aap ko search mein na dikhayein
      $or: [
        { username: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } }
      ],
    }).select("username avatar _id").limit(10); // Sirf zaroori fields bhejein

    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 5. DELETE CHAT
export const deleteChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const chat = await Chat.findByIdAndDelete(chatId);

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    res.status(200).json({ success: true, message: "Chat deleted successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};