import React, { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import { clearUserData } from "../redux/userSlice";
import io from "socket.io-client";
import axios from "axios";
import { serverUrl } from "../main";
import Logo from "../components/Logo";
import CallModal from "../components/CallModal";
import VoiceRecorder from "../components/VoiceRecorder";
import EmojiPicker from "../components/EmojiPicker";
import AudioMessage from "../components/AudioMessage";
import {
  IconPhone,
  IconVideo,
  IconSend,
  IconPaperclip,
  IconSmile,
  IconMic,
  IconSearch,
  IconPlus,
  IconTrash,
  IconUser,
  IconLogOut,
  IconCheck,
  IconCheckDouble,
  IconVolume2,
  IconVolumeX,
  IconClose,
  IconSparkles,
} from "../components/Icons";
import { sounds } from "../utils/soundEffects";
import { PULSE_AI_USER, generateAIResponse } from "../utils/aiBot";

export default function Home() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const userData = useSelector((state) => state.user.userData);

  // Chats & Messages
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [remoteTypingUser, setRemoteTypingUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  // Modals & UI states
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isMutedSounds, setIsMutedSounds] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [activeReactionMsgId, setActiveReactionMsgId] = useState(null);

  // WebRTC Calling State
  const [callState, setCallState] = useState("idle"); // 'idle' | 'outgoing' | 'incoming' | 'in-call'
  const [callType, setCallType] = useState("video"); // 'audio' | 'video'
  const [callerInfo, setCallerInfo] = useState(null);
  const [incomingOffer, setIncomingOffer] = useState(null);

  // Refs
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [selectedChat?.messages, remoteTypingUser]);

  // Sound toggle helper
  const toggleSoundMute = () => {
    const next = !isMutedSounds;
    setIsMutedSounds(next);
    sounds.setMuted(next);
  };

  // 1. Initialize Socket Connection & Listeners
  useEffect(() => {
    if (!userData?._id) return;

    const socket = io(serverUrl, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      reconnection: true,
    });
    socketRef.current = socket;

    // Attach user metadata to socket instance for easy access in modals
    socket.userId = userData._id;
    socket.userName = userData.name || userData.username;
    socket.userUsername = userData.username;
    socket.userAvatar = userData.avatar;

    const registerUserSocket = () => {
      const uid = String(userData._id);
      console.log("[SOCKET] Registering user presence on socket:", uid);
      socket.emit("register-user", uid);
    };

    socket.on("connect", () => {
      console.log("[SOCKET] Connected to PulseChat Realtime Gateway 🚀 Socket ID:", socket.id);
      registerUserSocket();
    });

    if (socket.connected) {
      registerUserSocket();
    }

    // Online presence tracking
    socket.on("online-users-list", (userIds) => {
      console.log("[SOCKET] Initial online users:", userIds);
      setOnlineUsers(new Set(userIds.map(String)));
    });

    socket.on("user-status-changed", ({ userId, isOnline }) => {
      const uStr = String(userId);
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (isOnline) next.add(uStr);
        else next.delete(uStr);
        return next;
      });
    });

    // Receive Message (Realtime)
    socket.on("receive-message", ({ chatId, message }) => {
      console.log("[SOCKET] Received message in chat:", chatId, message);
      if (message.sender !== userData.username) {
        sounds.playMessageReceived();
      }

      setChats((prev) => {
        const exists = prev.some((c) => String(c._id) === String(chatId));
        if (!exists) {
          // If this is a new incoming chat, reload chats from server
          fetchChats();
          return prev;
        }

        return prev.map((c) => {
          if (String(c._id) === String(chatId)) {
            const isDup = c.messages?.some((m) => m._id === message._id);
            const msgs = isDup ? c.messages : [...(c.messages || []), message];
            return {
              ...c,
              messages: msgs,
              lastMessage: message.text || (message.mediaType === "audio" ? "🎵 Voice Note" : "📎 Attachment"),
              lastMessageAt: message.createdAt || new Date(),
            };
          }
          return c;
        });
      });

      setSelectedChat((prev) => {
        if (prev && String(prev._id) === String(chatId)) {
          const isDup = prev.messages?.some((m) => m._id === message._id);
          if (isDup) return prev;
          return {
            ...prev,
            messages: [...(prev.messages || []), message],
          };
        }
        return prev;
      });
    });

    // Realtime New Chat Alert
    socket.on("new-chat-received", (newChat) => {
      console.log("[SOCKET] New chat received from contact:", newChat);
      if (newChat && newChat._id) {
        setChats((prev) => [newChat, ...prev.filter((c) => String(c._id) !== String(newChat._id))]);
        socket.emit("join-room", newChat._id);
      }
    });

    // Typing indicators
    socket.on("user-typing", ({ roomId, username }) => {
      setSelectedChat((current) => {
        if (current && String(current._id) === String(roomId)) {
          setRemoteTypingUser(username);
        }
        return current;
      });
    });

    socket.on("user-stop-typing", ({ roomId }) => {
      setSelectedChat((current) => {
        if (current && String(current._id) === String(roomId)) {
          setRemoteTypingUser(null);
        }
        return current;
      });
    });

    // Message Reaction Update
    socket.on("message-reaction-updated", ({ roomId, messageId, emoji, username }) => {
      const updateMsgs = (msgs) =>
        msgs?.map((m) => {
          if (m._id === messageId) {
            const rx = [...(m.reactions || [])];
            const idx = rx.findIndex((r) => r.username === username && r.emoji === emoji);
            if (idx > -1) rx.splice(idx, 1);
            else {
              const filtered = rx.filter((r) => r.username !== username);
              filtered.push({ emoji, username });
              return { ...m, reactions: filtered };
            }
            return { ...m, reactions: rx };
          }
          return m;
        });

      setSelectedChat((prev) => (prev && String(prev._id) === String(roomId) ? { ...prev, messages: updateMsgs(prev.messages) } : prev));
      setChats((prev) => prev.map((c) => (String(c._id) === String(roomId) ? { ...c, messages: updateMsgs(c.messages) } : c)));
    });

    // Message Deleted
    socket.on("message-deleted", ({ roomId, messageId }) => {
      const removeMsg = (msgs) => msgs?.filter((m) => m._id !== messageId);
      setSelectedChat((prev) => (prev && String(prev._id) === String(roomId) ? { ...prev, messages: removeMsg(prev.messages) } : prev));
      setChats((prev) => prev.map((c) => (String(c._id) === String(roomId) ? { ...c, messages: removeMsg(c.messages) } : c)));
    });

    // Incoming WebRTC Call
    socket.on("incoming-call", ({ from, offer, callType: cType }) => {
      console.log("[SOCKET] Incoming call alert from:", from, "Type:", cType);
      setCallerInfo(from);
      setIncomingOffer(offer);
      setCallType(cType || "video");
      setCallState("incoming");
    });

    fetchChats();

    return () => {
      socket.disconnect();
    };
  }, [userData?._id]);

  // Fetch initial chats from backend
  const fetchChats = async () => {
    try {
      const res = await axios.get(`${serverUrl}/api/chat?userId=${userData._id}`);
      const fetched = Array.isArray(res.data) ? res.data : [];

      // Include pinned Pulse AI companion in chats list
      const aiChat = {
        _id: "pulse_ai_chat_special",
        isAIChat: true,
        members: [userData, PULSE_AI_USER],
        messages: [
          {
            _id: "ai_intro_1",
            sender: "Pulse AI",
            text: "Welcome to PulseChat! 🚀 I'm Pulse AI, your neural companion. Ask me anything or explore features like HD Voice/Video calling, voice notes, and instant reactions!",
            createdAt: new Date(),
          },
        ],
        lastMessage: "⚡ Pulse AI is online and ready to assist you.",
        lastMessageAt: new Date(),
      };

      const combined = [aiChat, ...fetched];
      setChats(combined);

      // Join socket rooms for each chat
      if (socketRef.current) {
        fetched.forEach((c) => socketRef.current.emit("join-room", c._id));
      }
    } catch (err) {
      console.error("Fetch chats error:", err);
    }
  };

  // Join selected chat room
  useEffect(() => {
    if (selectedChat?._id && socketRef.current && !selectedChat.isAIChat) {
      socketRef.current.emit("join-room", selectedChat._id);
    }
    setRemoteTypingUser(null);
  }, [selectedChat?._id]);

  // 2. Sending Messages
  const handleSendMessage = async () => {
    const text = messageText.trim();
    if (!text || !selectedChat) return;

    setMessageText("");
    stopTyping();

    // Handle Pulse AI Assistant Chat
    if (selectedChat.isAIChat) {
      const userMsg = {
        _id: "user_msg_" + Date.now(),
        sender: userData.username,
        text,
        createdAt: new Date(),
      };

      const updatedMsgs = [...(selectedChat.messages || []), userMsg];
      setSelectedChat((prev) => ({ ...prev, messages: updatedMsgs }));
      setChats((prev) =>
        prev.map((c) => (c._id === selectedChat._id ? { ...c, messages: updatedMsgs, lastMessage: text } : c))
      );
      sounds.playMessageSent();

      // Show typing for AI
      setRemoteTypingUser("Pulse AI");
      const aiReplyText = await generateAIResponse(text);
      setRemoteTypingUser(null);

      const aiReplyMsg = {
        _id: "ai_msg_" + Date.now(),
        sender: "Pulse AI",
        text: aiReplyText,
        createdAt: new Date(),
      };

      const withAiMsgs = [...updatedMsgs, aiReplyMsg];
      setSelectedChat((prev) => ({ ...prev, messages: withAiMsgs }));
      setChats((prev) =>
        prev.map((c) =>
          c._id === selectedChat._id ? { ...c, messages: withAiMsgs, lastMessage: aiReplyText } : c
        )
      );
      sounds.playMessageReceived();
      return;
    }

    // Normal User Chat
    try {
      const msgPayload = {
        chatId: selectedChat._id,
        sender: userData.username,
        senderId: userData._id,
        text,
        mediaType: "text",
      };

      const res = await axios.post(`${serverUrl}/api/chat/message`, msgPayload);
      const saved = res.data;

      sounds.playMessageSent();

      socketRef.current?.emit("send-message", {
        roomId: selectedChat._id,
        message: saved,
        recipientId: currentPartner?._id,
      });

      setSelectedChat((prev) => ({
        ...prev,
        messages: [...(prev.messages || []), saved],
      }));

      setChats((prev) =>
        prev.map((c) =>
          c._id === selectedChat._id
            ? { ...c, messages: [...(c.messages || []), saved], lastMessage: text, lastMessageAt: new Date() }
            : c
        )
      );
    } catch (err) {
      console.error("Send message error:", err);
    }
  };

  // 3. Media Upload (Photos, Audio, Files)
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedChat) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const uploadRes = await axios.post(`${serverUrl}/api/media/upload`, formData);
      const { url, fileName, fileSize, mediaType } = uploadRes.data;

      const fullUrl = url.startsWith("http") ? url : `${serverUrl}${url}`;

      const msgPayload = {
        chatId: selectedChat._id,
        sender: userData.username,
        senderId: userData._id,
        text: file.name,
        mediaUrl: fullUrl,
        mediaType,
        fileName,
        fileSize,
      };

      const res = await axios.post(`${serverUrl}/api/chat/message`, msgPayload);
      const saved = res.data;

      sounds.playMessageSent();

      socketRef.current?.emit("send-message", {
        roomId: selectedChat._id,
        message: saved,
        recipientId: currentPartner?._id,
      });

      setSelectedChat((prev) => ({
        ...prev,
        messages: [...(prev.messages || []), saved],
      }));

      setChats((prev) =>
        prev.map((c) =>
          c._id === selectedChat._id
            ? {
                ...c,
                messages: [...(c.messages || []), saved],
                lastMessage: mediaType === "image" ? "📷 Photo" : "📎 File",
                lastMessageAt: new Date(),
              }
            : c
        )
      );
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // 4. Voice Recording Completed
  const handleVoiceRecordingComplete = async (audioBlob, durationSec) => {
    setIsRecordingVoice(false);
    if (!audioBlob || !selectedChat) return;

    const file = new File([audioBlob], `voice-note-${Date.now()}.webm`, {
      type: "audio/webm",
    });

    const formData = new FormData();
    formData.append("file", file);

    try {
      const uploadRes = await axios.post(`${serverUrl}/api/media/upload`, formData);
      const { url, fileName, fileSize } = uploadRes.data;
      const fullUrl = url.startsWith("http") ? url : `${serverUrl}${url}`;

      const msgPayload = {
        chatId: selectedChat._id,
        sender: userData.username,
        senderId: userData._id,
        text: `Voice note (${durationSec}s)`,
        mediaUrl: fullUrl,
        mediaType: "audio",
        fileName,
        fileSize,
      };

      const res = await axios.post(`${serverUrl}/api/chat/message`, msgPayload);
      const saved = res.data;

      sounds.playMessageSent();

      socketRef.current?.emit("send-message", {
        roomId: selectedChat._id,
        message: saved,
        recipientId: currentPartner?._id,
      });

      setSelectedChat((prev) => ({
        ...prev,
        messages: [...(prev.messages || []), saved],
      }));

      setChats((prev) =>
        prev.map((c) =>
          c._id === selectedChat._id
            ? {
                ...c,
                messages: [...(c.messages || []), saved],
                lastMessage: "🎵 Voice Note",
                lastMessageAt: new Date(),
              }
            : c
        )
      );
    } catch (err) {
      console.error("Voice upload error:", err);
    }
  };

  // 5. Typing Indicators Handling
  const handleInputChange = (e) => {
    setMessageText(e.target.value);

    if (!selectedChat || selectedChat.isAIChat) return;

    if (!isTyping) {
      setIsTyping(true);
      socketRef.current?.emit("typing", {
        roomId: selectedChat._id,
        username: userData.username,
        userId: userData._id,
      });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 1500);
  };

  const stopTyping = () => {
    if (isTyping && selectedChat) {
      setIsTyping(false);
      socketRef.current?.emit("stop-typing", {
        roomId: selectedChat._id,
        username: userData.username,
        userId: userData._id,
      });
    }
  };

  // 6. Reactions
  const handleReaction = async (messageId, emoji) => {
    setActiveReactionMsgId(null);
    if (!selectedChat || selectedChat.isAIChat) return;

    try {
      await axios.post(`${serverUrl}/api/chat/reaction`, {
        chatId: selectedChat._id,
        messageId,
        emoji,
        username: userData.username,
        userId: userData._id,
      });

      socketRef.current?.emit("message-reaction", {
        roomId: selectedChat._id,
        messageId,
        emoji,
        username: userData.username,
      });
    } catch (err) {
      console.error("Reaction error:", err);
    }
  };

  // 7. Delete Message
  const handleDeleteMessage = async (messageId) => {
    if (!selectedChat || selectedChat.isAIChat) return;
    try {
      await axios.delete(`${serverUrl}/api/chat/${selectedChat._id}/message/${messageId}`);
      socketRef.current?.emit("delete-message", {
        roomId: selectedChat._id,
        messageId,
      });
      setSelectedChat((prev) => ({
        ...prev,
        messages: prev.messages?.filter((m) => m._id !== messageId),
      }));
    } catch (err) {
      console.error("Delete message error:", err);
    }
  };

  // 8. Delete Chat
  const handleDeleteChat = async () => {
    if (!selectedChat || selectedChat.isAIChat) return;
    if (!window.confirm("Are you sure you want to delete this chat conversation?")) return;

    try {
      await axios.delete(`${serverUrl}/api/chat/${selectedChat._id}`);
      setChats((prev) => prev.filter((c) => c._id !== selectedChat._id));
      setSelectedChat(null);
    } catch (err) {
      console.error("Delete chat error:", err);
    }
  };

  // 9. Start Calling (WebRTC)
  const startCall = (type) => {
    if (!selectedChat || selectedChat.isAIChat) {
      alert("Calls are available with registered contacts!");
      return;
    }
    const partner = getChatPartner(selectedChat);
    if (!partner?._id) return;

    setCallType(type);
    setCallerInfo(null);
    setCallState("outgoing");
  };

  // WhatsApp-style Call Status Handler
  const handleCallEnded = async (callData = {}) => {
    const duration = typeof callData === "object" ? (callData.duration || 0) : 0;
    const cType = (typeof callData === "object" && callData.callType) ? callData.callType : callType;
    const status = (typeof callData === "object" && callData.status) ? callData.status : "completed";
    const reason = typeof callData === "string" ? callData : null;

    setCallState("idle");
    setCallerInfo(null);
    setIncomingOffer(null);

    if (reason && duration === 0) {
      console.log("[CALL END REASON]", reason);
    }

    if (!selectedChat || selectedChat.isAIChat) return;

    // Generate WhatsApp-style call summary notification
    const icon = cType === "video" ? "📹" : "📞";
    const typeLabel = cType === "video" ? "Video call" : "Voice call";
    let summaryText = "";

    if (duration > 0) {
      const mins = Math.floor(duration / 60);
      const secs = duration % 60;
      const durStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
      summaryText = `${icon} ${typeLabel} ended • ${durStr}`;
    } else if (status === "declined") {
      summaryText = `📵 ${typeLabel} declined`;
    } else if (status === "missed") {
      summaryText = `❌ Missed ${typeLabel.toLowerCase()}`;
    } else {
      summaryText = `${icon} ${typeLabel} ended`;
    }

    try {
      const msgPayload = {
        chatId: selectedChat._id,
        sender: "System",
        senderId: userData._id,
        text: summaryText,
        mediaType: "system",
        system: true,
      };

      const res = await axios.post(`${serverUrl}/api/chat/message`, msgPayload);
      const saved = res.data;

      socketRef.current?.emit("send-message", {
        roomId: selectedChat._id,
        message: saved,
        recipientId: currentPartner?._id,
      });

      setSelectedChat((prev) => ({
        ...prev,
        messages: [...(prev.messages || []), saved],
      }));

      setChats((prev) =>
        prev.map((c) =>
          c._id === selectedChat._id
            ? { ...c, messages: [...(c.messages || []), saved], lastMessage: summaryText, lastMessageAt: new Date() }
            : c
        )
      );
    } catch (err) {
      console.error("Error creating call notification in chat:", err);
    }
  };

  // 10. User Search & New Chat
  const handleUserSearch = async (val) => {
    setSearchFilter(val);
    if (!val.trim()) {
      setUserSearchResults([]);
      return;
    }
    setIsSearchingUsers(true);
    try {
      const res = await axios.get(`${serverUrl}/api/chat/search?query=${val}&myId=${userData._id}`);
      setUserSearchResults(res.data || []);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setIsSearchingUsers(false);
    }
  };

  const handleStartChatWithUser = async (targetUser) => {
    try {
      const res = await axios.post(`${serverUrl}/api/chat`, {
        myId: userData._id,
        recipientId: targetUser._id,
      });

      const newChat = res.data;
      setShowNewChatModal(false);
      setSearchFilter("");
      setUserSearchResults([]);

      const exists = chats.some((c) => c._id === newChat._id);
      if (!exists) {
        setChats([newChat, ...chats]);
      }
      setSelectedChat(newChat);

      if (socketRef.current) {
        socketRef.current.emit("join-room", newChat._id);
        socketRef.current.emit("new-chat-created", {
          recipientId: targetUser._id,
          chat: newChat,
        });
      }
    } catch (err) {
      console.error("Start chat error:", err);
    }
  };

  // Helper to extract the other user in a 1-to-1 chat
  const getChatPartner = (chat) => {
    if (!chat) return null;
    if (chat.isAIChat) return PULSE_AI_USER;
    const currentId = String(userData?._id || userData?.id || "");
    const partner = chat.members?.find((m) => {
      const memberId = String(m?._id || m || "");
      return memberId && memberId !== currentId;
    });
    return partner || { username: "User", name: "User" };
  };

  const getMediaUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:") || url.startsWith("blob:")) {
      return url;
    }
    return `${serverUrl}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  const currentPartner = selectedChat ? getChatPartner(selectedChat) : null;
  const isPartnerOnline = currentPartner
    ? currentPartner._id === PULSE_AI_USER._id
      ? true
      : onlineUsers.has(String(currentPartner._id))
    : false;

  return (
    <div className="fixed inset-0 flex h-[100dvh] w-full bg-[#0a0d14] text-white overflow-hidden font-sans select-none">
      {/* Background ambient lighting */}
      <div className="absolute top-0 -left-40 w-96 h-96 bg-violet-600/10 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-0 -right-40 w-96 h-96 bg-cyan-600/10 rounded-full blur-[140px] pointer-events-none"></div>

      {/* ======================================================== */}
      {/* LEFT SIDEBAR: Brand, User Profile, Chat List */}
      {/* ======================================================== */}
      <div
        className={`w-full md:w-96 border-r border-white/10 flex flex-col bg-[#10141f]/70 backdrop-blur-xl ${
          selectedChat ? "hidden md:flex" : "flex"
        } h-full z-10 transition-all`}
      >
        {/* Header: Logo & User Actions */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between flex-shrink-0">
          <Logo size="md" />

          <div className="flex items-center gap-1.5">
            {/* Sound mute toggle */}
            <button
              onClick={toggleSoundMute}
              className={`p-2 rounded-xl transition ${
                isMutedSounds ? "bg-red-500/20 text-red-400" : "bg-white/5 text-gray-400 hover:text-white"
              }`}
              title={isMutedSounds ? "Unmute sounds" : "Mute sounds"}
            >
              {isMutedSounds ? <IconVolumeX className="w-5 h-5" /> : <IconVolume2 className="w-5 h-5" />}
            </button>

            {/* Profile */}
            <Link
              to="/profile"
              className="p-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl transition"
              title="Profile Settings"
            >
              <IconUser className="w-5 h-5" />
            </Link>

            {/* New Chat Button */}
            <button
              onClick={() => setShowNewChatModal(true)}
              className="p-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-xl transition shadow-lg shadow-violet-600/20"
              title="New Conversation"
            >
              <IconPlus className="w-5 h-5" />
            </button>

            {/* Logout */}
            <button
              onClick={() => {
                dispatch(clearUserData());
                navigate("/login");
              }}
              className="p-2 text-gray-500 hover:text-red-400 rounded-xl hover:bg-red-500/10 transition"
              title="Logout"
            >
              <IconLogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Current User Quick Info Card */}
        <div className="px-4 py-3 mx-3 my-2 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center gap-3">
          <div className="relative">
            <img
              src={userData?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${userData?.username || "me"}`}
              alt={userData?.username}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-violet-500/40"
            />
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#10141f] rounded-full"></span>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-sm text-white truncate">{userData?.name || userData?.username}</h4>
            <p className="text-[11px] text-gray-400 truncate">@{userData?.username} • Active now</p>
          </div>
        </div>

        {/* Search Input Filter */}
        <div className="px-3 py-2">
          <div className="relative">
            <IconSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/5 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 transition"
            />
          </div>
        </div>

        {/* Chats List */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1">
          {chats
            .filter((c) => {
              if (!searchFilter.trim()) return true;
              const partner = getChatPartner(c);
              const q = searchFilter.toLowerCase();
              return (
                partner.username?.toLowerCase().includes(q) ||
                partner.name?.toLowerCase().includes(q) ||
                c.lastMessage?.toLowerCase().includes(q)
              );
            })
            .map((chat) => {
              const partner = getChatPartner(chat);
              const isSelected = selectedChat?._id === chat._id;
              const isOnline = chat.isAIChat ? true : onlineUsers.has(partner._id);

              return (
                <div
                  key={chat._id}
                  onClick={() => setSelectedChat(chat)}
                  className={`group relative p-3 rounded-2xl cursor-pointer transition-all flex items-center gap-3.5 ${
                    isSelected
                      ? "bg-gradient-to-r from-violet-600/90 to-fuchsia-600/80 shadow-lg shadow-violet-600/20 text-white"
                      : "hover:bg-white/5 text-gray-200"
                  }`}
                >
                  {/* Avatar with Status Ring */}
                  <div className="relative flex-shrink-0">
                    <img
                      src={
                        partner.avatar ||
                        `https://api.dicebear.com/7.x/bottts/svg?seed=${partner.username || "user"}`
                      }
                      alt={partner.username}
                      className="w-12 h-12 rounded-full object-cover border border-white/10"
                    />
                    {isOnline && (
                      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#10141f] rounded-full shadow-sm"></span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-semibold text-sm truncate">
                          {partner.name || partner.username}
                        </span>
                        {chat.isAIChat && (
                          <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 bg-cyan-500/20 text-cyan-300 rounded border border-cyan-500/30">
                            <IconSparkles className="w-2.5 h-2.5" /> AI
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {chat.lastMessageAt
                          ? new Date(chat.lastMessageAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </span>
                    </div>

                    <p className={`text-xs truncate ${isSelected ? "text-violet-100" : "text-gray-400"}`}>
                      {chat.lastMessage || "No messages yet"}
                    </p>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* RIGHT MAIN AREA: Chat Conversation Screen */}
      {/* ======================================================== */}
      <div
        className={`flex-1 flex flex-col bg-[#0b0e15] h-full ${
          !selectedChat ? "hidden md:flex" : "flex"
        } relative`}
      >
        {selectedChat ? (
          <>
            {/* Chat Top Header Bar */}
            <div className="p-3.5 md:p-4 bg-[#111622]/80 border-b border-white/10 backdrop-blur-md flex items-center justify-between z-20">
              <div className="flex items-center gap-3">
                {/* Back button for mobile */}
                <button
                  onClick={() => setSelectedChat(null)}
                  className="md:hidden p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition"
                >
                  ←
                </button>

                <div className="relative">
                  <img
                    src={
                      currentPartner?.avatar ||
                      `https://api.dicebear.com/7.x/bottts/svg?seed=${currentPartner?.username || "user"}`
                    }
                    alt={currentPartner?.username}
                    className="w-11 h-11 rounded-full object-cover border border-white/10"
                  />
                  {isPartnerOnline && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#111622] rounded-full"></span>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm md:text-base text-white truncate">
                      {currentPartner?.name || currentPartner?.username}
                    </h3>
                    {selectedChat.isAIChat && (
                      <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full font-bold border border-cyan-500/30">
                        Neural Bot
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400 truncate">
                    {remoteTypingUser ? (
                      <span className="text-violet-400 font-medium animate-pulse">
                        ✍️ {remoteTypingUser} is typing...
                      </span>
                    ) : isPartnerOnline ? (
                      <span className="text-emerald-400 font-medium">● Online</span>
                    ) : (
                      "Offline"
                    )}
                  </p>
                </div>
              </div>

              {/* Calling and Action Buttons */}
              <div className="flex items-center gap-2">
                {!selectedChat.isAIChat && (
                  <>
                    <button
                      onClick={() => startCall("audio")}
                      className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition shadow-sm"
                      title="Audio Call"
                    >
                      <IconPhone className="w-5 h-5" />
                    </button>

                    <button
                      onClick={() => startCall("video")}
                      className="p-2.5 rounded-xl bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 border border-violet-500/20 transition shadow-sm"
                      title="Video Call"
                    >
                      <IconVideo className="w-5 h-5" />
                    </button>

                    <button
                      onClick={handleDeleteChat}
                      className="p-2.5 rounded-xl bg-white/5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition"
                      title="Delete Conversation"
                    >
                      <IconTrash className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
              {selectedChat.messages?.map((msg, idx) => {
                const isSender = msg.sender === userData.username;
                const isSystem = msg.system || msg.mediaType === "system" || msg.sender === "System";

                if (isSystem) {
                  return (
                    <div key={msg._id || idx} className="flex justify-center my-3 w-full">
                      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.06] border border-white/10 text-xs text-gray-300 font-medium shadow-sm backdrop-blur-sm">
                        <span>{msg.text}</span>
                        <span className="text-[10px] text-gray-500 font-mono">
                          {msg.createdAt
                            ? new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </span>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg._id || idx}
                    className={`flex flex-col ${isSender ? "items-end" : "items-start"} group relative`}
                  >
                    <div
                      className={`relative max-w-[85%] md:max-w-[70%] rounded-2xl p-3 px-4 shadow-md transition-all ${
                        isSender
                          ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-br-sm"
                          : "bg-[#161c28] border border-white/10 text-gray-200 rounded-bl-sm"
                      }`}
                    >
                      {/* Sender label in group/AI mode */}
                      {!isSender && (
                        <p className="text-[11px] font-bold text-violet-400 mb-1">
                          {msg.sender}
                        </p>
                      )}

                      {/* Image Attachment */}
                      {msg.mediaType === "image" && msg.mediaUrl && (
                        <div className="my-1 rounded-xl overflow-hidden cursor-pointer">
                          <img
                            src={getMediaUrl(msg.mediaUrl)}
                            alt="Attached"
                            onClick={() => setPreviewImage(getMediaUrl(msg.mediaUrl))}
                            className="max-h-72 w-full object-cover rounded-xl hover:opacity-95 transition"
                          />
                        </div>
                      )}

                      {/* Voice Note Attachment */}
                      {msg.mediaType === "audio" && msg.mediaUrl && (
                        <AudioMessage audioUrl={getMediaUrl(msg.mediaUrl)} isSender={isSender} />
                      )}

                      {/* Generic File Attachment */}
                      {msg.mediaType === "file" && msg.mediaUrl && (
                        <a
                          href={getMediaUrl(msg.mediaUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-3 p-2 my-1 rounded-xl bg-black/20 hover:bg-black/30 transition text-xs"
                        >
                          <IconPaperclip className="w-5 h-5 text-violet-300" />
                          <div className="flex-1 truncate">
                            <p className="font-semibold truncate">{msg.fileName || msg.text || "File"}</p>
                            <span className="text-[10px] text-gray-400">{msg.fileSize || "Attachment"}</span>
                          </div>
                        </a>
                      )}

                      {/* Text Content */}
                      {msg.text && msg.mediaType !== "audio" && (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                          {msg.text}
                        </p>
                      )}

                      {/* Message Metadata (Time & Delivery Status) */}
                      <div className="flex items-center justify-end gap-1.5 mt-1.5 text-[10px] opacity-75">
                        <span>
                          {msg.createdAt
                            ? new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </span>
                        {isSender && (
                          <span title="Delivered">
                            <IconCheckDouble className="w-3.5 h-3.5 text-cyan-300" />
                          </span>
                        )}
                      </div>

                      {/* Reactions Display */}
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {Array.from(new Set(msg.reactions.map((r) => r.emoji))).map((emoji, rIdx) => {
                            const count = msg.reactions.filter((r) => r.emoji === emoji).length;
                            return (
                              <button
                                key={rIdx}
                                onClick={() => handleReaction(msg._id, emoji)}
                                className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-black/30 border border-white/10 hover:bg-black/50 transition"
                              >
                                <span>{emoji}</span>
                                <span className="font-mono text-[10px] font-bold">{count}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Quick Reaction Hover Bar */}
                    {!selectedChat.isAIChat && (
                      <div
                        className={`absolute -top-7 ${
                          isSender ? "right-2" : "left-2"
                        } hidden group-hover:flex items-center gap-1 bg-[#1c2230] border border-white/10 rounded-full px-2 py-1 shadow-xl z-20`}
                      >
                        {["❤️", "👍", "😂", "🔥", "😮", "👏"].map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => handleReaction(msg._id, emoji)}
                            className="hover:scale-125 transition transform px-1 text-sm"
                          >
                            {emoji}
                          </button>
                        ))}
                        {isSender && (
                          <button
                            onClick={() => handleDeleteMessage(msg._id)}
                            className="ml-1 text-gray-400 hover:text-red-400 transition"
                            title="Delete"
                          >
                            <IconTrash className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              <div ref={messagesEndRef} />
            </div>

            {/* Chat Bottom Input Bar */}
            <div className="relative p-3 md:p-4 bg-[#111622]/90 border-t border-white/10 backdrop-blur-md">
              {/* Emoji Picker Popover */}
              {showEmojiPicker && (
                <EmojiPicker
                  onSelectEmoji={(emoji) => {
                    setMessageText((prev) => prev + emoji);
                    setShowEmojiPicker(false);
                  }}
                  onClose={() => setShowEmojiPicker(false)}
                />
              )}

              {/* Voice Recorder Mode */}
              {isRecordingVoice ? (
                <VoiceRecorder
                  onRecordingComplete={handleVoiceRecordingComplete}
                  onCancel={() => setIsRecordingVoice(false)}
                />
              ) : (
                <div className="flex items-center gap-2">
                  {/* Emoji toggle */}
                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition"
                    title="Emojis"
                  >
                    <IconSmile className="w-5 h-5" />
                  </button>

                  {/* Attachment toggle (hidden file input) */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition"
                    title="Send Photo or Document"
                  >
                    <IconPaperclip className="w-5 h-5" />
                  </button>

                  {/* Text Input */}
                  <input
                    type="text"
                    value={messageText}
                    onChange={handleInputChange}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                    placeholder={
                      selectedChat.isAIChat
                        ? "Ask Pulse AI anything..."
                        : "Type your message..."
                    }
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition"
                  />

                  {/* Mic / Voice Recording Button */}
                  {!messageText.trim() ? (
                    <button
                      onClick={() => setIsRecordingVoice(true)}
                      className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition"
                      title="Record Voice Note"
                    >
                      <IconMic className="w-5 h-5" />
                    </button>
                  ) : (
                    /* Send Button */
                    <button
                      onClick={handleSendMessage}
                      className="p-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-lg shadow-violet-600/30 transition transform hover:scale-105 active:scale-95"
                      title="Send"
                    >
                      <IconSend className="w-5 h-5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          /* Empty Chat State */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center z-10">
            <Logo size="xl" showTag={false} className="mb-6 opacity-80" />
            <h3 className="text-2xl font-bold text-white mb-2">
              Select or Start a Conversation
            </h3>
            <p className="text-gray-400 text-sm max-w-sm mb-6">
              Connect in real-time with colleagues & friends via HD voice, video, rich media, and neural AI assistance.
            </p>
            <button
              onClick={() => setShowNewChatModal(true)}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold text-sm shadow-xl shadow-violet-600/30 hover:scale-105 transition"
            >
              + Start New Chat
            </button>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 3. WEBRTC AUDIO & VIDEO CALL MODAL */}
      {/* ======================================================== */}
      <CallModal
        callState={callState}
        callType={callType}
        peerUser={currentPartner}
        callerInfo={callerInfo}
        incomingOffer={incomingOffer}
        socket={socketRef.current}
        currentUser={userData}
        onEndCall={handleCallEnded}
        onCallAccepted={() => {
          setCallState("in-call");
        }}
      />

      {/* ======================================================== */}
      {/* 4. NEW CHAT SEARCH MODAL */}
      {/* ======================================================== */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#131824] border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <h3 className="text-lg font-bold text-white">Start New Conversation</h3>
              <button
                onClick={() => setShowNewChatModal(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                <IconClose className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative mb-4">
              <IconSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search by username or name..."
                value={searchFilter}
                onChange={(e) => handleUserSearch(e.target.value)}
                autoFocus
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition"
              />
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {isSearchingUsers ? (
                <div className="text-center py-8 text-gray-500 text-sm">Searching...</div>
              ) : userSearchResults.length > 0 ? (
                userSearchResults.map((user) => (
                  <div
                    key={user._id}
                    onClick={() => handleStartChatWithUser(user)}
                    className="p-3 rounded-2xl hover:bg-violet-600/30 border border-transparent hover:border-violet-500/30 flex items-center gap-3.5 cursor-pointer transition"
                  >
                    <img
                      src={user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
                      alt={user.username}
                      className="w-11 h-11 rounded-full object-cover border border-white/10"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-white truncate">{user.name || user.username}</h4>
                      <p className="text-xs text-gray-400 truncate">@{user.username}</p>
                    </div>
                    <span className="text-xs text-violet-400 font-semibold px-2 py-1 rounded-lg bg-violet-500/10">
                      Chat →
                    </span>
                  </div>
                ))
              ) : searchFilter.trim() ? (
                <div className="text-center py-8 text-gray-500 text-sm">No users found.</div>
              ) : (
                <div className="text-center py-8 text-gray-500 text-xs">
                  Type a username or email to search registered users.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. IMAGE LIGHTBOX MODAL */}
      {/* ======================================================== */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-[250] bg-black/95 flex items-center justify-center p-4 cursor-pointer"
        >
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-6 right-6 text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition"
          >
            <IconClose className="w-6 h-6" />
          </button>
          <img
            src={previewImage}
            alt="Preview"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
