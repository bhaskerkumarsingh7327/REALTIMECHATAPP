import React from "react";

export default function Logo({ size = "md", showTag = true, className = "" }) {
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-14 h-14 text-base",
    xl: "w-16 h-16 text-lg",
  };

  const titleSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
    xl: "text-3xl",
  };

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Icon with glowing aura */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-400 rounded-2xl blur-sm opacity-70 group-hover:opacity-100 transition duration-300"></div>
        <div
          className={`relative ${sizeClasses[size] || sizeClasses.md} rounded-2xl bg-[#0e131f] border border-white/20 flex items-center justify-center shadow-inner overflow-hidden`}
        >
          {/* Animated gradient wave */}
          <svg viewBox="0 0 40 40" className="w-4/5 h-4/5" fill="none">
            <defs>
              <linearGradient id="pulseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="50%" stopColor="#d946ef" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
            {/* Outer ring */}
            <circle cx="20" cy="20" r="16" stroke="url(#pulseGrad)" strokeWidth="2" strokeDasharray="4 2" className="animate-[spin_12s_linear_infinite]" />
            {/* Pulse waveform */}
            <path
              d="M10 20h4l2-5 4 10 3-8 3 4 4-1"
              stroke="url(#pulseGrad)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Center dot */}
            <circle cx="20" cy="20" r="2.5" fill="#38bdf8" className="animate-ping opacity-75" />
          </svg>
        </div>
      </div>

      {/* Brand Text */}
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className={`font-black tracking-tight bg-gradient-to-r from-white via-violet-200 to-fuchsia-300 bg-clip-text text-transparent ${titleSizes[size] || titleSizes.md}`}>
            Pulse<span className="text-violet-400">Chat</span>
          </span>
          {showTag && (
            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase bg-violet-500/20 text-violet-300 border border-violet-500/30">
              Nexus
            </span>
          )}
        </div>
        <span className="text-[10px] text-gray-400 font-medium tracking-wide -mt-0.5">
          Realtime Voice • Video • Neural
        </span>
      </div>
    </div>
  );
}

