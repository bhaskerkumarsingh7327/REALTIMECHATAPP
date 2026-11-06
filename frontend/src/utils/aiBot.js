// Pulse AI Companion - Local intelligent conversational bot

export const PULSE_AI_USER = {
  _id: "pulse_ai_assistant_bot_id",
  username: "Pulse AI",
  name: "Pulse AI Assistant",
  avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=pulseai&backgroundColor=8b5cf6",
  about: "⚡ Next-Gen Neural Assistant. Ask me anything!",
  isOnline: true,
};

export async function generateAIResponse(promptText) {
  // Simulate natural typing delay
  await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 800));

  const prompt = (promptText || "").toLowerCase().trim();

  if (prompt.includes("hello") || prompt.includes("hi") || prompt.includes("hey") || prompt.includes("namaste")) {
    return "Hey there! 👋 I'm **Pulse AI**, your built-in neural assistant. I can help you draft messages, brainstorm ideas, explain concepts, write code, or just chat. How can I help you today?";
  }

  if (prompt.includes("feature") || prompt.includes("app") || prompt.includes("pulsechat") || prompt.includes("b chat")) {
    return `✨ **PulseChat Features Overview**:
• 📞 **Crystal-Clear HD Audio & Video Calls** with WebRTC
• 🎵 **Voice Notes Recorder** & instant playback
• ⚡ **Realtime Messaging** via Socket.io with typing indicators
• 🟢 **Live Online / Offline Status** detection
• ❤️ **Message Reactions** (react with emojis anytime!)
• 📎 **Media & File Sharing** (photos, videos, documents)
• 🤖 **Pulse AI Assistant** (you're chatting with me right now!)
• 🎨 **Luxury Dark Glassmorphic Design**`;
  }

  if (prompt.includes("video call") || prompt.includes("call")) {
    return "📹 **How to use Video / Audio Calling in PulseChat:**\n1. Select any chat from your contact list.\n2. Tap the **Phone 📞** button for Voice Call or **Camera 📹** for Video Call.\n3. The recipient gets an instant incoming call modal with synthesized ringtones!\n4. During the call, you can mute your mic, toggle video, or share your screen!";
  }

  if (prompt.includes("code") || prompt.includes("react") || prompt.includes("javascript") || prompt.includes("python")) {
    return `💻 Here is a quick code snippet for you:

\`\`\`javascript
// PulseChat Realtime Hook
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

export function useRealtimePresence(userId) {
  const [online, setOnline] = useState(false);
  useEffect(() => {
    const socket = io();
    socket.emit('register-user', userId);
    socket.on('user-status-changed', ({ isOnline }) => setOnline(isOnline));
    return () => socket.disconnect();
  }, [userId]);
  return online;
}
\`\`\`
Let me know if you want me to write code in any specific language or framework!`;
  }

  if (prompt.includes("joke") || prompt.includes("funny")) {
    const jokes = [
      "Why do programmers prefer dark mode? Because light attracts bugs! 🐛",
      "There are 10 types of people in the world: those who understand binary, and those who don't. 😄",
      "Why did the JavaScript developer wear glasses? Because they didn't C#! 🤓",
      "A SQL query walks into a bar, walks up to two tables and asks: 'Can I join you?' 🍻",
    ];
    return jokes[Math.floor(Math.random() * jokes.length)];
  }

  if (prompt.includes("bye") || prompt.includes("see you")) {
    return "See you soon! Feel free to ping me whenever you need help. Have an awesome day! 🚀";
  }

  // Dynamic intelligent answer
  return `🤖 **Pulse AI**: That's an interesting point! You asked: "${promptText}".
PulseChat's neural engine is ready to assist you. You can share media files, initiate HD video/voice calls with contacts, or use real-time reactions on any message. Is there anything specific you would like to explore or do?`;
}

