import React, { useState } from "react";
import {
  IconClose,
  IconPhone,
  IconVideo,
  IconMail,
  IconUser,
  IconTrash,
  IconPaperclip,
  IconBan,
  IconMusic,
  IconFileText,
  IconExternalLink,
  IconPlay,
  IconPause,
} from "./Icons";

// Helper for relative time formatting
function formatRelativeSeen(dateInput) {
  if (!dateInput) return "recently";
  const date = new Date(dateInput);
  const now = new Date();
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins === 1) return "1 min ago";
  if (diffMins < 60) return `${diffMins} mins ago`;
  if (diffHours === 1) return "1 hour ago";
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function UserProfileModal({
  user,
  isOnline,
  chatMessages = [],
  isBlocked = false,
  onClose,
  onStartAudioCall,
  onStartVideoCall,
  onToggleBlock,
  onClearChat,
  onDeleteChat,
  onPreviewImage,
}) {
  const [activeMediaTab, setActiveMediaTab] = useState("photos");
  const [playingAudioUrl, setPlayingAudioUrl] = useState(null);
  const [audioEl, setAudioEl] = useState(null);

  if (!user) return null;

  // 1. Categorize all shared media from chat messages
  const sharedImages = chatMessages
    ?.filter((m) => m.mediaType === "image" && m.mediaUrl)
    ?.reverse() || [];

  const sharedAudio = chatMessages
    ?.filter((m) => m.mediaType === "audio" && m.mediaUrl)
    ?.reverse() || [];

  const sharedFiles = chatMessages
    ?.filter((m) => (m.mediaType === "file" || m.fileName) && m.mediaUrl)
    ?.reverse() || [];

  // Extract shared links from message texts
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const sharedLinks = chatMessages
    ?.flatMap((m) => {
      if (!m.text) return [];
      const matches = m.text.match(urlRegex);
      return matches ? matches.map((url) => ({ url, sender: m.sender, createdAt: m.createdAt })) : [];
    })
    ?.reverse() || [];

  const totalMediaCount = sharedImages.length + sharedAudio.length + sharedFiles.length + sharedLinks.length;

  // Audio play helper inside modal
  const handleTogglePlayAudio = (url) => {
    if (playingAudioUrl === url && audioEl) {
      audioEl.pause();
      setPlayingAudioUrl(null);
      return;
    }

    if (audioEl) {
      audioEl.pause();
    }

    const newAudio = new Audio(url);
    newAudio.play().catch(() => {});
    newAudio.onended = () => setPlayingAudioUrl(null);
    setAudioEl(newAudio);
    setPlayingAudioUrl(url);
  };

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-3 sm:p-4 animate-fade-in font-sans select-none">
      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 shadow-2xl overflow-hidden text-slate-800 flex flex-col max-h-[92vh]">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-blue-500/5 rounded-full blur-[90px] pointer-events-none"></div>

        {/* Close Button */}
        <button
          onClick={() => {
            if (audioEl) audioEl.pause();
            onClose();
          }}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition z-10"
        >
          <IconClose className="w-5 h-5" />
        </button>

        {/* Scrollable Modal Content */}
        <div className="overflow-y-auto pr-1 flex-1 space-y-5">
          {/* User Avatar & Status Header */}
          <div className="flex flex-col items-center text-center mt-2">
            <div className="relative mb-3">
              <img
                src={
                  user.avatar ||
                  `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username || "user"}`
                }
                alt={user.name || user.username}
                className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-2 border-slate-200 shadow-md"
              />
              {isOnline ? (
                <span className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full shadow-md animate-pulse"></span>
              ) : (
                <span className="absolute bottom-1 right-1 w-4 h-4 bg-slate-400 border-2 border-white rounded-full"></span>
              )}
            </div>

            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {user.name || user.username}
            </h3>
            <p className="text-xs text-blue-600 font-semibold mt-0.5">@{user.username}</p>

            {/* Status Beacon with Relative Last Seen */}
            <div className="mt-2.5 flex items-center gap-2">
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                  isBlocked
                    ? "bg-red-50 text-red-600 border-red-200"
                    : isOnline
                    ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                    : "bg-slate-100 text-slate-600 border-slate-200"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isBlocked
                      ? "bg-red-500"
                      : isOnline
                      ? "bg-emerald-500 animate-pulse"
                      : "bg-slate-400"
                  }`}
                ></span>
                <span>
                  {isBlocked
                    ? "Blocked by you"
                    : isOnline
                    ? "Active Now"
                    : `Last seen ${formatRelativeSeen(user.lastSeen)}`}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Call Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              disabled={isBlocked}
              onClick={() => {
                onClose();
                if (onStartAudioCall) onStartAudioCall();
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border transition font-semibold text-xs shadow-xs ${
                isBlocked
                  ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                  : "bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-emerald-200 hover:scale-[1.02] active:scale-[0.98]"
              }`}
            >
              <IconPhone className="w-4 h-4" />
              <span>Voice Call</span>
            </button>

            <button
              disabled={isBlocked}
              onClick={() => {
                onClose();
                if (onStartVideoCall) onStartVideoCall();
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border transition font-semibold text-xs shadow-xs ${
                isBlocked
                  ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                  : "bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200 hover:scale-[1.02] active:scale-[0.98]"
              }`}
            >
              <IconVideo className="w-4 h-4" />
              <span>Video Call</span>
            </button>
          </div>

          {/* Bio / About & Email Card */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1">
                About / Bio
              </span>
              <p className="text-xs text-slate-700 leading-relaxed select-text">
                {user.about || "Hey there! I am using PulseChat."}
              </p>
            </div>

            {user.email && (
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <IconMail className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span className="text-xs text-slate-700 truncate select-text">{user.email}</span>
                </div>
                <span className="text-[10px] text-emerald-600 font-semibold">Verified</span>
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* SHARED MEDIA, AUDIO, DOCS & LINKS SECTION */}
          {/* ========================================================= */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] uppercase font-bold text-slate-700 tracking-wider flex items-center gap-1.5">
                <span>Shared Media</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                  {totalMediaCount}
                </span>
              </span>
            </div>

            {/* Media Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-xl mb-3 text-xs">
              <button
                onClick={() => setActiveMediaTab("photos")}
                className={`flex-1 py-1.5 px-2 rounded-lg font-semibold transition ${
                  activeMediaTab === "photos"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Photos ({sharedImages.length})
              </button>

              <button
                onClick={() => setActiveMediaTab("voice")}
                className={`flex-1 py-1.5 px-2 rounded-lg font-semibold transition ${
                  activeMediaTab === "voice"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Voice ({sharedAudio.length})
              </button>

              <button
                onClick={() => setActiveMediaTab("files")}
                className={`flex-1 py-1.5 px-2 rounded-lg font-semibold transition ${
                  activeMediaTab === "files"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Docs ({sharedFiles.length})
              </button>

              <button
                onClick={() => setActiveMediaTab("links")}
                className={`flex-1 py-1.5 px-2 rounded-lg font-semibold transition ${
                  activeMediaTab === "links"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Links ({sharedLinks.length})
              </button>
            </div>

            {/* TAB CONTENT: 1. PHOTOS */}
            {activeMediaTab === "photos" && (
              <div>
                {sharedImages.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                    {sharedImages.map((img, idx) => (
                      <div
                        key={idx}
                        onClick={() => onPreviewImage && onPreviewImage(img.mediaUrl)}
                        className="group relative h-20 rounded-xl overflow-hidden border border-slate-200 bg-white cursor-pointer shadow-2xs"
                        title="Click to view full photo"
                      >
                        <img
                          src={img.mediaUrl}
                          alt="Shared media"
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                          <span className="text-[10px] font-bold text-white bg-black/60 px-2 py-0.5 rounded-full">
                            View
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-6 text-slate-400 text-xs">No photos shared in this conversation yet.</p>
                )}
              </div>
            )}

            {/* TAB CONTENT: 2. VOICE NOTES */}
            {activeMediaTab === "voice" && (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {sharedAudio.length > 0 ? (
                  sharedAudio.map((aud, idx) => {
                    const isPlaying = playingAudioUrl === aud.mediaUrl;
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs"
                      >
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleTogglePlayAudio(aud.mediaUrl)}
                            className="w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition shadow-sm"
                          >
                            {isPlaying ? <IconPause className="w-4 h-4" /> : <IconPlay className="w-4 h-4 ml-0.5" />}
                          </button>
                          <div>
                            <p className="text-xs font-semibold text-slate-900">Voice Note</p>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {aud.createdAt ? new Date(aud.createdAt).toLocaleDateString([], { month: "short", day: "numeric" }) : ""}
                            </span>
                          </div>
                        </div>

                        <a
                          href={aud.mediaUrl}
                          download="voice-note.webm"
                          className="text-xs text-blue-600 hover:text-blue-700 font-semibold px-2.5 py-1 bg-blue-50 rounded-lg transition"
                        >
                          Save
                        </a>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-center py-6 text-slate-400 text-xs">No voice notes shared yet.</p>
                )}
              </div>
            )}

            {/* TAB CONTENT: 3. DOCS & FILES */}
            {activeMediaTab === "files" && (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {sharedFiles.length > 0 ? (
                  sharedFiles.map((f, idx) => (
                    <a
                      key={idx}
                      href={f.mediaUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 transition shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <IconFileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                        <div className="truncate">
                          <p className="text-xs font-semibold text-slate-900 truncate">{f.fileName || f.text || "File"}</p>
                          <span className="text-[10px] text-slate-400">{f.fileSize || "Attachment"}</span>
                        </div>
                      </div>
                      <IconExternalLink className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    </a>
                  ))
                ) : (
                  <p className="text-center py-6 text-slate-400 text-xs">No documents or files shared yet.</p>
                )}
              </div>
            )}

            {/* TAB CONTENT: 4. LINKS */}
            {activeMediaTab === "links" && (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {sharedLinks.length > 0 ? (
                  sharedLinks.map((linkObj, idx) => (
                    <a
                      key={idx}
                      href={linkObj.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 transition shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <IconExternalLink className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <span className="text-xs text-blue-600 underline truncate">{linkObj.url}</span>
                      </div>
                    </a>
                  ))
                ) : (
                  <p className="text-center py-6 text-slate-400 text-xs">No links shared in this conversation yet.</p>
                )}
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* USER ACTIONS: BLOCK / CLEAR / DELETE */}
          {/* ========================================================= */}
          <div className="space-y-2 pt-1 border-t border-slate-200">
            {/* Block / Unblock Contact Button */}
            {onToggleBlock && (
              <button
                onClick={onToggleBlock}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs ${
                  isBlocked
                    ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200"
                    : "bg-red-50 hover:bg-red-100 text-red-600 border border-red-200"
                }`}
              >
                <IconBan className="w-4 h-4" />
                <span>{isBlocked ? `Unblock @${user.username}` : `Block @${user.username}`}</span>
              </button>
            )}

            {/* Clear Chat History */}
            {onClearChat && (
              <button
                onClick={() => {
                  if (window.confirm("Are you sure you want to clear all messages in this conversation?")) {
                    onClearChat();
                  }
                }}
                className="w-full py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition flex items-center justify-center gap-2"
              >
                <IconTrash className="w-3.5 h-3.5 text-slate-500" />
                <span>Clear Messages</span>
              </button>
            )}

            {/* Delete Entire Conversation */}
            {onDeleteChat && (
              <button
                onClick={() => {
                  onClose();
                  onDeleteChat();
                }}
                className="w-full py-2.5 rounded-xl text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 transition flex items-center justify-center gap-2"
              >
                <IconTrash className="w-3.5 h-3.5 text-red-600" />
                <span>Delete Entire Conversation</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
