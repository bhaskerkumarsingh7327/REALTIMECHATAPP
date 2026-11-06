import React from "react";
import {
  IconClose,
  IconPhone,
  IconVideo,
  IconMail,
  IconUser,
  IconTrash,
  IconPaperclip,
} from "./Icons";

export default function UserProfileModal({
  user,
  isOnline,
  chatMessages = [],
  onClose,
  onStartAudioCall,
  onStartVideoCall,
  onDeleteChat,
}) {
  if (!user) return null;

  // Extract photos shared in this chat
  const sharedImages = chatMessages
    ?.filter((m) => m.mediaType === "image" && m.mediaUrl)
    ?.slice(-6)
    ?.reverse() || [];

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in font-sans select-none">
      <div className="relative w-full max-w-md bg-[#111622]/95 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden text-white flex flex-col">
        {/* Top ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-violet-600/20 rounded-full blur-[80px] pointer-events-none"></div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition z-10"
        >
          <IconClose className="w-5 h-5" />
        </button>

        {/* User Avatar & Status */}
        <div className="flex flex-col items-center text-center mt-2 mb-6">
          <div className="relative mb-3">
            <div className="absolute -inset-1.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-full blur-sm opacity-60"></div>
            <img
              src={
                user.avatar ||
                `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username || "user"}`
              }
              alt={user.name || user.username}
              className="relative w-24 h-24 rounded-full object-cover border-2 border-white/20 shadow-xl"
            />
            {isOnline && (
              <span className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 border-2 border-[#111622] rounded-full shadow-md"></span>
            )}
          </div>

          <h3 className="text-xl font-bold text-white tracking-tight">
            {user.name || user.username}
          </h3>
          <p className="text-xs text-violet-400 font-medium">@{user.username}</p>

          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium">
            <span
              className={`w-2 h-2 rounded-full ${
                isOnline ? "bg-emerald-400 animate-pulse" : "bg-gray-500"
              }`}
            ></span>
            <span className={isOnline ? "text-emerald-400" : "text-gray-400"}>
              {isOnline ? "Active Now" : "Offline"}
            </span>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => {
              onClose();
              if (onStartAudioCall) onStartAudioCall();
            }}
            className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition font-semibold text-xs shadow-sm"
          >
            <IconPhone className="w-4 h-4" />
            <span>Voice Call</span>
          </button>

          <button
            onClick={() => {
              onClose();
              if (onStartVideoCall) onStartVideoCall();
            }}
            className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/20 transition font-semibold text-xs shadow-sm"
          >
            <IconVideo className="w-4 h-4" />
            <span>Video Call</span>
          </button>
        </div>

        {/* Bio / About Card */}
        <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 mb-4 space-y-3">
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">
              About / Bio
            </span>
            <p className="text-xs text-gray-200 leading-relaxed">
              {user.about || "Hey there! I am using PulseChat."}
            </p>
          </div>

          {user.email && (
            <div className="pt-2 border-t border-white/5 flex items-center gap-2.5">
              <IconMail className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-300 truncate">{user.email}</span>
            </div>
          )}
        </div>

        {/* Shared Media Gallery Preview */}
        {sharedImages.length > 0 && (
          <div className="mb-4">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-2">
              Shared Media ({sharedImages.length})
            </span>
            <div className="grid grid-cols-3 gap-2">
              {sharedImages.map((img, idx) => (
                <div key={idx} className="h-16 rounded-xl overflow-hidden border border-white/10 bg-black/20">
                  <img
                    src={img.mediaUrl}
                    alt="Media"
                    className="w-full h-full object-cover hover:scale-110 transition duration-200"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Danger Action (Delete Conversation) */}
        {onDeleteChat && (
          <button
            onClick={() => {
              onClose();
              onDeleteChat();
            }}
            className="w-full py-2.5 rounded-xl text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/10 transition flex items-center justify-center gap-2 mt-auto"
          >
            <IconTrash className="w-4 h-4" />
            <span>Delete Conversation</span>
          </button>
        )}
      </div>
    </div>
  );
}

