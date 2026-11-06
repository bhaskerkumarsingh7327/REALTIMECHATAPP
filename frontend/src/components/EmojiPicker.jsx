import React, { useState } from "react";

const EMOJI_CATEGORIES = {
  Reactions: ["❤️", "👍", "🔥", "😂", "🎉", "👏", "😍", "✨", "🙌", "💯"],
  Smileys: ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔"],
  Gestures: ["👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🫰", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲"],
  Hearts: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❤️‍🔥", "❤️‍🩹", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝"],
  Objects: ["🚀", "⭐", "🌟", "💡", "☕", "🍕", "🍔", "🎮", "🎵", "🎧", "📷", "💻", "📱", "🔒", "🔑", "🏆", "🎁", "🎈", "💎", "⚡"],
};

export default function EmojiPicker({ onSelectEmoji, onClose }) {
  const [activeCategory, setActiveCategory] = useState("Reactions");

  return (
    <div className="absolute bottom-16 left-0 sm:left-4 z-50 w-72 sm:w-80 bg-[#161b26] border border-white/10 rounded-2xl shadow-2xl p-3 animate-fade-in backdrop-blur-md">
      {/* Category Tabs */}
      <div className="flex items-center gap-1 pb-2 mb-2 border-b border-white/10 overflow-x-auto text-xs">
        {Object.keys(EMOJI_CATEGORIES).map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-2.5 py-1 rounded-lg font-medium transition whitespace-nowrap ${
              activeCategory === cat
                ? "bg-violet-600 text-white"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Emoji Grid */}
      <div className="grid grid-cols-6 sm:grid-cols-7 gap-1.5 max-h-48 overflow-y-auto pr-1">
        {EMOJI_CATEGORIES[activeCategory].map((emoji, index) => (
          <button
            key={index}
            onClick={() => onSelectEmoji(emoji)}
            className="w-9 h-9 flex items-center justify-center text-xl hover:bg-white/10 rounded-xl transition transform hover:scale-125 active:scale-95"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

