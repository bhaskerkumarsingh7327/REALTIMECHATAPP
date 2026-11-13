import React, { useState } from "react";
import { IconClose, IconSearch, IconForward, IconUsers } from "./Icons";

export default function ForwardMessageModal({
  isOpen,
  onClose,
  message,
  chats,
  currentUser,
  onForward,
}) {
  const [search, setSearch] = useState("");
  const [forwardingToId, setForwardingToId] = useState(null);

  if (!isOpen || !message) return null;

  // Filter available chats (exclude AI chat or self)
  const availableChats = (chats || []).filter((chat) => {
    if (chat.isAIChat) return false;
    const q = search.toLowerCase().trim();
    if (!q) return true;
    if (chat.isGroup) {
      return (chat.groupName || "").toLowerCase().includes(q);
    }
    const partner = chat.members?.find(
      (m) => String(m?._id || m) !== String(currentUser?._id)
    );
    return (
      (partner?.name || "").toLowerCase().includes(q) ||
      (partner?.username || "").toLowerCase().includes(q)
    );
  });

  const handleSendForward = async (targetChat) => {
    setForwardingToId(targetChat._id);
    try {
      await onForward(targetChat, message);
      onClose();
    } catch (err) {
      console.error("Forward error:", err);
    } finally {
      setForwardingToId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[280] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-md bg-[#202c33] border border-[#2e3b43] rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="p-4 border-b border-[#2e3b43] flex items-center justify-between bg-[#111b21]">
          <div className="flex items-center gap-2 text-[#e9edef]">
            <IconForward className="w-5 h-5 text-[#00a884]" />
            <h3 className="font-bold text-base">Forward message to...</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#8696a0] hover:text-white hover:bg-[#202c33] transition"
          >
            <IconClose className="w-5 h-5" />
          </button>
        </div>

        {/* Message Snippet Preview */}
        <div className="p-3 bg-[#182229] border-b border-[#2e3b43] flex items-center gap-3 text-xs text-[#aebac1]">
          <div className="w-1 h-8 rounded-full bg-[#00a884] flex-shrink-0" />
          <div className="truncate flex-1">
            <span className="font-bold text-[#00a884] block">{message.sender}</span>
            <span className="truncate block opacity-80">
              {message.text ||
                (message.mediaType === "image"
                  ? "📷 Photo"
                  : message.mediaType === "audio"
                  ? "🎵 Voice message"
                  : "📎 Document")}
            </span>
          </div>
        </div>

        {/* Search Input */}
        <div className="p-3 border-b border-[#2e3b43]">
          <div className="flex items-center gap-2 px-3 py-2 bg-[#111b21] rounded-xl border border-[#2e3b43]">
            <IconSearch className="w-4 h-4 text-[#8696a0]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chat or contact..."
              className="bg-transparent text-sm text-[#e9edef] placeholder-[#8696a0] focus:outline-none w-full"
            />
          </div>
        </div>

        {/* Chats List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {availableChats.length === 0 ? (
            <div className="text-center py-8 text-xs text-[#8696a0]">
              No chats found to forward to.
            </div>
          ) : (
            availableChats.map((chat) => {
              let title = "";
              let avatar = "";
              if (chat.isGroup) {
                title = chat.groupName || "Group";
                avatar =
                  chat.groupAvatar ||
                  `https://api.dicebear.com/7.x/identicon/svg?seed=${chat._id}`;
              } else {
                const partner = chat.members?.find(
                  (m) => String(m?._id || m) !== String(currentUser?._id)
                );
                title = partner?.name || partner?.username || "Contact";
                avatar =
                  partner?.avatar ||
                  `https://api.dicebear.com/7.x/bottts/svg?seed=${partner?.username || "user"}`;
              }

              const isSending = forwardingToId === chat._id;

              return (
                <div
                  key={chat._id}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#111b21] transition group border border-transparent hover:border-[#2e3b43]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={avatar}
                      alt={title}
                      className="w-10 h-10 rounded-full object-cover border border-[#2e3b43] bg-[#111b21]"
                    />
                    <div className="truncate">
                      <p className="font-semibold text-sm text-[#e9edef] truncate">{title}</p>
                      <p className="text-[11px] text-[#8696a0] truncate">
                        {chat.isGroup ? "Group Chat" : "Direct Message"}
                      </p>
                    </div>
                  </div>

                  <button
                    disabled={isSending}
                    onClick={() => handleSendForward(chat)}
                    className="px-3.5 py-1.5 rounded-lg bg-[#00a884] hover:bg-[#02906f] text-[#111b21] font-bold text-xs shadow-xs hover:scale-105 active:scale-95 transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isSending ? (
                      "Sending..."
                    ) : (
                      <>
                        <span>Forward</span>
                        <IconForward className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
