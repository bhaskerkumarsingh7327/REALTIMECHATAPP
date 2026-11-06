<div align="center">

# ⚡ PulseChat (Nexus)
### Next-Gen Realtime Voice, HD Video & Neural AI Messaging Platform

[![React](https://img.shields.io/badge/React-18.2-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Socket.io](https://img.shields.io/badge/Socket.io-Realtime-010101?logo=socket.io&logoColor=white)](https://socket.io/)
[![WebRTC](https://img.shields.io/badge/WebRTC-HD_Video_Calls-333333?logo=webrtc&logoColor=white)](https://webrtc.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)](https://mongodb.com/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Redux Toolkit](https://img.shields.io/badge/Redux_Toolkit-State-764ABC?logo=redux&logoColor=white)](https://redux-toolkit.js.org/)

<p align="center">
  A futuristic, luxury glassmorphic chat suite packed with crystal-clear WebRTC video & voice calls, in-browser voice note recording, instant emoji reactions, file sharing, real-time typing/presence, and an integrated Neural AI Assistant.
</p>

</div>

---

## ✨ Key Features

### 📹 1. Crystal-Clear WebRTC Video & Voice Calls
- **Full 1-on-1 Peer-to-Peer Calling**: Direct low-latency media streams using Google STUN servers.
- **Incoming Call Overlay**: Real-time incoming modal with Accept (green bounce) and Decline (red) actions.
- **Active Call Interface**:
  - Full-screen remote video stream.
  - Floating Picture-in-Picture (PiP) local camera preview.
  - Live call timer (`MM:SS`).
  - **Mute / Unmute Microphone** with live indicator.
  - **Turn Camera On / Off** anytime during the call.
  - **Screen Share 💻**: Share your desktop, app window, or browser tab directly.
- **Dynamic Voice Call Mode**: If video is disabled or in voice call mode, a real-time pulsing waveform visualizer is displayed.
- **Zero-Dependency Synthesized Audio**: Authentic phone ringing cadence, melodic incoming chimes, message pops, and hangup tones generated dynamically using the browser's **Web Audio API** (no missing audio files!).

---

### 🤖 2. Pulse AI Neural Companion
- Pinned right into the contact list of every user.
- Ask questions, debug code, brainstorm ideas, request summaries, or chat casually.
- Simulated intelligent response engine with code block formatting and feature guidance.

---

### 💬 3. Rich Real-Time Messaging
- **Instant Messaging**: Powered by Socket.io and stored permanently in MongoDB.
- **Real-Time Typing Indicators**: Animated *"Alice is typing..."* notifications.
- **Live Online / Offline Presence**: Live green dot indicators with instant socket disconnect cleanup.
- **Voice Notes**:
  - Record voice notes directly with the browser's `MediaRecorder` API.
  - Live recording timer and pulsing recording indicator.
  - Interactive player with waveform seeker, elapsed time, and duration.
- **Emoji Reactions**: Hover over any message to react with ❤️, 👍, 😂, 🔥, 😮, 👏.
- **Media & File Attachments**:
  - Send photos with instant lightbox click-to-preview.
  - Send documents/files with file name and size badges.
- **Emoji Picker Dropdown**: Categorized emojis (Reactions, Smileys, Gestures, Hearts, Objects).
- **Message Management**: Delete individual messages or clear/delete entire conversations.

---

### 👤 4. User Profiles & Customization
- **Database-Synced Profile Updates**: Update display name, status/bio, and avatar.
- **Avatar Upload**: Upload custom images via multer with permanent server storage.
- **Sound Effects Toggle**: Mute or unmute all app sounds with one click.
- **User Discovery**: Instant search modal to discover and start chatting with any registered user.

---

## 🏗️ Project Architecture

```
realtimechatapp/
├── backend/
│   ├── config/
│   │   ├── db.js              # Resilient MongoDB Atlas connection
│   │   └── token.js           # JWT token generation
│   ├── controller/
│   │   ├── auth.controllers.js # Signup, Login & Logout with bcrypt
│   │   ├── chat.controllers.js # Messages, reactions, search & chat history
│   │   └── user.controllers.js # Profile updates & contact discovery
│   ├── middlewares/
│   │   └── isAuth.js          # Dual auth (Cookies + Bearer Header)
│   ├── models/
│   │   ├── chat.model.js      # Chat & Message schema with reactions/media
│   │   └── user.model.js      # User schema with online status & bio
│   ├── routes/
│   │   ├── auth.routes.js     # /api/auth
│   │   ├── chat.routes.js     # /api/chat
│   │   ├── media.routes.js    # /api/media (Multer uploads)
│   │   └── user.routes.js     # /api/user
│   ├── uploads/               # Uploaded images, audio notes & files
│   └── index.js               # Express + Socket.io WebRTC signaling server
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AudioMessage.jsx   # Voice note waveform player
│   │   │   ├── CallModal.jsx      # WebRTC HD Video & Voice call overlay
│   │   │   ├── EmojiPicker.jsx    # Categorized emoji dropdown
│   │   │   ├── Icons.jsx          # Sharp inline SVG vector icon set
│   │   │   ├── Logo.jsx           # Animated glowing geometric brand logo
│   │   │   └── VoiceRecorder.jsx  # Live microphone audio recorder
│   │   ├── pages/
│   │   │   ├── Home.jsx           # Main chat, calling & sidebar dashboard
│   │   │   ├── Login.jsx          # Glassmorphic sign-in page
│   │   │   ├── Profile.jsx        # Profile & avatar settings
│   │   │   └── SignUp.jsx         # Glassmorphic registration page
│   │   ├── redux/
│   │   │   ├── store.js           # Redux store
│   │   │   └── userSlice.js       # User & Token auth state
│   │   ├── utils/
│   │   │   ├── aiBot.js           # Built-in Pulse AI Companion
│   │   │   └── soundEffects.js    # Web Audio API ringtones & chimes
│   │   ├── App.jsx                # Protected routes & navigation
│   │   └── main.jsx               # Axios interceptors & root render
│   ├── index.html                 # Brand favicon & meta tags
│   └── tailwind.config.js         # Tailwind CSS styling configuration
│
├── package.json                   # Root orchestrator scripts
└── README.md                      # Complete documentation
```

---

## ⚡ Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [MongoDB](https://www.mongodb.com/) (Local instance or MongoDB Atlas cluster URI)

---

### 2. Backend Setup

1. Navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure your environment variables in `backend/.env`:
   ```env
   PORT=8000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_super_secret_jwt_key
   ```
4. Start the backend development server:
   ```bash
   npm run dev
   ```
   *Backend will run at: `http://localhost:8000`*

---

### 3. Frontend Setup

1. Open a new terminal and navigate to `frontend`:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *Frontend will launch at: `http://localhost:5173`*

---

### 4. Running from Root (Convenience Scripts)

From the project root directory:
```bash
# Start backend
npm run dev:backend

# Start frontend
npm run dev:frontend

# Build frontend for production
npm run build
```

---

## 📡 Socket.io Events Reference

| Event Name | Direction | Payload | Description |
|---|---|---|---|
| `register-user` | Client ➔ Server | `userId` | Registers user socket & marks presence online |
| `user-status-changed` | Server ➔ Client | `{ userId, isOnline }` | Broadcasts live presence updates |
| `join-room` | Client ➔ Server | `roomId` | Joins a chat room for instant messaging |
| `send-message` | Client ➔ Server | `{ roomId, message }` | Sends and broadcasts message |
| `typing` / `stop-typing` | Client ➔ Server | `{ roomId, username, userId }` | Triggers real-time typing indicators |
| `message-reaction` | Client ➔ Server | `{ roomId, messageId, emoji, username }` | Syncs emoji reactions |
| `call-user` | Client ➔ Server | `{ recipientId, offer, callType, callerInfo }` | Initiates WebRTC call signaling |
| `answer-call` | Client ➔ Server | `{ to, answer }` | Answers WebRTC call with SDP answer |
| `ice-candidate` | Client ➔ Server | `{ to, candidate }` | Exchanges ICE candidates for connection |
| `reject-call` / `end-call` | Client ➔ Server | `{ to }` | Ends or rejects call session |

---

## 🔒 Security & Best Practices
- Passwords are securely hashed using **bcryptjs**.
- Protected API routes verified via **JWT (JSON Web Tokens)**.
- Secure static uploads handling with mime-type detection and size limits.
- Dual-mode authentication: seamless support for `Authorization: Bearer <token>` alongside `httpOnly` cookies.

---

<div align="center">
  <b>Built with ❤️ for modern real-time communication.</b>
</div>
