import React from "react";
import axios from "axios";
import { serverUrl } from "../main";
import { IconClose, IconUsers, IconTrash, IconBan } from "./Icons";

export default function GroupInfoModal({
  chat,
  currentUser,
  onClose,
  onGroupUpdated,
  onLeaveGroup,
}) {
  if (!chat || !chat.isGroup) return null;

  const isAdmin = String(chat.groupAdmin?._id || chat.groupAdmin) === String(currentUser._id);
  const members = chat.members || [];

  const handleRemoveMember = async (memberId) => {
    if (!isAdmin) return;
    if (!window.confirm("Are you sure you want to remove this member from the group?")) return;

    try {
      const res = await axios.put(`${serverUrl}/api/chat/group/${chat._id}`, {
        removeMemberId: memberId,
      });
      if (onGroupUpdated) onGroupUpdated(res.data);
    } catch (err) {
      console.error("Remove member error:", err);
      alert("Failed to remove member");
    }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm("Are you sure you want to leave this group?")) return;
    try {
      await axios.put(`${serverUrl}/api/chat/group/${chat._id}`, {
        removeMemberId: currentUser._id,
      });
      if (onLeaveGroup) onLeaveGroup(chat._id);
      onClose();
    } catch (err) {
      console.error("Leave group error:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fade-in font-sans select-none">
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl overflow-hidden text-slate-800 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 mb-4">
          <h3 className="text-base font-bold text-slate-900">Group Info</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <IconClose className="w-5 h-5" />
          </button>
        </div>

        {/* Group Banner */}
        <div className="flex flex-col items-center text-center mb-5">
          <img
            src={chat.groupAvatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${chat.groupName}`}
            alt={chat.groupName}
            className="w-20 h-20 rounded-2xl object-cover border-2 border-slate-200 shadow-md mb-2.5"
          />
          <h4 className="text-lg font-bold text-slate-900">{chat.groupName}</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Group • {members.length} {members.length === 1 ? "participant" : "participants"}
          </p>
          {chat.groupDescription && (
            <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 mt-3 max-w-sm">
              {chat.groupDescription}
            </p>
          )}
        </div>

        {/* Participants Section */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 mb-4">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            Participants ({members.length})
          </label>
          <div className="space-y-1.5">
            {members.map((member) => {
              const mId = String(member._id || member);
              const mName = member.name || member.username || "User";
              const isGroupAdmin = String(chat.groupAdmin?._id || chat.groupAdmin) === mId;
              const isMe = mId === String(currentUser._id);

              return (
                <div
                  key={mId}
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={
                        member.avatar ||
                        `https://api.dicebear.com/7.x/bottts/svg?seed=${member.username || mId}`
                      }
                      alt={mName}
                      className="w-9 h-9 rounded-full object-cover border border-slate-200"
                    />
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {isMe ? "You" : mName}
                        </p>
                        {isGroupAdmin && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700">
                            Admin
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">@{member.username || "member"}</span>
                    </div>
                  </div>

                  {isAdmin && !isGroupAdmin && (
                    <button
                      onClick={() => handleRemoveMember(mId)}
                      className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 transition"
                      title="Remove participant"
                    >
                      Remove
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Footer */}
        <div className="pt-3 border-t border-slate-200 space-y-2">
          <button
            onClick={handleLeaveGroup}
            className="w-full py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs transition border border-red-200 flex items-center justify-center gap-2"
          >
            <IconTrash className="w-4 h-4" />
            <span>Leave Group</span>
          </button>
        </div>
      </div>
    </div>
  );
}
