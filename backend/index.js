// import express from "express";
// import dotenv from "dotenv";
// import connectDb from "./config/db.js";
// import authRouter from "./routes/auth.routes.js";
// import cookieParser from "cookie-parser";
// import chatRoutes from "./routes/chat.routes.js";
// dotenv.config();

// const port=process.env.port || 8000;

// const app = express();
// app.use(express.json());
// app.use(cookieParser());

// app.use("/api/auth",authRouter)
// app.use("/api/chat",chatRoutes)
// app.get("/", (req,res)=>{
//     res.send("server is running")
// })



// app.listen(port,()=>{
//     connectDb();
//     console.log("server is running on port");
// })



// import express from "express";
// import http from "http";
// import { Server } from "socket.io";
// import cors from "cors";
// import dotenv from "dotenv";
// import connectDB from "./db.js";
// import chatRoutes from "./routes/chat.routes.js";

// dotenv.config();
// connectDB();

// const app = express();
// app.use(cors());
// app.use(express.json());

// app.use("/api/chat", chatRoutes);

// const server = http.createServer(app);
// const io = new Server(server, {
//   cors: {
//     origin: "*",
//   },
// });

// io.on("connection", (socket) => {
//   console.log("New socket connected:", socket.id);

//   socket.on("join-room", (roomId) => {
//     socket.join(roomId);
//     console.log(`User joined room: ${roomId}`);
//   });

//   socket.on("send-message", ({ roomId, message }) => {
//     io.to(roomId).emit("receive-message", { chatId: roomId, message });
//   });

//   // 📞 --- CALL STATUS EVENTS ---
//   socket.on("call-started", ({ roomId, callType, sender }) => {
//     io.to(roomId).emit("receive-message", {
//       chatId: roomId,
//       message: {
//         sender: "System",
//         text: `📞 ${sender} started a ${callType} call`,
//         system: true,
//       },
//     });
//   });

//   socket.on("call-ended", ({ roomId, sender }) => {
//     io.to(roomId).emit("receive-message", {
//       chatId: roomId,
//       message: {
//         sender: "System",
//         text: `✅ ${sender}'s call ended`,
//         system: true,
//       },
//     });
//   });

//   socket.on("call-missed", ({ roomId, sender }) => {
//     io.to(roomId).emit("receive-message", {
//       chatId: roomId,
//       message: {
//         sender: "System",
//         text: `❌ Missed call from ${sender}`,
//         system: true,
//       },
//     });
//   });

//   socket.on("disconnect", () => {
//     console.log("Socket disconnected:", socket.id);
//   });
// });

// const PORT = process.env.PORT || 5000;
// server.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });

// import express from "express";
// import http from "http";
// import { Server } from "socket.io";
// import cors from "cors";
// import dotenv from "dotenv";
// import cookieParser from "cookie-parser";
// import connectDB from "./config/db.js";
// import chatRoutes from "./routes/chat.routes.js";
// import authRouter from "./routes/auth.routes.js";

// dotenv.config();
// connectDB();

// const app = express();

// // ✅ Fixed CORS for cookies (withCredentials)
// app.use(cors({
//   origin: "http://localhost:5173", // ⚠️ Ensure this matches your frontend URL
//   methods: ["GET", "POST", "PUT", "DELETE"],
//   credentials: true
// }));

// app.use(express.json());
// app.use(cookieParser());

// // ✅ Health check route (important)
// app.get("/", (req, res) => {
//   res.send("Backend is running 🚀");
// });

// app.use("/api/chat", chatRoutes);
// app.use("/api/auth", authRouter); // ✅ Auth routes added

// const server = http.createServer(app);

// const io = new Server(server, {
//   cors: {
//     origin: "*",
//   },
// });

// io.on("connection", (socket) => {
//   console.log("New socket connected:", socket.id);

//   socket.on("join-room", (roomId) => {
//     socket.join(roomId);
//     console.log(`User joined room: ${roomId}`);
//   });

//   socket.on("send-message", ({ roomId, message }) => {
//     io.to(roomId).emit("receive-message", { chatId: roomId, message });
//   });

