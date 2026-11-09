import React, { useState, useEffect } from "react";
import axios from "axios";
import { serverUrl } from "../main";
import { IconClose, IconUsers, IconSearch, IconCheck, IconCamera } from "./Icons";

const GROUP_AVATAR_PRESETS = [
  "https://api.dicebear.com/7.x/identicon/svg?seed=FamilyGroup",
  "https://api.dicebear.com/7.x/identicon/svg?seed=WorkTeam",
  "https://api.dicebear.com/7.x/identicon/svg?seed=FriendsForever",
  "https://api.dicebear.com/7.x/identicon/svg?seed=GamingSquad",
  "https://api.dicebear.com/7.x/identicon/svg?seed=ProjectCoders",
  "https://api.dicebear.com/7.x/identicon/svg?seed=PulseCommunity",
];

export default function CreateGroupModal({
  currentUser,
  onClose,
  onGroupCreated,
  socket,
}) {
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupAvatar, setGroupAvatar] = useState(GROUP_AVATAR_PRESETS[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Search registered users
  useEffect(() => {
    let cancel = false;
    setIsSearching(true);

    axios
      .get(`${serverUrl}/api/chat/search?query=${encodeURIComponent(searchQuery)}&myId=${currentUser._id}`)
      .then((res) => {
        if (!cancel) {
          setAvailableUsers(res.data || []);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancel) setIsSearching(false);
      });

    return () => {
      cancel = true;
    };
  }, [searchQuery, currentUser._id]);

  const toggleSelectUser = (user) => {
    const uid = String(user._id);
    setSelectedUserIds((prev) => {
      if (prev.includes(uid)) {
        return prev.filter((id) => id !== uid);
      } else {
        return [...prev, uid];
      }
    });
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) {
      setError("Please enter a group name");
      return;
    }

    if (selectedUserIds.length < 1) {
      setError("Please select at least 1 participant to create a group");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const payload = {
        name: groupName.trim(),
        description: groupDescription.trim(),
        avatar: groupAvatar,
        adminId: currentUser._id,
        members: selectedUserIds,
      };

      const res = await axios.post(`${serverUrl}/api/chat/group`, payload);
      const createdGroup = res.data;

      // Realtime notification to all members
      if (socket) {
        socket.emit("group-created", {
          group: createdGroup,
          memberIds: createdGroup.members?.map((m) => String(m._id || m)) || [],
        });
      }

      if (onGroupCreated) {
        onGroupCreated(createdGroup);
      }
      onClose();
    } catch (err) {
      console.error("Create group error:", err);
      setError(err.response?.data?.error || "Failed to create group. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fade-in font-sans select-none">
      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl overflow-hidden text-slate-800 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <IconUsers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Create New Group</h3>
              <p className="text-[11px] text-slate-500">Add participants and start group messaging</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <IconClose className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleCreateGroup} className="flex-1 overflow-y-auto pr-1 space-y-4">
          {/* Group Icon & Name */}
          <div className="flex items-center gap-4">
            <div className="relative group flex-shrink-0">
              <img
                src={groupAvatar}
                alt="Group Icon"
                className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-200 shadow-xs"
              />
            </div>

            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Group Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Project Developers, Family..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                maxLength={40}
                required
                autoFocus
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition"
              />
            </div>
          </div>

          {/* Group Avatar Presets */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Choose Group Icon
            </label>
            <div className="grid grid-cols-6 gap-2">
              {GROUP_AVATAR_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setGroupAvatar(preset)}
                  className={`p-1 rounded-xl border transition overflow-hidden ${
                    groupAvatar === preset
                      ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500/30"
                      : "border-slate-200 bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  <img src={preset} alt="Preset" className="w-full h-8 object-contain" />
                </button>
              ))}
            </div>
          </div>

          {/* Group Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Group Description (optional)
            </label>
            <input
              type="text"
              placeholder="What is this group about?"
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              maxLength={120}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition"
            />
          </div>

          {/* Selected Participants Chips Bar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Select Participants ({selectedUserIds.length} selected)
              </label>
            </div>

            {selectedUserIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2 bg-slate-100/70 rounded-2xl mb-2.5 max-h-24 overflow-y-auto">
                {selectedUserIds.map((uid) => {
                  const u = availableUsers.find((x) => String(x._id) === uid);
                  return (
                    <span
                      key={uid}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-xs font-medium text-slate-800 shadow-2xs"
                    >
                      <img
                        src={u?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${u?.username || uid}`}
                        alt="Avatar"
                        className="w-4 h-4 rounded-full object-cover"
                      />
                      <span className="truncate max-w-[100px]">{u?.name || u?.username || "User"}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedUserIds((prev) => prev.filter((id) => id !== uid))}
                        className="text-slate-400 hover:text-red-500 ml-0.5"
                      >
                        ✕
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Search Input for Contacts */}
            <div className="relative mb-2">
              <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search registered users by name or username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition"
              />
            </div>

            {/* Available Users List */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {isSearching ? (
                <div className="text-center py-6 text-slate-400 text-xs">Searching users...</div>
              ) : availableUsers.length > 0 ? (
                availableUsers.map((user) => {
                  const isSelected = selectedUserIds.includes(String(user._id));
                  return (
                    <div
                      key={user._id}
                      onClick={() => toggleSelectUser(user)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                        isSelected
                          ? "bg-blue-50/80 border-blue-200"
                          : "hover:bg-slate-50 border-transparent hover:border-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={
                            user.avatar ||
                            `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`
                          }
                          alt={user.username}
                          className="w-9 h-9 rounded-full object-cover border border-slate-200"
                        />
                        <div className="truncate">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {user.name || user.username}
                          </p>
                          <span className="text-[10px] text-slate-400 truncate">@{user.username}</span>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${
                          isSelected
                            ? "bg-blue-600 border-blue-600 text-white"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {isSelected && <IconCheck className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs">
                  {searchQuery ? "No matching users found" : "No other users available"}
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="px-3.5 py-2 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs">
              {error}
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-2 border-t border-slate-200 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || selectedUserIds.length < 1 || !groupName.trim()}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/25 transition transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? "Creating Group..." : `Create Group (${selectedUserIds.length})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

