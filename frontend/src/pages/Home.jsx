import React, { useState, useEffect, useRef, useMemo } from "react";
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
import CreateStatusModal from "../components/CreateStatusModal";
import StoryViewerModal from "../components/StoryViewerModal";
import CreateGroupModal from "../components/CreateGroupModal";
import GroupInfoModal from "../components/GroupInfoModal";
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
  IconDotsVertical,
  IconBell,
  IconBellOff,
  IconChat,
  IconStatus,
  IconUsers,
  IconArrowDownLeft,
  IconArrowUpRight,
  IconEye,
  IconPalette,
} from "../components/Icons";
import { sounds } from "../utils/soundEffects";
import { PULSE_AI_USER, generateAIResponse } from "../utils/aiBot";

// Helper for highlighting in-chat search query matches
function renderHighlightedText(text, query) {
  if (!query || !query.trim() || !text) return text;
  try {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-amber-300 text-slate-900 rounded-xs px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  } catch {
    return text;
  }
}

// Helper for relative time formatting (e.g., "just now", "1 min ago", "5 mins ago", "1 hour ago", "2 hours ago", "yesterday")
function formatRelativeTime(dateInput) {
  if (!dateInput) return "";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "";
  const now = new Date();
  const diffMs = now - date;
  if (diffMs < 0) return "just now";
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 45) return "just now";
  if (diffSecs < 90) return "1 min ago";
  if (diffMins < 60) return `${diffMins} mins ago`;
  if (diffHours === 1) return "1 hour ago";
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
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

  // WhatsApp-style Sidebar Navigation Tab: "chats" | "status" | "calls"
  const [sidebarTab, setSidebarTab] = useState("chats");

  // Status / Story States
  const [myStatus, setMyStatus] = useState(null);
  const [otherStatuses, setOtherStatuses] = useState([]);
  const [selectedStoryGroup, setSelectedStoryGroup] = useState(null);
  const [showCreateStatusModal, setShowCreateStatusModal] = useState(false);
  const [loadingStatuses, setLoadingStatuses] = useState(false);

  // Call History States
  const [callLogs, setCallLogs] = useState([]);
  const [loadingCallLogs, setLoadingCallLogs] = useState(false);

  // Group Management States
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);

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

  // WhatsApp-style 3-Dot Menu & In-Chat Search State
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [profileModalTab, setProfileModalTab] = useState("photos");
  const [searchInChatOpen, setSearchInChatOpen] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [mutedChats, setMutedChats] = useState(() => {
    try {
      const saved = localStorage.getItem("pulse_muted_chats");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const chatMenuRef = useRef(null);
  const mutedChatsRef = useRef(mutedChats);
  useEffect(() => {
    mutedChatsRef.current = mutedChats;
  }, [mutedChats]);

  // Click outside to close 3-dot dropdown menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (chatMenuRef.current && !chatMenuRef.current.contains(e.target)) {
        setShowChatMenu(false);
      }
    };
    if (showChatMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showChatMenu]);

  // Reset menu & in-chat search when active chat changes
  useEffect(() => {
    setShowChatMenu(false);
    setSearchInChatOpen(false);
    setChatSearchQuery("");
  }, [selectedChat?._id]);

  const handleToggleMuteChat = (chatId) => {
    if (!chatId) return;
    setMutedChats((prev) => {
      const next = new Set(prev);
      if (next.has(chatId)) {
        next.delete(chatId);
      } else {
        next.add(chatId);
      }
      try {
        localStorage.setItem("pulse_muted_chats", JSON.stringify([...next]));
      } catch (e) {}
      return next;
    });
  };

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

  // Live ticker to update relative elapsed time (e.g., "just now" -> "1 min ago" -> "5 mins ago" -> "1 hour ago")
  const [, setTimeTick] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeTick(Date.now());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

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
        if (!mutedChatsRef.current.has(chatId)) {
          sounds.playMessageReceived();
        }
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
    socket.on("messages-seen-updated", ({ roomId, readerId, readerUsername, userId, seenAt }) => {
      const effectiveReaderId = readerId || userId;
      const currentUid = String(userData?._id || userData?.id || "");
      const currentUname = userData?.username;

      // Crucial: Only update my sent messages if the reader is SOMEONE ELSE (the recipient / partner)
      const isReadByOther =
        (effectiveReaderId && String(effectiveReaderId) !== currentUid) ||
        (readerUsername && readerUsername !== currentUname);

      if (isReadByOther) {
        const markMySentAsSeen = (msgs) =>
          msgs?.map((m) => {
            const isMySent =
              m.sender === currentUname ||
              (m.senderId && String(m.senderId) === currentUid);
            if (isMySent && !m.system) {
              return { ...m, seen: true, seenAt: m.seenAt || seenAt || new Date() };
            }
            return m;
          });

        setSelectedChat((prev) =>
          prev && String(prev._id) === String(roomId)
            ? { ...prev, messages: markMySentAsSeen(prev.messages) }
            : prev
        );

        setChats((prev) =>
          prev.map((c) =>
            String(c._id) === String(roomId)
              ? { ...c, messages: markMySentAsSeen(c.messages) }
              : c
          )
        );
      }
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

    // Realtime Status Available
    socket.on("new-status-available", () => {
      fetchStatuses();
    });

    fetchChats();
    fetchStatuses();
    fetchCallLogs();

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
        readerId: userData._id,
        readerUsername: userData.username,
        senderId: partner?._id,
      });

      axios
        .post(`${serverUrl}/api/chat/${selectedChat._id}/seen`, {
          userId: userData._id,
          readerUsername: userData.username,
        })
        .catch(() => {});

      const now = new Date();
      setSelectedChat((prev) => {
        if (!prev || String(prev._id) !== String(selectedChat._id)) return prev;
        return {
          ...prev,
          messages: prev.messages?.map((m) =>
            m.sender !== userData.username ? { ...m, seen: true, seenAt: m.seenAt || now } : m
          ),
        };
      });

      setChats((prev) =>
        prev.map((c) => {
          if (String(c._id) !== String(selectedChat._id)) return c;
          return {
            ...c,
            messages: c.messages?.map((m) =>
              m.sender !== userData.username ? { ...m, seen: true, seenAt: m.seenAt || now } : m
            ),
          };
        })
      );
    }
  }, [selectedChat?._id, selectedChat?.messages?.length, userData?._id, userData?.username]);

  // Helper to extract the other user in a 1-to-1 chat or group info
  const getChatPartner = (chat) => {
    if (!chat) return null;
    if (chat.isAIChat) return PULSE_AI_USER;
    if (chat.isGroup) {
      return {
        _id: chat._id,
        isGroup: true,
        name: chat.groupName || "Group Chat",
        username: chat.groupName || "Group Chat",
        avatar:
          chat.groupAvatar ||
          `https://api.dicebear.com/7.x/identicon/svg?seed=${chat._id}`,
        groupAdmin: chat.groupAdmin,
        groupDescription: chat.groupDescription,
        members: chat.members,
      };
    }
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

    // Record call in persistent backend Call Log
    try {
      const logCallerId = callerInfo?._id ? callerInfo._id : userData._id;
      const logRecipientId = callerInfo?._id ? userData._id : (currentPartner?._id || userData._id);
      if (logRecipientId && logRecipientId !== PULSE_AI_USER._id) {
        await axios.post(`${serverUrl}/api/calls/log`, {
          callerId: logCallerId,
          recipientId: logRecipientId,
          callType: cType,
          status: status === "declined" ? "declined" : duration > 0 ? "completed" : "missed",
          duration: duration || 0,
        });
        fetchCallLogs();
      }
    } catch (e) {
      console.error("Log call error:", e);
    }

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

  // Status / Story Handlers
  const fetchStatuses = async () => {
    if (!userData?._id) return;
    setLoadingStatuses(true);
    try {
      const res = await axios.get(`${serverUrl}/api/status?userId=${userData._id}`);
      setMyStatus(res.data?.myStatus || null);
      setOtherStatuses(res.data?.otherStatuses || []);
    } catch (err) {
      console.error("Fetch statuses error:", err);
    } finally {
      setLoadingStatuses(false);
    }
  };

  const handleMarkStatusViewed = async (statusId) => {
    if (!statusId || !userData?._id) return;
    try {
      await axios.post(`${serverUrl}/api/status/${statusId}/view`, { userId: userData._id });
    } catch (err) {
      console.error("View status error:", err);
    }
  };

  const handleDeleteStatus = async (statusId) => {
    if (!statusId) return;
    try {
      await axios.delete(`${serverUrl}/api/status/${statusId}`);
      fetchStatuses();
      setSelectedStoryGroup(null);
    } catch (err) {
      console.error("Delete status error:", err);
    }
  };

  // Call History Handlers
  const fetchCallLogs = async () => {
    if (!userData?._id) return;
    setLoadingCallLogs(true);
    try {
      const res = await axios.get(`${serverUrl}/api/calls?userId=${userData._id}`);
      setCallLogs(res.data || []);
    } catch (err) {
      console.error("Fetch call logs error:", err);
    } finally {
      setLoadingCallLogs(false);
    }
  };

  const handleClearCallLogs = async () => {
    if (!userData?._id) return;
    if (!window.confirm("Clear all call logs from your history?")) return;
    try {
      await axios.delete(`${serverUrl}/api/calls/clear?userId=${userData._id}`);
      setCallLogs([]);
    } catch (err) {
      console.error("Clear call logs error:", err);
    }
  };

  const handleCallbackUser = async (targetUser, type = "audio") => {
    if (!targetUser || !targetUser._id) return;
    try {
      const res = await axios.post(`${serverUrl}/api/chat`, {
        myId: userData._id,
        recipientId: targetUser._id,
      });
      const chat = res.data;
      const exists = chats.some((c) => c._id === chat._id);
      if (!exists) setChats((prev) => [chat, ...prev]);
      setSelectedChat(chat);
      setSidebarTab("chats");

      // Initiate WebRTC call
      setCallType(type);
      setCallerInfo(null);
      setIsCallMinimized(false);
      setCallState("outgoing");
    } catch (err) {
      console.error("Callback user error:", err);
    }
  };

  // Group Handlers
  const handleGroupCreated = (newGroup) => {
    setChats((prev) => [newGroup, ...prev.filter((c) => c._id !== newGroup._id)]);
    setSelectedChat(newGroup);
    setSidebarTab("chats");
    if (socketRef.current) {
      socketRef.current.emit("join-room", newGroup._id);
      socketRef.current.emit("group-created", {
        memberIds: newGroup.members?.map((m) => m._id || m),
        groupChat: newGroup,
      });
    }
  };

  const handleGroupUpdated = (updatedGroup) => {
    setSelectedChat(updatedGroup);
    setChats((prev) => prev.map((c) => (c._id === updatedGroup._id ? updatedGroup : c)));
  };

  const handleLeaveGroup = async () => {
    if (!selectedChat?._id || !userData?._id) return;
    if (!window.confirm("Are you sure you want to exit this group?")) return;
    try {
      const updatedMembers = selectedChat.members?.filter(
        (m) => String(m._id || m) !== String(userData._id)
      );
      await axios.put(`${serverUrl}/api/chat/group/${selectedChat._id}`, {
        userId: userData._id,
        members: updatedMembers.map((m) => m._id || m),
      });
      setShowGroupInfoModal(false);
      setChats((prev) => prev.filter((c) => c._id !== selectedChat._id));
      setSelectedChat(null);
    } catch (err) {
      console.error("Leave group error:", err);
    }
  };

  // Tab switch listener
  useEffect(() => {
    if (sidebarTab === "status") {
      fetchStatuses();
    } else if (sidebarTab === "calls") {
      fetchCallLogs();
    }
  }, [sidebarTab]);

  const getMediaUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:") || url.startsWith("blob:")) {
      return url;
    }
    return `${serverUrl}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  // Calculate index of the very last sent message so "Seen X mins ago" only appears once at the bottom
  const lastSentMsgIndex = useMemo(() => {
    if (!selectedChat?.messages || !Array.isArray(selectedChat.messages)) return -1;
    for (let i = selectedChat.messages.length - 1; i >= 0; i--) {
      const m = selectedChat.messages[i];
      const isSystem = m.system || m.mediaType === "system" || m.sender === "System";
      const isMyMsg =
        m.sender === userData?.username ||
        (m.senderId && String(m.senderId) === String(userData?._id));
      if (!isSystem && isMyMsg) {
        return i;
      }
    }
    return -1;
  }, [selectedChat?.messages, userData?.username, userData?._id]);

  // Count matching messages for in-chat search
  const matchingChatMessagesCount = useMemo(() => {
    if (!chatSearchQuery.trim() || !selectedChat?.messages) return 0;
    const q = chatSearchQuery.toLowerCase();
    return selectedChat.messages.filter((m) => m.text && m.text.toLowerCase().includes(q)).length;
  }, [chatSearchQuery, selectedChat?.messages]);

  return (
    <div className="fixed inset-0 flex h-[100dvh] w-full bg-[#f8fafc] text-slate-800 overflow-hidden font-sans select-none">
      {/* Subtle ambient light */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.04),rgba(255,255,255,0))] pointer-events-none"></div>

      {/* ======================================================== */}
      {/* LEFT SIDEBAR: Brand, User Profile, Chat List */}
      {/* ======================================================== */}
      <div
        className={`w-full md:w-[360px] lg:w-[390px] border-r border-slate-200/90 flex flex-col bg-white shadow-sm ${
          selectedChat ? "hidden md:flex" : "flex"
        } h-full z-10 transition-all`}
      >
        {/* Header: Logo & User Quick Actions */}
        <div className="p-3.5 border-b border-slate-200/80 flex items-center justify-between flex-shrink-0 bg-white">
          <Logo size="md" />

          <div className="flex items-center gap-1.5">
            {/* Sound toggle */}
            <button
              onClick={toggleSoundMute}
              className={`p-2 rounded-xl transition ${
                isMutedSounds
                  ? "bg-red-50 text-red-500 border border-red-200"
                  : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 border border-slate-200"
              }`}
              title={isMutedSounds ? "Unmute sounds" : "Mute sounds"}
            >
              {isMutedSounds ? <IconVolumeX className="w-4 h-4" /> : <IconVolume2 className="w-4 h-4" />}
            </button>

            {/* Edit My Profile Button */}
            <button
              onClick={() => setShowMyProfileModal(true)}
              className="p-2 bg-slate-100 hover:bg-slate-200/70 border border-slate-200 text-slate-600 hover:text-slate-900 rounded-xl transition"
              title="Edit Profile & Picture"
            >
              <IconUser className="w-4 h-4" />
            </button>

            {/* New Group Button */}
            <button
              onClick={() => setShowCreateGroupModal(true)}
              className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl transition border border-indigo-200"
              title="Create New Group"
            >
              <IconUsers className="w-4 h-4" />
            </button>

            {/* New Chat Button */}
            <button
              onClick={() => setShowNewChatModal(true)}
              className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition shadow-sm shadow-blue-600/30 transform hover:scale-105 active:scale-95"
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
              className="p-2 text-slate-400 hover:text-red-500 rounded-xl hover:bg-red-50 border border-transparent hover:border-red-200 transition"
              title="Logout"
            >
              <IconLogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Current User Quick Info Card (Click to edit picture) */}
        <div
          onClick={() => setShowMyProfileModal(true)}
          className="px-3.5 py-2.5 mx-3 my-2 rounded-2xl bg-slate-50 hover:bg-slate-100/90 border border-slate-200/80 flex items-center justify-between shadow-xs cursor-pointer group transition"
          title="Click to edit profile & change picture"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative flex-shrink-0">
              <img
                src={userData?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${userData?.username || "me"}`}
                alt={userData?.username}
                className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-xs group-hover:border-blue-500/50 transition"
              />
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full shadow-xs"></span>
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-sm text-slate-800 truncate leading-tight group-hover:text-blue-600 transition">
                {userData?.name || userData?.username}
              </h4>
              <p className="text-[11px] text-emerald-600 font-medium truncate flex items-center gap-1 mt-0.5">
                <span>● Active</span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-500 truncate">Change photo ↗</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <span className="p-1.5 rounded-lg bg-white group-hover:bg-blue-50 text-slate-500 group-hover:text-blue-600 border border-slate-200 transition">
              <IconCamera className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* WhatsApp-Style Navigation Tabs: Chats, Status, Calls */}
        <div className="px-3 pt-1 pb-2 flex items-center justify-between gap-1 border-b border-slate-200/80 bg-white">
          <button
            onClick={() => setSidebarTab("chats")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-semibold transition ${
              sidebarTab === "chats"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <IconChat className="w-4 h-4" />
            <span>Chats</span>
            {chats.length > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  sidebarTab === "chats" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                }`}
              >
                {chats.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setSidebarTab("status")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-semibold transition relative ${
              sidebarTab === "status"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <IconStatus className="w-4 h-4" />
            <span>Status</span>
            {otherStatuses.some((s) => s.hasUnviewed) && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-white"></span>
            )}
          </button>

          <button
            onClick={() => setSidebarTab("calls")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-semibold transition ${
              sidebarTab === "calls"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <IconPhone className="w-4 h-4" />
            <span>Calls</span>
            {callLogs.length > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  sidebarTab === "calls" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                }`}
              >
                {callLogs.length}
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: CHATS VIEW */}
        {sidebarTab === "chats" && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Search Input Filter */}
            <div className="px-3 py-2 flex-shrink-0">
              <div className="relative">
                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search chats, contacts, messages..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-100 border border-slate-200/90 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>
            </div>

            {/* Chats List Header */}
            <div className="px-4 pt-1 pb-1 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 flex-shrink-0">
              <span>Conversations</span>
              <span className="text-slate-500 font-mono font-semibold">{chats.length}</span>
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
                  const isOnline = chat.isAIChat
                    ? true
                    : chat.isGroup
                    ? false
                    : onlineUsers.has(String(partner._id));

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
                          ? "bg-blue-50/90 border-blue-200 text-slate-900 shadow-xs"
                          : "hover:bg-slate-50 text-slate-700 border-transparent hover:border-slate-200/70"
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
                          className="w-11 h-11 rounded-full object-cover border border-slate-200 group-hover:scale-105 transition"
                        />
                        {isOnline && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full shadow-xs"></span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <div className="flex items-center gap-1.5 truncate">
                            <span
                              className={`font-semibold text-sm truncate ${
                                isSelected ? "text-blue-900" : "text-slate-800"
                              }`}
                            >
                              {partner.name || partner.username}
                            </span>
                            {chat.isAIChat && (
                              <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded border border-blue-200">
                                <IconSparkles className="w-2.5 h-2.5" /> AI
                              </span>
                            )}
                            {chat.isGroup && (
                              <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded border border-indigo-200">
                                <IconUsers className="w-2.5 h-2.5" /> Group
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {chat.lastMessageAt
                              ? new Date(chat.lastMessageAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : ""}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <p
                            className={`text-xs truncate ${
                              isSelected ? "text-blue-800/90 font-medium" : "text-slate-500"
                            }`}
                          >
                            {chat.lastMessage || (chat.isGroup ? "Group created" : "No messages yet")}
                          </p>

                          {/* Unread message count badge */}
                          {unreadCount > 0 && !isSelected && (
                            <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold shadow-xs flex-shrink-0">
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
        )}

        {/* TAB 2: STATUS / STORY VIEW */}
        {sidebarTab === "status" && (
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
            {/* My Status Card */}
            <div className="p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/90 rounded-2xl transition flex items-center justify-between">
              <div
                onClick={() => {
                  if (myStatus && myStatus.statuses?.length > 0) {
                    setSelectedStoryGroup({
                      user: userData,
                      statuses: myStatus.statuses,
                      isOwn: true,
                    });
                  } else {
                    setShowCreateStatusModal(true);
                  }
                }}
                className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
              >
                <div className="relative flex-shrink-0">
                  <img
                    src={userData?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${userData?.username}`}
                    alt={userData?.username}
                    className={`w-12 h-12 rounded-full object-cover border-2 p-0.5 transition ${
                      myStatus && myStatus.statuses?.length > 0
                        ? "border-emerald-500 ring-2 ring-emerald-200"
                        : "border-slate-200"
                    }`}
                  />
                  {(!myStatus || myStatus.statuses?.length === 0) && (
                    <span className="absolute bottom-0 right-0 w-4 h-4 bg-blue-600 text-white rounded-full flex items-center justify-center text-[11px] font-bold shadow-xs">
                      +
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-sm text-slate-800 truncate">My Status</h4>
                  <p className="text-xs text-slate-500 truncate">
                    {myStatus && myStatus.statuses?.length > 0
                      ? `${myStatus.statuses.length} update${myStatus.statuses.length > 1 ? "s" : ""} • Tap to view`
                      : "Tap to add status update"}
                  </p>
                </div>
              </div>

              {/* Quick add status button */}
              <button
                onClick={() => setShowCreateStatusModal(true)}
                className="p-2 bg-white hover:bg-blue-50 text-slate-600 hover:text-blue-600 border border-slate-200 rounded-xl transition shadow-xs"
                title="Add text or photo status"
              >
                <IconCamera className="w-4 h-4" />
              </button>
            </div>

            {/* Recent Updates Header */}
            <div className="pt-2 px-1 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <span>Recent Updates</span>
              <span className="text-slate-500 font-mono font-semibold">{otherStatuses.length}</span>
            </div>

            {/* Contacts Status List */}
            {loadingStatuses ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading updates...</div>
            ) : otherStatuses.length === 0 ? (
              <div className="p-6 text-center bg-slate-50/70 border border-slate-200/60 rounded-2xl">
                <p className="text-xs text-slate-600 font-medium">No recent updates</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Status updates from contacts will appear here and disappear after 24 hours.
                </p>
                <button
                  onClick={() => setShowCreateStatusModal(true)}
                  className="mt-3 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition shadow-xs"
                >
                  Share an update
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                {otherStatuses.map((item) => {
                  const contact = item.user || {};
                  const lastStatus = item.statuses[item.statuses.length - 1];
                  return (
                    <div
                      key={contact._id}
                      onClick={() =>
                        setSelectedStoryGroup({
                          user: contact,
                          statuses: item.statuses,
                          isOwn: false,
                        })
                      }
                      className="p-2.5 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-200/80 flex items-center gap-3 cursor-pointer transition"
                    >
                      <div className="relative flex-shrink-0">
                        <img
                          src={contact.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${contact.username}`}
                          alt={contact.username}
                          className={`w-11 h-11 rounded-full object-cover p-0.5 border-2 transition ${
                            item.hasUnviewed
                              ? "border-emerald-500 ring-2 ring-emerald-300"
                              : "border-slate-300"
                          }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm text-slate-800 truncate">
                          {contact.name || contact.username}
                        </h4>
                        <p className="text-xs text-slate-500 truncate flex items-center gap-1.5">
                          <span>
                            {item.statuses.length} update{item.statuses.length > 1 ? "s" : ""}
                          </span>
                          <span>•</span>
                          <span>{formatRelativeTime(lastStatus?.createdAt)}</span>
                        </p>
                      </div>
                      {item.hasUnviewed && (
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white"></span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CALL HISTORY VIEW */}
        {sidebarTab === "calls" && (
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
            {/* Header with clear history button */}
            <div className="px-1 py-1 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <span>Call History</span>
              {callLogs.length > 0 && (
                <button
                  onClick={handleClearCallLogs}
                  className="text-[11px] font-semibold text-red-500 hover:text-red-600 transition flex items-center gap-1"
                >
                  <IconTrash className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {loadingCallLogs ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading call history...</div>
            ) : callLogs.length === 0 ? (
              <div className="p-6 text-center bg-slate-50/70 border border-slate-200/60 rounded-2xl">
                <p className="text-xs text-slate-600 font-medium">No call logs yet</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Calls made or received with your contacts will be saved here.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {callLogs.map((log) => {
                  const isCaller = String(log.caller?._id || log.caller) === String(userData._id);
                  const otherParty = isCaller ? log.recipient : log.caller;
                  const isMissed = log.status === "missed" || log.status === "declined";

                  return (
                    <div
                      key={log._id}
                      className="p-2.5 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-200/80 flex items-center gap-3 transition group"
                    >
                      {/* Contact avatar */}
                      <img
                        src={
                          otherParty?.avatar ||
                          `https://api.dicebear.com/7.x/bottts/svg?seed=${otherParty?.username || "call"}`
                        }
                        alt={otherParty?.username}
                        className="w-11 h-11 rounded-full object-cover border border-slate-200"
                      />

                      {/* Call Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm text-slate-800 truncate">
                          {otherParty?.name || otherParty?.username || "Contact"}
                        </h4>
                        <div className="flex items-center gap-1.5 text-xs mt-0.5">
                          {isCaller ? (
                            <span className="flex items-center gap-1 text-blue-600">
                              <IconArrowUpRight className="w-3.5 h-3.5" />
                              <span>Outgoing</span>
                            </span>
                          ) : isMissed ? (
                            <span className="flex items-center gap-1 text-red-500 font-semibold">
                              <IconArrowDownLeft className="w-3.5 h-3.5" />
                              <span>Missed</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-emerald-600">
                              <IconArrowDownLeft className="w-3.5 h-3.5" />
                              <span>Incoming</span>
                            </span>
                          )}

                          <span className="text-slate-400">•</span>
                          <span className="text-slate-500 text-[11px]">
                            {log.duration > 0
                              ? formatCallDuration(log.duration)
                              : formatRelativeTime(log.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Quick callback action buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleCallbackUser(otherParty, "audio")}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 border border-slate-200 hover:border-emerald-200 transition"
                          title="Audio call back"
                        >
                          <IconPhone className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleCallbackUser(otherParty, "video")}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 border border-slate-200 hover:border-blue-200 transition"
                          title="Video call back"
                        >
                          <IconVideo className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* RIGHT MAIN AREA: Chat Conversation Screen */}
      {/* ======================================================== */}
      <div
        className={`flex-1 flex flex-col bg-[#f8fafc] h-full ${
          !selectedChat ? "hidden md:flex" : "flex"
        } relative overflow-hidden`}
      >
        {selectedChat ? (
          <>
            {/* Chat Top Header Bar */}
            <div className="p-3 md:p-3.5 bg-white/95 border-b border-slate-200/90 backdrop-blur-xl flex items-center justify-between z-20 shadow-xs">
              {/* Partner / Group Info (Click to open modal) */}
              <div
                onClick={() => {
                  if (selectedChat.isGroup) {
                    setShowGroupInfoModal(true);
                  } else if (!selectedChat.isAIChat) {
                    setShowProfileModal(true);
                  }
                }}
                className={`flex items-center gap-3 min-w-0 ${
                  !selectedChat.isAIChat ? "cursor-pointer group" : ""
                }`}
                title={
                  selectedChat.isGroup
                    ? "Group info & members"
                    : !selectedChat.isAIChat
                    ? "Click to view profile & media"
                    : "Pulse AI Assistant"
                }
              >
                {/* Mobile back arrow */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedChat(null);
                  }}
                  className="md:hidden p-2 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition -ml-1"
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
                    className="w-10 h-10 rounded-full object-cover border border-slate-200 group-hover:border-blue-500 transition shadow-xs"
                  />
                  {!selectedChat.isGroup &&
                    (isPartnerOnline ? (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full animate-pulse"></span>
                    ) : (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-slate-400 border-2 border-white rounded-full"></span>
                    ))}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm md:text-base text-slate-900 truncate group-hover:text-blue-600 transition flex items-center gap-1.5">
                      <span>{currentPartner?.name || currentPartner?.username}</span>
                      {mutedChats.has(selectedChat._id) && (
                        <span title="Notifications muted">
                          <IconBellOff className="w-3.5 h-3.5 text-slate-400" />
                        </span>
                      )}
                      {selectedChat.isGroup && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 font-bold border border-indigo-200">
                          Group
                        </span>
                      )}
                      {isContactBlockedByMe && !selectedChat.isGroup && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-bold border border-red-200">
                          Blocked
                        </span>
                      )}
                      {!selectedChat.isAIChat && (
                        <span className="text-[10px] text-slate-400 group-hover:text-blue-600 transition">
                          ↗
                        </span>
                      )}
                    </h3>
                    {selectedChat.isAIChat && (
                      <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold border border-blue-200">
                        Neural Bot
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">
                    {remoteTypingUser ? (
                      <span className="text-blue-600 font-medium animate-pulse">
                        ✍️ {remoteTypingUser} is typing...
                      </span>
                    ) : selectedChat.isGroup ? (
                      <span className="text-slate-500 font-medium">
                        {selectedChat.members?.length || 0} participants • Tap for info
                      </span>
                    ) : isPartnerOnline ? (
                      <span className="text-emerald-600 font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Active Now
                      </span>
                    ) : (
                      <span className="text-slate-500">
                        Last seen {formatRelativeTime(currentPartner?.lastSeen)}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Header Action Buttons */}
              <div className="flex items-center gap-1.5 relative">
                {!selectedChat.isAIChat && !selectedChat.isGroup && (
                  <>
                    <button
                      disabled={isContactBlockedByMe}
                      onClick={() => startCall("audio")}
                      className={`p-2 rounded-xl border transition shadow-xs ${
                        isContactBlockedByMe
                          ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                          : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-emerald-200 hover:scale-105 active:scale-95"
                      }`}
                      title={isContactBlockedByMe ? "Unblock contact to call" : "Start Voice Call"}
                    >
                      <IconPhone className="w-4 h-4" />
                    </button>

                    <button
                      disabled={isContactBlockedByMe}
                      onClick={() => startCall("video")}
                      className={`p-2 rounded-xl border transition shadow-xs ${
                        isContactBlockedByMe
                          ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                          : "bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200 hover:scale-105 active:scale-95"
                      }`}
                      title={isContactBlockedByMe ? "Unblock contact to call" : "Start Video Call"}
                    >
                      <IconVideo className="w-4 h-4" />
                    </button>
                  </>
                )}

                {/* 3-Dot More Options Dropdown Menu (WhatsApp-style) */}
                <div className="relative" ref={chatMenuRef}>
                  <button
                    onClick={() => setShowChatMenu((prev) => !prev)}
                    className={`p-2 rounded-xl border transition shadow-xs ${
                      showChatMenu
                        ? "bg-blue-50 text-blue-600 border-blue-200 ring-2 ring-blue-100"
                        : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 border-slate-200"
                    }`}
                    title="More options"
                  >
                    <IconDotsVertical className="w-4 h-4" />
                  </button>

                  {/* Dropdown Popover */}
                  {showChatMenu && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200/90 rounded-2xl shadow-xl py-1.5 z-50 animate-fade-in text-xs font-medium text-slate-700">
                      {selectedChat.isGroup ? (
                        <>
                          {/* Group info */}
                          <button
                            onClick={() => {
                              setShowChatMenu(false);
                              setShowGroupInfoModal(true);
                            }}
                            className="w-full px-3.5 py-2.5 text-left hover:bg-slate-50 flex items-center gap-2.5 transition text-slate-700"
                          >
                            <IconInfo className="w-4 h-4 text-slate-500" />
                            <span>Group info</span>
                          </button>

                          {/* Search in group chat */}
                          <button
                            onClick={() => {
                              setShowChatMenu(false);
                              setSearchInChatOpen((prev) => !prev);
                            }}
                            className="w-full px-3.5 py-2.5 text-left hover:bg-slate-50 flex items-center gap-2.5 transition text-slate-700"
                          >
                            <IconSearch className="w-4 h-4 text-slate-500" />
                            <span>Search in conversation</span>
                          </button>

                          {/* Mute notifications */}
                          <button
                            onClick={() => {
                              handleToggleMuteChat(selectedChat._id);
                              setShowChatMenu(false);
                            }}
                            className="w-full px-3.5 py-2.5 text-left hover:bg-slate-50 flex items-center gap-2.5 transition text-slate-700"
                          >
                            {mutedChats.has(selectedChat._id) ? (
                              <>
                                <IconBell className="w-4 h-4 text-slate-500" />
                                <span>Unmute notifications</span>
                              </>
                            ) : (
                              <>
                                <IconBellOff className="w-4 h-4 text-slate-500" />
                                <span>Mute notifications</span>
                              </>
                            )}
                          </button>

                          <div className="my-1 border-t border-slate-100"></div>

                          {/* Clear chat history */}
                          <button
                            onClick={() => {
                              setShowChatMenu(false);
                              if (window.confirm("Are you sure you want to clear all messages in this group?")) {
                                handleClearChatHistory();
                              }
                            }}
                            className="w-full px-3.5 py-2.5 text-left hover:bg-slate-50 flex items-center gap-2.5 transition text-slate-700"
                          >
                            <IconTrash className="w-4 h-4 text-slate-400" />
                            <span>Clear chat history</span>
                          </button>

                          {/* Leave / Exit group */}
                          <button
                            onClick={() => {
                              setShowChatMenu(false);
                              handleLeaveGroup();
                            }}
                            className="w-full px-3.5 py-2.5 text-left hover:bg-red-50 flex items-center gap-2.5 transition text-red-600 font-medium"
                          >
                            <IconLogOut className="w-4 h-4 text-red-500" />
                            <span>Exit group</span>
                          </button>
                        </>
                      ) : !selectedChat.isAIChat ? (
                        <>
                          {/* 1. Contact info */}
                          <button
                            onClick={() => {
                              setShowChatMenu(false);
                              setProfileModalTab("photos");
                              setShowProfileModal(true);
                            }}
                            className="w-full px-3.5 py-2.5 text-left hover:bg-slate-50 flex items-center gap-2.5 transition text-slate-700"
                          >
                            <IconUser className="w-4 h-4 text-slate-500" />
                            <span>Contact info</span>
                          </button>

                          {/* 2. Media, links, and docs */}
                          <button
                            onClick={() => {
                              setShowChatMenu(false);
                              setProfileModalTab("photos");
                              setShowProfileModal(true);
                            }}
                            className="w-full px-3.5 py-2.5 text-left hover:bg-slate-50 flex items-center gap-2.5 transition text-slate-700"
                          >
                            <IconCamera className="w-4 h-4 text-slate-500" />
                            <span>Media, links and docs</span>
                          </button>

                          {/* 3. Search in chat */}
                          <button
                            onClick={() => {
                              setShowChatMenu(false);
                              setSearchInChatOpen((prev) => !prev);
                            }}
                            className="w-full px-3.5 py-2.5 text-left hover:bg-slate-50 flex items-center gap-2.5 transition text-slate-700"
                          >
                            <IconSearch className="w-4 h-4 text-slate-500" />
                            <span>Search in conversation</span>
                          </button>

                          {/* 4. Mute notifications */}
                          <button
                            onClick={() => {
                              handleToggleMuteChat(selectedChat._id);
                              setShowChatMenu(false);
                            }}
                            className="w-full px-3.5 py-2.5 text-left hover:bg-slate-50 flex items-center gap-2.5 transition text-slate-700"
                          >
                            {mutedChats.has(selectedChat._id) ? (
                              <>
                                <IconBell className="w-4 h-4 text-slate-500" />
                                <span>Unmute notifications</span>
                              </>
                            ) : (
                              <>
                                <IconBellOff className="w-4 h-4 text-slate-500" />
                                <span>Mute notifications</span>
                              </>
                            )}
                          </button>

                          <div className="my-1 border-t border-slate-100"></div>

                          {/* 5. Clear chat */}
                          <button
                            onClick={() => {
                              setShowChatMenu(false);
                              if (window.confirm("Are you sure you want to clear all messages in this chat?")) {
                                handleClearChatHistory();
                              }
                            }}
                            className="w-full px-3.5 py-2.5 text-left hover:bg-slate-50 flex items-center gap-2.5 transition text-slate-700"
                          >
                            <IconTrash className="w-4 h-4 text-slate-400" />
                            <span>Clear chat history</span>
                          </button>

                          {/* 6. Block / Unblock contact */}
                          <button
                            onClick={() => {
                              setShowChatMenu(false);
                              handleToggleBlockContact();
                            }}
                            className={`w-full px-3.5 py-2.5 text-left hover:bg-slate-50 flex items-center gap-2.5 transition ${
                              isContactBlockedByMe ? "text-emerald-600 font-semibold" : "text-slate-700"
                            }`}
                          >
                            <IconBan className={`w-4 h-4 ${isContactBlockedByMe ? "text-emerald-600" : "text-red-500"}`} />
                            <span>{isContactBlockedByMe ? "Unblock contact" : "Block contact"}</span>
                          </button>

                          {/* 7. Delete chat */}
                          <button
                            onClick={() => {
                              setShowChatMenu(false);
                              handleDeleteChat();
                            }}
                            className="w-full px-3.5 py-2.5 text-left hover:bg-red-50 flex items-center gap-2.5 transition text-red-600 font-medium"
                          >
                            <IconTrash className="w-4 h-4 text-red-500" />
                            <span>Delete conversation</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setShowChatMenu(false);
                              setSearchInChatOpen((prev) => !prev);
                            }}
                            className="w-full px-3.5 py-2.5 text-left hover:bg-slate-50 flex items-center gap-2.5 transition text-slate-700"
                          >
                            <IconSearch className="w-4 h-4 text-slate-500" />
                            <span>Search in conversation</span>
                          </button>

                          <button
                            onClick={() => {
                              setShowChatMenu(false);
                              handleClearChatHistory();
                            }}
                            className="w-full px-3.5 py-2.5 text-left hover:bg-slate-50 flex items-center gap-2.5 transition text-slate-700"
                          >
                            <IconTrash className="w-4 h-4 text-slate-400" />
                            <span>Clear conversation</span>
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* IN-CHAT MESSAGE SEARCH BAR (WhatsApp-style) */}
            {searchInChatOpen && (
              <div className="bg-white border-b border-slate-200/90 px-4 py-2 flex items-center gap-3 backdrop-blur-md shadow-xs z-20 animate-fade-in">
                <IconSearch className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search in conversation..."
                  value={chatSearchQuery}
                  onChange={(e) => setChatSearchQuery(e.target.value)}
                  autoFocus
                  className="flex-1 bg-slate-100/90 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                />
                {chatSearchQuery && (
                  <span className="text-[11px] font-semibold text-slate-500 font-mono">
                    {matchingChatMessagesCount} {matchingChatMessagesCount === 1 ? "match" : "matches"}
                  </span>
                )}
                <button
                  onClick={() => {
                    setSearchInChatOpen(false);
                    setChatSearchQuery("");
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                  title="Close search"
                >
                  <IconClose className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* BLOCKED CONTACT WARNING BANNER WITH INSTANT UNBLOCK */}
            {isContactBlockedByMe && (
              <div className="bg-red-50 border-b border-red-200 px-4 py-2.5 flex items-center justify-between text-xs text-red-700 z-20 backdrop-blur-md animate-fade-in shadow-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <IconBan className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span className="truncate font-medium">You have blocked this contact. They cannot message or call you.</span>
                </div>
                <button
                  onClick={handleToggleBlockContact}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-sm hover:scale-105 active:scale-95 flex-shrink-0 ml-2"
                >
                  Unblock Contact
                </button>
              </div>
            )}

            {/* LIVE ACTIVE CALL BANNER (Appears when call is minimized or ongoing) */}
            {(callState === "in-call" || callState === "outgoing") && (
              <div
                onClick={() => setIsCallMinimized(false)}
                className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 px-4 py-2.5 flex items-center justify-between cursor-pointer hover:brightness-105 transition shadow-md text-white select-none z-20"
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
                <div className="flex items-center gap-1.5 text-xs font-semibold bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition shadow-xs">
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
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200/90 text-xs text-slate-700 font-medium shadow-xs hover:bg-slate-50 transition cursor-pointer select-none"
                      >
                        <span>{msg.text}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
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
                      className={`relative max-w-[85%] md:max-w-[70%] rounded-2xl p-3.5 px-4 transition-all ${
                        isSender
                          ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-br-xs shadow-md shadow-blue-500/15"
                          : "bg-white border border-slate-200/90 text-slate-800 rounded-bl-xs shadow-xs"
                      }`}
                    >
                      {/* Sender label in received mode */}
                      {!isSender && (
                        <p className="text-[11px] font-bold text-blue-600 mb-1">
                          {msg.sender}
                        </p>
                      )}

                      {/* Image Attachment */}
                      {msg.mediaType === "image" && msg.mediaUrl && (
                        <div className="my-1 rounded-xl overflow-hidden cursor-pointer border border-slate-200/80">
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
                          className={`flex items-center gap-3 p-2.5 my-1 rounded-xl transition text-xs border ${
                            isSender
                              ? "bg-white/15 hover:bg-white/25 border-white/20 text-white"
                              : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800"
                          }`}
                        >
                          <IconPaperclip className={`w-5 h-5 ${isSender ? "text-blue-100" : "text-blue-600"}`} />
                          <div className="flex-1 truncate">
                            <p className="font-semibold truncate">{msg.fileName || msg.text || "File"}</p>
                            <span className={`text-[10px] ${isSender ? "text-blue-200" : "text-slate-400"}`}>
                              {msg.fileSize || "Attachment"}
                            </span>
                          </div>
                        </a>
                      )}

                      {/* Text Content */}
                      {msg.text && msg.mediaType !== "audio" && (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words select-text">
                          {chatSearchQuery
                            ? renderHighlightedText(msg.text, chatSearchQuery)
                            : msg.text}
                        </p>
                      )}

                      {/* Message Metadata (Time & Delivery/Seen Status) */}
                      <div
                        className={`flex items-center justify-end gap-1.5 mt-1 text-[10px] select-none ${
                          isSender ? "text-blue-100" : "text-slate-400"
                        }`}
                      >
                        <span className="opacity-80">
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
                                {idx === lastSentMsgIndex && (
                                  <span className="text-[9px] text-sky-200 font-semibold tracking-tight">
                                    {msg.seenAt ? `Seen ${formatRelativeTime(msg.seenAt)}` : "Seen"}
                                  </span>
                                )}
                                <span title={msg.seenAt ? `Seen ${formatRelativeTime(msg.seenAt)}` : "Seen"}>
                                  <IconCheckDouble className="w-3.5 h-3.5 text-sky-200 stroke-[2.5]" />
                                </span>
                              </>
                            ) : (
                              <span title="Delivered">
                                <IconCheckDouble className="w-3.5 h-3.5 text-white/60" />
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
                                className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-white border border-slate-200 shadow-xs hover:bg-slate-50 text-slate-800 transition"
                              >
                                <span>{emoji}</span>
                                <span className="font-mono text-[10px] font-bold text-slate-600">{count}</span>
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
                        } hidden group-hover:flex items-center gap-1 bg-white border border-slate-200 rounded-full px-2 py-1 shadow-lg z-20`}
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
                            className="p-1 text-slate-400 hover:text-slate-700 transition"
                            title={copiedMsgId === msg._id ? "Copied!" : "Copy message"}
                          >
                            <IconCopy className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Delete message (sender only) */}
                        {isSender && (
                          <button
                            onClick={() => handleDeleteMessage(msg._id)}
                            className="p-1 text-slate-400 hover:text-red-500 transition"
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
            <div className="relative p-3 md:p-3.5 bg-white/95 border-t border-slate-200/90 backdrop-blur-xl shadow-xs">
              {/* If user is blocked */}
              {isContactBlockedByMe ? (
                <div className="flex items-center justify-center gap-3 py-3 px-4 text-xs text-slate-600 bg-slate-100 rounded-xl border border-slate-200">
                  <IconBan className="w-4 h-4 text-red-500" />
                  <span>You have blocked this contact.</span>
                  <button
                    onClick={handleToggleBlockContact}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition hover:scale-105 active:scale-95 ml-2 shadow-xs"
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
                        className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
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
                        className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
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
                        className="flex-1 bg-slate-100/90 border border-slate-200/90 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition"
                      />

                      {/* Mic / Voice Recording Button */}
                      {!messageText.trim() ? (
                        <button
                          onClick={() => setIsRecordingVoice(true)}
                          className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-600 hover:text-slate-900 border border-slate-200 transition"
                          title="Record Voice Note"
                        >
                          <IconMic className="w-5 h-5" />
                        </button>
                      ) : (
                        /* Send Button */
                        <button
                          onClick={handleSendMessage}
                          className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/25 transition transform hover:scale-105 active:scale-95"
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
          /* Empty Chat State - Clean Natural Modern Graphic */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center z-10 bg-[#f8fafc]">
            <div className="relative mb-6">
              <div className="absolute -inset-4 bg-blue-500/10 rounded-full blur-2xl opacity-60"></div>
              <Logo size="xl" showTag={false} className="relative opacity-95" />
            </div>

            <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2.5 tracking-tight">
              Welcome to Pulse<span className="text-blue-600">Chat</span>
            </h3>

            <p className="text-slate-500 text-sm max-w-md mb-6 leading-relaxed">
              Experience fast, secure realtime messaging, crystal-clear voice and HD video calling, voice notes, and smart AI assistance.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => setShowNewChatModal(true)}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs tracking-wide shadow-md shadow-blue-600/20 hover:scale-105 active:scale-95 transition"
              >
                + New Conversation
              </button>

              <button
                onClick={() => {
                  const ai = chats.find((c) => c.isAIChat);
                  if (ai) setSelectedChat(ai);
                }}
                className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs tracking-wide hover:scale-105 active:scale-95 transition flex items-center gap-2 shadow-xs"
              >
                <IconSparkles className="w-4 h-4 text-blue-600" />
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
          initialTab={profileModalTab}
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
        <div className="fixed inset-0 z-[120] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl flex flex-col max-h-[80vh] text-slate-900">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
              <h3 className="text-base font-bold text-slate-900">Start New Conversation</h3>
              <button
                onClick={() => setShowNewChatModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition"
              >
                <IconClose className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative mb-4">
              <IconSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by username or name..."
                value={searchFilter}
                onChange={(e) => handleUserSearch(e.target.value)}
                autoFocus
                className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition"
              />
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {isSearchingUsers ? (
                <div className="text-center py-8 text-slate-400 text-sm">Searching...</div>
              ) : userSearchResults.length > 0 ? (
                userSearchResults.map((user) => (
                  <div
                    key={user._id}
                    onClick={() => handleStartChatWithUser(user)}
                    className="p-3 rounded-xl hover:bg-blue-50/70 border border-transparent hover:border-blue-200 flex items-center gap-3.5 cursor-pointer transition"
                  >
                    <img
                      src={user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
                      alt={user.username}
                      className="w-10 h-10 rounded-full object-cover border border-slate-200"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-slate-900 truncate">{user.name || user.username}</h4>
                      <p className="text-xs text-slate-500 truncate">@{user.username}</p>
                    </div>
                    <span className="text-xs text-blue-600 font-semibold px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200">
                      Chat →
                    </span>
                  </div>
                ))
              ) : searchFilter.trim() ? (
                <div className="text-center py-8 text-slate-400 text-sm">No users found.</div>
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs">
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

      {/* ======================================================== */}
      {/* 8. CREATE STATUS / STORY MODAL */}
      {/* ======================================================== */}
      {showCreateStatusModal && (
        <CreateStatusModal
          currentUser={userData}
          onClose={() => setShowCreateStatusModal(false)}
          onStatusCreated={() => {
            fetchStatuses();
            socketRef.current?.emit("status-posted", { userId: userData._id });
          }}
        />
      )}

      {/* ======================================================== */}
      {/* 9. STORY / STATUS VIEWER MODAL */}
      {/* ======================================================== */}
      {selectedStoryGroup && (
        <StoryViewerModal
          storyGroup={selectedStoryGroup}
          currentUser={userData}
          onClose={() => setSelectedStoryGroup(null)}
          onViewStatus={handleMarkStatusViewed}
          onDeleteStatus={handleDeleteStatus}
        />
      )}

      {/* ======================================================== */}
      {/* 10. CREATE GROUP MODAL */}
      {/* ======================================================== */}
      {showCreateGroupModal && (
        <CreateGroupModal
          currentUser={userData}
          onClose={() => setShowCreateGroupModal(false)}
          onGroupCreated={handleGroupCreated}
        />
      )}

      {/* ======================================================== */}
      {/* 11. GROUP INFO & MEMBERS MODAL */}
      {/* ======================================================== */}
      {showGroupInfoModal && selectedChat?.isGroup && (
        <GroupInfoModal
          chat={selectedChat}
          currentUser={userData}
          onClose={() => setShowGroupInfoModal(false)}
          onGroupUpdated={handleGroupUpdated}
          onLeaveGroup={handleLeaveGroup}
        />
      )}
    </div>
  );
}
