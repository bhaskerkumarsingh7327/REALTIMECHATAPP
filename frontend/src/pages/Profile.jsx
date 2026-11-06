import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { setUserData } from "../redux/userSlice";
import { serverUrl } from "../main";
import { IconCamera, IconClose, IconCheck } from "../components/Icons";

export default function Profile() {
  const { userData } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [name, setName] = useState(userData?.name || userData?.username || "");
  const [about, setAbout] = useState(userData?.about || "Hey there! I am using PulseChat.");
  const [avatar, setAvatar] = useState(
    userData?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${userData?.username || "me"}`
  );
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(avatar);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      let finalAvatarUrl = avatar;

      // 1. Upload new avatar if user selected a file
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
        name,
        about,
        avatar: finalAvatarUrl,
      });

      const updatedUser = res.data.user;

      // 3. Update Redux state and localStorage
      dispatch(setUserData(updatedUser));
      setSavedSuccess(true);

      setTimeout(() => {
        setSavedSuccess(false);
        navigate("/");
      }, 1200);
    } catch (err) {
      console.error("Save profile error:", err);
      setError(err.response?.data?.message || "Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#090c13] px-4 py-8 select-none font-sans relative">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-violet-600/20 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="w-full max-w-md z-10">
        {/* Back Link */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white mb-6 transition"
        >
          ← Back to chats
        </button>

        <div className="bg-[#111622]/90 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <h2 className="text-xl font-bold text-white mb-6 text-center">
            Edit Your Profile
          </h2>

          {/* Avatar Upload */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative group">
              <img
                src={avatarPreview}
                alt="Avatar"
                className="w-24 h-24 rounded-full object-cover ring-4 ring-violet-500/40 border border-white/20 shadow-xl"
              />
              <label
                htmlFor="avatarUploadInput"
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center cursor-pointer shadow-lg transition transform hover:scale-110 active:scale-95"
                title="Change Photo"
              >
                <IconCamera className="w-4 h-4" />
              </label>
              <input
                id="avatarUploadInput"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-2">
              Tap the camera icon to upload a custom picture
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase tracking-wider">
                Full Display Name
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
                value={userData?.username || ""}
                className="w-full px-4 py-3 rounded-xl bg-white/[0.02] border border-white/5 text-gray-400 text-sm cursor-not-allowed"
              />
              <span className="text-[10px] text-gray-500 mt-0.5 block">
                Username is permanent and unique to your account
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase tracking-wider">
                About / Bio Status
              </label>
              <textarea
                rows={2}
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                placeholder="Available, Coding, In a meeting..."
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 text-sm transition resize-none"
              />
            </div>

            {error && (
              <div className="px-3.5 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className={`w-full py-3.5 rounded-xl font-bold text-sm shadow-xl transition transform hover:scale-[1.02] active:scale-[0.98] mt-2 flex items-center justify-center gap-2 ${
                savedSuccess
                  ? "bg-emerald-600 text-white shadow-emerald-600/30"
                  : "bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white shadow-violet-600/30"
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
