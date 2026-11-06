import React, { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import { clearUserData, setUserData } from "../redux/userSlice";
import io from "socket.io-client";
import axios from "axios";
import { serverUrl } from "../main";
import Logo from "../components/Logo";
import CallModal from "../components/CallModal";
import UserProfileModal from "../components/UserProfileModal";
import MyProfileModal from "../components/MyProfileModal";
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
  IconCheckDouble,
  IconVolume2,
  IconVolumeX,
  IconClose,
  IconSparkles,
  IconInfo,
  IconMaximize,
  IconCopy,
  IconBan,
  IconCamera,
} from "../components/Icons";
import { sounds } from "../utils/soundEffects";
import { PULSE_AI_USER, generateAIResponse } from "../utils/aiBot";

// Helper for relative time formatting (e.g., "just now", "2m ago", "1h ago", "yesterday")
function formatRelativeTime(dateInput) {
  if (!dateInput) return "";
  const date = new Date(dateInput);
  const now = new Date();
  const diffMs = now - date;
  if (diffMs < 0) return "just now";
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins === 1) return "1m ago";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours === 1) return "1h ago";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

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

  // Blocked users set for instant reactive updates
  const [blockedUserIds, setBlockedUserIds] = useState(new Set());

  // Modals & UI states
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showMyProfileModal, setShowMyProfileModal] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isMutedSounds, setIsMutedSounds] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [activeReactionMsgId, setActiveReactionMsgId] = useState(null);
  const [copiedMsgId, setCopiedMsgId] = useState(null);

  // WebRTC Calling State
  const [callState, setCallState] = useState("idle"); // 'idle' | 'outgoing' | 'incoming' | 'in-call'
  const [callType, setCallType] = useState("video"); // 'audio' | 'video'
  const [callerInfo, setCallerInfo] = useState(null);
  const [incomingOffer, setIncomingOffer] = useState(null);
  const [isCallMinimized, setIsCallMinimized] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

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

  // Sync blocked user ids whenever userData changes
  useEffect(() => {
    if (userData?.blockedUsers && Array.isArray(userData.blockedUsers)) {
      setBlockedUserIds(new Set(userData.blockedUsers.map((b) => String(b?._id || b))));
    }
  }, [userData?.blockedUsers]);

  // Fetch fresh current user profile on mount
  useEffect(() => {
    if (userData?._id) {
      axios
        .get(`${serverUrl}/api/user/current`)
        .then((res) => {
          if (res.data?.user) {
            dispatch(setUserData(res.data.user));
          }
        })
        .catch(() => {});
    }
  }, [userData?._id, dispatch]);

  // Sound toggle helper
  const toggleSoundMute = () => {
    const next = !isMutedSounds;
    setIsMutedSounds(next);
    sounds.setMuted(next);
  };

  // Format call duration helper MM:SS
  const formatCallDuration = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${rem.toString().padStart(2, "0")}`;
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
      console.log("[SOCKET] Connected to PulseChat Gateway 🚀 Socket ID:", socket.id);
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

    socket.on("user-status-changed", ({ userId, isOnline, lastSeen }) => {
      const uStr = String(userId);
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (isOnline) next.add(uStr);
        else next.delete(uStr);
        return next;
      });

      // Update lastSeen in chat contacts
      setChats((prev) =>
        prev.map((c) => ({
          ...c,
          members: c.members?.map((m) =>
            String(m?._id || m) === uStr ? { ...m, isOnline, lastSeen: lastSeen || new Date() } : m
          ),
        }))
      );
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

    // Realtime Read Receipts / Seen status
    socket.on("messages-seen-updated", ({ roomId, userId, seenAt }) => {
      const updateSeen = (msgs) =>
        msgs?.map((m) => {
          if (m.sender === userData.username || (m.senderId && String(m.senderId) !== String(userId))) {
            return { ...m, seen: true, seenAt: seenAt || m.seenAt || new Date() };
          }
          return m;
        });

      setSelectedChat((prev) =>
        prev && String(prev._id) === String(roomId) ? { ...prev, messages: updateSeen(prev.messages) } : prev
      );

      setChats((prev) =>
        prev.map((c) => (String(c._id) === String(roomId) ? { ...c, messages: updateSeen(c.messages) } : c))
      );
    });

    // Realtime Chat Cleared
    socket.on("chat-cleared", ({ roomId }) => {
      setSelectedChat((prev) =>
        prev && String(prev._id) === String(roomId) ? { ...prev, messages: [] } : prev
      );
      setChats((prev) =>
        prev.map((c) => (String(c._id) === String(roomId) ? { ...c, messages: [], lastMessage: "Chat cleared" } : c))
      );
    });

    // Realtime Block Status changed
    socket.on("blocked-status-changed", ({ blockerId, isBlocked }) => {
      console.log("[SOCKET] Block status updated by:", blockerId, isBlocked);
    });

    // Realtime New Chat Alert
    socket.on("new-chat-received", (newChat) => {
      console.log("[SOCKET] New chat received:", newChat);
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
      console.log("[SOCKET] Incoming call from:", from, "Type:", cType);
      setCallerInfo(from);
      setIncomingOffer(offer);
      setCallType(cType || "video");
      setIsCallMinimized(false);
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

      const aiChat = {
        _id: "pulse_ai_chat_special",
        isAIChat: true,
        members: [userData, PULSE_AI_USER],
        messages: [
          {
            _id: "ai_intro_1",
            sender: "Pulse AI",
            text: "Welcome to PulseChat! 🚀 I'm Pulse AI, your intelligent neural companion. You can chat with me, or make high-definition voice and video calls with friends!",
            createdAt: new Date(),
          },
        ],
        lastMessage: "⚡ Pulse AI is online and ready to assist you.",
        lastMessageAt: new Date(),
      };

      const combined = [aiChat, ...fetched];
      setChats(combined);

      if (socketRef.current) {
        fetched.forEach((c) => socketRef.current.emit("join-room", c._id));
      }
    } catch (err) {
      console.error("Fetch chats error:", err);
    }
  };

  // Join selected chat room & Mark Messages as Seen
  useEffect(() => {
    if (selectedChat?._id && socketRef.current && !selectedChat.isAIChat) {
      socketRef.current.emit("join-room", selectedChat._id);
    }
    setRemoteTypingUser(null);
  }, [selectedChat?._id]);

  // Mark unseen messages in active chat as seen
  useEffect(() => {
    if (!selectedChat?._id || selectedChat.isAIChat || !userData?._id) return;

    const partner = getChatPartner(selectedChat);
    const hasUnseen = selectedChat.messages?.some(
      (m) => m.sender !== userData.username && !m.seen
    );

    if (hasUnseen) {
      socketRef.current?.emit("mark-as-seen", {
        roomId: selectedChat._id,
        userId: userData._id,
        senderId: partner?._id,
      });

      axios
        .post(`${serverUrl}/api/chat/${selectedChat._id}/seen`, {
          userId: userData._id,
        })
        .catch(() => {});

      const now = new Date();
      setSelectedChat((prev) => {
        if (!prev || String(prev._id) !== String(selectedChat._id)) return prev;
        return {
          ...prev,
          messages: prev.messages?.map((m) =>
            m.sender !== userData.username ? { ...m, seen: true, seenAt: now } : m
          ),
        };
      });

      setChats((prev) =>
        prev.map((c) => {
          if (String(c._id) !== String(selectedChat._id)) return c;
          return {
            ...c,
            messages: c.messages?.map((m) =>
              m.sender !== userData.username ? { ...m, seen: true, seenAt: now } : m
            ),
          };
        })
      );
    }
  }, [selectedChat?._id, selectedChat?.messages?.length, userData?._id]);

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

  const currentPartner = selectedChat ? getChatPartner(selectedChat) : null;
  const isPartnerOnline = currentPartner
    ? currentPartner._id === PULSE_AI_USER._id
      ? true
      : onlineUsers.has(String(currentPartner._id))
    : false;

  // Block status check
  const isContactBlockedByMe = currentPartner?._id
    ? blockedUserIds.has(String(currentPartner._id))
    : false;

  // 2. Block / Unblock Contact (instant zero-lag optimistic feedback)
  const handleToggleBlockContact = async () => {
    if (!currentPartner?._id || selectedChat?.isAIChat) return;

    const targetId = String(currentPartner._id);
    const currentlyBlocked = blockedUserIds.has(targetId);
    const willBlock = !currentlyBlocked;

    const confirmPrompt = willBlock
      ? `Are you sure you want to block ${currentPartner.name || currentPartner.username}? They won't be able to message or call you.`
      : `Unblock ${currentPartner.name || currentPartner.username}?`;

    if (!window.confirm(confirmPrompt)) return;

    // Instant optimistic update
    setBlockedUserIds((prev) => {
      const next = new Set(prev);
      if (willBlock) next.add(targetId);
      else next.delete(targetId);
      return next;
    });

    try {
      const res = await axios.post(`${serverUrl}/api/user/block`, {
        targetUserId: targetId,
      });

      if (res.data?.user) {
        dispatch(setUserData(res.data.user));
      }

      socketRef.current?.emit("user-blocked-status", {
        blockerId: userData._id,
        targetId: targetId,
        isBlocked: willBlock,
      });
    } catch (err) {
      console.error("Block user error:", err);
      // Revert state on error
      setBlockedUserIds((prev) => {
        const next = new Set(prev);
        if (currentlyBlocked) next.add(targetId);
        else next.delete(targetId);
        return next;
      });
      alert("Could not update block status. Please try again.");
    }
  };

  // 3. Clear Chat History
  const handleClearChatHistory = async () => {
    if (!selectedChat?._id || selectedChat.isAIChat) return;
    try {
      await axios.post(`${serverUrl}/api/chat/${selectedChat._id}/clear`);
      setSelectedChat((prev) => ({ ...prev, messages: [] }));
      setChats((prev) =>
        prev.map((c) => (c._id === selectedChat._id ? { ...c, messages: [], lastMessage: "Chat cleared" } : c))
      );
      socketRef.current?.emit("clear-chat", { roomId: selectedChat._id });
    } catch (err) {
      console.error("Clear chat error:", err);
    }
  };

  // 4. Sending Messages
  const handleSendMessage = async () => {
    const text = messageText.trim();
    if (!text || !selectedChat) return;

    if (isContactBlockedByMe) {
      alert("Please unblock this contact before sending a message.");
      return;
    }

    setMessageText("");
    stopTyping();

    // Pulse AI Assistant Chat
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
        recipientId: currentPartner?._id,
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
      if (err.response?.status === 403) {
        alert(err.response?.data?.error || "Cannot send message. You may be blocked.");
      }
    }
  };

  // 5. Media Upload (Photos, Audio, Files)
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedChat) return;

    if (isContactBlockedByMe) {
      alert("Please unblock this contact before sending media.");
      return;
    }

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
        recipientId: currentPartner?._id,
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

  // 6. Voice Recording Completed
  const handleVoiceRecordingComplete = async (audioBlob, durationSec) => {
    setIsRecordingVoice(false);
    if (!audioBlob || !selectedChat) return;

    if (isContactBlockedByMe) {
      alert("Please unblock this contact before sending voice notes.");
      return;
    }

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
        recipientId: currentPartner?._id,
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

  // 7. Typing Indicators Handling
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

  // 8. Reactions
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

  // 9. Delete Message
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

  // 10. Delete Chat
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

  // 11. Start Calling (WebRTC)
  const startCall = (type) => {
    if (!selectedChat || selectedChat.isAIChat) {
      alert("Calls are available with registered contacts!");
      return;
    }
    if (isContactBlockedByMe) {
      alert("Unblock contact to start voice/video calls.");
      return;
    }
    const partner = getChatPartner(selectedChat);
    if (!partner?._id) return;

    setCallType(type);
    setCallerInfo(null);
    setIsCallMinimized(false);
    setCallState("outgoing");
  };

  // WhatsApp-style Call Status Notification Generator
  const handleCallEnded = async (callData = {}) => {
    const duration = typeof callData === "object" ? callData.duration || 0 : 0;
    const cType = typeof callData === "object" && callData.callType ? callData.callType : callType;
    const status = typeof callData === "object" && callData.status ? callData.status : "completed";

    setCallState("idle");
    setCallerInfo(null);
    setIncomingOffer(null);
    setIsCallMinimized(false);
    setCallDuration(0);

    if (!selectedChat || selectedChat.isAIChat) return;

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

  // 12. User Search & New Chat
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

  const getMediaUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:") || url.startsWith("blob:")) {
      return url;
    }
    return `${serverUrl}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  return (
    <div className="fixed inset-0 flex h-[100dvh] w-full bg-[#070a12] text-white overflow-hidden font-sans select-none">
      {/* Dynamic Ambient Background Glows */}
      <div className="absolute top-0 -left-48 w-[500px] h-[500px] bg-violet-600/15 rounded-full blur-[160px] pointer-events-none"></div>
      <div className="absolute bottom-0 -right-48 w-[500px] h-[500px] bg-cyan-600/15 rounded-full blur-[160px] pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/3 w-[300px] h-[300px] bg-fuchsia-600/10 rounded-full blur-[140px] pointer-events-none"></div>

      {/* ======================================================== */}
      {/* LEFT SIDEBAR: Brand, User Profile, Chat List */}
      {/* ======================================================== */}
      <div
        className={`w-full md:w-[380px] lg:w-[420px] border-r border-white/[0.08] flex flex-col bg-[#0d111d]/90 backdrop-blur-2xl ${
          selectedChat ? "hidden md:flex" : "flex"
        } h-full z-10 transition-all shadow-[10px_0_30px_rgba(0,0,0,0.4)]`}
      >
        {/* Header: Logo & User Quick Actions */}
        <div className="p-4 border-b border-white/[0.08] flex items-center justify-between flex-shrink-0">
          <Logo size="md" />

          <div className="flex items-center gap-1.5">
            {/* Sound toggle */}
            <button
              onClick={toggleSoundMute}
              className={`p-2.5 rounded-xl transition ${
                isMutedSounds
                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                  : "bg-white/[0.04] text-gray-400 hover:text-white hover:bg-white/[0.08] border border-white/[0.06]"
              }`}
              title={isMutedSounds ? "Unmute sounds" : "Mute sounds"}
            >
              {isMutedSounds ? <IconVolumeX className="w-4 h-4" /> : <IconVolume2 className="w-4 h-4" />}
            </button>

            {/* Edit My Profile Button */}
            <button
              onClick={() => setShowMyProfileModal(true)}
              className="p-2.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-gray-300 hover:text-white rounded-xl transition"
              title="Edit Profile & Picture"
            >
              <IconUser className="w-4 h-4" />
            </button>

            {/* New Chat Button */}
            <button
              onClick={() => setShowNewChatModal(true)}
              className="p-2.5 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-500 hover:opacity-95 text-white rounded-xl transition shadow-lg shadow-violet-600/30 transform hover:scale-105 active:scale-95"
              title="Start New Conversation"
            >
              <IconPlus className="w-4 h-4 stroke-[2.5]" />
            </button>

            {/* Logout */}
            <button
              onClick={() => {
                dispatch(clearUserData());
                navigate("/login");
              }}
              className="p-2.5 text-gray-500 hover:text-red-400 rounded-xl hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition"
              title="Logout"
            >
              <IconLogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Current User Quick Info Card (Click to edit picture) */}
        <div
          onClick={() => setShowMyProfileModal(true)}
          className="px-4 py-3 mx-3.5 my-2.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] flex items-center justify-between shadow-sm cursor-pointer group transition"
          title="Click to edit profile & change picture"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative flex-shrink-0">
              <img
                src={userData?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${userData?.username || "me"}`}
                alt={userData?.username}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-violet-500/50 group-hover:ring-violet-400 group-hover:scale-105 transition"
              />
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#0d111d] rounded-full shadow-sm"></span>
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-sm text-white truncate leading-tight group-hover:text-violet-300 transition">
                {userData?.name || userData?.username}
              </h4>
              <p className="text-[11px] text-emerald-400 font-medium truncate flex items-center gap-1">
                <span>● Active</span>
                <span className="text-gray-500">•</span>
                <span className="text-gray-400 truncate">Change picture ↗</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <span className="p-1.5 rounded-lg bg-white/5 group-hover:bg-violet-600/20 text-gray-400 group-hover:text-violet-300 transition">
              <IconCamera className="w-4 h-4" />
            </span>
          </div>
        </div>

        {/* Search Input Filter */}
        <div className="px-3.5 py-1.5">
          <div className="relative">
            <IconSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search chats, contacts, messages..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/60 focus:bg-white/[0.07] transition"
            />
          </div>
        </div>

        {/* Chats List Header */}
        <div className="px-4 pt-3 pb-1 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-gray-400">
          <span>Conversations</span>
          <span className="text-violet-400 font-mono font-semibold">{chats.length}</span>
        </div>

        {/* Chats List */}
        <div className="flex-1 overflow-y-auto px-2.5 py-1 space-y-1">
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
              const isOnline = chat.isAIChat ? true : onlineUsers.has(String(partner._id));

              // Compute unread message count
              const unreadCount = !chat.isAIChat
                ? chat.messages?.filter((m) => m.sender !== userData?.username && !m.seen).length || 0
                : 0;

              return (
                <div
                  key={chat._id}
                  onClick={() => setSelectedChat(chat)}
                  className={`group relative p-3 rounded-2xl cursor-pointer transition-all flex items-center gap-3.5 border ${
                    isSelected
                      ? "bg-gradient-to-r from-violet-600/90 via-violet-700/90 to-indigo-700/90 text-white shadow-[0_6px_20px_rgba(124,58,237,0.3)] border-violet-400/30"
                      : "hover:bg-white/[0.04] text-gray-200 border-transparent hover:border-white/[0.06]"
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
                      className="w-12 h-12 rounded-full object-cover border border-white/10 group-hover:scale-105 transition"
                    />
                    {isOnline && (
                      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#0d111d] rounded-full shadow-sm"></span>
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

                    <div className="flex items-center justify-between">
                      <p className={`text-xs truncate ${isSelected ? "text-violet-100 font-medium" : "text-gray-400"}`}>
                        {chat.lastMessage || "No messages yet"}
                      </p>

                      {/* Unread message count badge */}
                      {unreadCount > 0 && !isSelected && (
                        <span className="ml-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 text-black text-[10px] font-black shadow-md shadow-cyan-500/30 animate-pulse flex-shrink-0">
                          {unreadCount}
                        </span>
                      )}
                    </div>
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
        className={`flex-1 flex flex-col bg-[#070a12] h-full ${
          !selectedChat ? "hidden md:flex" : "flex"
        } relative overflow-hidden`}
      >
        {selectedChat ? (
          <>
            {/* Chat Top Header Bar */}
            <div className="p-3.5 md:p-4 bg-[#0e1322]/90 border-b border-white/[0.08] backdrop-blur-xl flex items-center justify-between z-20 shadow-md">
              {/* Partner Info (Click to open profile modal) */}
              <div
                onClick={() => {
                  if (!selectedChat.isAIChat) setShowProfileModal(true);
                }}
                className={`flex items-center gap-3.5 min-w-0 ${
                  !selectedChat.isAIChat ? "cursor-pointer group" : ""
                }`}
                title={!selectedChat.isAIChat ? "Click to view profile & media" : "Pulse AI Assistant"}
              >
                {/* Mobile back arrow */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedChat(null);
                  }}
                  className="md:hidden p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition -ml-1"
                >
                  ←
                </button>

                <div className="relative flex-shrink-0">
                  <img
                    src={
                      currentPartner?.avatar ||
                      `https://api.dicebear.com/7.x/bottts/svg?seed=${currentPartner?.username || "user"}`
                    }
                    alt={currentPartner?.username}
                    className="w-11 h-11 rounded-full object-cover border-2 border-violet-500/30 group-hover:border-violet-400 transition"
                  />
                  {isPartnerOnline ? (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#0e1322] rounded-full animate-pulse"></span>
                  ) : (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-gray-600 border-2 border-[#0e1322] rounded-full"></span>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm md:text-base text-white truncate group-hover:text-violet-300 transition flex items-center gap-1.5">
                      <span>{currentPartner?.name || currentPartner?.username}</span>
                      {isContactBlockedByMe && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-bold border border-red-500/30">
                          Blocked
                        </span>
                      )}
                      {!selectedChat.isAIChat && (
                        <span className="text-[10px] text-gray-500 group-hover:text-violet-400 transition">
                          ↗
                        </span>
                      )}
                    </h3>
                    {selectedChat.isAIChat && (
                      <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full font-bold border border-cyan-500/30">
                        Neural Bot
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400 truncate">
                    {remoteTypingUser ? (
                      <span className="text-violet-400 font-semibold animate-pulse">
                        ✍️ {remoteTypingUser} is typing...
                      </span>
                    ) : isPartnerOnline ? (
                      <span className="text-emerald-400 font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        Active Now
                      </span>
                    ) : (
                      <span className="text-gray-400">
                        Last seen {formatRelativeTime(currentPartner?.lastSeen)}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Header Action Buttons */}
              <div className="flex items-center gap-2">
                {!selectedChat.isAIChat && (
                  <>
                    <button
                      disabled={isContactBlockedByMe}
                      onClick={() => startCall("audio")}
                      className={`p-2.5 rounded-xl border transition shadow-sm ${
                        isContactBlockedByMe
                          ? "bg-white/[0.02] text-gray-600 border-white/5 cursor-not-allowed"
                          : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20 hover:scale-105 active:scale-95"
                      }`}
                      title={isContactBlockedByMe ? "Unblock contact to call" : "Start Voice Call"}
                    >
                      <IconPhone className="w-4 h-4" />
                    </button>

                    <button
                      disabled={isContactBlockedByMe}
                      onClick={() => startCall("video")}
                      className={`p-2.5 rounded-xl border transition shadow-sm ${
                        isContactBlockedByMe
                          ? "bg-white/[0.02] text-gray-600 border-white/5 cursor-not-allowed"
                          : "bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 border-violet-500/20 hover:scale-105 active:scale-95"
                      }`}
                      title={isContactBlockedByMe ? "Unblock contact to call" : "Start Video Call"}
                    >
                      <IconVideo className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setShowProfileModal(true)}
                      className="p-2.5 rounded-xl bg-white/[0.05] text-gray-300 hover:text-white hover:bg-white/10 border border-white/[0.08] transition shadow-sm"
                      title="Contact Profile & Shared Media"
                    >
                      <IconInfo className="w-4 h-4" />
                    </button>

                    <button
                      onClick={handleDeleteChat}
                      className="p-2.5 rounded-xl bg-white/[0.04] text-gray-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition"
                      title="Delete Conversation"
                    >
                      <IconTrash className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* BLOCKED CONTACT WARNING BANNER WITH INSTANT UNBLOCK */}
            {isContactBlockedByMe && (
              <div className="bg-red-500/20 border-b border-red-500/35 px-4 py-2.5 flex items-center justify-between text-xs text-red-200 z-20 backdrop-blur-md animate-fade-in shadow-md">
                <div className="flex items-center gap-2 min-w-0">
                  <IconBan className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span className="truncate">You have blocked this contact. They cannot message or call you.</span>
                </div>
                <button
                  onClick={handleToggleBlockContact}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs transition shadow-md hover:scale-105 active:scale-95 flex-shrink-0 ml-2"
                >
                  Unblock Contact
                </button>
              </div>
            )}

            {/* LIVE ACTIVE CALL BANNER (Appears when call is minimized or ongoing) */}
            {(callState === "in-call" || callState === "outgoing") && (
              <div
                onClick={() => setIsCallMinimized(false)}
                className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 px-4 py-2.5 flex items-center justify-between cursor-pointer hover:brightness-110 transition shadow-lg text-white select-none z-20"
              >
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-85"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                  </span>
                  <span className="text-xs font-bold tracking-wide">
                    {callState === "in-call" ? `CALL WITH ${currentPartner?.name || currentPartner?.username}` : "CALLING..."}
                  </span>
                  <span className="text-xs text-white font-mono font-bold">
                    ({formatCallDuration(callDuration)})
                  </span>
                  <span className="text-[11px] text-white/90 hidden sm:inline">
                    • Tap anywhere to return to calling screen ↗
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition shadow-sm">
                  <span>Return to Call</span>
                  <IconMaximize className="w-3.5 h-3.5" />
                </div>
              </div>
            )}

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
              {selectedChat.messages?.map((msg, idx) => {
                const isSender = msg.sender === userData.username;
                const isSystem = msg.system || msg.mediaType === "system" || msg.sender === "System";

                // WhatsApp-Style Call Notification Message
                if (isSystem) {
                  return (
                    <div key={msg._id || idx} className="flex justify-center my-3 w-full">
                      <div
                        onClick={() => {
                          if (callState === "in-call" || callState === "outgoing") {
                            setIsCallMinimized(false);
                          }
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] border border-white/10 text-xs text-gray-200 font-medium shadow-sm backdrop-blur-md hover:bg-white/[0.1] transition cursor-pointer select-none"
                      >
                        <span>{msg.text}</span>
                        <span className="text-[10px] text-gray-400 font-mono">
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
                      className={`relative max-w-[85%] md:max-w-[70%] rounded-2xl p-3.5 px-4 shadow-[0_4px_16px_rgba(0,0,0,0.25)] transition-all ${
                        isSender
                          ? "bg-gradient-to-br from-violet-600 via-violet-700 to-indigo-700 text-white rounded-br-xs shadow-violet-900/20"
                          : "bg-[#121828]/95 border border-white/[0.08] text-gray-100 rounded-bl-xs backdrop-blur-md"
                      }`}
                    >
                      {/* Sender label in received mode */}
                      {!isSender && (
                        <p className="text-[11px] font-bold text-violet-400 mb-1">
                          {msg.sender}
                        </p>
                      )}

                      {/* Image Attachment */}
                      {msg.mediaType === "image" && msg.mediaUrl && (
                        <div className="my-1 rounded-xl overflow-hidden cursor-pointer border border-white/10">
                          <img
                            src={getMediaUrl(msg.mediaUrl)}
                            alt="Attached"
                            onClick={() => setPreviewImage(getMediaUrl(msg.mediaUrl))}
                            className="max-h-72 w-full object-cover rounded-xl hover:scale-[1.01] transition duration-200"
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
                          className="flex items-center gap-3 p-2.5 my-1 rounded-xl bg-black/30 hover:bg-black/40 border border-white/10 transition text-xs"
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
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words select-text">
                          {msg.text}
                        </p>
                      )}

                      {/* Message Metadata (Time & Delivery/Seen Status) */}
                      <div className="flex items-center justify-end gap-1.5 mt-1 text-[10px] select-none">
                        <span className="opacity-75">
                          {msg.createdAt
                            ? new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </span>

                        {/* Read Receipts & Seen Relative Time Indicator */}
                        {isSender && (
                          <div className="flex items-center gap-1">
                            {msg.seen ? (
                              <>
                                <span className="text-[9px] text-cyan-300 font-semibold tracking-tight">
                                  {msg.seenAt ? `Seen ${formatRelativeTime(msg.seenAt)}` : "Seen"}
                                </span>
                                <span title={msg.seenAt ? `Seen ${formatRelativeTime(msg.seenAt)}` : "Seen"}>
                                  <IconCheckDouble className="w-3.5 h-3.5 text-cyan-400 stroke-[2.5]" />
                                </span>
                              </>
                            ) : (
                              <span title="Delivered">
                                <IconCheckDouble className="w-3.5 h-3.5 text-white/50" />
                              </span>
                            )}
                          </div>
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
                                className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-black/40 border border-white/10 hover:bg-black/60 transition"
                              >
                                <span>{emoji}</span>
                                <span className="font-mono text-[10px] font-bold">{count}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Quick Reaction & Copy Hover Bar */}
                    {!selectedChat.isAIChat && (
                      <div
                        className={`absolute -top-7 ${
                          isSender ? "right-2" : "left-2"
                        } hidden group-hover:flex items-center gap-1 bg-[#1a2133] border border-white/10 rounded-full px-2 py-1 shadow-2xl z-20`}
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

                        {/* Copy message text */}
                        {msg.text && (
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(msg.text);
                              setCopiedMsgId(msg._id);
                              setTimeout(() => setCopiedMsgId(null), 1500);
                            }}
                            className="p-1 text-gray-400 hover:text-white transition"
                            title={copiedMsgId === msg._id ? "Copied!" : "Copy message"}
                          >
                            <IconCopy className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Delete message (sender only) */}
                        {isSender && (
                          <button
                            onClick={() => handleDeleteMessage(msg._id)}
                            className="p-1 text-gray-400 hover:text-red-400 transition"
                            title="Delete Message"
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
            <div className="relative p-3 md:p-4 bg-[#0e1322]/90 border-t border-white/[0.08] backdrop-blur-xl">
              {/* If user is blocked */}
              {isContactBlockedByMe ? (
                <div className="flex items-center justify-center gap-3 py-3 px-4 text-xs text-gray-300 bg-[#0e1322]/90 rounded-2xl border border-white/5">
                  <IconBan className="w-4 h-4 text-red-400" />
                  <span>You have blocked this contact.</span>
                  <button
                    onClick={handleToggleBlockContact}
                    className="px-4 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-bold transition hover:scale-105 active:scale-95 ml-2"
                  >
                    Unblock to Chat
                  </button>
                </div>
              ) : (
                <>
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
                        className="p-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/[0.06] transition"
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
                        className="p-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/[0.06] transition"
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
                        className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/60 focus:bg-white/[0.08] transition"
                      />

                      {/* Mic / Voice Recording Button */}
                      {!messageText.trim() ? (
                        <button
                          onClick={() => setIsRecordingVoice(true)}
                          className="p-3 rounded-xl bg-white/[0.05] hover:bg-white/10 text-gray-300 hover:text-white border border-white/[0.06] transition"
                          title="Record Voice Note"
                        >
                          <IconMic className="w-5 h-5" />
                        </button>
                      ) : (
                        /* Send Button */
                        <button
                          onClick={handleSendMessage}
                          className="p-3 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-500 hover:opacity-95 text-white shadow-lg shadow-violet-600/30 transition transform hover:scale-105 active:scale-95"
                          title="Send"
                        >
                          <IconSend className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        ) : (
          /* Empty Chat State - Luxury Modern Welcome Graphic */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center z-10">
            <div className="relative mb-6">
              <div className="absolute -inset-4 bg-gradient-to-r from-violet-600 to-cyan-500 rounded-full blur-2xl opacity-30 animate-pulse"></div>
              <Logo size="xl" showTag={false} className="relative opacity-90" />
            </div>

            <h3 className="text-3xl font-extrabold text-white mb-3 tracking-tight">
              Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400">PulseChat</span>
            </h3>

            <p className="text-gray-400 text-sm max-w-md mb-8 leading-relaxed">
              Experience modern realtime messaging with peer-to-peer HD video & voice calling, neural AI assistance, voice notes, and instant reactions.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => setShowNewChatModal(true)}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold text-xs uppercase tracking-wider shadow-xl shadow-violet-600/30 hover:scale-105 active:scale-95 transition"
              >
                + New Conversation
              </button>

              <button
                onClick={() => {
                  const ai = chats.find((c) => c.isAIChat);
                  if (ai) setSelectedChat(ai);
                }}
                className="px-6 py-3 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] text-gray-200 border border-white/10 font-bold text-xs uppercase tracking-wider hover:scale-105 active:scale-95 transition flex items-center gap-2"
              >
                <IconSparkles className="w-4 h-4 text-cyan-400" />
                <span>Talk to Pulse AI</span>
              </button>
            </div>
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
        isMinimized={isCallMinimized}
        onToggleMinimize={setIsCallMinimized}
        onDurationUpdate={setCallDuration}
        onEndCall={(callData) => {
          setIsCallMinimized(false);
          handleCallEnded(callData);
        }}
        onCallAccepted={() => {
          setCallState("in-call");
        }}
      />

      {/* ======================================================== */}
      {/* 4. CONTACT USER PROFILE MODAL */}
      {/* ======================================================== */}
      {showProfileModal && currentPartner && (
        <UserProfileModal
          user={currentPartner}
          isOnline={isPartnerOnline}
          chatMessages={selectedChat?.messages || []}
          isBlocked={isContactBlockedByMe}
          onClose={() => setShowProfileModal(false)}
          onStartAudioCall={() => startCall("audio")}
          onStartVideoCall={() => startCall("video")}
          onToggleBlock={handleToggleBlockContact}
          onClearChat={handleClearChatHistory}
          onDeleteChat={handleDeleteChat}
          onPreviewImage={(url) => setPreviewImage(url)}
        />
      )}

      {/* ======================================================== */}
      {/* 5. EDIT MY PROFILE & PICTURE MODAL */}
      {/* ======================================================== */}
      {showMyProfileModal && (
        <MyProfileModal
          onClose={() => setShowMyProfileModal(false)}
          onAvatarUpdated={(newAvatar) => {
            if (socketRef.current) {
              socketRef.current.userAvatar = newAvatar;
            }
          }}
        />
      )}

      {/* ======================================================== */}
      {/* 6. NEW CHAT SEARCH MODAL */}
      {/* ======================================================== */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#111624] border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <h3 className="text-lg font-bold text-white">Start New Conversation</h3>
              <button
                onClick={() => setShowNewChatModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-xl hover:bg-white/10 transition"
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
                    <span className="text-xs text-violet-400 font-semibold px-2.5 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20">
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
      {/* 7. IMAGE LIGHTBOX MODAL */}
      {/* ======================================================== */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-[260] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-6 right-6 text-white p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition"
          >
            <IconClose className="w-6 h-6" />
          </button>
          <img
            src={previewImage}
            alt="Preview"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl border border-white/10"
          />
        </div>
      )}
    </div>
  );
}
