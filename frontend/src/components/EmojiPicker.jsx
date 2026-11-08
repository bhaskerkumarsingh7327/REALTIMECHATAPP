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
    <div className="absolute bottom-16 left-0 sm:left-4 z-50 w-72 sm:w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl p-3 animate-fade-in">
      {/* Category Tabs */}
      <div className="flex items-center gap-1 pb-2 mb-2 border-b border-slate-200 overflow-x-auto text-xs">
        {Object.keys(EMOJI_CATEGORIES).map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-2.5 py-1 rounded-lg font-medium transition whitespace-nowrap ${
              activeCategory === cat
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
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
            className="w-9 h-9 flex items-center justify-center text-xl hover:bg-slate-100 rounded-xl transition transform hover:scale-125 active:scale-95"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

