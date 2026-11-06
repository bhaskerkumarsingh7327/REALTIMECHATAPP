import React from "react";
import { IconPhone, IconVideo } from "./Icons";

export default function CallButtons({ onStartAudioCall, onStartVideoCall }) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onStartAudioCall}
        title="Voice Call"
        className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition shadow-sm"
      >
        <IconPhone className="w-5 h-5" />
      </button>
      <button
        onClick={onStartVideoCall}
        title="Video Call"
        className="p-2.5 rounded-xl bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 border border-violet-500/20 transition shadow-sm"
      >
        <IconVideo className="w-5 h-5" />
      </button>
    </div>
  );
}