//   // 📞 --- CALL STATUS EVENTS ---
//   socket.on("call-started", ({ roomId, callType, sender }) => {
//     io.to(roomId).emit("receive-message", {
//       chatId: roomId,
//       message: {
//         sender: "System",
//         text: `📞 ${sender} started a ${callType} call`,
//         system: true,
//       },
//     });
//   });

//   socket.on("call-ended", ({ roomId, sender }) => {
//     io.to(roomId).emit("receive-message", {
//       chatId: roomId,
//       message: {
//         sender: "System",
//         text: `✅ ${sender}'s call ended`,
//         system: true,
//       },
//     });
//   });

//   socket.on("call-missed", ({ roomId, sender }) => {
//     io.to(roomId).emit("receive-message", {
//       chatId: roomId,
//       message: {
//         sender: "System",
//         text: `❌ Missed call from ${sender}`,
//         system: true,
//       },
//     });
//   });

//   socket.on("disconnect", () => {
//     console.log("Socket disconnected:", socket.id);
//   });
// });

// // ✅ PORT (already correct)
// const PORT = process.env.PORT || 8000;

// server.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });
//  claude code 
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import path from "path";
import connectDB from "./config/db.js";
import chatRoutes from "./routes/chat.routes.js";
import authRouter from "./routes/auth.routes.js";
import userRouter from "./routes/user.routes.js";
import mediaRouter from "./routes/media.routes.js";

dotenv.config();
connectDB();

const app = express();

// 🔥 FIXED: CORS Origins (Hamesha yaad rakhein: No trailing slash at the end)
const allowedOrigins = [
  "http://localhost:5173", 
  "http://127.0.0.1:5173", 
  "http://localhost:5174", 
  "https://realtimechatapp-frontend-7uv3.onrender.com" 
];

app.use(cors({
  origin: function (origin, callback) {
    // Agar origin list mein hai, ya agar origin nahi hai (jaise mobile/Postman/Server-to-server)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log("Blocked by CORS: ", origin); // Taaki hum logs mein dekh sakein kaunsa link block hua
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"]
}));

app.use(express.json());
app.use(cookieParser());

// Serve uploaded files
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/", (req, res) => res.send("Backend is running 🚀"));

app.use("/api/chat", chatRoutes);
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/media", mediaRouter);

const server = http.createServer(app);

// 🔥 FIXED: Socket.io CORS Configuration
const io = new Server(server, {
  cors: { 
    origin: allowedOrigins, 
    methods: ["GET", "POST"],
    credentials: true 
  },
  transports: ['websocket', 'polling'] // Better stability on Render
});

const roomUsers = {};

io.on("connection", (socket) => {
  console.log("New socket connected:", socket.id);

  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    if (!roomUsers[roomId]) roomUsers[roomId] = [];
    if (!roomUsers[roomId].includes(socket.id)) {
      roomUsers[roomId].push(socket.id);
    }
    console.log(`Socket ${socket.id} joined room: ${roomId}`);
  });

  socket.on("send-message", ({ roomId, message }) => {
    socket.to(roomId).emit("receive-message", { chatId: roomId, message });
  });

  // ---- CALL SIGNALING ----
  socket.on("call-user", ({ roomId, signal, callType, from }) => {
    socket.to(roomId).emit("incoming-call", { from, signal, callType });
  });

  socket.on("signal", ({ roomId, signal }) => {
    socket.to(roomId).emit("signal", { signal, from: socket.id });
  });

  socket.on("end-call", ({ roomId } = {}) => {
    if (roomId) socket.to(roomId).emit("end-call");
  });

  socket.on("call-started", ({ roomId, callType, sender }) => {
    socket.to(roomId).emit("receive-message", {
      chatId: roomId,
      message: { sender: "system", text: `📞 ${sender} started a ${callType} call` },
    });
  });

  socket.on("call-ended", ({ roomId, sender }) => {
    socket.to(roomId).emit("receive-message", {
      chatId: roomId,
      message: { sender: "system", text: `🔚 ${sender}'s call ended` },
    });
  });

  socket.on("disconnect", () => {
    for (const roomId in roomUsers) {
      roomUsers[roomId] = roomUsers[roomId].filter((id) => id !== socket.id);
    }
    console.log("Socket disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => console.log(`Server running on port ${PORT} 🚀`));