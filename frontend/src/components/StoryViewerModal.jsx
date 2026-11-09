import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { serverUrl } from "../main";
import { IconClose, IconEye, IconTrash } from "./Icons";

function formatStoryTime(dateInput) {
  if (!dateInput) return "";
  const date = new Date(dateInput);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function StoryViewerModal({
  storyGroup, // { user, statuses: [...] }
  currentUser,
  onClose,
  onDeleteStatus,
  onStoryViewed,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showViewersSheet, setShowViewersSheet] = useState(false);

  const statuses = storyGroup?.statuses || [];
  const currentStatus = statuses[currentIndex];
  const isMyStory = String(storyGroup?.user?._id || storyGroup?.user) === String(currentUser?._id);

  // Mark status as viewed in backend
  useEffect(() => {
    if (!currentStatus || isMyStory) return;

    axios
      .post(`${serverUrl}/api/status/${currentStatus._id}/view`, {
        userId: currentUser._id,
      })
      .then(() => {
        if (onStoryViewed) onStoryViewed(currentStatus._id);
      })
      .catch(() => {});
  }, [currentStatus?._id, isMyStory, currentUser?._id]);

  // Story Timer (5 seconds per slide)
  useEffect(() => {
    if (!currentStatus || isPaused || showViewersSheet) return;

    setProgress(0);
    const intervalMs = 50;
    const step = 100 / (5000 / intervalMs); // 5 seconds total

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          handleNext();
          return 0;
        }
        return prev + step;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [currentIndex, isPaused, showViewersSheet, currentStatus]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, statuses.length]);

  const handleNext = () => {
    if (currentIndex < statuses.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setProgress(0);
    }
  };

  const handleDeleteCurrent = async () => {
    if (!currentStatus || !window.confirm("Are you sure you want to delete this status update?")) return;
    try {
      await axios.delete(`${serverUrl}/api/status/${currentStatus._id}?userId=${currentUser._id}`);
      if (onDeleteStatus) onDeleteStatus(currentStatus._id);
      if (statuses.length <= 1) {
        onClose();
      } else {
        handleNext();
      }
    } catch (err) {
      console.error("Delete status error:", err);
    }
  };

  if (!currentStatus) return null;

  const viewsList = currentStatus.views || [];

  return (
    <div className="fixed inset-0 z-[250] bg-black/95 backdrop-blur-md flex items-center justify-center select-none font-sans animate-fade-in">
      {/* Story Stage Frame */}
      <div
        className="relative w-full max-w-md h-full md:h-[90vh] md:max-h-[820px] md:rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between"
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* ================= BACKGROUND CONTENT ================= */}
        {currentStatus.mediaType === "image" && currentStatus.mediaUrl ? (
          <div className="absolute inset-0 bg-black flex items-center justify-center">
            <img
              src={currentStatus.mediaUrl}
              alt="Story"
              className="w-full h-full object-contain"
            />
            {currentStatus.text && (
              <div className="absolute bottom-16 inset-x-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-center z-10">
                <p className="text-white text-sm md:text-base font-semibold drop-shadow-md">
                  {currentStatus.text}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div
            style={{ background: currentStatus.backgroundColor || "linear-gradient(135deg, #2563eb, #7c3aed)" }}
            className="absolute inset-0 flex items-center justify-center p-8 text-center text-white"
          >
            <p className="text-xl md:text-2xl font-bold leading-relaxed whitespace-pre-wrap drop-shadow-lg max-w-sm">
              {currentStatus.text}
            </p>
          </div>
        )}

        {/* ================= TOP CONTROLS & TIMERS ================= */}
        <div className="relative z-30 p-4 pt-3 bg-gradient-to-b from-black/70 via-black/30 to-transparent">
          {/* Progress Bars for multiple stories */}
          <div className="flex items-center gap-1.5 mb-3">
            {statuses.map((s, idx) => {
              let fillPercent = 0;
              if (idx < currentIndex) fillPercent = 100;
              else if (idx === currentIndex) fillPercent = progress;

              return (
                <div
                  key={s._id || idx}
                  className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden"
                >
                  <div
                    className="h-full bg-white transition-all duration-75"
                    style={{ width: `${fillPercent}%` }}
                  />
                </div>
              );
            })}
          </div>

          {/* User Info & Actions Bar */}
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <img
                src={
                  storyGroup.user?.avatar ||
                  `https://api.dicebear.com/7.x/bottts/svg?seed=${storyGroup.user?.username || "user"}`
                }
                alt="Avatar"
                className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-sm"
              />
              <div>
                <h4 className="text-sm font-bold truncate text-white drop-shadow-sm">
                  {isMyStory ? "My Status" : storyGroup.user?.name || storyGroup.user?.username}
                </h4>
                <p className="text-[11px] text-white/80 font-medium">
                  {formatStoryTime(currentStatus.createdAt)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Delete button (owner only) */}
              {isMyStory && (
                <button
                  onClick={handleDeleteCurrent}
                  className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white/80 hover:text-red-400 transition"
                  title="Delete this status"
                >
                  <IconTrash className="w-4 h-4" />
                </button>
              )}

              {/* Close Button */}
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition"
                title="Close"
              >
                <IconClose className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* ================= TAP NAVIGATION ZONES ================= */}
        <div className="absolute inset-0 z-20 flex">
          <div
            onClick={handlePrev}
            className="w-1/3 h-full cursor-pointer"
            title="Previous Story"
          />
          <div
            onClick={handleNext}
            className="w-2/3 h-full cursor-pointer"
            title="Next Story"
          />
        </div>

        {/* ================= BOTTOM BAR (VIEWS FOR MY STORY) ================= */}
        {isMyStory && (
          <div className="relative z-30 p-4 pb-5 flex items-center justify-center bg-gradient-to-t from-black/80 via-black/40 to-transparent">
            <button
              onClick={() => setShowViewersSheet(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-xs font-semibold shadow-lg transition"
            >
              <IconEye className="w-4 h-4" />
              <span>
                {viewsList.length} {viewsList.length === 1 ? "view" : "views"}
              </span>
              <span className="text-[10px] text-white/70">▲</span>
            </button>
          </div>
        )}

        {/* ================= VIEWERS BOTTOM SHEET (MY STORY) ================= */}
        {isMyStory && showViewersSheet && (
          <div className="absolute inset-x-0 bottom-0 z-40 max-h-[60%] bg-white rounded-t-3xl p-5 shadow-2xl flex flex-col text-slate-800 animate-slide-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
              <div className="flex items-center gap-2">
                <IconEye className="w-4 h-4 text-blue-600" />
                <h5 className="font-bold text-sm text-slate-900">
                  Viewed by ({viewsList.length})
                </h5>
              </div>
              <button
                onClick={() => setShowViewersSheet(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <IconClose className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {viewsList.length > 0 ? (
                viewsList.map((vw, vIdx) => {
                  const viewer = vw.user;
                  return (
                    <div
                      key={vIdx}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            viewer?.avatar ||
                            `https://api.dicebear.com/7.x/bottts/svg?seed=${viewer?.username || "user"}`
                          }
                          alt="Viewer"
                          className="w-8 h-8 rounded-full object-cover border border-slate-200"
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-900">
                            {viewer?.name || viewer?.username || "User"}
                          </p>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {formatStoryTime(vw.viewedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No views yet. When contacts view your status, they will appear here.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
