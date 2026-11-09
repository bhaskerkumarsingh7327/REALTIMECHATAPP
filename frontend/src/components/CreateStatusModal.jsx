import React, { useState, useRef } from "react";
import axios from "axios";
import { serverUrl } from "../main";
import { IconClose, IconCamera, IconPalette, IconSend } from "./Icons";

const GRADIENT_PRESETS = [
  { label: "Royal Blue", value: "linear-gradient(135deg, #2563eb, #7c3aed)" },
  { label: "Emerald Teal", value: "linear-gradient(135deg, #059669, #0d9488)" },
  { label: "Sunset Rose", value: "linear-gradient(135deg, #f43f5e, #fb923c)" },
  { label: "Midnight", value: "linear-gradient(135deg, #0f172a, #334155)" },
  { label: "Amethyst", value: "linear-gradient(135deg, #9333ea, #c026d3)" },
  { label: "Ocean Breeze", value: "linear-gradient(135deg, #0284c7, #06b6d4)" },
];

export default function CreateStatusModal({ currentUser, onClose, onStatusCreated, socket }) {
  const [statusType, setStatusType] = useState("text"); // 'text' | 'photo'
  const [textContent, setTextContent] = useState("");
  const [selectedGradient, setSelectedGradient] = useState(GRADIENT_PRESETS[0].value);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoCaption, setPhotoCaption] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        setError("Photo should be less than 15MB");
        return;
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
      setError("");
    }
  };

  const handlePublish = async (e) => {
    e.preventDefault();
    setError("");

    if (statusType === "text" && !textContent.trim()) {
      setError("Please type something for your status");
      return;
    }

    if (statusType === "photo" && !photoFile) {
      setError("Please select a photo to upload");
      return;
    }

    setIsSubmitting(true);
    try {
      let mediaUrl = "";

      // 1. Upload photo if statusType === 'photo'
      if (statusType === "photo" && photoFile) {
        const formData = new FormData();
        formData.append("file", photoFile);
        const uploadRes = await axios.post(`${serverUrl}/api/media/upload`, formData);
        mediaUrl = uploadRes.data?.url || "";
        if (mediaUrl && !mediaUrl.startsWith("http")) {
          mediaUrl = `${serverUrl}${mediaUrl}`;
        }
      }

      // 2. Post status to backend
      const payload = {
        userId: currentUser._id,
        mediaUrl,
        mediaType: statusType === "photo" ? "image" : "text",
        text: statusType === "photo" ? photoCaption.trim() : textContent.trim(),
        backgroundColor: selectedGradient,
      };

      const res = await axios.post(`${serverUrl}/api/status`, payload);
      const createdStatus = res.data;

      // 3. Emit realtime socket event
      if (socket) {
        socket.emit("status-posted", createdStatus);
      }

      if (onStatusCreated) {
        onStatusCreated(createdStatus);
      }
      onClose();
    } catch (err) {
      console.error("Status publish error:", err);
      setError(err.response?.data?.error || "Failed to publish status. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fade-in font-sans select-none">
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl overflow-hidden text-slate-800 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Add New Status</h3>
            <p className="text-[11px] text-slate-500">Visible to your contacts for 24 hours</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <IconClose className="w-5 h-5" />
          </button>
        </div>

        {/* Type Toggle: Text vs Photo */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl mb-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setStatusType("text")}
            className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-2 ${
              statusType === "text"
                ? "bg-white text-blue-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <IconPalette className="w-4 h-4" />
            <span>Text Status</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusType("photo")}
            className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-2 ${
              statusType === "photo"
                ? "bg-white text-blue-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <IconCamera className="w-4 h-4" />
            <span>Photo Status</span>
          </button>
        </div>

        {/* Status Content Form */}
        <form onSubmit={handlePublish} className="flex-1 flex flex-col min-h-0 space-y-4">
          {statusType === "text" ? (
            /* ================= TEXT STATUS MODE ================= */
            <div className="flex-1 flex flex-col space-y-3">
              {/* Text Preview Canvas */}
              <div
                style={{ background: selectedGradient }}
                className="w-full h-56 rounded-2xl p-5 flex items-center justify-center text-center shadow-inner relative overflow-hidden transition-all duration-300"
              >
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Type a status update..."
                  maxLength={300}
                  autoFocus
                  className="w-full h-full bg-transparent resize-none border-none outline-none text-white placeholder-white/60 text-lg md:text-xl font-bold flex items-center justify-center text-center leading-relaxed"
                />
                <span className="absolute bottom-2 right-3 text-[10px] text-white/70 font-mono">
                  {textContent.length}/300
                </span>
              </div>

              {/* Gradient Palette Selection */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Choose Color Style
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {GRADIENT_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedGradient(preset.value)}
                      style={{ background: preset.value }}
                      className={`h-8 rounded-xl transition transform hover:scale-110 shadow-xs ${
                        selectedGradient === preset.value
                          ? "ring-2 ring-blue-500 ring-offset-2 scale-105"
                          : ""
                      }`}
                      title={preset.label}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* ================= PHOTO STATUS MODE ================= */
            <div className="flex-1 flex flex-col space-y-3">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
              />

              {photoPreview ? (
                <div className="relative w-full h-56 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 group">
                  <img
                    src={photoPreview}
                    alt="Status Preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoFile(null);
                      setPhotoPreview(null);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition"
                  >
                    <IconClose className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-2 right-2 px-3 py-1 rounded-xl bg-black/60 text-white text-xs font-semibold hover:bg-black/80 transition"
                  >
                    Change Photo
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-56 rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/40 flex flex-col items-center justify-center cursor-pointer transition p-4 text-center group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-2.5 group-hover:scale-110 transition">
                    <IconCamera className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-800">Tap to upload a photo</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">JPG, PNG, GIF up to 15MB</p>
                </div>
              )}

              {/* Caption Input */}
              <div>
                <input
                  type="text"
                  placeholder="Add a caption... (optional)"
                  value={photoCaption}
                  onChange={(e) => setPhotoCaption(e.target.value)}
                  maxLength={160}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                />
              </div>
            </div>
          )}

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
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/25 transition transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                "Publishing..."
              ) : (
                <>
                  <IconSend className="w-4 h-4" />
                  <span>Publish Status</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
