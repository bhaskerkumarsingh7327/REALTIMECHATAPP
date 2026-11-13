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
import ForwardMessageModal from "../components/ForwardMessageModal";
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
  IconChatPlus,
  IconChannels,
  IconMediaGallery,
  IconMetaAI,
  IconUserPlus,
  IconStar,
  IconSettings,
  IconFileText,
  IconMail,
  IconReply,
  IconForward,
  IconViewOnce,
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

  // Reply / Quoting Message State
  const [replyingTo, setReplyingTo] = useState(null);

  // View-Once Media States
  const [isViewOnceActive, setIsViewOnceActive] = useState(false);
  const [activeViewOnceMedia, setActiveViewOnceMedia] = useState(null);
  const [pendingUploadFile, setPendingUploadFile] = useState(null);
  const [pendingUploadPreview, setPendingUploadPreview] = useState(null);
  const [pendingCaption, setPendingCaption] = useState("");

  // Forward Message States
  const [forwardingMsg, setForwardingMsg] = useState(null);
  const [showForwardModal, setShowForwardModal] = useState(false);

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

  // WhatsApp-style Vertical Rail Profile Menu State
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef(null);

  // Chat filter chips state: "all" | "unread" | "favourites" | "groups" | "ai"
  const [chatFilter, setChatFilter] = useState("all");

  // Click outside to close profile popup menu
  useEffect(() => {
    const handleProfileOutside = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    if (showProfileMenu) {
      document.addEventListener("mousedown", handleProfileOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleProfileOutside);
    };
  }, [showProfileMenu]);

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

    // Realtime View-Once Message Opened
    socket.on("message-view-once-opened", ({ chatId, messageId }) => {
      setSelectedChat((prev) => {
        if (!prev || String(prev._id) !== String(chatId)) return prev;
        return {
          ...prev,
          messages: prev.messages?.map((m) =>
            m._id === messageId ? { ...m, viewOnceOpened: true } : m
          ),
        };
      });
      setChats((prev) =>
        prev.map((c) =>
          String(c._id) === String(chatId)
            ? {
                ...c,
                messages: c.messages?.map((m) =>
                  m._id === messageId ? { ...m, viewOnceOpened: true } : m
                ),
              }
            : c
        )
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
      const currentReply = replyingTo
        ? {
            messageId: replyingTo._id,
            sender: replyingTo.sender,
            text: replyingTo.text,
            mediaType: replyingTo.mediaType,
          }
        : null;

      const msgPayload = {
        chatId: selectedChat._id,
        sender: userData.username,
        senderId: userData._id,
        recipientId: currentPartner?._id,
        text,
        mediaType: "text",
        replyTo: currentReply,
      };

      const res = await axios.post(`${serverUrl}/api/chat/message`, msgPayload);
      const saved = res.data;

      sounds.playMessageSent();
      setReplyingTo(null);

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

    // If it's an image, open preview with View-Once toggle & caption
    if (file.type.startsWith("image/")) {
      const previewUrl = URL.createObjectURL(file);
      setPendingUploadFile(file);
      setPendingUploadPreview(previewUrl);
      setIsViewOnceActive(false);
      setPendingCaption("");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const uploadRes = await axios.post(`${serverUrl}/api/media/upload`, formData);
      const { url, fileName, fileSize, mediaType } = uploadRes.data;
      const fullUrl = url.startsWith("http") ? url : `${serverUrl}${url}`;

      const currentReply = replyingTo
        ? {
            messageId: replyingTo._id,
            sender: replyingTo.sender,
            text: replyingTo.text,
            mediaType: replyingTo.mediaType,
          }
        : null;

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
        replyTo: currentReply,
      };

      const res = await axios.post(`${serverUrl}/api/chat/message`, msgPayload);
      const saved = res.data;

      sounds.playMessageSent();
      setReplyingTo(null);

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

  // 5.1 Send Staged Image with View-Once Option
  const handleSendPendingImage = async () => {
    if (!pendingUploadFile || !selectedChat) return;
    const file = pendingUploadFile;
    const formData = new FormData();
    formData.append("file", file);

    try {
      const uploadRes = await axios.post(`${serverUrl}/api/media/upload`, formData);
      const { url, fileName, fileSize } = uploadRes.data;
      const fullUrl = url.startsWith("http") ? url : `${serverUrl}${url}`;

      const currentReply = replyingTo
        ? {
            messageId: replyingTo._id,
            sender: replyingTo.sender,
            text: replyingTo.text,
            mediaType: replyingTo.mediaType,
          }
        : null;

      const msgPayload = {
        chatId: selectedChat._id,
        sender: userData.username,
        senderId: userData._id,
        recipientId: currentPartner?._id,
        text: pendingCaption.trim() || file.name,
        mediaUrl: fullUrl,
        mediaType: "image",
        fileName,
        fileSize,
        isViewOnce: isViewOnceActive,
        replyTo: currentReply,
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
                lastMessage: isViewOnceActive ? "① View once photo" : "📷 Photo",
                lastMessageAt: new Date(),
              }
            : c
        )
      );
    } catch (err) {
      console.error("Send image error:", err);
      alert("Failed to send photo. Please try again.");
    } finally {
      if (pendingUploadPreview) URL.revokeObjectURL(pendingUploadPreview);
      setPendingUploadFile(null);
      setPendingUploadPreview(null);
      setIsViewOnceActive(false);
      setPendingCaption("");
      setReplyingTo(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleCancelPendingUpload = () => {
    if (pendingUploadPreview) URL.revokeObjectURL(pendingUploadPreview);
    setPendingUploadFile(null);
    setPendingUploadPreview(null);
    setIsViewOnceActive(false);
    setPendingCaption("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // 5.2 Open View-Once Photo Handler
  const handleOpenViewOnce = async (msg) => {
    if (!msg || !selectedChat) return;
    setActiveViewOnceMedia(msg);

    // If recipient is viewing, mark as opened in DB and socket
    if (msg.sender !== userData.username && !msg.viewOnceOpened) {
      try {
        await axios.post(`${serverUrl}/api/chat/${selectedChat._id}/message/${msg._id}/view-once`);
        socketRef.current?.emit("view-once-opened", {
          roomId: selectedChat._id,
          messageId: msg._id,
        });

        setSelectedChat((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            messages: prev.messages?.map((m) =>
              m._id === msg._id ? { ...m, viewOnceOpened: true } : m
            ),
          };
        });

        setChats((prev) =>
          prev.map((c) =>
            c._id === selectedChat._id
              ? {
                  ...c,
                  messages: c.messages?.map((m) =>
                    m._id === msg._id ? { ...m, viewOnceOpened: true } : m
                  ),
                }
              : c
          )
        );
      } catch (e) {
        console.error("Failed to mark view-once as opened:", e);
      }
    }
  };

  // 5.3 Forward Message Handler
  const handleForwardMessage = async (targetChat, msgToForward) => {
    if (!targetChat || !msgToForward) return;
    const targetPartner = targetChat.members?.find(
      (m) => String(m?._id || m) !== String(userData?._id)
    );

    const msgPayload = {
      chatId: targetChat._id,
      sender: userData.username,
      senderId: userData._id,
      recipientId: targetPartner?._id,
      text: msgToForward.text || "",
      mediaUrl: msgToForward.mediaUrl || "",
      mediaType: msgToForward.mediaType || "text",
      fileName: msgToForward.fileName || "",
      fileSize: msgToForward.fileSize || "",
      isViewOnce: false,
    };

    const res = await axios.post(`${serverUrl}/api/chat/message`, msgPayload);
    const saved = res.data;

    sounds.playMessageSent();

    socketRef.current?.emit("send-message", {
      roomId: targetChat._id,
      message: saved,
      recipientId: targetPartner?._id,
    });

    if (selectedChat && String(selectedChat._id) === String(targetChat._id)) {
      setSelectedChat((prev) => ({
        ...prev,
        messages: [...(prev.messages || []), saved],
      }));
    }

    setChats((prev) =>
      prev.map((c) =>
        String(c._id) === String(targetChat._id)
          ? {
              ...c,
              messages: [...(c.messages || []), saved],
              lastMessage: saved.text || (saved.mediaType === "image" ? "📷 Photo" : "📎 File"),
              lastMessageAt: new Date(),
            }
          : c
      )
    );
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

  // 1. Calculate total unread messages count for the Chats icon badge
  const totalUnreadMessages = useMemo(() => {
    if (!chats || !Array.isArray(chats)) return 0;
    return chats.reduce((acc, c) => {
      if (c.isAIChat) return acc;
      const count =
        c.messages?.filter((m) => m.sender !== userData?.username && !m.seen).length || 0;
      return acc + count;
    }, 0);
  }, [chats, userData?.username]);

  // 2. Calculate missed calls count for the Calls icon badge
  const missedCallsCount = useMemo(() => {
    if (!callLogs || !Array.isArray(callLogs)) return 0;
    return callLogs.filter((log) => {
      const isCaller = String(log.caller?._id || log.caller) === String(userData?._id);
      return !isCaller && (log.status === "missed" || log.status === "declined");
    }).length;
  }, [callLogs, userData?._id]);

  // 3. Filtered chats based on text search and filter chips (All, Unread, Favourites, Groups, AI)
  const filteredChats = useMemo(() => {
    return chats.filter((c) => {
      // Text search
      if (searchFilter.trim()) {
        const partner = getChatPartner(c);
        const q = searchFilter.toLowerCase();
        const matches =
          partner?.username?.toLowerCase().includes(q) ||
          partner?.name?.toLowerCase().includes(q) ||
          c.lastMessage?.toLowerCase().includes(q);
        if (!matches) return false;
      }

      // Filter chips
      if (chatFilter === "unread") {
        if (c.isAIChat) return false;
        const unread =
          c.messages?.filter((m) => m.sender !== userData?.username && !m.seen).length || 0;
        return unread > 0;
      }
      if (chatFilter === "favourites") {
        return mutedChats.has(c._id);
      }
      if (chatFilter === "groups") {
        return c.isGroup === true;
      }
      if (chatFilter === "ai") {
        return c.isAIChat === true;
      }
      return true;
    });
  }, [chats, searchFilter, chatFilter, userData?.username, mutedChats]);

  // 4. Quick handler to open Pulse AI Chat
  const handleOpenAIChat = () => {
    const aiChat = chats.find((c) => c.isAIChat) || {
      _id: "pulse_ai_chat_special",
      isAIChat: true,
      members: [userData, PULSE_AI_USER],
      messages: [
        {
          _id: "ai_intro_1",
          sender: "Pulse AI",
          text: "Welcome to PulseChat! 🚀 I'm Pulse AI, your intelligent neural companion. Ask me anything or chat with friends!",
          createdAt: new Date(),
        },
      ],
      lastMessage: "⚡ Pulse AI is online and ready to assist you.",
      lastMessageAt: new Date(),
    };
    setSelectedChat(aiChat);
    setSidebarTab("chats");
    setChatFilter("ai");
  };

  // 5. Quick handler to invite friends
  const handleInviteFriend = () => {
    const url = window.location.origin;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      alert("PulseChat link copied to clipboard! Share it with your friends.");
    } else {
      prompt("Share this link with your friends:", url);
    }
  };

  return (
    <div className="fixed inset-0 flex h-[100dvh] w-full bg-[#111b21] text-[#e9edef] overflow-hidden font-sans select-none">
      {/* ======================================================== */}
      {/* 1. FAR-LEFT VERTICAL ICON RAIL (WhatsApp Web Desktop Layout) */}
      {/* ======================================================== */}
      <div
        className={`w-[56px] sm:w-[60px] md:w-[68px] h-full bg-[#111b21] border-r border-[#222d34] flex flex-col items-center py-3.5 flex-shrink-0 z-30 select-none ${
          selectedChat ? "hidden md:flex" : "flex"
        }`}
      >
        {/* Top Navigation Rail Icons */}
        <div className="flex flex-col items-center gap-2 w-full">
          {/* 1. Chats Icon with Green Unread Badge */}
          <button
            onClick={() => setSidebarTab("chats")}
            className={`relative w-11 h-11 rounded-full flex items-center justify-center transition-all ${
              sidebarTab === "chats"
                ? "bg-[#374248] text-[#00a884]"
                : "text-[#aebac1] hover:text-white hover:bg-[#202c33]"
            }`}
            title="Chats"
          >
            <IconChat className="w-5 h-5" />
            {totalUnreadMessages > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#25d366] text-[#111b21] text-[10px] font-extrabold flex items-center justify-center shadow-xs">
                {totalUnreadMessages > 99 ? "99+" : totalUnreadMessages}
              </span>
            )}
          </button>

          {/* 2. Calls Icon with Missed Badge */}
          <button
            onClick={() => setSidebarTab("calls")}
            className={`relative w-11 h-11 rounded-full flex items-center justify-center transition-all ${
              sidebarTab === "calls"
                ? "bg-[#374248] text-[#00a884]"
                : "text-[#aebac1] hover:text-white hover:bg-[#202c33]"
            }`}
            title="Calls"
          >
            <IconPhone className="w-5 h-5" />
            {missedCallsCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#25d366] text-[#111b21] text-[10px] font-extrabold flex items-center justify-center shadow-xs">
                {missedCallsCount}
              </span>
            )}
          </button>

          {/* 3. Status Icon with Unviewed Green Dot */}
          <button
            onClick={() => setSidebarTab("status")}
            className={`relative w-11 h-11 rounded-full flex items-center justify-center transition-all ${
              sidebarTab === "status"
                ? "bg-[#374248] text-[#00a884]"
                : "text-[#aebac1] hover:text-white hover:bg-[#202c33]"
            }`}
            title="Status"
          >
            <IconStatus className="w-5 h-5" />
            {otherStatuses.some((s) => s.hasUnviewed) && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-[#25d366] ring-2 ring-[#111b21]" />
            )}
          </button>

          {/* 4. Channels / Broadcast Updates */}
          <button
            onClick={() => setSidebarTab("channels")}
            className={`relative w-11 h-11 rounded-full flex items-center justify-center transition-all ${
              sidebarTab === "channels"
                ? "bg-[#374248] text-[#00a884]"
                : "text-[#aebac1] hover:text-white hover:bg-[#202c33]"
            }`}
            title="Channels & Broadcasts"
          >
            <IconChannels className="w-5 h-5" />
          </button>

          {/* 5. Communities / Groups */}
          <button
            onClick={() => setSidebarTab("groups")}
            className={`relative w-11 h-11 rounded-full flex items-center justify-center transition-all ${
              sidebarTab === "groups"
                ? "bg-[#374248] text-[#00a884]"
                : "text-[#aebac1] hover:text-white hover:bg-[#202c33]"
            }`}
            title="Communities & Groups"
          >
            <IconUsers className="w-5 h-5" />
          </button>

          {/* Horizontal Divider */}
          <div className="w-7 h-[1px] bg-[#222d34] my-1" />

          {/* 6. Meta AI / Pulse AI Glowing Flower Icon */}
          <button
            onClick={handleOpenAIChat}
            className="relative w-11 h-11 rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
            title="Ask Pulse AI"
          >
            <IconMetaAI className="w-6 h-6 animate-pulse" />
          </button>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom Rail Section */}
        <div className="flex flex-col items-center gap-2.5 w-full">
          {/* Media / Starred Gallery */}
          <button
            onClick={() => {
              setSidebarTab("chats");
              setChatFilter("favourites");
            }}
            className="w-11 h-11 rounded-full flex items-center justify-center text-[#aebac1] hover:text-white hover:bg-[#202c33] transition"
            title="Starred & Media"
          >
            <IconMediaGallery className="w-5 h-5" />
          </button>

          {/* User Profile Avatar with WhatsApp-style Popup Menu */}
          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => setShowProfileMenu((prev) => !prev)}
              className="relative group p-0.5 rounded-full border-2 border-transparent hover:border-[#00a884] transition"
              title="Account & Profile Menu"
            >
              <img
                src={
                  userData?.avatar ||
                  `https://api.dicebear.com/7.x/bottts/svg?seed=${userData?.username || "user"}`
                }
                alt={userData?.username}
                className="w-9 h-9 rounded-full object-cover bg-[#202c33]"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#25d366] border-2 border-[#111b21]" />
            </button>

            {/* Profile Popover Menu (WhatsApp-style) */}
            {showProfileMenu && (
              <div className="absolute left-full bottom-0 ml-3 w-64 bg-[#233138] border border-[#2e3b43] rounded-2xl shadow-2xl py-2 z-50 text-xs text-[#d1d7db] animate-fade-in backdrop-blur-md">
                {/* User Info Header */}
                <div className="px-4 py-2.5 border-b border-[#2e3b43] flex items-center gap-3">
                  <img
                    src={
                      userData?.avatar ||
                      `https://api.dicebear.com/7.x/bottts/svg?seed=${userData?.username || "user"}`
                    }
                    alt={userData?.username}
                    className="w-10 h-10 rounded-full object-cover border border-[#2e3b43]"
                  />
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-[#e9edef] truncate">
                      {userData?.name || userData?.username}
                    </h4>
                    <p className="text-[11px] text-[#00a884] font-medium truncate">
                      @{userData?.username} • Active
                    </p>
                  </div>
                </div>

                {/* Menu Options */}
                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      setShowMyProfileModal(true);
                    }}
                    className="w-full px-4 py-2.5 text-left hover:bg-[#182229] flex items-center gap-3 transition text-[#d1d7db] hover:text-white"
                  >
                    <IconUser className="w-4 h-4 text-[#8696a0]" />
                    <span>Profile & Picture</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      setShowCreateGroupModal(true);
                    }}
                    className="w-full px-4 py-2.5 text-left hover:bg-[#182229] flex items-center gap-3 transition text-[#d1d7db] hover:text-white"
                  >
                    <IconUsers className="w-4 h-4 text-[#8696a0]" />
                    <span>New Group</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      setShowNewChatModal(true);
                    }}
                    className="w-full px-4 py-2.5 text-left hover:bg-[#182229] flex items-center gap-3 transition text-[#d1d7db] hover:text-white"
                  >
                    <IconChatPlus className="w-4 h-4 text-[#8696a0]" />
                    <span>New Chat</span>
                  </button>

                  <button
                    onClick={() => {
                      toggleSoundMute();
                    }}
                    className="w-full px-4 py-2.5 text-left hover:bg-[#182229] flex items-center justify-between transition text-[#d1d7db] hover:text-white"
                  >
                    <div className="flex items-center gap-3">
                      {isMutedSounds ? (
                        <IconVolumeX className="w-4 h-4 text-red-400" />
                      ) : (
                        <IconVolume2 className="w-4 h-4 text-[#00a884]" />
                      )}
                      <span>Sound Effects</span>
                    </div>
                    <span className="text-[10px] text-[#8696a0] font-mono">
                      {isMutedSounds ? "Muted" : "On"}
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      setSidebarTab("chats");
                      setChatFilter("favourites");
                    }}
                    className="w-full px-4 py-2.5 text-left hover:bg-[#182229] flex items-center gap-3 transition text-[#d1d7db] hover:text-white"
                  >
                    <IconStar className="w-4 h-4 text-[#8696a0]" />
                    <span>Starred Messages</span>
                  </button>
                </div>

                {/* Logout Divider */}
                <div className="border-t border-[#2e3b43] pt-1">
                  <button
                    onClick={() => {
                      dispatch(clearUserData());
                      navigate("/login");
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-red-500/10 text-red-400 hover:text-red-300 flex items-center gap-3 transition"
                  >
                    <IconLogOut className="w-4 h-4" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. ADJACENT LIST PANEL (Chats, Status, Calls, Groups, Channels) */}
      {/* ======================================================== */}
      <div
        className={`flex-1 md:w-[380px] lg:w-[410px] md:flex-initial border-r border-[#222d34] flex flex-col bg-[#111b21] shadow-xl ${
          selectedChat ? "hidden md:flex" : "flex"
        } h-full z-10 transition-all overflow-hidden flex-shrink-0 min-w-0`}
      >
        {/* TAB 1: CHATS VIEW */}
        {sidebarTab === "chats" && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Header: Title ("PulseChat"), 3-Dot Menu, and Circular "+ New Chat" Button (Screenshot 2) */}
            <div className="px-4 py-3 flex items-center justify-between flex-shrink-0 bg-[#111b21] border-b border-[#222d34]">
              <h2 className="text-xl font-bold text-[#e9edef] tracking-tight">PulseChat</h2>

              <div className="flex items-center gap-2">
                {/* 3-Dot Menu */}
                <div className="relative">
                  <button
                    onClick={() => setShowChatMenu((prev) => !prev)}
                    className="p-2 text-[#aebac1] hover:text-white rounded-full hover:bg-[#202c33] transition"
                    title="Menu"
                  >
                    <IconDotsVertical className="w-5 h-5" />
                  </button>

                  {showChatMenu && (
                    <div className="absolute right-0 top-full mt-2 w-52 bg-[#233138] border border-[#2e3b43] rounded-2xl shadow-2xl py-1.5 z-50 animate-fade-in text-xs text-[#d1d7db]">
                      <button
                        onClick={() => {
                          setShowChatMenu(false);
                          setShowCreateGroupModal(true);
                        }}
                        className="w-full px-3.5 py-2.5 text-left hover:bg-[#182229] flex items-center gap-2.5 transition"
                      >
                        <IconUsers className="w-4 h-4 text-[#8696a0]" />
                        <span>New group</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowChatMenu(false);
                          setSidebarTab("status");
                        }}
                        className="w-full px-3.5 py-2.5 text-left hover:bg-[#182229] flex items-center gap-2.5 transition"
                      >
                        <IconStatus className="w-4 h-4 text-[#8696a0]" />
                        <span>Status updates</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowChatMenu(false);
                          setSidebarTab("calls");
                        }}
                        className="w-full px-3.5 py-2.5 text-left hover:bg-[#182229] flex items-center gap-2.5 transition"
                      >
                        <IconPhone className="w-4 h-4 text-[#8696a0]" />
                        <span>Call history</span>
                      </button>
                      <div className="my-1 border-t border-[#2e3b43]"></div>
                      <button
                        onClick={() => {
                          setShowChatMenu(false);
                          setShowMyProfileModal(true);
                        }}
                        className="w-full px-3.5 py-2.5 text-left hover:bg-[#182229] flex items-center gap-2.5 transition"
                      >
                        <IconUser className="w-4 h-4 text-[#8696a0]" />
                        <span>Profile & Settings</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Green Circular "+ New Chat" Button (Exact match for Screenshot 2!) */}
                <button
                  onClick={() => setShowNewChatModal(true)}
                  className="w-9 h-9 rounded-full bg-[#00a884] hover:bg-[#02906f] text-[#111b21] flex items-center justify-center transition shadow-md shadow-[#00a884]/25 hover:scale-105 active:scale-95"
                  title="New chat"
                >
                  <IconChatPlus className="w-5 h-5 stroke-[2.4]" />
                </button>
              </div>
            </div>

            {/* Search Input Bar (Matching Screenshot 2) */}
            <div className="px-3 pt-2.5 pb-2 flex-shrink-0">
              <div className="relative">
                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8696a0]" />
                <input
                  type="text"
                  placeholder="Search or start a new chat"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#202c33] border border-transparent focus:border-[#00a884]/40 rounded-lg text-xs text-[#e9edef] placeholder-[#8696a0] focus:outline-none transition"
                />
              </div>
            </div>

            {/* Filter Pills Row (Matching Screenshot 2: All, Unread 1, Favourites, Groups, +) */}
            <div className="px-3 pb-2.5 flex items-center gap-1.5 overflow-x-auto flex-shrink-0 no-scrollbar">
              {/* All */}
              <button
                onClick={() => setChatFilter("all")}
                className={`px-3 py-1 rounded-full text-xs font-medium transition flex-shrink-0 ${
                  chatFilter === "all"
                    ? "bg-[#00a884]/20 text-[#00a884] border border-[#00a884]/40"
                    : "bg-[#202c33] text-[#8696a0] hover:text-[#d1d7db] hover:bg-[#2a3942]"
                }`}
              >
                All
              </button>

              {/* Unread */}
              <button
                onClick={() => setChatFilter("unread")}
                className={`px-3 py-1 rounded-full text-xs font-medium transition flex-shrink-0 flex items-center gap-1.5 ${
                  chatFilter === "unread"
                    ? "bg-[#00a884]/20 text-[#00a884] border border-[#00a884]/40"
                    : "bg-[#202c33] text-[#8696a0] hover:text-[#d1d7db] hover:bg-[#2a3942]"
                }`}
              >
                <span>Unread</span>
                {totalUnreadMessages > 0 && (
                  <span className="text-[10px] font-bold text-[#00a884]">
                    {totalUnreadMessages}
                  </span>
                )}
              </button>

              {/* Favourites */}
              <button
                onClick={() => setChatFilter("favourites")}
                className={`px-3 py-1 rounded-full text-xs font-medium transition flex-shrink-0 ${
                  chatFilter === "favourites"
                    ? "bg-[#00a884]/20 text-[#00a884] border border-[#00a884]/40"
                    : "bg-[#202c33] text-[#8696a0] hover:text-[#d1d7db] hover:bg-[#2a3942]"
                }`}
              >
                Favourites
              </button>

              {/* Groups */}
              <button
                onClick={() => setChatFilter("groups")}
                className={`px-3 py-1 rounded-full text-xs font-medium transition flex-shrink-0 ${
                  chatFilter === "groups"
                    ? "bg-[#00a884]/20 text-[#00a884] border border-[#00a884]/40"
                    : "bg-[#202c33] text-[#8696a0] hover:text-[#d1d7db] hover:bg-[#2a3942]"
                }`}
              >
                Groups
              </button>

              {/* AI Bot */}
              <button
                onClick={() => setChatFilter("ai")}
                className={`px-3 py-1 rounded-full text-xs font-medium transition flex-shrink-0 flex items-center gap-1 ${
                  chatFilter === "ai"
                    ? "bg-[#00a884]/20 text-[#00a884] border border-[#00a884]/40"
                    : "bg-[#202c33] text-[#8696a0] hover:text-[#d1d7db] hover:bg-[#2a3942]"
                }`}
              >
                <span>AI Bot</span>
              </button>

              {/* + Add New Conversation */}
              <button
                onClick={() => setShowNewChatModal(true)}
                className="w-7 h-7 rounded-full bg-[#202c33] hover:bg-[#2a3942] text-[#8696a0] hover:text-white flex items-center justify-center text-sm font-bold flex-shrink-0 transition"
                title="New conversation"
              >
                +
              </button>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
              {filteredChats.map((chat) => {
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
                    className={`group relative p-3 rounded-xl cursor-pointer transition-all flex items-center gap-3.5 border ${
                      isSelected
                        ? "bg-[#2a3942] border-[#00a884]/30 text-[#e9edef]"
                        : "hover:bg-[#202c33] text-[#d1d7db] border-transparent"
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
                        className="w-11 h-11 rounded-full object-cover border border-[#2e3b43] group-hover:scale-105 transition bg-[#202c33]"
                      />
                      {isOnline && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#25d366] border-2 border-[#111b21] rounded-full shadow-xs"></span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1.5 truncate">
                          <span
                            className={`font-semibold text-sm truncate ${
                              isSelected ? "text-[#e9edef]" : "text-[#d1d7db]"
                            }`}
                          >
                            {partner.name || partner.username}
                          </span>
                          {chat.isAIChat && (
                            <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 bg-[#a855f7]/20 text-[#c084fc] rounded border border-[#a855f7]/30">
                              <IconSparkles className="w-2.5 h-2.5" /> AI
                            </span>
                          )}
                          {chat.isGroup && (
                            <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 bg-[#00a884]/20 text-[#00a884] rounded border border-[#00a884]/30">
                              <IconUsers className="w-2.5 h-2.5" /> Group
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-[#8696a0] font-mono">
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
                            isSelected ? "text-[#d1d7db]" : "text-[#8696a0]"
                          }`}
                        >
                          {chat.lastMessage || (chat.isGroup ? "Group created" : "No messages yet")}
                        </p>

                        {/* Unread message count badge */}
                        {unreadCount > 0 && !isSelected && (
                          <span className="ml-2 px-2 py-0.5 rounded-full bg-[#25d366] text-[#111b21] text-[10px] font-extrabold shadow-xs flex-shrink-0">
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
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {/* Header */}
            <div className="px-1 flex items-center justify-between text-sm font-bold text-[#e9edef]">
              <span>Status Updates</span>
              <button
                onClick={() => setShowCreateStatusModal(true)}
                className="p-1.5 rounded-lg bg-[#202c33] text-[#00a884] hover:bg-[#2a3942] transition"
                title="Add status"
              >
                <IconCamera className="w-4 h-4" />
              </button>
            </div>

            {/* My Status Card */}
            <div className="p-3 bg-[#202c33] hover:bg-[#2a3942] border border-[#2e3b43] rounded-2xl transition flex items-center justify-between">
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
                        ? "border-[#00a884] ring-2 ring-[#00a884]/40"
                        : "border-[#2e3b43]"
                    }`}
                  />
                  {(!myStatus || myStatus.statuses?.length === 0) && (
                    <span className="absolute bottom-0 right-0 w-4 h-4 bg-[#00a884] text-[#111b21] rounded-full flex items-center justify-center text-[11px] font-extrabold shadow-xs">
                      +
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-sm text-[#e9edef] truncate">My Status</h4>
                  <p className="text-xs text-[#8696a0] truncate">
                    {myStatus && myStatus.statuses?.length > 0
                      ? `${myStatus.statuses.length} update${myStatus.statuses.length > 1 ? "s" : ""} • Tap to view`
                      : "Tap to add status update"}
                  </p>
                </div>
              </div>

              {/* Quick add status button */}
              <button
                onClick={() => setShowCreateStatusModal(true)}
                className="p-2 bg-[#2a3942] hover:bg-[#374248] text-[#8696a0] hover:text-[#00a884] rounded-xl transition shadow-xs"
                title="Add text or photo status"
              >
                <IconCamera className="w-4 h-4" />
              </button>
            </div>

            {/* Recent Updates Header */}
            <div className="pt-2 px-1 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#8696a0]">
              <span>Recent Updates</span>
              <span className="text-[#00a884] font-mono font-bold">{otherStatuses.length}</span>
            </div>

            {/* Contacts Status List */}
            {loadingStatuses ? (
              <div className="py-8 text-center text-xs text-[#8696a0]">Loading updates...</div>
            ) : otherStatuses.length === 0 ? (
              <div className="p-6 text-center bg-[#18222d] border border-[#222d34] rounded-2xl">
                <p className="text-xs text-[#d1d7db] font-medium">No recent updates</p>
                <p className="text-[11px] text-[#8696a0] mt-1">
                  Status updates from contacts will appear here and disappear after 24 hours.
                </p>
                <button
                  onClick={() => setShowCreateStatusModal(true)}
                  className="mt-3 px-3.5 py-1.5 rounded-xl bg-[#00a884] hover:bg-[#02906f] text-[#111b21] text-xs font-bold transition shadow-xs"
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
                      className="p-2.5 rounded-2xl hover:bg-[#202c33] border border-transparent hover:border-[#2e3b43] flex items-center gap-3 cursor-pointer transition"
                    >
                      <div className="relative flex-shrink-0">
                        <img
                          src={contact.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${contact.username}`}
                          alt={contact.username}
                          className={`w-11 h-11 rounded-full object-cover p-0.5 border-2 transition ${
                            item.hasUnviewed
                              ? "border-[#25d366] ring-2 ring-[#25d366]/40"
                              : "border-[#374248]"
                          }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm text-[#e9edef] truncate">
                          {contact.name || contact.username}
                        </h4>
                        <p className="text-xs text-[#8696a0] truncate flex items-center gap-1.5">
                          <span>
                            {item.statuses.length} update{item.statuses.length > 1 ? "s" : ""}
                          </span>
                          <span>•</span>
                          <span>{formatRelativeTime(lastStatus?.createdAt)}</span>
                        </p>
                      </div>
                      {item.hasUnviewed && (
                        <span className="w-2.5 h-2.5 rounded-full bg-[#25d366] ring-2 ring-[#111b21]"></span>
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
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
            {/* Header with clear history button */}
            <div className="px-1 py-1 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#8696a0]">
              <span>Call History</span>
              {callLogs.length > 0 && (
                <button
                  onClick={handleClearCallLogs}
                  className="text-[11px] font-semibold text-red-400 hover:text-red-300 transition flex items-center gap-1"
                >
                  <IconTrash className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {loadingCallLogs ? (
              <div className="py-8 text-center text-xs text-[#8696a0]">Loading call history...</div>
            ) : callLogs.length === 0 ? (
              <div className="p-6 text-center bg-[#18222d] border border-[#222d34] rounded-2xl">
                <p className="text-xs text-[#d1d7db] font-medium">No call logs yet</p>
                <p className="text-[11px] text-[#8696a0] mt-1">
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
                      className="p-2.5 rounded-2xl hover:bg-[#202c33] border border-transparent hover:border-[#2e3b43] flex items-center gap-3 transition group"
                    >
                      {/* Contact avatar */}
                      <img
                        src={
                          otherParty?.avatar ||
                          `https://api.dicebear.com/7.x/bottts/svg?seed=${otherParty?.username || "call"}`
                        }
                        alt={otherParty?.username}
                        className="w-11 h-11 rounded-full object-cover border border-[#2e3b43]"
                      />

                      {/* Call Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm text-[#e9edef] truncate">
                          {otherParty?.name || otherParty?.username || "Contact"}
                        </h4>
                        <div className="flex items-center gap-1.5 text-xs mt-0.5">
                          {isCaller ? (
                            <span className="flex items-center gap-1 text-[#53bdeb]">
                              <IconArrowUpRight className="w-3.5 h-3.5" />
                              <span>Outgoing</span>
                            </span>
                          ) : isMissed ? (
                            <span className="flex items-center gap-1 text-red-400 font-semibold">
                              <IconArrowDownLeft className="w-3.5 h-3.5" />
                              <span>Missed</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[#25d366]">
                              <IconArrowDownLeft className="w-3.5 h-3.5" />
                              <span>Incoming</span>
                            </span>
                          )}

                          <span className="text-[#8696a0]">•</span>
                          <span className="text-[#8696a0] text-[11px]">
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
                          className="p-2 rounded-xl bg-[#202c33] hover:bg-[#00a884]/20 text-[#8696a0] hover:text-[#00a884] border border-[#2e3b43] transition"
                          title="Audio call back"
                        >
                          <IconPhone className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleCallbackUser(otherParty, "video")}
                          className="p-2 rounded-xl bg-[#202c33] hover:bg-[#53bdeb]/20 text-[#8696a0] hover:text-[#53bdeb] border border-[#2e3b43] transition"
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

        {/* TAB 4: COMMUNITIES & GROUPS VIEW */}
        {sidebarTab === "groups" && (
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {/* Create New Group Card */}
            <div
              onClick={() => setShowCreateGroupModal(true)}
              className="p-3.5 bg-[#202c33] hover:bg-[#2a3942] border border-[#2e3b43] rounded-2xl transition cursor-pointer flex items-center gap-3.5 group"
            >
              <div className="w-12 h-12 rounded-xl bg-[#00a884]/20 text-[#00a884] flex items-center justify-center border border-[#00a884]/30 group-hover:scale-105 transition flex-shrink-0">
                <IconUsers className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm text-[#e9edef] group-hover:text-[#00a884] transition">
                  + Create New Group
                </h4>
                <p className="text-xs text-[#8696a0] truncate mt-0.5">
                  Connect family, teams, and friends together
                </p>
              </div>
            </div>

            {/* Groups Section Header */}
            <div className="pt-2 px-1 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#8696a0]">
              <span>Your Groups</span>
              <span className="text-[#00a884] font-mono font-bold">
                {chats.filter((c) => c.isGroup).length}
              </span>
            </div>

            {/* Group List */}
            <div className="space-y-1">
              {chats.filter((c) => c.isGroup).length === 0 ? (
                <div className="p-6 text-center bg-[#18222d] border border-[#222d34] rounded-2xl">
                  <p className="text-xs text-[#d1d7db] font-medium">No groups yet</p>
                  <p className="text-[11px] text-[#8696a0] mt-1">
                    Create a group to start chatting and sharing media with multiple people.
                  </p>
                  <button
                    onClick={() => setShowCreateGroupModal(true)}
                    className="mt-3 px-3.5 py-1.5 rounded-xl bg-[#00a884] hover:bg-[#02906f] text-[#111b21] text-xs font-bold transition shadow-xs"
                  >
                    Create Group
                  </button>
                </div>
              ) : (
                chats
                  .filter((c) => c.isGroup)
                  .map((chat) => (
                    <div
                      key={chat._id}
                      onClick={() => {
                        setSelectedChat(chat);
                        setSidebarTab("chats");
                      }}
                      className="p-3 rounded-2xl hover:bg-[#202c33] border border-transparent hover:border-[#2e3b43] flex items-center gap-3.5 cursor-pointer transition group"
                    >
                      <img
                        src={
                          chat.groupAvatar ||
                          `https://api.dicebear.com/7.x/identicon/svg?seed=${chat._id}`
                        }
                        alt={chat.groupName}
                        className="w-11 h-11 rounded-full object-cover border border-[#2e3b43] group-hover:scale-105 transition"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm text-[#e9edef] truncate">
                          {chat.groupName}
                        </h4>
                        <p className="text-xs text-[#8696a0] truncate mt-0.5">
                          {chat.members?.length || 0} participants • {chat.lastMessage || "Group chat"}
                        </p>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        )}

        {/* TAB 5: CHANNELS & BROADCAST VIEW */}
        {sidebarTab === "channels" && (
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {/* Channels Header Card */}
            <div className="p-4 bg-gradient-to-br from-teal-900/30 to-emerald-950/30 border border-emerald-800/30 rounded-2xl text-[#e9edef]">
              <div className="flex items-center gap-2 mb-1.5">
                <IconChannels className="w-5 h-5 text-[#00a884]" />
                <h4 className="font-bold text-sm text-[#00a884]">Pulse Channels</h4>
              </div>
              <p className="text-xs text-[#8696a0] leading-relaxed">
                Stay updated on topics you care about. Discover official channels, news, and broadcasts.
              </p>
            </div>

            {/* Official Pulse Updates Channel */}
            <div
              onClick={handleOpenAIChat}
              className="p-3 rounded-2xl bg-[#202c33] hover:bg-[#2a3942] border border-[#2e3b43] flex items-center gap-3.5 cursor-pointer transition group"
            >
              <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-pink-500 via-purple-600 to-indigo-600 flex items-center justify-center text-white flex-shrink-0 shadow-md">
                <IconSparkles className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-semibold text-sm text-[#e9edef] truncate">Pulse Official</h4>
                  <span className="text-[10px] bg-[#00a884]/20 text-[#00a884] px-1.5 py-0.2 rounded font-bold">Verified</span>
                </div>
                <p className="text-xs text-[#8696a0] truncate mt-0.5">
                  ⚡ Welcome to PulseChat 2.0 with Voice & Video Calls and 24h Stories!
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 3. RIGHT MAIN AREA: Chat Screen OR Welcome Screen */}
      {/* ======================================================== */}
      <div
        className={`flex-1 flex flex-col bg-[#0b141a] h-full ${
          !selectedChat ? "hidden md:flex" : "flex"
        } relative overflow-hidden`}
      >
        {selectedChat ? (
          <>
            {/* Chat Top Header Bar */}
            <div className="p-3 md:p-3.5 bg-[#202c33] border-b border-[#222d34] flex items-center justify-between z-20 shadow-sm">
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
                  className="md:hidden p-2 text-[#aebac1] hover:text-white rounded-xl hover:bg-[#374248] transition -ml-1"
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
                    className="w-10 h-10 rounded-full object-cover border border-[#2e3b43] group-hover:border-[#00a884] transition shadow-xs bg-[#111b21]"
                  />
                  {!selectedChat.isGroup &&
                    (isPartnerOnline ? (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#25d366] border-2 border-[#202c33] rounded-full animate-pulse"></span>
                    ) : (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#8696a0] border-2 border-[#202c33] rounded-full"></span>
                    ))}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm md:text-base text-[#e9edef] truncate group-hover:text-[#00a884] transition flex items-center gap-1.5">
                      <span>{currentPartner?.name || currentPartner?.username}</span>
                      {mutedChats.has(selectedChat._id) && (
                        <span title="Notifications muted">
                          <IconBellOff className="w-3.5 h-3.5 text-[#8696a0]" />
                        </span>
                      )}
                      {selectedChat.isGroup && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#00a884]/20 text-[#00a884] font-bold border border-[#00a884]/30">
                          Group
                        </span>
                      )}
                      {isContactBlockedByMe && !selectedChat.isGroup && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-bold border border-red-500/30">
                          Blocked
                        </span>
                      )}
                      {!selectedChat.isAIChat && (
                        <span className="text-[10px] text-[#8696a0] group-hover:text-[#00a884] transition">
                          ↗
                        </span>
                      )}
                    </h3>
                    {selectedChat.isAIChat && (
                      <span className="text-[10px] bg-[#a855f7]/20 text-[#c084fc] px-2 py-0.5 rounded-full font-bold border border-[#a855f7]/30">
                        Neural Bot
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#8696a0] truncate">
                    {remoteTypingUser ? (
                      <span className="text-[#00a884] font-medium animate-pulse">
                        ✍️ {remoteTypingUser} is typing...
                      </span>
                    ) : selectedChat.isGroup ? (
                      <span className="text-[#8696a0] font-medium">
                        {selectedChat.members?.length || 0} participants • Tap for info
                      </span>
                    ) : isPartnerOnline ? (
                      <span className="text-[#25d366] font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#25d366] animate-pulse"></span>
                        Active Now
                      </span>
                    ) : (
                      <span className="text-[#8696a0]">
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
                          ? "bg-[#202c33] text-[#8696a0] border-[#2e3b43] cursor-not-allowed"
                          : "bg-[#202c33] hover:bg-[#00a884]/20 text-[#aebac1] hover:text-[#00a884] border-[#2e3b43] hover:scale-105 active:scale-95"
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
                          ? "bg-[#202c33] text-[#8696a0] border-[#2e3b43] cursor-not-allowed"
                          : "bg-[#202c33] hover:bg-[#53bdeb]/20 text-[#aebac1] hover:text-[#53bdeb] border-[#2e3b43] hover:scale-105 active:scale-95"
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
                        ? "bg-[#374248] text-white border-[#00a884]/40"
                        : "bg-[#202c33] text-[#aebac1] hover:text-white hover:bg-[#374248] border-[#2e3b43]"
                    }`}
                    title="More options"
                  >
                    <IconDotsVertical className="w-4 h-4" />
                  </button>

                  {/* Dropdown Popover */}
                  {showChatMenu && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-[#233138] border border-[#2e3b43] rounded-2xl shadow-xl py-1.5 z-50 animate-fade-in text-xs font-medium text-[#d1d7db]">
                      {selectedChat.isGroup ? (
                        <>
                          {/* Group info */}
                          <button
                            onClick={() => {
                              setShowChatMenu(false);
                              setShowGroupInfoModal(true);
                            }}
                            className="w-full px-3.5 py-2.5 text-left hover:bg-[#182229] flex items-center gap-2.5 transition text-[#d1d7db] hover:text-white"
                          >
                            <IconInfo className="w-4 h-4 text-[#8696a0]" />
                            <span>Group info</span>
                          </button>

                          {/* Search in group chat */}
                          <button
                            onClick={() => {
                              setShowChatMenu(false);
                              setSearchInChatOpen((prev) => !prev);
                            }}
                            className="w-full px-3.5 py-2.5 text-left hover:bg-[#182229] flex items-center gap-2.5 transition text-[#d1d7db] hover:text-white"
                          >
                            <IconSearch className="w-4 h-4 text-[#8696a0]" />
                            <span>Search in conversation</span>
                          </button>

                          {/* Mute notifications */}
                          <button
                            onClick={() => {
                              handleToggleMuteChat(selectedChat._id);
                              setShowChatMenu(false);
                            }}
                            className="w-full px-3.5 py-2.5 text-left hover:bg-[#182229] flex items-center gap-2.5 transition text-[#d1d7db] hover:text-white"
                          >
                            {mutedChats.has(selectedChat._id) ? (
                              <>
                                <IconBell className="w-4 h-4 text-[#8696a0]" />
                                <span>Unmute notifications</span>
                              </>
                            ) : (
                              <>
                                <IconBellOff className="w-4 h-4 text-[#8696a0]" />
                                <span>Mute notifications</span>
                              </>
                            )}
                          </button>

                          <div className="my-1 border-t border-[#2e3b43]"></div>

                          {/* Clear chat history */}
                          <button
                            onClick={() => {
                              setShowChatMenu(false);
                              if (window.confirm("Are you sure you want to clear all messages in this group?")) {
                                handleClearChatHistory();
                              }
                            }}
                            className="w-full px-3.5 py-2.5 text-left hover:bg-[#182229] flex items-center gap-2.5 transition text-[#d1d7db] hover:text-white"
                          >
                            <IconTrash className="w-4 h-4 text-[#8696a0]" />
                            <span>Clear chat history</span>
                          </button>

                          {/* Leave / Exit group */}
                          <button
                            onClick={() => {
                              setShowChatMenu(false);
                              handleLeaveGroup();
                            }}
                            className="w-full px-3.5 py-2.5 text-left hover:bg-red-500/10 flex items-center gap-2.5 transition text-red-400 font-medium"
                          >
                            <IconLogOut className="w-4 h-4 text-red-400" />
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
                            className="w-full px-3.5 py-2.5 text-left hover:bg-[#182229] flex items-center gap-2.5 transition text-[#d1d7db] hover:text-white"
                          >
                            <IconUser className="w-4 h-4 text-[#8696a0]" />
                            <span>Contact info</span>
                          </button>

                          {/* 2. Media, links, and docs */}
                          <button
                            onClick={() => {
                              setShowChatMenu(false);
                              setProfileModalTab("photos");
                              setShowProfileModal(true);
                            }}
                            className="w-full px-3.5 py-2.5 text-left hover:bg-[#182229] flex items-center gap-2.5 transition text-[#d1d7db] hover:text-white"
                          >
                            <IconCamera className="w-4 h-4 text-[#8696a0]" />
                            <span>Media, links and docs</span>
                          </button>

                          {/* 3. Search in chat */}
                          <button
                            onClick={() => {
                              setShowChatMenu(false);
                              setSearchInChatOpen((prev) => !prev);
                            }}
                            className="w-full px-3.5 py-2.5 text-left hover:bg-[#182229] flex items-center gap-2.5 transition text-[#d1d7db] hover:text-white"
                          >
                            <IconSearch className="w-4 h-4 text-[#8696a0]" />
                            <span>Search in conversation</span>
                          </button>

                          {/* 4. Mute notifications */}
                          <button
                            onClick={() => {
                              handleToggleMuteChat(selectedChat._id);
                              setShowChatMenu(false);
                            }}
                            className="w-full px-3.5 py-2.5 text-left hover:bg-[#182229] flex items-center gap-2.5 transition text-[#d1d7db] hover:text-white"
                          >
                            {mutedChats.has(selectedChat._id) ? (
                              <>
                                <IconBell className="w-4 h-4 text-[#8696a0]" />
                                <span>Unmute notifications</span>
                              </>
                            ) : (
                              <>
                                <IconBellOff className="w-4 h-4 text-[#8696a0]" />
                                <span>Mute notifications</span>
                              </>
                            )}
                          </button>

                          <div className="my-1 border-t border-[#2e3b43]"></div>

                          {/* 5. Clear chat */}
                          <button
                            onClick={() => {
                              setShowChatMenu(false);
                              if (window.confirm("Are you sure you want to clear all messages in this chat?")) {
                                handleClearChatHistory();
                              }
                            }}
                            className="w-full px-3.5 py-2.5 text-left hover:bg-[#182229] flex items-center gap-2.5 transition text-[#d1d7db] hover:text-white"
                          >
                            <IconTrash className="w-4 h-4 text-[#8696a0]" />
                            <span>Clear chat history</span>
                          </button>

                          {/* 6. Block / Unblock contact */}
                          <button
                            onClick={() => {
                              setShowChatMenu(false);
                              handleToggleBlockContact();
                            }}
                            className={`w-full px-3.5 py-2.5 text-left hover:bg-[#182229] flex items-center gap-2.5 transition ${
                              isContactBlockedByMe ? "text-[#00a884] font-semibold" : "text-[#d1d7db]"
                            }`}
                          >
                            <IconBan className={`w-4 h-4 ${isContactBlockedByMe ? "text-[#00a884]" : "text-red-400"}`} />
                            <span>{isContactBlockedByMe ? "Unblock contact" : "Block contact"}</span>
                          </button>

                          {/* 7. Delete chat */}
                          <button
                            onClick={() => {
                              setShowChatMenu(false);
                              handleDeleteChat();
                            }}
                            className="w-full px-3.5 py-2.5 text-left hover:bg-red-500/10 flex items-center gap-2.5 transition text-red-400 font-medium"
                          >
                            <IconTrash className="w-4 h-4 text-red-400" />
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
                            className="w-full px-3.5 py-2.5 text-left hover:bg-[#182229] flex items-center gap-2.5 transition text-[#d1d7db] hover:text-white"
                          >
                            <IconSearch className="w-4 h-4 text-[#8696a0]" />
                            <span>Search in conversation</span>
                          </button>

                          <button
                            onClick={() => {
                              setShowChatMenu(false);
                              handleClearChatHistory();
                            }}
                            className="w-full px-3.5 py-2.5 text-left hover:bg-[#182229] flex items-center gap-2.5 transition text-[#d1d7db] hover:text-white"
                          >
                            <IconTrash className="w-4 h-4 text-[#8696a0]" />
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
              <div className="bg-[#202c33] border-b border-[#222d34] px-4 py-2 flex items-center gap-3 backdrop-blur-md shadow-xs z-20 animate-fade-in">
                <IconSearch className="w-4 h-4 text-[#8696a0] flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search in conversation..."
                  value={chatSearchQuery}
                  onChange={(e) => setChatSearchQuery(e.target.value)}
                  autoFocus
                  className="flex-1 bg-[#111b21] border border-[#2e3b43] rounded-xl px-3 py-1.5 text-xs text-[#e9edef] placeholder-[#8696a0] focus:outline-none focus:border-[#00a884]/40 transition"
                />
                {chatSearchQuery && (
                  <span className="text-[11px] font-semibold text-[#8696a0] font-mono">
                    {matchingChatMessagesCount} {matchingChatMessagesCount === 1 ? "match" : "matches"}
                  </span>
                )}
                <button
                  onClick={() => {
                    setSearchInChatOpen(false);
                    setChatSearchQuery("");
                  }}
                  className="p-1 rounded-lg text-[#8696a0] hover:text-white hover:bg-[#374248] transition"
                  title="Close search"
                >
                  <IconClose className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* BLOCKED CONTACT WARNING BANNER WITH INSTANT UNBLOCK */}
            {isContactBlockedByMe && (
              <div className="bg-red-900/30 border-b border-red-800/40 px-4 py-2.5 flex items-center justify-between text-xs text-red-300 z-20 backdrop-blur-md animate-fade-in shadow-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <IconBan className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span className="truncate font-medium">You have blocked this contact. They cannot message or call you.</span>
                </div>
                <button
                  onClick={handleToggleBlockContact}
                  className="px-3.5 py-1.5 rounded-xl bg-[#00a884] hover:bg-[#02906f] text-[#111b21] font-bold text-xs transition shadow-sm hover:scale-105 active:scale-95 flex-shrink-0 ml-2"
                >
                  Unblock Contact
                </button>
              </div>
            )}

            {/* LIVE ACTIVE CALL BANNER */}
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
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 bg-[#0b141a]">
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
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#18222d] border border-[#222d34] text-xs text-[#8696a0] font-medium shadow-xs hover:bg-[#202c33] transition cursor-pointer select-none"
                      >
                        <span>{msg.text}</span>
                        <span className="text-[10px] text-[#8696a0] font-mono">
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
                    id={`msg-${msg._id}`}
                    className={`flex flex-col ${isSender ? "items-end" : "items-start"} group relative`}
                  >
                    <div
                      className={`relative max-w-[85%] md:max-w-[70%] rounded-2xl p-3 px-4 transition-all ${
                        isSender
                          ? "bg-[#005c4b] text-[#e9edef] rounded-br-xs shadow-md shadow-black/20"
                          : "bg-[#202c33] border border-[#2e3b43] text-[#e9edef] rounded-bl-xs shadow-xs"
                      }`}
                    >
                      {/* Sender label in received mode */}
                      {!isSender && (
                        <p className="text-[11px] font-bold text-[#00a884] mb-1">
                          {msg.sender}
                        </p>
                      )}

                      {/* Quoted / Replied-to Message Banner */}
                      {msg.replyTo && msg.replyTo.sender && (
                        <div
                          onClick={() => {
                            const el = document.getElementById(`msg-${msg.replyTo.messageId}`);
                            if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                          }}
                          className="mb-2 p-2 rounded-lg bg-black/25 hover:bg-black/35 border-l-4 border-[#00a884] text-xs cursor-pointer transition select-none text-left"
                        >
                          <p className="font-bold text-[11px] text-[#25d366] truncate">
                            {msg.replyTo.sender === userData.username ? "You" : msg.replyTo.sender}
                          </p>
                          <p className="text-[11px] text-[#e9edef]/80 truncate">
                            {msg.replyTo.text ||
                              (msg.replyTo.mediaType === "audio"
                                ? "🎵 Voice message"
                                : "📷 Photo")}
                          </p>
                        </div>
                      )}

                      {/* View-Once Photo or Standard Image */}
                      {msg.isViewOnce ? (
                        msg.viewOnceOpened ? (
                          <div className="flex items-center gap-2 py-1.5 px-1 text-xs text-[#8696a0] select-none font-medium">
                            <IconViewOnce className="w-4 h-4 text-[#8696a0]" />
                            <span>Photo • Opened</span>
                          </div>
                        ) : isSender ? (
                          <div className="flex items-center gap-2 py-1.5 px-1 text-xs select-none font-medium text-[#e9edef]">
                            <div className="w-5 h-5 rounded-full border border-[#00a884] text-[#00a884] flex items-center justify-center font-bold text-[10px]">
                              1
                            </div>
                            <span>Photo (View once)</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenViewOnce(msg)}
                            className="flex items-center gap-2.5 py-1.5 px-3 my-1 rounded-xl bg-[#111b21]/60 hover:bg-[#111b21] border border-[#00a884]/40 hover:border-[#00a884] transition text-xs font-semibold text-[#e9edef] group cursor-pointer"
                          >
                            <div className="w-6 h-6 rounded-full border-2 border-[#00a884] text-[#00a884] flex items-center justify-center font-bold text-xs group-hover:scale-110 transition bg-[#00a884]/15">
                              1
                            </div>
                            <div className="flex flex-col text-left">
                              <span className="text-[#00a884] group-hover:underline font-bold">Photo</span>
                              <span className="text-[10px] text-[#8696a0]">Tap to view once</span>
                            </div>
                          </button>
                        )
                      ) : (
                        /* Standard Image Attachment */
                        msg.mediaType === "image" && msg.mediaUrl && (
                          <div className="my-1 rounded-xl overflow-hidden cursor-pointer border border-white/10">
                            <img
                              src={getMediaUrl(msg.mediaUrl)}
                              alt="Attached"
                              onClick={() => setPreviewImage(getMediaUrl(msg.mediaUrl))}
                              className="max-h-72 w-full object-cover rounded-xl hover:scale-[1.01] transition duration-200"
                            />
                          </div>
                        )
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
                              ? "bg-white/10 hover:bg-white/15 border-white/20 text-[#e9edef]"
                              : "bg-[#111b21] hover:bg-[#182229] border-[#2e3b43] text-[#e9edef]"
                          }`}
                        >
                          <IconPaperclip className={`w-5 h-5 ${isSender ? "text-emerald-200" : "text-[#00a884]"}`} />
                          <div className="flex-1 truncate">
                            <p className="font-semibold truncate">{msg.fileName || msg.text || "File"}</p>
                            <span className={`text-[10px] ${isSender ? "text-emerald-200/80" : "text-[#8696a0]"}`}>
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
                          isSender ? "text-emerald-200/80" : "text-[#8696a0]"
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
                                   <span className="text-[9px] text-[#53bdeb] font-semibold tracking-tight">
                                    {msg.seenAt ? `Seen ${formatRelativeTime(msg.seenAt)}` : "Seen"}
                                  </span>
                                )}
                                <span title={msg.seenAt ? `Seen ${formatRelativeTime(msg.seenAt)}` : "Seen"}>
                                  <IconCheckDouble className="w-3.5 h-3.5 text-[#53bdeb] stroke-[2.5]" />
                                </span>
                              </>
                            ) : (
                              <span title="Delivered">
                                <IconCheckDouble className="w-3.5 h-3.5 text-[#8696a0]" />
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
                                className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-[#182229] border border-[#2e3b43] shadow-xs hover:bg-[#202c33] text-[#e9edef] transition"
                              >
                                <span>{emoji}</span>
                                <span className="font-mono text-[10px] font-bold text-[#8696a0]">{count}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Quick Reaction & Action Hover Bar */}
                    {!selectedChat.isAIChat && (
                      <div
                        className={`absolute -top-7 ${
                          isSender ? "right-2" : "left-2"
                        } hidden group-hover:flex items-center gap-1 bg-[#233138] border border-[#2e3b43] rounded-full px-2 py-1 shadow-lg z-20`}
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

                        {/* Reply to message */}
                        <button
                          onClick={() => setReplyingTo(msg)}
                          className="p-1 text-[#8696a0] hover:text-[#00a884] transition"
                          title="Reply"
                        >
                          <IconReply className="w-3.5 h-3.5" />
                        </button>

                        {/* Forward message */}
                        <button
                          onClick={() => {
                            setForwardingMsg(msg);
                            setShowForwardModal(true);
                          }}
                          className="p-1 text-[#8696a0] hover:text-[#00a884] transition"
                          title="Forward message"
                        >
                          <IconForward className="w-3.5 h-3.5" />
                        </button>

                        {/* Copy message text */}
                        {msg.text && (
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(msg.text);
                              setCopiedMsgId(msg._id);
                              setTimeout(() => setCopiedMsgId(null), 1500);
                            }}
                            className="p-1 text-[#8696a0] hover:text-white transition"
                            title={copiedMsgId === msg._id ? "Copied!" : "Copy message"}
                          >
                            <IconCopy className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Delete message (sender only) */}
                        {isSender && (
                          <button
                            onClick={() => handleDeleteMessage(msg._id)}
                            className="p-1 text-[#8696a0] hover:text-red-400 transition"
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
            <div className="relative p-3 md:p-3.5 bg-[#202c33] border-t border-[#222d34] shadow-xs">
              {/* If user is blocked */}
              {isContactBlockedByMe ? (
                <div className="flex items-center justify-center gap-3 py-3 px-4 text-xs text-[#8696a0] bg-[#111b21] rounded-xl border border-[#2e3b43]">
                  <IconBan className="w-4 h-4 text-red-400" />
                  <span>You have blocked this contact.</span>
                  <button
                    onClick={handleToggleBlockContact}
                    className="px-3.5 py-1.5 rounded-lg bg-[#00a884] hover:bg-[#02906f] text-[#111b21] font-bold transition hover:scale-105 active:scale-95 ml-2 shadow-xs"
                  >
                    Unblock to Chat
                  </button>
                </div>
              ) : (
                <>
                  {/* Replying-To Banner */}
                  {replyingTo && (
                    <div className="mb-2 p-2.5 px-3 rounded-xl bg-[#111b21] border-l-4 border-[#00a884] flex items-center justify-between text-xs shadow-xs animate-fade-in select-none">
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="font-bold text-[#00a884] text-[11px] truncate">
                          Replying to {replyingTo.sender === userData.username ? "yourself" : replyingTo.sender}
                        </p>
                        <p className="text-[#aebac1] truncate text-[11px] mt-0.5">
                          {replyingTo.text ||
                            (replyingTo.mediaType === "audio"
                              ? "🎵 Voice message"
                              : "📷 Photo")}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReplyingTo(null)}
                        className="p-1 rounded-full text-[#8696a0] hover:text-white hover:bg-[#202c33] transition"
                        title="Cancel reply"
                      >
                        <IconClose className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Photo Staging / Caption / View-Once Bar */}
                  {pendingUploadPreview && (
                    <div className="p-3 bg-[#182229] rounded-2xl border border-[#2e3b43] mb-2 animate-scale-up space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-[#2e3b43] flex-shrink-0 bg-black">
                          <img
                            src={pendingUploadPreview}
                            alt="Staged"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <input
                            type="text"
                            value={pendingCaption}
                            onChange={(e) => setPendingCaption(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendPendingImage()}
                            placeholder="Add a caption..."
                            className="w-full bg-[#111b21] border border-[#2e3b43] focus:border-[#00a884] rounded-xl px-3 py-2 text-xs text-[#e9edef] placeholder-[#8696a0] focus:outline-none transition"
                            autoFocus
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-[#222d34]">
                        {/* WhatsApp ① View Once Toggle */}
                        <button
                          type="button"
                          onClick={() => setIsViewOnceActive(!isViewOnceActive)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold transition cursor-pointer select-none ${
                            isViewOnceActive
                              ? "bg-[#00a884]/20 border-[#00a884] text-[#00a884] shadow-xs"
                              : "bg-[#111b21] border-[#2e3b43] text-[#8696a0] hover:text-[#e9edef]"
                          }`}
                          title={isViewOnceActive ? "View once active (tap to turn off)" : "Set to View Once"}
                        >
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] font-bold ${
                              isViewOnceActive ? "border-[#00a884] text-[#00a884]" : "border-current"
                            }`}
                          >
                            1
                          </div>
                          <span>{isViewOnceActive ? "View Once Photo" : "View Once"}</span>
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleCancelPendingUpload}
                            className="px-3 py-1.5 rounded-xl text-xs text-[#8696a0] hover:text-white hover:bg-[#202c33] transition"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleSendPendingImage}
                            className="px-4 py-1.5 rounded-xl bg-[#00a884] hover:bg-[#02906f] text-[#111b21] font-bold text-xs flex items-center gap-1.5 shadow-md shadow-[#00a884]/25 transition hover:scale-105 active:scale-95"
                          >
                            <span>Send</span>
                            <IconSend className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

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
                        className="p-2 rounded-xl text-[#8696a0] hover:text-white hover:bg-[#374248] transition"
                        title="Emojis"
                      >
                        <IconSmile className="w-5 h-5" />
                      </button>

                      {/* Attachment toggle */}
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 rounded-xl text-[#8696a0] hover:text-white hover:bg-[#374248] transition"
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
                            : "Type a message"
                        }
                        className="flex-1 bg-[#2a3942] border border-transparent focus:border-[#00a884]/40 rounded-xl px-4 py-2.5 text-sm text-[#e9edef] placeholder-[#8696a0] focus:outline-none transition"
                      />

                      {/* Mic / Voice Recording Button */}
                      {!messageText.trim() ? (
                        <button
                          onClick={() => setIsRecordingVoice(true)}
                          className="p-2.5 rounded-xl bg-[#2a3942] hover:bg-[#374248] text-[#8696a0] hover:text-white transition"
                          title="Record Voice Note"
                        >
                          <IconMic className="w-5 h-5" />
                        </button>
                      ) : (
                        /* Send Button */
                        <button
                          onClick={handleSendMessage}
                          className="p-2.5 rounded-xl bg-[#00a884] hover:bg-[#02906f] text-[#111b21] shadow-md shadow-[#00a884]/25 transition transform hover:scale-105 active:scale-95"
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
          /* ======================================================== */
          /* WELCOME / EMPTY CHAT SCREEN (Matching Screenshot 3!) */
          /* ======================================================== */
          <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-10 text-center z-10 bg-[#111b21] select-none">
            {/* Central Card (Screenshot 3) */}
            <div className="w-full max-w-sm md:max-w-md bg-[#18222d] border border-[#222d34] rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col items-center text-center">
              {/* Calling Illustration with Laptop & Green Phone Icon */}
              <div className="w-24 h-24 mb-5 relative flex items-center justify-center">
                {/* Laptop base */}
                <div className="w-20 h-14 bg-[#2a3942] border-2 border-[#8696a0]/40 rounded-lg flex items-center justify-center p-1.5 shadow-lg relative">
                  <div className="w-full h-full bg-[#00a884] rounded-md flex items-center justify-center shadow-inner">
                    <IconPhone className="w-6 h-6 text-[#111b21] animate-pulse" />
                  </div>
                </div>
                <div className="absolute bottom-1 w-24 h-1.5 bg-[#8696a0]/60 rounded-full"></div>
              </div>

              {/* Title & Subtitle */}
              <h3 className="text-xl md:text-2xl font-bold text-[#e9edef] mb-2 tracking-tight">
                Voice and video calling is now available
              </h3>
              <p className="text-[#8696a0] text-xs md:text-sm max-w-xs mb-6 leading-relaxed">
                Now you can make and join calls on PulseChat Web.
              </p>

              {/* Go to Calls Button */}
              <button
                onClick={() => setSidebarTab("calls")}
                className="px-6 py-2.5 rounded-full bg-[#00a884] hover:bg-[#02906f] text-[#111b21] font-bold text-xs tracking-wide shadow-lg shadow-[#00a884]/20 hover:scale-105 active:scale-95 transition"
              >
                Go to Calls
              </button>
            </div>

            {/* Bottom 5 Quick Action Circles (Matching Screenshot 3!) */}
            <div className="mt-10 md:mt-12 flex items-center justify-center gap-4 md:gap-7 flex-wrap">
              {/* 1. Send document */}
              <div
                onClick={() => setShowNewChatModal(true)}
                className="flex flex-col items-center gap-2 cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-full bg-[#202c33] group-hover:bg-[#2a3942] border border-[#2e3b43] group-hover:border-[#00a884]/40 flex items-center justify-center text-[#e9edef] shadow-md group-hover:scale-110 transition">
                  <IconFileText className="w-5 h-5 text-[#8696a0] group-hover:text-[#00a884]" />
                </div>
                <span className="text-[11px] text-[#8696a0] group-hover:text-[#e9edef] transition font-medium">
                  Send document
                </span>
              </div>

              {/* 2. Add contact */}
              <div
                onClick={() => setShowNewChatModal(true)}
                className="flex flex-col items-center gap-2 cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-full bg-[#202c33] group-hover:bg-[#2a3942] border border-[#2e3b43] group-hover:border-[#00a884]/40 flex items-center justify-center text-[#e9edef] shadow-md group-hover:scale-110 transition">
                  <IconUserPlus className="w-5 h-5 text-[#8696a0] group-hover:text-[#00a884]" />
                </div>
                <span className="text-[11px] text-[#8696a0] group-hover:text-[#e9edef] transition font-medium">
                  Add contact
                </span>
              </div>

              {/* 3. Invite a friend */}
              <div
                onClick={handleInviteFriend}
                className="flex flex-col items-center gap-2 cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-full bg-[#202c33] group-hover:bg-[#2a3942] border border-[#2e3b43] group-hover:border-[#00a884]/40 flex items-center justify-center text-[#e9edef] shadow-md group-hover:scale-110 transition">
                  <IconMail className="w-5 h-5 text-[#8696a0] group-hover:text-[#00a884]" />
                </div>
                <span className="text-[11px] text-[#8696a0] group-hover:text-[#e9edef] transition font-medium">
                  Invite a friend
                </span>
              </div>

              {/* 4. New call */}
              <div
                onClick={() => setSidebarTab("calls")}
                className="flex flex-col items-center gap-2 cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-full bg-[#202c33] group-hover:bg-[#2a3942] border border-[#2e3b43] group-hover:border-[#00a884]/40 flex items-center justify-center text-[#e9edef] shadow-md group-hover:scale-110 transition">
                  <IconVideo className="w-5 h-5 text-[#8696a0] group-hover:text-[#00a884]" />
                </div>
                <span className="text-[11px] text-[#8696a0] group-hover:text-[#e9edef] transition font-medium">
                  New call
                </span>
              </div>

              {/* 5. Ask Pulse AI */}
              <div
                onClick={handleOpenAIChat}
                className="flex flex-col items-center gap-2 cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-full bg-[#202c33] group-hover:bg-[#2a3942] border border-[#2e3b43] group-hover:border-[#a855f7]/40 flex items-center justify-center text-[#e9edef] shadow-md group-hover:scale-110 transition">
                  <IconMetaAI className="w-6 h-6 animate-pulse" />
                </div>
                <span className="text-[11px] text-[#8696a0] group-hover:text-[#e9edef] transition font-medium">
                  Ask Pulse AI
                </span>
              </div>
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
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#202c33] border border-[#2e3b43] rounded-2xl p-6 shadow-2xl flex flex-col max-h-[80vh] text-[#e9edef]">
            <div className="flex items-center justify-between pb-4 border-b border-[#2e3b43] mb-4">
              <h3 className="text-base font-bold text-[#e9edef]">Start New Conversation</h3>
              <button
                onClick={() => setShowNewChatModal(false)}
                className="text-[#8696a0] hover:text-white p-1 rounded-lg hover:bg-[#2a3942] transition"
              >
                <IconClose className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative mb-4">
              <IconSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8696a0]" />
              <input
                type="text"
                placeholder="Search by username or name..."
                value={searchFilter}
                onChange={(e) => handleUserSearch(e.target.value)}
                autoFocus
                className="w-full pl-10 pr-4 py-2.5 bg-[#111b21] border border-[#2e3b43] rounded-xl text-sm text-[#e9edef] placeholder-[#8696a0] focus:outline-none focus:border-[#00a884]/60 transition"
              />
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {isSearchingUsers ? (
                <div className="text-center py-8 text-[#8696a0] text-sm">Searching...</div>
              ) : userSearchResults.length > 0 ? (
                userSearchResults.map((user) => (
                  <div
                    key={user._id}
                    onClick={() => handleStartChatWithUser(user)}
                    className="p-3 rounded-xl hover:bg-[#2a3942] border border-transparent hover:border-[#2e3b43] flex items-center gap-3.5 cursor-pointer transition"
                  >
                    <img
                      src={user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
                      alt={user.username}
                      className="w-10 h-10 rounded-full object-cover border border-[#2e3b43]"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-[#e9edef] truncate">{user.name || user.username}</h4>
                      <p className="text-xs text-[#8696a0] truncate">@{user.username}</p>
                    </div>
                    <span className="text-xs text-[#00a884] font-semibold px-2.5 py-1 rounded-lg bg-[#00a884]/20 border border-[#00a884]/30">
                      Chat →
                    </span>
                  </div>
                ))
              ) : searchFilter.trim() ? (
                <div className="text-center py-8 text-[#8696a0] text-sm">No users found.</div>
              ) : (
                <div className="text-center py-8 text-[#8696a0] text-xs">
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

      {/* ======================================================== */}
      {/* 12. VIEW-ONCE PHOTO VIEWER MODAL */}
      {/* ======================================================== */}
      {activeViewOnceMedia && (
        <div
          onClick={() => setActiveViewOnceMedia(null)}
          className="fixed inset-0 z-[270] bg-black/98 backdrop-blur-md flex flex-col items-center justify-center p-4 select-none cursor-pointer"
        >
          {/* Top Info Banner */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute top-6 left-6 right-6 flex items-center justify-between text-[#e9edef]"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full border-2 border-[#00a884] text-[#00a884] flex items-center justify-center font-bold text-xs bg-[#00a884]/20">
                1
              </div>
              <div>
                <p className="font-bold text-sm">View Once Photo</p>
                <p className="text-[11px] text-[#8696a0]">
                  This photo will disappear once closed
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveViewOnceMedia(null)}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
              title="Close"
            >
              <IconClose className="w-6 h-6" />
            </button>
          </div>

          <img
            src={getMediaUrl(activeViewOnceMedia.mediaUrl)}
            alt="View Once"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[82vh] max-w-[92vw] object-contain rounded-2xl shadow-2xl border border-white/10"
          />

          {activeViewOnceMedia.text && activeViewOnceMedia.text !== activeViewOnceMedia.fileName && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="mt-4 px-4 py-2 rounded-xl bg-black/60 border border-white/10 text-white text-sm max-w-lg text-center"
            >
              {activeViewOnceMedia.text}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 13. FORWARD MESSAGE MODAL */}
      {/* ======================================================== */}
      <ForwardMessageModal
        isOpen={showForwardModal}
        onClose={() => {
          setShowForwardModal(false);
          setForwardingMsg(null);
        }}
        message={forwardingMsg}
        chats={chats}
        currentUser={userData}
        onForward={handleForwardMessage}
      />
    </div>
  );
}
