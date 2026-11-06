import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";

import connectDB from "./config/db.js";
import chatRoutes from "./routes/chat.routes.js";
import authRouter from "./routes/auth.routes.js";
import userRouter from "./routes/user.routes.js";
import mediaRouter from "./routes/media.routes.js";
import User from "./models/user.model.js";
import Chat from "./models/chat.model.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "uploads");

dotenv.config();
connectDB();

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
  "http://localhost:3000",
  "https://realtimechatapp-bchat.netlify.app",
  "https://realtimechatapp-frontend-7uv3.onrender.com",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Permissive CORS to allow connections across laptops, local IPs, and deployed domains
      callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  })
);

app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(uploadsDir));

// Health check routes
app.get("/", (req, res) => res.json({ status: "ok", app: "PulseChat API 🚀", time: new Date() }));
app.get("/api/health", (req, res) => res.json({ status: "healthy", timestamp: new Date() }));

// API Routes
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/chat", chatRoutes);
app.use("/api/media", mediaRouter);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

// Map of userId -> Set of socket IDs
const onlineUsers = new Map();

io.on("connection", (socket) => {
  let connectedUserId = null;

  // 1. User Registration (Presence)
  socket.on("register-user", async (userId) => {
    if (!userId) return;
    const uidStr = String(userId);
    connectedUserId = uidStr;
    socket.join(uidStr); // Join personal room for 1-to-1 alerts/calls

    if (!onlineUsers.has(uidStr)) {
      onlineUsers.set(uidStr, new Set());
    }
    onlineUsers.get(uidStr).add(socket.id);

    console.log(`[USER ONLINE] ${uidStr} connected (Socket: ${socket.id}). Active users: ${onlineUsers.size}`);

    try {
      await User.findByIdAndUpdate(uidStr, { isOnline: true });
    } catch (e) {}

    // Broadcast online status to all connected users
    io.emit("user-status-changed", { userId: uidStr, isOnline: true });

    // Send currently online user list to this newly connected socket
    const onlineUserIds = Array.from(onlineUsers.keys());
    socket.emit("online-users-list", onlineUserIds);
  });

  // 2. Chat Rooms
  socket.on("join-room", (roomId) => {
    if (roomId) {
      socket.join(String(roomId));
    }
  });

  socket.on("leave-room", (roomId) => {
    if (roomId) {
      socket.leave(String(roomId));
    }
  });

  // 3. Realtime Messages (Dual broadcast: room + members' personal rooms)
  socket.on("send-message", async ({ roomId, message, recipientId }) => {
    if (roomId && message) {
      const roomStr = String(roomId);
      console.log(`[MESSAGE] Room: ${roomStr}, Sender: ${message.sender}`);

      // Emit to chat room (for whoever is active in the chat)
      io.in(roomStr).emit("receive-message", { chatId: roomStr, message });

      // Direct delivery to recipient personal room
      if (recipientId) {
        io.to(String(recipientId)).emit("receive-message", { chatId: roomStr, message });
      }

      // Also deliver to all chat members via database lookup
      try {
        const chat = await Chat.findById(roomStr).select("members");
        if (chat && chat.members) {
          chat.members.forEach((m) => {
            const mId = m.toString();
            io.to(mId).emit("receive-message", { chatId: roomStr, message });
          });
        }
      } catch (err) {
        console.error("Error looking up chat members:", err);
      }
    }
  });

  // 4. New Chat Alert (notifies recipient to load newly created chat)
  socket.on("new-chat-created", ({ recipientId, chat }) => {
    if (recipientId && chat) {
      io.to(String(recipientId)).emit("new-chat-received", chat);
    }
  });

  // 5. Typing Indicators
  socket.on("typing", ({ roomId, username, userId, recipientId }) => {
    if (roomId) {
      socket.to(String(roomId)).emit("user-typing", { roomId, username, userId });
    }
    if (recipientId) {
      io.to(String(recipientId)).emit("user-typing", { roomId, username, userId });
    }
  });

  socket.on("stop-typing", ({ roomId, username, userId, recipientId }) => {
    if (roomId) {
      socket.to(String(roomId)).emit("user-stop-typing", { roomId, username, userId });
    }
    if (recipientId) {
      io.to(String(recipientId)).emit("user-stop-typing", { roomId, username, userId });
    }
  });

  // 6. Message Reactions
  socket.on("message-reaction", ({ roomId, messageId, emoji, username }) => {
    if (roomId) {
      io.in(String(roomId)).emit("message-reaction-updated", { roomId, messageId, emoji, username });
    }
  });

  // 7. Delete Message
  socket.on("delete-message", ({ roomId, messageId }) => {
    if (roomId) {
      io.in(String(roomId)).emit("message-deleted", { roomId, messageId });
    }
  });

  // 7.1 Mark Messages as Seen / Read Receipts
  socket.on("mark-as-seen", async ({ roomId, userId, readerId, readerUsername, senderId }) => {
    try {
      const activeReaderId = readerId || userId;
      const now = new Date();
      if (roomId && !roomId.startsWith("pulse_ai")) {
        const chat = await Chat.findById(roomId);
        if (chat) {
          let resolvedUsername = readerUsername;
          if (!resolvedUsername && activeReaderId) {
            const u = await User.findById(activeReaderId).select("username");
            if (u) resolvedUsername = u.username;
          }

          let modified = false;
          chat.messages.forEach((msg) => {
            const isFromReader =
              (msg.senderId && String(msg.senderId) === String(activeReaderId)) ||
              (resolvedUsername && msg.sender === resolvedUsername);

            if (!isFromReader && !msg.seen) {
              msg.seen = true;
              msg.seenAt = now;
              modified = true;
            }
          });
          if (modified) await chat.save();
        }
      }

      const payload = {
        roomId: String(roomId),
        readerId: String(activeReaderId),
        readerUsername: readerUsername || "",
        seenAt: now,
      };

      io.in(String(roomId)).emit("messages-seen-updated", payload);
      if (senderId) {
        io.to(String(senderId)).emit("messages-seen-updated", payload);
      }
    } catch (e) {
      console.error("Error in mark-as-seen socket handler:", e);
    }
  });

  // 7.2 Clear Chat History
  socket.on("clear-chat", ({ roomId }) => {
    if (roomId) {
      io.in(String(roomId)).emit("chat-cleared", { roomId });
    }
  });

  // 7.3 Pin & Unpin Message
  socket.on("pin-message", ({ roomId, message }) => {
    if (roomId) {
      io.in(String(roomId)).emit("message-pinned", { roomId, message });
    }
  });

  socket.on("unpin-message", ({ roomId }) => {
    if (roomId) {
      io.in(String(roomId)).emit("message-unpinned", { roomId });
    }
  });

  // 7.3 Block / Unblock Contact Alert
  socket.on("user-blocked-status", ({ blockerId, targetId, isBlocked }) => {
    if (targetId) {
      io.to(String(targetId)).emit("blocked-status-changed", { blockerId, isBlocked });
    }
  });

  // ==========================================
  // 8. WEBRTC AUDIO & VIDEO CALL SIGNALING
  // ==========================================

  // A starts call to B
  socket.on("call-user", ({ recipientId, offer, callType, callerInfo, callRoomId }) => {
    if (recipientId) {
      const target = String(recipientId);
      console.log(`[CALL] Offer from ${callerInfo?.username} (${callerInfo?._id}) -> ${target} (${callType})`);
      // Send incoming call alert directly to recipient's personal room
      io.to(target).emit("incoming-call", {
        from: callerInfo,
        offer,
        callType,
        callRoomId,
      });
    }
  });

  // B answers the call
  socket.on("answer-call", ({ to, answer, callRoomId }) => {
    if (to) {
      const target = String(to);
      console.log(`[CALL] Answer from socket -> ${target}`);
      io.to(target).emit("call-answered", { answer, callRoomId });
    }
  });

  // ICE Candidate exchange
  socket.on("ice-candidate", ({ to, candidate, callRoomId }) => {
    if (to) {
      const target = String(to);
      io.to(target).emit("ice-candidate", { candidate, callRoomId });
    }
  });

  // Reject / Decline call
  socket.on("reject-call", ({ to, reason, callRoomId }) => {
    if (to) {
      const target = String(to);
      console.log(`[CALL] Rejected -> ${target}`);
      io.to(target).emit("call-rejected", { reason, callRoomId });
    }
  });

  // End active call
  socket.on("end-call", ({ to, callRoomId }) => {
    if (to) {
      const target = String(to);
      console.log(`[CALL] Ended -> ${target}`);
      io.to(target).emit("call-ended", { callRoomId });
    }
    if (callRoomId) {
      socket.to(String(callRoomId)).emit("call-ended", { callRoomId });
    }
  });

  // Toggle audio / video status in call
  socket.on("toggle-media", ({ to, mediaType, isEnabled, callRoomId }) => {
    if (to) {
      io.to(String(to)).emit("remote-media-toggled", { mediaType, isEnabled, callRoomId });
    }
  });

  // 9. Disconnect
  socket.on("disconnect", async () => {
    if (connectedUserId && onlineUsers.has(connectedUserId)) {
      const userSockets = onlineUsers.get(connectedUserId);
      userSockets.delete(socket.id);

      if (userSockets.size === 0) {
        onlineUsers.delete(connectedUserId);
        console.log(`[USER OFFLINE] ${connectedUserId} disconnected`);
        try {
          await User.findByIdAndUpdate(connectedUserId, {
            isOnline: false,
            lastSeen: new Date(),
          });
        } catch (e) {}
        io.emit("user-status-changed", {
          userId: connectedUserId,
          isOnline: false,
          lastSeen: new Date(),
        });
      }
    }
  });
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`🚀 PulseChat Server running on port ${PORT}`);
});
