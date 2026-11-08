import React from "react";

export default function Logo({ size = "md", showTag = true, className = "" }) {
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
    xl: "w-14 h-14 text-lg",
  };

  const titleSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
    xl: "text-3xl",
  };

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Icon with natural subtle aura */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur-sm opacity-50 group-hover:opacity-80 transition duration-300"></div>
        <div
          className={`relative ${sizeClasses[size] || sizeClasses.md} rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 border border-blue-400/30 flex items-center justify-center shadow-lg shadow-blue-600/20 overflow-hidden`}
        >
          {/* Natural clean pulse waveform */}
          <svg viewBox="0 0 24 24" className="w-3/5 h-3/5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="rgba(255,255,255,0.15)" stroke="none" />
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            <path d="M8 10h.01M12 10h.01M16 10h.01" strokeWidth="3" />
          </svg>
        </div>
      </div>

      {/* Brand Text */}
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className={`font-black tracking-tight text-white ${titleSizes[size] || titleSizes.md}`}>
            Pulse<span className="text-blue-500">Chat</span>
          </span>
          {showTag && (
            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold tracking-wider uppercase bg-blue-500/15 text-blue-400 border border-blue-500/25">
              Live
            </span>
          )}
        </div>
        <span className="text-[10px] text-slate-400 font-medium tracking-wide -mt-0.5">
          Realtime Messaging & HD Calling
        </span>
      </div>
    </div>
  );
}

