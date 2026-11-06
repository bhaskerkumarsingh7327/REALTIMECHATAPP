import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import axios from "axios";
import { setUserData } from "../redux/userSlice";
import { serverUrl } from "../main";
import {
  IconClose,
  IconCamera,
  IconCheck,
  IconSparkles,
  IconBan,
} from "./Icons";

// Curated 3D avatar preset options
const AVATAR_PRESETS = [
  "https://api.dicebear.com/7.x/bottts/svg?seed=Felix",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Luna",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Max",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Zoe",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Nova",
  "https://api.dicebear.com/7.x/bottts/svg?seed=PulseHero",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=CyberSamurai",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Starlight",
];

export default function MyProfileModal({ onClose, onAvatarUpdated }) {
  const { userData } = useSelector((state) => state.user);
  const dispatch = useDispatch();

  const [name, setName] = useState(userData?.name || userData?.username || "");
  const [about, setAbout] = useState(userData?.about || "Hey there! I am using PulseChat.");
  const [avatarPreview, setAvatarPreview] = useState(
    userData?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${userData?.username || "me"}`
  );
  const [avatarFile, setAvatarFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState("");
  const [blockedList, setBlockedList] = useState(userData?.blockedUsers || []);

  // Handle local file selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError("Image size should be less than 10MB");
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
      setError("");
    }
  };

  // Select an avatar preset
  const handleSelectPreset = (presetUrl) => {
    setAvatarFile(null);
    setAvatarPreview(presetUrl);
    setError("");
  };

  // Generate random avatar seed
  const handleRandomizeAvatar = () => {
    setAvatarFile(null);
    const randomSeed = "pulse_" + Math.random().toString(36).substring(2, 9);
    setAvatarPreview(`https://api.dicebear.com/7.x/bottts/svg?seed=${randomSeed}`);
    setError("");
  };

  // Unblock user directly from profile modal
  const handleUnblockUser = async (targetId) => {
    try {
      const res = await axios.post(`${serverUrl}/api/user/block`, {
        targetUserId: targetId,
      });
      if (res.data?.user) {
        dispatch(setUserData(res.data.user));
        setBlockedList(res.data.user.blockedUsers || []);
      }
    } catch (err) {
      console.error("Unblock user error:", err);
    }
  };

  // Save profile changes
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      let finalAvatarUrl = avatarPreview;

      // 1. Upload new custom file if selected
      if (avatarFile) {
        const formData = new FormData();
        formData.append("file", avatarFile);
        const uploadRes = await axios.post(`${serverUrl}/api/media/upload`, formData);
        const uploadedUrl = uploadRes.data?.url;
        if (uploadedUrl) {
          finalAvatarUrl = uploadedUrl.startsWith("http")
            ? uploadedUrl
            : `${serverUrl}${uploadedUrl}`;
        }
      }

      // 2. Persist to database
      const res = await axios.put(`${serverUrl}/api/user/profile`, {
        name: name.trim() || userData?.username,
        about: about.trim(),
        avatar: finalAvatarUrl,
      });

      const updatedUser = res.data.user;
      dispatch(setUserData(updatedUser));
      if (onAvatarUpdated) onAvatarUpdated(finalAvatarUrl);

      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1000);
    } catch (err) {
      console.error("Save profile error:", err);
      setError(err.response?.data?.message || "Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[230] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in font-sans select-none">
      <div className="relative w-full max-w-lg bg-[#0e1322]/95 border border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl overflow-hidden text-white flex flex-col max-h-[92vh]">
        {/* Glow ambient orbs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-violet-600/25 rounded-full blur-[100px] pointer-events-none"></div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition z-10"
        >
          <IconClose className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-white mb-4 text-center">
          Edit Profile & Picture
        </h3>

        {/* Scrollable Container */}
        <div className="overflow-y-auto pr-1 flex-1 space-y-5">
          {/* Avatar Preview with Camera Overlay */}
          <div className="flex flex-col items-center">
            <div className="relative group">
              <div className="absolute -inset-1.5 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-500 rounded-full blur-md opacity-70 group-hover:opacity-100 transition duration-300"></div>
              <img
                src={avatarPreview}
                alt="Avatar Preview"
                className="relative w-28 h-28 rounded-full object-cover border-4 border-[#0e1322] shadow-2xl"
              />

              {/* Upload trigger label */}
              <label
                htmlFor="myAvatarUploadInput"
                className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center cursor-pointer shadow-lg border-2 border-[#0e1322] transition transform hover:scale-110 active:scale-95"
                title="Upload Photo from Device"
              >
                <IconCamera className="w-4 h-4" />
              </label>
              <input
                id="myAvatarUploadInput"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <div className="flex items-center gap-2 mt-3">
              <label
                htmlFor="myAvatarUploadInput"
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white cursor-pointer transition flex items-center gap-1.5"
              >
                <IconCamera className="w-3.5 h-3.5 text-violet-400" />
                <span>Upload Photo</span>
              </label>

              <button
                type="button"
                onClick={handleRandomizeAvatar}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300 hover:text-white border border-white/10 transition flex items-center gap-1.5"
              >
                <IconSparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Randomize</span>
              </button>
            </div>
          </div>

          {/* Preset Avatars Selection */}
          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 text-center">
              Or Choose a 3D Avatar Preset
            </label>
            <div className="grid grid-cols-4 gap-2">
              {AVATAR_PRESETS.map((preset, idx) => {
                const isSelected = avatarPreview === preset && !avatarFile;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`relative p-1 rounded-2xl border transition overflow-hidden group ${
                      isSelected
                        ? "border-violet-500 bg-violet-600/20 ring-2 ring-violet-500/50"
                        : "border-white/10 bg-white/[0.03] hover:border-white/30"
                    }`}
                  >
                    <img
                      src={preset}
                      alt={`Preset ${idx + 1}`}
                      className="w-full h-12 rounded-xl object-cover group-hover:scale-110 transition duration-200"
                    />
                    {isSelected && (
                      <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-violet-500 rounded-full flex items-center justify-center text-[9px] text-white font-bold">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Fields */}
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase tracking-wider">
                Display Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 text-sm transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase tracking-wider">
                Username
              </label>
              <input
                type="text"
                disabled
                value={`@${userData?.username || ""}`}
                className="w-full px-4 py-3 rounded-xl bg-white/[0.02] border border-white/5 text-gray-500 text-sm cursor-not-allowed font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase tracking-wider">
                About / Status Bio
              </label>
              <textarea
                rows={2}
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                placeholder="Hey there! I am using PulseChat."
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 text-sm transition resize-none"
              />
            </div>

            {/* Blocked Contacts Management Section */}
            {blockedList && blockedList.length > 0 && (
              <div className="pt-2 border-t border-white/[0.08]">
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <IconBan className="w-3.5 h-3.5 text-red-400" />
                  <span>Blocked Contacts ({blockedList.length})</span>
                </label>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {blockedList.map((blockedUser) => {
                    const bId = String(blockedUser?._id || blockedUser);
                    const bName = blockedUser?.name || blockedUser?.username || "Blocked User";
                    const bUsername = blockedUser?.username || bId.substring(0, 8);
                    return (
                      <div
                        key={bId}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={
                              blockedUser?.avatar ||
                              `https://api.dicebear.com/7.x/bottts/svg?seed=${bUsername}`
                            }
                            alt="Avatar"
                            className="w-8 h-8 rounded-full object-cover border border-white/10"
                          />
                          <div className="truncate">
                            <p className="text-xs font-semibold text-white truncate">{bName}</p>
                            <span className="text-[10px] text-gray-400">@{bUsername}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleUnblockUser(bId)}
                          className="px-3 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-bold transition border border-emerald-500/20"
                        >
                          Unblock
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {error && (
              <div className="px-3.5 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold transition"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition transform hover:scale-[1.02] active:scale-[0.98] shadow-lg flex items-center justify-center gap-2 ${
                  savedSuccess
                    ? "bg-emerald-600 text-white shadow-emerald-600/30"
                    : "bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-500 text-white shadow-violet-600/30 hover:opacity-95"
                }`}
              >
                {saving ? (
                  "Saving..."
                ) : savedSuccess ? (
                  <>
                    <IconCheck className="w-4 h-4" />
                    <span>Saved!</span>
                  </>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
