import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { setUserData } from "../redux/userSlice";
import { serverUrl } from "../main";
import {
  IconCamera,
  IconClose,
  IconCheck,
  IconSparkles,
  IconBan,
} from "../components/Icons";

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

export default function Profile() {
  const { userData } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

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

  // Fetch fresh user data on mount
  useEffect(() => {
    axios
      .get(`${serverUrl}/api/user/current`)
      .then((res) => {
        if (res.data?.user) {
          dispatch(setUserData(res.data.user));
          setBlockedList(res.data.user.blockedUsers || []);
        }
      })
      .catch(() => {});
  }, [dispatch]);

  const handleAvatarChange = (e) => {
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

  const handleSelectPreset = (presetUrl) => {
    setAvatarFile(null);
    setAvatarPreview(presetUrl);
    setError("");
  };

  const handleRandomizeAvatar = () => {
    setAvatarFile(null);
    const randomSeed = "pulse_" + Math.random().toString(36).substring(2, 9);
    setAvatarPreview(`https://api.dicebear.com/7.x/bottts/svg?seed=${randomSeed}`);
    setError("");
  };

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

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      let finalAvatarUrl = avatarPreview;

      // 1. Upload new custom avatar file if selected
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

      // 2. Update profile in database
      const res = await axios.put(`${serverUrl}/api/user/profile`, {
        name: name.trim() || userData?.username,
        about: about.trim(),
        avatar: finalAvatarUrl,
      });

      const updatedUser = res.data.user;
      dispatch(setUserData(updatedUser));
      setSavedSuccess(true);

      setTimeout(() => {
        setSavedSuccess(false);
        navigate("/");
      }, 1000);
    } catch (err) {
      console.error("Save profile error:", err);
      setError(err.response?.data?.message || "Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0d14] px-4 py-8 select-none font-sans relative overflow-hidden">
      {/* Natural ambient subtle light */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.08),rgba(255,255,255,0))] pointer-events-none"></div>

      <div className="w-full max-w-lg z-10">
        {/* Back Button */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white mb-5 transition px-2.5 py-1.5 rounded-lg hover:bg-slate-800/60 w-fit"
        >
          ← Back to chats
        </button>

        <div className="bg-[#0e1320] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-1.5 text-center tracking-tight">
            Account & Profile Settings
          </h2>
          <p className="text-xs text-slate-400 text-center mb-6">
            Customize your avatar, display name, status bio, and manage blocked contacts
          </p>

          {/* Avatar Preview with Camera Overlay */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative group">
              <img
                src={avatarPreview}
                alt="Avatar"
                className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-slate-700 shadow-xl"
              />
              <label
                htmlFor="avatarUploadInput"
                className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center cursor-pointer shadow-lg border-2 border-[#0e1320] transition transform hover:scale-110 active:scale-95"
                title="Change Photo from Device"
              >
                <IconCamera className="w-5 h-5" />
              </label>
              <input
                id="avatarUploadInput"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            {/* Photo Action Buttons */}
            <div className="flex items-center gap-2 mt-4">
              <label
                htmlFor="avatarUploadInput"
                className="px-3.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-xs font-semibold text-slate-200 cursor-pointer transition flex items-center gap-1.5 shadow-sm"
              >
                <IconCamera className="w-3.5 h-3.5 text-blue-400" />
                <span>Upload Custom Photo</span>
              </label>

              <button
                type="button"
                onClick={handleRandomizeAvatar}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-xs font-semibold text-slate-300 hover:text-white border border-slate-700/60 transition flex items-center gap-1.5 shadow-sm"
              >
                <IconSparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>Randomize 3D</span>
              </button>
            </div>
          </div>

          {/* Preset Avatars Selection */}
          <div className="mb-6">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 text-center">
              Quick 3D Avatar Presets
            </label>
            <div className="grid grid-cols-4 gap-2">
              {AVATAR_PRESETS.map((preset, idx) => {
                const isSelected = avatarPreview === preset && !avatarFile;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`relative p-1 rounded-xl border transition overflow-hidden group ${
                      isSelected
                        ? "border-blue-500 bg-blue-600/20 ring-2 ring-blue-500/50"
                        : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                    }`}
                  >
                    <img
                      src={preset}
                      alt={`Preset ${idx + 1}`}
                      className="w-full h-12 rounded-lg object-cover group-hover:scale-105 transition duration-200"
                    />
                    {isSelected && (
                      <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-blue-600 rounded-full flex items-center justify-center text-[9px] text-white font-bold">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Profile Form */}
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Full Display Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/60 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 text-sm transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Username
              </label>
              <input
                type="text"
                disabled
                value={`@${userData?.username || ""}`}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800/20 border border-slate-800 text-slate-500 text-sm cursor-not-allowed font-mono"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Username is permanent and unique across PulseChat
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                About / Bio Status
              </label>
              <textarea
                rows={2}
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                placeholder="Available, Coding, Busy..."
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/60 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 text-sm transition resize-none"
              />
            </div>

            {/* Blocked Users Section */}
            {blockedList && blockedList.length > 0 && (
              <div className="pt-3 border-t border-slate-800">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
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
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/40"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={
                              blockedUser?.avatar ||
                              `https://api.dicebear.com/7.x/bottts/svg?seed=${bUsername}`
                            }
                            alt="Avatar"
                            className="w-8 h-8 rounded-full object-cover border border-slate-700/60"
                          />
                          <div className="truncate">
                            <p className="text-xs font-semibold text-white truncate">{bName}</p>
                            <span className="text-[10px] text-slate-400">@{bUsername}</span>
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

            <button
              type="submit"
              disabled={saving}
              className={`w-full py-3 rounded-xl font-semibold text-sm shadow-md transition transform hover:scale-[1.01] active:scale-[0.99] mt-2 flex items-center justify-center gap-2 ${
                savedSuccess
                  ? "bg-emerald-600 text-white shadow-emerald-600/30"
                  : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/25"
              }`}
            >
              {saving ? (
                "Saving changes..."
              ) : savedSuccess ? (
                <>
                  <IconCheck className="w-4 h-4" /> Saved! Redirecting...
                </>
              ) : (
                "Save Profile Changes"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
