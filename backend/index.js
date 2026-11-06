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
      // Allow any local origin during development, or any allowed domain
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:")
      ) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive for production deployment
      }
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
app.get("/", (req, res) => res.json({ status: "ok", app: "PulseChat API 🚀" }));
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
    connectedUserId = userId;
    socket.join(userId); // Join personal room for 1-to-1 alerts/calls

    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    try {
      await User.findByIdAndUpdate(userId, { isOnline: true });
    } catch (e) {}

    // Broadcast online status to all connected users
    io.emit("user-status-changed", { userId, isOnline: true });

    // Send currently online user list to this newly connected socket
    const onlineUserIds = Array.from(onlineUsers.keys());
    socket.emit("online-users-list", onlineUserIds);
  });

  // 2. Chat Rooms
  socket.on("join-room", (roomId) => {
    if (roomId) {
      socket.join(roomId);
    }
  });

  socket.on("leave-room", (roomId) => {
    if (roomId) {
      socket.leave(roomId);
    }
  });

  // 3. Realtime Messages
  socket.on("send-message", ({ roomId, message }) => {
    if (roomId && message) {
      io.in(roomId).emit("receive-message", { chatId: roomId, message });
    }
  });

  // 4. Typing Indicators
  socket.on("typing", ({ roomId, username, userId }) => {
    if (roomId) {
      socket.to(roomId).emit("user-typing", { roomId, username, userId });
    }
  });

  socket.on("stop-typing", ({ roomId, username, userId }) => {
    if (roomId) {
      socket.to(roomId).emit("user-stop-typing", { roomId, username, userId });
    }
  });

  // 5. Message Reactions
  socket.on("message-reaction", ({ roomId, messageId, emoji, username }) => {
    if (roomId) {
      io.in(roomId).emit("message-reaction-updated", { roomId, messageId, emoji, username });
    }
  });

  // 6. Delete Message
  socket.on("delete-message", ({ roomId, messageId }) => {
    if (roomId) {
      io.in(roomId).emit("message-deleted", { roomId, messageId });
    }
  });

  // ==========================================
  // 7. WEBRTC AUDIO & VIDEO CALL SIGNALING
  // ==========================================

  // A starts call to B
  socket.on("call-user", ({ recipientId, offer, callType, callerInfo, callRoomId }) => {
    if (recipientId) {
      // Send incoming call alert to recipient's personal room
      io.to(recipientId).emit("incoming-call", {
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
      io.to(to).emit("call-answered", { answer, callRoomId });
    }
  });

  // ICE Candidate exchange
  socket.on("ice-candidate", ({ to, candidate, callRoomId }) => {
    if (to) {
      io.to(to).emit("ice-candidate", { candidate, callRoomId });
    }
  });

  // Reject / Decline call
  socket.on("reject-call", ({ to, reason, callRoomId }) => {
    if (to) {
      io.to(to).emit("call-rejected", { reason, callRoomId });
    }
  });

  // End active call
  socket.on("end-call", ({ to, callRoomId }) => {
    if (to) {
      io.to(to).emit("call-ended", { callRoomId });
    }
    if (callRoomId) {
      socket.to(callRoomId).emit("call-ended", { callRoomId });
    }
  });

  // Toggle audio / video status in call
  socket.on("toggle-media", ({ to, mediaType, isEnabled, callRoomId }) => {
    if (to) {
      io.to(to).emit("remote-media-toggled", { mediaType, isEnabled, callRoomId });
    }
  });

  // 8. Disconnect
  socket.on("disconnect", async () => {
    if (connectedUserId && onlineUsers.has(connectedUserId)) {
      const userSockets = onlineUsers.get(connectedUserId);
      userSockets.delete(socket.id);

      if (userSockets.size === 0) {
        onlineUsers.delete(connectedUserId);
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
