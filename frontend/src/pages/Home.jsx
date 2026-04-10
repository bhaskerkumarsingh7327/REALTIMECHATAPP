// import React, { useState, useEffect, useRef } from "react";
// import { useSelector, useDispatch } from "react-redux";
// import { useNavigate } from "react-router-dom";
// import {
//   SwipeableList,
//   SwipeableListItem,
//   TrailingActions,
//   SwipeAction,
// } from "react-swipeable-list";
// import "react-swipeable-list/dist/styles.css";
// import { clearUserData, setUserData } from "../redux/userSlice";
// import io from "socket.io-client";

// const SOCKET_URL = "http://localhost:8000";

// function Home() {
//   const dispatch = useDispatch();
//   const navigate = useNavigate();
//   const reduxUserData = useSelector((state) => state.user.userData);

//   const [userData, setUserDataState] = useState(
//     reduxUserData || JSON.parse(localStorage.getItem("userData"))
//   );
//   const [chats, setChats] = useState([]);
//   const [selectedChat, setSelectedChat] = useState(null);
//   const [message, setMessage] = useState("");
//   const [showAddChatModal, setShowAddChatModal] = useState(false);
//   const [newChatName, setNewChatName] = useState("");
//   const [callActive, setCallActive] = useState(false);
//   const [callType, setCallType] = useState(null);
//   const [remoteStream, setRemoteStream] = useState(null);
//   const [callStartedAt, setCallStartedAt] = useState(null);
//   const [incomingCall, setIncomingCall] = useState(null); // for incoming call
//   const [miniVideo, setMiniVideo] = useState(false); // local video corner mode

//   const localVideoRef = useRef();
//   const remoteVideoRef = useRef();
//   const socketRef = useRef();
//   const peerRef = useRef();

//   // ---------- Load user ----------
//   useEffect(() => {
//     if (!userData) {
//       const savedUser = JSON.parse(localStorage.getItem("userData"));
//       if (savedUser) {
//         setUserDataState(savedUser);
//         dispatch(setUserData(savedUser));
//       }
//     } else {
//       localStorage.setItem("userData", JSON.stringify(userData));
//     }
//   }, [userData, dispatch]);

//   // ---------- Socket Setup ----------
//   useEffect(() => {
//     socketRef.current = io(SOCKET_URL);

//     socketRef.current.on("connect", () => console.log("✅ Connected to server"));

//     socketRef.current.on("receive-message", (data) => {
//       if (data.chatId === selectedChat?._id) {
//         setChats((prev) =>
//           prev.map((chat) =>
//             chat._id === data.chatId
//               ? { ...chat, messages: [...(chat.messages || []), data.message] }
//               : chat
//           )
//         );
//         setSelectedChat((prev) =>
//           prev
//             ? { ...prev, messages: [...(prev.messages || []), data.message] }
//             : prev
//         );
//       }
//     });

//     // WebRTC signaling
//     socketRef.current.on("signal", ({ signal, from }) => {
//       if (incomingCall && !callActive) {
//         setIncomingCall({ from, signal });
//       } else if (peerRef.current) {
//         peerRef.current.signal(signal);
//       }
//     });

//     socketRef.current.on("end-call", () => endCall("remote"));

//     return () => socketRef.current.disconnect();
//   }, [selectedChat, incomingCall]);

//   // ---------- Load chats ----------
//   useEffect(() => {
//     const savedChats = JSON.parse(localStorage.getItem("chats")) || [];
//     if (savedChats.length > 0) {
//       setChats(savedChats);
//       setSelectedChat(savedChats[0]);
//     } else {
//       const defaultChat = { _id: Date.now().toString(), name: "General Chat", messages: [] };
//       setChats([defaultChat]);
//       setSelectedChat(defaultChat);
//       localStorage.setItem("chats", JSON.stringify([defaultChat]));
//     }
//   }, []);

//   // ---------- Join room ----------
//   useEffect(() => {
//     if (socketRef.current && selectedChat?._id) {
//       socketRef.current.emit("join-room", selectedChat._id);
//     }
//   }, [selectedChat]);

//   // ---------- Helper: add system message ----------
//   const addSystemMessage = (text) => {
//     if (!selectedChat) return;
//     const newMsg = { sender: "system", text };
//     const updatedChats = chats.map((chat) =>
//       chat._id === selectedChat._id
//         ? { ...chat, messages: [...(chat.messages || []), newMsg] }
//         : chat
//     );
//     setChats(updatedChats);
//     setSelectedChat((prev) =>
//       prev ? { ...prev, messages: [...(prev.messages || []), newMsg] } : prev
//     );
//     localStorage.setItem("chats", JSON.stringify(updatedChats));
//   };

//   // ---------- Send message ----------
//   const handleSend = () => {
//     if (!message.trim() || !selectedChat) return;
//     const newMsg = { sender: userData?.name || "Anonymous", text: message.trim() };
//     const updatedChats = chats.map((chat) =>
//       chat._id === selectedChat._id
//         ? { ...chat, messages: [...(chat.messages || []), newMsg] }
//         : chat
//     );
//     setChats(updatedChats);
//     setSelectedChat((prev) =>
//       prev ? { ...prev, messages: [...(prev.messages || []), newMsg] } : prev
//     );
//     localStorage.setItem("chats", JSON.stringify(updatedChats));
//     setMessage("");
//     socketRef.current?.emit("send-message", { chatId: selectedChat._id, message: newMsg });
//   };

//   // ---------- Media upload ----------
//   const handleMediaUpload = async (e) => {
//     const file = e.target.files[0];
//     if (!file || !selectedChat) return;
//     const newMsg = {
//       sender: userData?.name || "Anonymous",
//       text: file.name,
//       mediaUrl: URL.createObjectURL(file),
//       mediaType: file.type,
//     };
//     const updatedChats = chats.map((chat) =>
//       chat._id === selectedChat._id
//         ? { ...chat, messages: [...(chat.messages || []), newMsg] }
//         : chat
//     );
//     setChats(updatedChats);
//     setSelectedChat((prev) =>
//       prev ? { ...prev, messages: [...(prev.messages || []), newMsg] } : prev
//     );
//     localStorage.setItem("chats", JSON.stringify(updatedChats));
//     socketRef.current?.emit("send-message", { chatId: selectedChat._id, message: newMsg });
//   };

//   // ---------- Start Call ----------
//   const startCall = async (type) => {
//     setCallType(type);
//     setCallActive(true);
//     setCallStartedAt(Date.now());
//     setMiniVideo(false);
//     addSystemMessage(type === "audio" ? "📞 Audio call started" : "🎥 Video call started");

//     const stream = await navigator.mediaDevices.getUserMedia({
//       video: type === "video",
//       audio: true,
//     });
//     if (localVideoRef.current) localVideoRef.current.srcObject = stream;

//     const Peer = (await import("simple-peer")).default;
//     const peer = new Peer({ initiator: true, trickle: false, stream });

//     peer.on("signal", (signal) => socketRef.current.emit("signal", { roomId: selectedChat._id, signal }));

//     peer.on("connect", () => addSystemMessage("✅ Call connected"));

//     peer.on("stream", (remoteStream) => {
//       setRemoteStream(remoteStream);
//       if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
//       setMiniVideo(true); // corner mode when remote joins
//     });

//     peerRef.current = peer;
//   };

//   // ---------- Answer Incoming Call ----------
//   const answerCall = async () => {
//     if (!incomingCall) return;
//     setCallActive(true);
//     setCallStartedAt(Date.now());
//     setMiniVideo(false);

//     const stream = await navigator.mediaDevices.getUserMedia({
//       video: incomingCall.type === "video",
//       audio: true,
//     });
//     if (localVideoRef.current) localVideoRef.current.srcObject = stream;

//     const Peer = (await import("simple-peer")).default;
//     const peer = new Peer({ initiator: false, trickle: false, stream });

//     peer.on("signal", (signal) => socketRef.current.emit("signal", { roomId: selectedChat._id, signal }));

//     peer.on("stream", (remoteStream) => {
//       setRemoteStream(remoteStream);
//       if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
//       setMiniVideo(true);
//     });

//     peer.signal(incomingCall.signal);
//     peerRef.current = peer;
//     setIncomingCall(null);
//     addSystemMessage("✅ Call connected");
//   };

//   const declineCall = () => {
//     setIncomingCall(null);
//     socketRef.current?.emit("end-call");
//     addSystemMessage("❌ Call declined");
//   };

//   const endCall = (who = "self") => {
//     if (!callActive) return;
//     const callDuration = callStartedAt ? (Date.now() - callStartedAt) / 1000 : 0;
//     if (callDuration < 10) {
//       addSystemMessage("❌ Missed call");
//     } else {
//       addSystemMessage("🔚 Call ended");
//     }
//     setCallActive(false);
//     setRemoteStream(null);
//     setMiniVideo(false);
//     peerRef.current?.destroy();
//     peerRef.current = null;
//     socketRef.current?.emit("end-call");
//   };

//   // ---------- Delete Chat ----------
//   const confirmDeleteChat = (id) => {
//     if (window.confirm("Are you sure you want to delete this chat?")) {
//       const updatedChats = chats.filter((chat) => chat._id !== id);
//       setChats(updatedChats);
//       localStorage.setItem("chats", JSON.stringify(updatedChats));
//       if (selectedChat?._id === id) setSelectedChat(null);
//     }
//   };

//   const renderChatItem = (chat) => (
//     <div
//       key={chat._id}
//       className={`group flex items-center justify-between p-4 cursor-pointer hover:bg-white/30 transition ${
//         selectedChat?._id === chat._id ? "bg-white/40" : ""
//       }`}
//       onClick={() => setSelectedChat(chat)}
//     >
//       <div className="flex items-center flex-1">
//         <div className="w-12 h-12 bg-gradient-to-br from-pink-500 via-purple-600 to-indigo-500 rounded-full mr-3 flex items-center justify-center text-white font-bold shadow-lg">
//           {chat.name?.[0]}
//         </div>
//         <div className="truncate">
//           <h4 className="font-semibold text-white">{chat.name}</h4>
//           <p className="text-sm text-gray-200 truncate w-40">
//             {chat.messages?.[chat.messages.length - 1]?.text || "No messages yet"}
//           </p>
//         </div>
//       </div>
//       <button
//         onClick={(e) => {
//           e.stopPropagation();
//           confirmDeleteChat(chat._id);
//         }}
//         className="ml-3 px-3 py-1 bg-red-500 text-white text-xs rounded-full shadow transition-transform transform scale-0 group-hover:scale-100 hover:scale-110 hover:bg-red-600 hover:shadow-lg"
//       >
//         Delete
//       </button>
//     </div>
//   );

//   const trailingActions = (chatId) => (
//     <TrailingActions>
//       <SwipeAction destructive onClick={() => confirmDeleteChat(chatId)}>
//         Delete
//       </SwipeAction>
//     </TrailingActions>
//   );

//   // ---------- Render ----------
//   return (
//     <div className="min-h-screen flex bg-gradient-to-br from-[#0f2027] via-[#203a43] to-[#2c5364]">
//       {/* Sidebar */}
//       <div className="w-80 bg-white/20 backdrop-blur-xl shadow-2xl flex flex-col border-r border-white/30">
//         <div
//           onClick={() => navigate("/profile")}
//           className="flex items-center p-4 border-b border-white/20 bg-gradient-to-r from-purple-700 via-pink-600 to-yellow-500 text-white rounded-b-2xl cursor-pointer hover:opacity-95 transition"
//         >
//           <img
//             src={userData?.avatar || "https://www.w3schools.com/howto/img_avatar.png"}
//             alt="User"
//             className="w-12 h-12 rounded-full mr-3 object-cover border-2 border-white shadow-lg"
//           />
//           <div>
//             <h3 className="text-lg font-bold">{userData?.name || "User"}</h3>
//             <p className="text-sm text-gray-200">@{userData?.username || "username"}</p>
//           </div>
//         </div>
//         <div className="flex justify-between items-center p-4 border-b border-white/20">
//           <h2 className="font-bold text-white">Chats</h2>
//           <div className="flex gap-2">
//             <button
//               onClick={() => setShowAddChatModal(true)}
//               className="px-3 py-1 bg-gradient-to-r from-purple-600 via-pink-500 to-yellow-400 text-white rounded-full text-sm hover:scale-105 transition transform shadow-lg"
//             >
//               + Add
//             </button>
//             <button
//               onClick={() => {
//                 dispatch(clearUserData());
//                 localStorage.removeItem("userData");
//                 navigate("/login");
//               }}
//               className="px-3 py-1 bg-red-500 text-white rounded-full text-sm hover:scale-105 transition transform shadow-lg"
//             >
//               Logout
//             </button>
//           </div>
//         </div>
//         <div className="flex-1 overflow-y-auto custom-scrollbar">
//           <SwipeableList>
//             {chats.map((chat) => (
//               <SwipeableListItem key={chat._id} trailingActions={() => trailingActions(chat._id)}>
//                 {renderChatItem(chat)}
//               </SwipeableListItem>
//             ))}
//           </SwipeableList>
//         </div>
//       </div>

//       {/* Chat Area */}
//       <div className="flex-1 flex flex-col bg-white/10 backdrop-blur-lg shadow-2xl rounded-l-2xl relative">
//         {selectedChat ? (
//           <>
//             {/* Chat header + call buttons */}
//             <div className="p-4 border-b border-white/20 flex items-center bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-600 text-white rounded-tl-2xl shadow-lg">
//               <div className="w-10 h-10 bg-indigo-600 rounded-full mr-3 flex items-center justify-center font-bold shadow-md">
//                 {selectedChat.name?.[0]}
//               </div>
//               <h3 className="font-bold">{selectedChat.name}</h3>
//               <div className="ml-auto flex gap-2">
//                 <button
//                   title="Audio Call"
//                   className="px-3 py-1 bg-green-500 text-white rounded-full shadow hover:bg-green-600"
//                   onClick={() => startCall("audio")}
//                 >
//                   🎧 Audio
//                 </button>
//                 <button
//                   title="Video Call"
//                   className="px-3 py-1 bg-blue-500 text-white rounded-full shadow hover:bg-blue-600"
//                   onClick={() => startCall("video")}
//                 >
//                   🎥 Video
//                 </button>
//               </div>
//             </div>

//             {/* Messages */}
//             <div className="flex-1 p-4 overflow-y-auto flex flex-col space-y-3 bg-transparent custom-scrollbar">
//               {selectedChat.messages?.map((msg, index) => (
//                 <div
//                   key={index}
//                   className={`flex ${
//                     msg.sender === "system"
//                       ? "justify-center"
//                       : msg.sender === (userData?.name || "Anonymous")
//                       ? "justify-end"
//                       : "justify-start"
//                   }`}
//                 >
//                   <div
//                     className={`px-4 py-2 rounded-2xl max-w-xs break-words shadow-md ${
//                       msg.sender === "system"
//                         ? "bg-gray-700 text-white text-sm italic"
//                         : msg.sender === (userData?.name || "Anonymous")
//                         ? "bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white rounded-br-none shadow-lg"
//                         : "bg-white/90 text-gray-800 rounded-bl-none shadow-sm"
//                     }`}
//                   >
//                     {msg.mediaUrl ? (
//                       msg.mediaType.startsWith("image") ? (
//                         <img src={msg.mediaUrl} alt={msg.text} className="max-w-full max-h-40 rounded-lg" />
//                       ) : msg.mediaType.startsWith("video") ? (
//                         <video src={msg.mediaUrl} controls className="max-w-full max-h-40 rounded-lg" />
//                       ) : (
//                         <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" className="underline text-blue-600">
//                           {msg.text}
//                         </a>
//                       )
//                     ) : (
//                       msg.text
//                     )}
//                   </div>
//                 </div>
//               ))}
//             </div>

//             {/* Input + media */}
//             <div className="p-4 border-t border-white/20 flex items-center bg-white/20 backdrop-blur-md">
//               <input
//                 type="text"
//                 placeholder="Type a message..."
//                 className="flex-1 px-4 py-2 border-2 border-white/40 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-400 transition bg-white/70 backdrop-blur-md text-gray-800 placeholder-gray-500"
//                 value={message}
//                 onChange={(e) => setMessage(e.target.value)}
//                 onKeyDown={(e) => e.key === "Enter" && handleSend()}
//               />
//               <label className="ml-2 px-3 py-2 bg-yellow-400 text-gray-900 rounded-full shadow-lg cursor-pointer hover:bg-yellow-500">
//                 <input type="file" hidden onChange={handleMediaUpload} />
//                 📎 Attach
//               </label>
//               <button
//                 onClick={handleSend}
//                 className="ml-2 px-5 py-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 text-white rounded-full hover:scale-105 transition shadow-lg"
//               >
//                 Send
//               </button>
//             </div>

//             {/* Video Call Overlay */}
//             {callActive && (
//               <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50">
//                 <div className="relative w-96 h-96 bg-gray-900 rounded-xl p-2 flex flex-col items-center justify-center">
//                   <video
//                     ref={remoteVideoRef}
//                     autoPlay
//                     className={`w-full h-full rounded-xl object-cover shadow-lg`}
//                   />
//                   <video
//                     ref={localVideoRef}
//                     autoPlay
//                     muted
//                     className={`absolute top-2 right-2 w-28 h-20 rounded-lg shadow-lg object-cover transition-all duration-500 ${
//                       miniVideo ? "opacity-100" : "opacity-100"
//                     }`}
//                   />
//                   <button
//                     onClick={() => endCall("self")}
//                     className="absolute bottom-2 px-4 py-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600"
//                   >
//                     End Call
//                   </button>
//                 </div>
//               </div>
//             )}

//             {/* Incoming Call Modal */}
//             {incomingCall && !callActive && (
//               <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
//                 <div className="bg-gray-800 text-white p-6 rounded-xl shadow-lg flex flex-col items-center">
//                   <h3 className="mb-4">Incoming {callType === "video" ? "Video" : "Audio"} Call</h3>
//                   <div className="flex gap-4">
//                     <button
//                       onClick={answerCall}
//                       className="px-4 py-2 bg-green-500 rounded-full hover:bg-green-600 shadow-lg"
//                     >
//                       Answer
//                     </button>
//                     <button
//                       onClick={declineCall}
//                       className="px-4 py-2 bg-red-500 rounded-full hover:bg-red-600 shadow-lg"
//                     >
//                       Decline
//                     </button>
//                   </div>
//                 </div>
//               </div>
//             )}
//           </>
//         ) : (
//           <div className="flex-1 flex items-center justify-center text-gray-200 italic text-lg">
//             Select a chat to start messaging
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// export default Home;

// import React, { useState, useEffect, useRef } from "react";
// import { useSelector, useDispatch } from "react-redux";
// import { useNavigate } from "react-router-dom";
// import {
//   SwipeableList,
//   SwipeableListItem,
//   TrailingActions,
//   SwipeAction,
// } from "react-swipeable-list";
// import "react-swipeable-list/dist/styles.css";
// import { clearUserData, setUserData } from "../redux/userSlice";
// import io from "socket.io-client";

// const SOCKET_URL = "http://localhost:8000";

// function Home() {
//   const dispatch = useDispatch();
//   const navigate = useNavigate();
//   const reduxUserData = useSelector((state) => state.user.userData);

//   const [userData, setUserDataState] = useState(
//     reduxUserData || JSON.parse(localStorage.getItem("userData"))
//   );
//   const [chats, setChats] = useState([]);
//   const [selectedChat, setSelectedChat] = useState(null);
//   const [message, setMessage] = useState("");
//   const [callActive, setCallActive] = useState(false);
//   const [callType, setCallType] = useState(null);
//   const [remoteStream, setRemoteStream] = useState(null);
//   const [callStartedAt, setCallStartedAt] = useState(null);
//   const [incomingCall, setIncomingCall] = useState(null);
//   const [miniVideo, setMiniVideo] = useState(false);
//   const [usingFrontCamera, setUsingFrontCamera] = useState(true);
//   const [speakerOn, setSpeakerOn] = useState(true);

//   const [localVideoPos, setLocalVideoPos] = useState({ x: 20, y: 20 });
//   const [dragging, setDragging] = useState(false);
//   const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

//   const localVideoRef = useRef();
//   const remoteVideoRef = useRef();
//   const socketRef = useRef();
//   const peerRef = useRef();
//   const localStreamRef = useRef();

//   // ---------- Load user ----------
//   useEffect(() => {
//     if (!userData) {
//       const savedUser = JSON.parse(localStorage.getItem("userData"));
//       if (savedUser) {
//         setUserDataState(savedUser);
//         dispatch(setUserData(savedUser));
//       }
//     } else {
//       localStorage.setItem("userData", JSON.stringify(userData));
//     }
//   }, [userData, dispatch]);

//   // ---------- Socket Setup ----------
//   useEffect(() => {
//     socketRef.current = io(SOCKET_URL);

//     socketRef.current.on("connect", () => console.log("✅ Connected to server"));

//     socketRef.current.on("receive-message", (data) => {
//       if (data.chatId === selectedChat?._id) {
//         setChats((prev) =>
//           prev.map((chat) =>
//             chat._id === data.chatId
//               ? { ...chat, messages: [...(chat.messages || []), data.message] }
//               : chat
//           )
//         );
//         setSelectedChat((prev) =>
//           prev
//             ? { ...prev, messages: [...(prev.messages || []), data.message] }
//             : prev
//         );
//       }
//     });

//     socketRef.current.on("signal", ({ signal, from }) => {
//       if (incomingCall && !callActive) {
//         setIncomingCall({ from, signal });
//       } else if (peerRef.current) {
//         peerRef.current.signal(signal);
//       }
//     });

//     socketRef.current.on("end-call", () => endCall("remote"));

//     return () => socketRef.current.disconnect();
//   }, [selectedChat, incomingCall]);

//   // ---------- Load chats ----------
//   useEffect(() => {
//     const savedChats = JSON.parse(localStorage.getItem("chats")) || [];
//     if (savedChats.length > 0) {
//       setChats(savedChats);
//       setSelectedChat(savedChats[0]);
//     } else {
//       const defaultChat = { _id: Date.now().toString(), name: "General Chat", messages: [] };
//       setChats([defaultChat]);
//       setSelectedChat(defaultChat);
//       localStorage.setItem("chats", JSON.stringify([defaultChat]));
//     }
//   }, []);

//   // ---------- Join room ----------
//   useEffect(() => {
//     if (socketRef.current && selectedChat?._id) {
//       socketRef.current.emit("join-room", selectedChat._id);
//     }
//   }, [selectedChat]);

//   // ---------- Helper ----------
//   const addSystemMessage = (text) => {
//     if (!selectedChat) return;
//     const newMsg = { sender: "system", text };
//     const updatedChats = chats.map((chat) =>
//       chat._id === selectedChat._id
//         ? { ...chat, messages: [...(chat.messages || []), newMsg] }
//         : chat
//     );
//     setChats(updatedChats);
//     setSelectedChat((prev) =>
//       prev ? { ...prev, messages: [...(prev.messages || []), newMsg] } : prev
//     );
//     localStorage.setItem("chats", JSON.stringify(updatedChats));
//   };

//   const handleSend = () => {
//     if (!message.trim() || !selectedChat) return;
//     const newMsg = { sender: userData?.name || "Anonymous", text: message.trim() };
//     const updatedChats = chats.map((chat) =>
//       chat._id === selectedChat._id
//         ? { ...chat, messages: [...(chat.messages || []), newMsg] }
//         : chat
//     );
//     setChats(updatedChats);
//     setSelectedChat((prev) =>
//       prev ? { ...prev, messages: [...(prev.messages || []), newMsg] } : prev
//     );
//     localStorage.setItem("chats", JSON.stringify(updatedChats));
//     setMessage("");
//     socketRef.current?.emit("send-message", { chatId: selectedChat._id, message: newMsg });
//   };

//   const handleMediaUpload = async (e) => {
//     const file = e.target.files[0];
//     if (!file || !selectedChat) return;
//     const newMsg = {
//       sender: userData?.name || "Anonymous",
//       text: file.name,
//       mediaUrl: URL.createObjectURL(file),
//       mediaType: file.type,
//     };
//     const updatedChats = chats.map((chat) =>
//       chat._id === selectedChat._id
//         ? { ...chat, messages: [...(chat.messages || []), newMsg] }
//         : chat
//     );
//     setChats(updatedChats);
//     setSelectedChat((prev) =>
//       prev ? { ...prev, messages: [...(prev.messages || []), newMsg] } : prev
//     );
//     localStorage.setItem("chats", JSON.stringify(updatedChats));
//     socketRef.current?.emit("send-message", { chatId: selectedChat._id, message: newMsg });
//   };

//   // ---------- Video Call ----------
//   const startCall = async (type) => {
//     setCallType(type);
//     setCallActive(true);
//     setCallStartedAt(Date.now());
//     setMiniVideo(false);
//     addSystemMessage(type === "audio" ? "📞 Audio call started" : "🎥 Video call started");
//     await initStream(type === "video");
//   };

//   const initStream = async (isVideo) => {
//     const stream = await navigator.mediaDevices.getUserMedia({
//       video: isVideo ? { facingMode: usingFrontCamera ? "user" : "environment" } : false,
//       audio: true,
//     });
//     localStreamRef.current = stream;
//     if (localVideoRef.current) localVideoRef.current.srcObject = stream;

//     const Peer = (await import("simple-peer")).default;
//     const peer = new Peer({ initiator: true, trickle: false, stream });

//     peer.on("signal", (signal) => socketRef.current.emit("signal", { roomId: selectedChat._id, signal }));
//     peer.on("connect", () => addSystemMessage("✅ Call connected"));
//     peer.on("stream", (remoteStream) => {
//       setRemoteStream(remoteStream);
//       if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
//       setMiniVideo(true);
//     });

//     peerRef.current = peer;
//   };

//   const answerCall = async () => {
//     if (!incomingCall) return;
//     setCallActive(true);
//     setCallStartedAt(Date.now());
//     setMiniVideo(false);
//     await initStream(callType === "video");
//     const Peer = (await import("simple-peer")).default;
//     const peer = new Peer({ initiator: false, trickle: false, stream: localStreamRef.current });
//     peer.on("signal", (signal) => socketRef.current.emit("signal", { roomId: selectedChat._id, signal }));
//     peer.on("stream", (remoteStream) => {
//       setRemoteStream(remoteStream);
//       if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
//       setMiniVideo(true);
//     });
//     peer.signal(incomingCall.signal);
//     peerRef.current = peer;
//     setIncomingCall(null);
//     addSystemMessage("✅ Call connected");
//   };

//   const toggleCamera = async () => {
//     if (!localStreamRef.current) return;
//     const videoTrack = localStreamRef.current.getVideoTracks()[0];
//     if (!videoTrack) return;
//     setUsingFrontCamera(!usingFrontCamera);
//     videoTrack.stop();
//     await initStream(callType === "video");
//   };

//   const toggleSpeaker = () => {
//     setSpeakerOn(!speakerOn);
//     if (remoteVideoRef.current) remoteVideoRef.current.muted = !speakerOn;
//   };

//   const endCall = (who = "self") => {
//     if (!callActive) return;
//     const callDuration = callStartedAt ? (Date.now() - callStartedAt) / 1000 : 0;
//     if (callDuration < 10) addSystemMessage("❌ Missed call");
//     else addSystemMessage("🔚 Call ended");
//     setCallActive(false);
//     setRemoteStream(null);
//     setMiniVideo(false);
//     peerRef.current?.destroy();
//     peerRef.current = null;
//     localStreamRef.current?.getTracks().forEach((t) => t.stop());
//     socketRef.current?.emit("end-call");
//   };

//   // ---------- Drag handlers for local video ----------
//   const onMouseDown = (e) => {
//     setDragging(true);
//     setDragOffset({ x: e.clientX - localVideoPos.x, y: e.clientY - localVideoPos.y });
//   };

//   const onMouseMove = (e) => {
//     if (dragging) {
//       setLocalVideoPos({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
//     }
//   };

//   const onMouseUp = () => setDragging(false);

//   useEffect(() => {
//     window.addEventListener("mousemove", onMouseMove);
//     window.addEventListener("mouseup", onMouseUp);
//     return () => {
//       window.removeEventListener("mousemove", onMouseMove);
//       window.removeEventListener("mouseup", onMouseUp);
//     };
//   });

//   // ---------- Delete Chat ----------
//   const confirmDeleteChat = (id) => {
//     if (window.confirm("Are you sure you want to delete this chat?")) {
//       const updatedChats = chats.filter((chat) => chat._id !== id);
//       setChats(updatedChats);
//       localStorage.setItem("chats", JSON.stringify(updatedChats));
//       if (selectedChat?._id === id) setSelectedChat(null);
//     }
//   };

//   const renderChatItem = (chat) => (
//     <div
//       key={chat._id}
//       className={`group flex items-center justify-between p-4 cursor-pointer hover:bg-white/30 transition ${
//         selectedChat?._id === chat._id ? "bg-white/40" : ""
//       }`}
//       onClick={() => setSelectedChat(chat)}
//     >
//       <div className="flex items-center flex-1">
//         <div className="w-12 h-12 bg-gradient-to-br from-pink-500 via-purple-600 to-indigo-500 rounded-full mr-3 flex items-center justify-center text-white font-bold shadow-lg">
//           {chat.name?.[0]}
//         </div>
//         <div className="truncate">
//           <h4 className="font-semibold text-white">{chat.name}</h4>
//           <p className="text-sm text-gray-200 truncate w-40">
//             {chat.messages?.[chat.messages.length - 1]?.text || "No messages yet"}
//           </p>
//         </div>
//       </div>
//       <button
//         onClick={(e) => {
//           e.stopPropagation();
//           confirmDeleteChat(chat._id);
//         }}
//         className="ml-3 px-3 py-1 bg-red-500 text-white text-xs rounded-full shadow transition-transform transform scale-0 group-hover:scale-100 hover:scale-110 hover:bg-red-600 hover:shadow-lg"
//       >
//         Delete
//       </button>
//     </div>
//   );

//   const trailingActions = (chatId) => (
//     <TrailingActions>
//       <SwipeAction destructive onClick={() => confirmDeleteChat(chatId)}>
//         Delete
//       </SwipeAction>
//     </TrailingActions>
//   );

//   return (
//     <div className="min-h-screen flex bg-gradient-to-br from-[#0f2027] via-[#203a43] to-[#2c5364]">
//       {/* Sidebar */}
//       <div className="w-80 bg-white/20 backdrop-blur-xl shadow-2xl flex flex-col border-r border-white/30">
//         <div
//           onClick={() => navigate("/profile")}
//           className="flex items-center p-4 border-b border-white/20 bg-gradient-to-r from-purple-700 via-pink-600 to-yellow-500 text-white rounded-b-2xl cursor-pointer hover:opacity-95 transition"
//         >
//           <img
//             src={userData?.avatar || "https://www.w3schools.com/howto/img_avatar.png"}
//             alt="User"
//             className="w-12 h-12 rounded-full mr-3 object-cover border-2 border-white shadow-lg"
//           />
//           <div>
//             <h3 className="text-lg font-bold">{userData?.name || "User"}</h3>
//             <p className="text-sm text-gray-200">@{userData?.username || "username"}</p>
//           </div>
//         </div>
//         <div className="flex justify-between items-center p-4 border-b border-white/20">
//           <h2 className="font-bold text-white">Chats</h2>
//         </div>
//         <div className="flex-1 overflow-y-auto custom-scrollbar">
//           <SwipeableList>
//             {chats.map((chat) => (
//               <SwipeableListItem key={chat._id} trailingActions={() => trailingActions(chat._id)}>
//                 {renderChatItem(chat)}
//               </SwipeableListItem>
//             ))}
//           </SwipeableList>
//         </div>
//       </div>

//       {/* Chat Area */}
//       <div className="flex-1 flex flex-col bg-white/10 backdrop-blur-lg shadow-2xl rounded-l-2xl relative">
//         {selectedChat ? (
//           <>
//             {/* Chat header + call buttons */}
//             <div className="sticky top-0 z-10 p-4 border-b border-white/20 flex items-center bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-600 text-white shadow-lg">
//               <div className="w-10 h-10 bg-indigo-600 rounded-full mr-3 flex items-center justify-center font-bold shadow-md">
//                 {selectedChat.name?.[0]}
//               </div>
//               <h3 className="font-bold">{selectedChat.name}</h3>
//               <div className="ml-auto flex gap-2">
//                 <button
//                   title="Audio Call"
//                   className="px-3 py-1 bg-green-500 text-white rounded-full shadow hover:bg-green-600"
//                   onClick={() => startCall("audio")}
//                 >
//                   🎧 Audio
//                 </button>
//                 <button
//                   title="Video Call"
//                   className="px-3 py-1 bg-blue-500 text-white rounded-full shadow hover:bg-blue-600"
//                   onClick={() => startCall("video")}
//                 >
//                   🎥 Video
//                 </button>
//               </div>
//             </div>

//             {/* Messages scrollable area */}
//             <div className="flex-1 overflow-y-auto p-4 flex flex-col space-y-3 custom-scrollbar">
//               {selectedChat.messages?.map((msg, index) => (
//                 <div
//                   key={index}
//                   className={`flex ${
//                     msg.sender === "system"
//                       ? "justify-center"
//                       : msg.sender === (userData?.name || "Anonymous")
//                       ? "justify-end"
//                       : "justify-start"
//                   }`}
//                 >
//                   <div
//                     className={`px-4 py-2 rounded-2xl max-w-xs break-words shadow-md ${
//                       msg.sender === "system"
//                         ? "bg-gray-700 text-white text-sm italic"
//                         : msg.sender === (userData?.name || "Anonymous")
//                         ? "bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white rounded-br-none shadow-lg"
//                         : "bg-white/90 text-gray-800 rounded-bl-none shadow-sm"
//                     }`}
//                   >
//                     {msg.mediaUrl ? (
//                       msg.mediaType.startsWith("image") ? (
//                         <img src={msg.mediaUrl} alt={msg.text} className="max-w-full max-h-40 rounded-lg" />
//                       ) : msg.mediaType.startsWith("video") ? (
//                         <video src={msg.mediaUrl} controls className="max-w-full max-h-40 rounded-lg" />
//                       ) : (
//                         <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" className="underline text-blue-600">
//                           {msg.text}
//                         </a>
//                       )
//                     ) : (
//                       msg.text
//                     )}
//                   </div>
//                 </div>
//               ))}
//             </div>

//             {/* Input + media (fixed at bottom) */}
//             <div className="sticky bottom-0 z-10 flex-none p-4 border-t border-white/20 flex items-center bg-white/20 backdrop-blur-md">
//               <input
//                 type="text"
//                 placeholder="Type a message..."
//                 className="flex-1 px-4 py-2 border-2 border-white/40 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-400 transition bg-white/70 backdrop-blur-md text-gray-800 placeholder-gray-500"
//                 value={message}
//                 onChange={(e) => setMessage(e.target.value)}
//                 onKeyDown={(e) => e.key === "Enter" && handleSend()}
//               />
//               <label className="ml-2 px-3 py-2 bg-yellow-400 text-gray-900 rounded-full shadow-lg cursor-pointer hover:bg-yellow-500">
//                 <input type="file" hidden onChange={handleMediaUpload} />
//                 📎 Attach
//               </label>
//               <button
//                 onClick={handleSend}
//                 className="ml-2 px-5 py-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 text-white rounded-full hover:scale-105 transition shadow-lg"
//               >
//                 Send
//               </button>
//             </div>

//             {/* Video Call Overlay */}
//             {callActive && (
//               <div className="fixed inset-0 flex items-center justify-center bg-black/90 z-50">
//                 {/* Remote Video Fullscreen */}
//                 <video
//                   ref={remoteVideoRef}
//                   autoPlay
//                   className="absolute inset-0 w-full h-full object-cover"
//                 />

//                 {/* Local draggable video */}
//                 <video
//                   ref={localVideoRef}
//                   autoPlay
//                   muted
//                   onMouseDown={onMouseDown}
//                   style={{
//                     position: "absolute",
//                     top: localVideoPos.y,
//                     left: localVideoPos.x,
//                     width: "200px",
//                     height: "150px",
//                     borderRadius: "12px",
//                     cursor: "grab",
//                     zIndex: 60,
//                   }}
//                 />

//                 {/* Fixed buttons bottom center */}
//                 <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 flex gap-4 z-70">
//                   <button
//                     onClick={() => endCall("self")}
//                     className="px-6 py-3 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600"
//                   >
//                     End Call
//                   </button>
//                   <button
//                     onClick={toggleCamera}
//                     className="px-6 py-3 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600"
//                   >
//                     Flip
//                   </button>
//                   <button
//                     onClick={toggleSpeaker}
//                     className={`px-6 py-3 rounded-full shadow-lg ${
//                       speakerOn ? "bg-green-500 text-white hover:bg-green-600" : "bg-gray-500 text-white hover:bg-gray-600"
//                     }`}
//                   >
//                     {speakerOn ? "Speaker" : "Bluetooth"}
//                   </button>
//                 </div>
//               </div>
//             )}

//             {/* Incoming Call Modal */}
//             {incomingCall && !callActive && (
//               <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
//                 <div className="bg-gray-800 text-white p-6 rounded-xl shadow-lg flex flex-col items-center">
//                   <h3 className="mb-4">Incoming {callType === "video" ? "Video" : "Audio"} Call</h3>
//                   <div className="flex gap-4">
//                     <button
//                       onClick={answerCall}
//                       className="px-4 py-2 bg-green-500 rounded-full hover:bg-green-600 shadow-lg"
//                     >
//                       Answer
//                     </button>
//                     <button
//                       onClick={declineCall}
//                       className="px-4 py-2 bg-red-500 rounded-full hover:bg-red-600 shadow-lg"
//                     >
//                       Decline
//                     </button>
//                   </div>
//                 </div>
//               </div>
//             )}
//           </>
//         ) : (
//           <div className="flex-1 flex items-center justify-center text-gray-200 italic text-lg">
//             Select a chat to start messaging
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// export default Home;
// import React, { useState, useEffect, useRef } from "react";
// import { useSelector, useDispatch } from "react-redux";
// import { useNavigate } from "react-router-dom";
// import {
//   SwipeableList,
//   SwipeableListItem,
//   TrailingActions,
//   SwipeAction,
// } from "react-swipeable-list";
// import "react-swipeable-list/dist/styles.css";
// import { clearUserData, setUserData } from "../redux/userSlice";
// import io from "socket.io-client";
// import axios from "axios";
// // Native WebRTC — no external library needed

// const SOCKET_URL = "http://localhost:8000";

// function Home() {
//   const dispatch = useDispatch();
//   const navigate = useNavigate();
//   const reduxUserData = useSelector((state) => state.user.userData);

//   const [userData, setUserDataState] = useState(
//     reduxUserData || JSON.parse(localStorage.getItem("userData"))
//   );
//   const [chats, setChats] = useState([]);
//   const [selectedChat, setSelectedChat] = useState(null);
//   const [message, setMessage] = useState("");
//   const [callActive, setCallActive] = useState(false);
//   const [callType, setCallType] = useState(null);
//   const [callStartedAt, setCallStartedAt] = useState(null);
//   const [callDuration, setCallDuration] = useState(0);
//   const [incomingCall, setIncomingCall] = useState(null);
//   const [usingFrontCamera, setUsingFrontCamera] = useState(true);
//   const [isMuted, setIsMuted] = useState(false);
//   const [speakerOn, setSpeakerOn] = useState(true);
//   const [showAddChat, setShowAddChat] = useState(false);
//   const [newChatName, setNewChatName] = useState("");
//   const [addingChat, setAddingChat] = useState(false);
//   const [localVideoPos, setLocalVideoPos] = useState({ x: 20, y: 20 });
//   const [dragging, setDragging] = useState(false);
//   const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
//   const [sidebarOpen, setSidebarOpen] = useState(true);
//   const [remoteStreamActive, setRemoteStreamActive] = useState(false);

//   const messagesEndRef = useRef(null);
//   const localVideoRef = useRef();
//   const remoteVideoRef = useRef();
//   const socketRef = useRef();
//   const peerRef = useRef();
//   const localStreamRef = useRef();
//   const selectedChatRef = useRef(selectedChat);
//   const callTimerRef = useRef();

//   useEffect(() => { selectedChatRef.current = selectedChat; }, [selectedChat]);

//   // Auto scroll
//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
//   }, [selectedChat?.messages]);

//   // ---------- Load user ----------
//   useEffect(() => {
//     if (!userData) {
//       const savedUser = JSON.parse(localStorage.getItem("userData"));
//       if (savedUser) {
//         setUserDataState(savedUser);
//         dispatch(setUserData(savedUser));
//       } else {
//         navigate("/login");
//       }
//     } else {
//       localStorage.setItem("userData", JSON.stringify(userData));
//     }
//   }, [userData, dispatch, navigate]);

//   // ---------- Socket Setup ----------
//   useEffect(() => {
//     socketRef.current = io(SOCKET_URL, { withCredentials: true });

//     socketRef.current.on("connect", () => console.log("✅ Socket connected:", socketRef.current.id));

//     // Receive chat message
//     socketRef.current.on("receive-message", (data) => {
//       const current = selectedChatRef.current;
//       setChats((prev) =>
//         prev.map((chat) =>
//           chat._id === data.chatId
//             ? { ...chat, messages: [...(chat.messages || []), data.message] }
//             : chat
//         )
//       );
//       if (current?._id === data.chatId) {
//         setSelectedChat((prev) =>
//           prev ? { ...prev, messages: [...(prev.messages || []), data.message] } : prev
//         );
//       }
//     });

//     // ✅ FIX 2: incoming-call — store full signal and show modal
//     socketRef.current.on("incoming-call", ({ from, signal, callType: ct }) => {
//       console.log("📞 Incoming call from:", from, "type:", ct);
//       setIncomingCall({ from, signal });
//       setCallType(ct);
//     });

//     // ✅ signal — handle SDP answer + ICE candidates
//     socketRef.current.on("signal", async ({ signal }) => {
//       const pc = peerRef.current;
//       if (!pc) return;
//       try {
//         if (signal.type === "answer") {
//           console.log("📥 Got answer");
//           await pc.setRemoteDescription(new RTCSessionDescription(signal));
//         } else if (signal.type === "candidate" && signal.candidate) {
//           await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
//         }
//       } catch (err) {
//         console.error("Signal handling error:", err);
//       }
//     });

//     socketRef.current.on("end-call", () => {
//       console.log("📵 Remote ended call");
//       endCall("remote");
//     });

//     return () => socketRef.current?.disconnect();
//   }, []);

//   // ---------- Load chats ----------
//   useEffect(() => {
//     if (!userData?._id) return;
//     const fetchChats = async () => {
//       try {
//         const res = await axios.get(`${SOCKET_URL}/api/chat?userId=${userData._id}`, {
//           withCredentials: true,
//         });
//         const fetchedChats = res.data.chats || [];
//         if (fetchedChats.length > 0) {
//           setChats(fetchedChats);
//           setSelectedChat(fetchedChats[0]);
//         } else {
//           const saved = JSON.parse(localStorage.getItem("chats")) || [];
//           setChats(saved);
//           if (saved.length > 0) setSelectedChat(saved[0]);
//         }
//       } catch (err) {
//         const saved = JSON.parse(localStorage.getItem("chats")) || [];
//         setChats(saved);
//         if (saved.length > 0) setSelectedChat(saved[0]);
//       }
//     };
//     fetchChats();
//   }, [userData]);

//   // ---------- Join socket room ----------
//   useEffect(() => {
//     if (socketRef.current && selectedChat?._id) {
//       socketRef.current.emit("join-room", selectedChat._id);
//       console.log("🏠 Joined room:", selectedChat._id);
//     }
//   }, [selectedChat?._id]);

//   // ---------- Call timer ----------
//   useEffect(() => {
//     if (callActive && callStartedAt) {
//       callTimerRef.current = setInterval(() => {
//         setCallDuration(Math.floor((Date.now() - callStartedAt) / 1000));
//       }, 1000);
//     } else {
//       clearInterval(callTimerRef.current);
//       setCallDuration(0);
//     }
//     return () => clearInterval(callTimerRef.current);
//   }, [callActive, callStartedAt]);

//   const formatDuration = (s) => {
//     const m = Math.floor(s / 60).toString().padStart(2, "0");
//     const sec = (s % 60).toString().padStart(2, "0");
//     return `${m}:${sec}`;
//   };

//   // ---------- System message helper ----------
//   const addSystemMessage = (text) => {
//     const chatId = selectedChatRef.current?._id;
//     if (!chatId) return;
//     const newMsg = { sender: "system", text, _id: Date.now().toString() };
//     setChats((prev) => {
//       const updated = prev.map((c) =>
//         c._id === chatId ? { ...c, messages: [...(c.messages || []), newMsg] } : c
//       );
//       localStorage.setItem("chats", JSON.stringify(updated));
//       return updated;
//     });
//     setSelectedChat((prev) =>
//       prev?._id === chatId
//         ? { ...prev, messages: [...(prev.messages || []), newMsg] }
//         : prev
//     );
//   };

//   // ---------- Send message ----------
//   const handleSend = async () => {
//     if (!message.trim() || !selectedChat) return;
//     const newMsg = {
//       sender: userData?.name || userData?.username || "Anonymous",
//       text: message.trim(),
//       _id: Date.now().toString(),
//     };
//     const updatedChats = chats.map((chat) =>
//       chat._id === selectedChat._id
//         ? { ...chat, messages: [...(chat.messages || []), newMsg] }
//         : chat
//     );
//     setChats(updatedChats);
//     setSelectedChat((prev) =>
//       prev ? { ...prev, messages: [...(prev.messages || []), newMsg] } : prev
//     );
//     localStorage.setItem("chats", JSON.stringify(updatedChats));
//     setMessage("");

//     socketRef.current?.emit("send-message", {
//       roomId: selectedChat._id,
//       message: newMsg,
//     });

//     try {
//       await axios.post(
//         `${SOCKET_URL}/api/chat/message`,
//         {
//           chatId: selectedChat._id,
//           sender: userData?.name || userData?.username || "Anonymous",
//           text: newMsg.text,
//         },
//         { withCredentials: true }
//       );
//     } catch (err) {
//       console.log("Message save error:", err);
//     }
//   };

//   const handleMediaUpload = async (e) => {
//     const file = e.target.files[0];
//     if (!file || !selectedChat) return;
//     const newMsg = {
//       sender: userData?.name || userData?.username || "Anonymous",
//       text: file.name,
//       mediaUrl: URL.createObjectURL(file),
//       mediaType: file.type,
//       _id: Date.now().toString(),
//     };
//     const updatedChats = chats.map((chat) =>
//       chat._id === selectedChat._id
//         ? { ...chat, messages: [...(chat.messages || []), newMsg] }
//         : chat
//     );
//     setChats(updatedChats);
//     setSelectedChat((prev) =>
//       prev ? { ...prev, messages: [...(prev.messages || []), newMsg] } : prev
//     );
//     localStorage.setItem("chats", JSON.stringify(updatedChats));
//     socketRef.current?.emit("send-message", {
//       roomId: selectedChat._id,
//       message: newMsg,
//     });
//   };

//   // ---------- Add Chat ----------
//   const handleAddChat = async () => {
//     if (!newChatName.trim() || !userData?._id) return;
//     setAddingChat(true);
//     try {
//       const res = await axios.post(
//         `${SOCKET_URL}/api/chat`,
//         { name: newChatName.trim(), userId: userData._id },
//         { withCredentials: true }
//       );
//       const newChat = res.data.chat;
//       const updatedChats = [...chats, newChat];
//       setChats(updatedChats);
//       setSelectedChat(newChat);
//       localStorage.setItem("chats", JSON.stringify(updatedChats));
//     } catch (err) {
//       const newChat = {
//         _id: Date.now().toString(),
//         name: newChatName.trim(),
//         messages: [],
//         userId: userData._id,
//       };
//       const updatedChats = [...chats, newChat];
//       setChats(updatedChats);
//       setSelectedChat(newChat);
//       localStorage.setItem("chats", JSON.stringify(updatedChats));
//     }
//     setNewChatName("");
//     setShowAddChat(false);
//     setAddingChat(false);
//   };

//   // ---------- Logout ----------
//   const handleLogout = async () => {
//     try {
//       await axios.get(`${SOCKET_URL}/api/auth/logout`, { withCredentials: true });
//     } catch (err) {
//       console.log("Logout err:", err);
//     }
//     dispatch(clearUserData());
//     localStorage.removeItem("userData");
//     localStorage.removeItem("chats");
//     navigate("/login");
//   };

//   // ---------- Native WebRTC initStream ----------
//   const initStream = async (isVideo, isInitiator, incomingSignal = null) => {
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({
//         video: isVideo ? { facingMode: usingFrontCamera ? "user" : "environment" } : false,
//         audio: true,
//       });

//       localStreamRef.current = stream;
//       if (localVideoRef.current) localVideoRef.current.srcObject = stream;

//       // Create native RTCPeerConnection
//       const pc = new RTCPeerConnection({
//         iceServers: [
//           { urls: "stun:stun.l.google.com:19302" },
//           { urls: "stun:stun1.l.google.com:19302" },
//         ],
//       });

//       // Add local tracks
//       stream.getTracks().forEach((track) => pc.addTrack(track, stream));

//       // ICE candidate — send to remote
//       pc.onicecandidate = (e) => {
//         if (e.candidate) {
//           socketRef.current.emit("signal", {
//             roomId: selectedChatRef.current?._id,
//             signal: { type: "candidate", candidate: e.candidate },
//           });
//         }
//       };

//       // Remote stream arrived
//       pc.ontrack = (e) => {
//         if (e.streams && e.streams[0]) {
//           console.log("🎥 Got remote stream");
//           setRemoteStreamActive(true);
//           setCallStartedAt(Date.now());
//           if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
//         }
//       };

//       pc.onconnectionstatechange = () => {
//         console.log("Connection state:", pc.connectionState);
//         if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
//           endCall("remote");
//         }
//       };

//       peerRef.current = pc;

//       if (isInitiator) {
//         // Caller: create offer
//         const offer = await pc.createOffer();
//         await pc.setLocalDescription(offer);
//         console.log("📤 Sending offer via call-user");
//         socketRef.current.emit("call-user", {
//           roomId: selectedChatRef.current?._id,
//           signal: offer,
//           callType: isVideo ? "video" : "audio",
//           from: userData?.name || userData?.username || "User",
//         });
//       } else if (incomingSignal) {
//         // Receiver: set remote offer, create answer
//         await pc.setRemoteDescription(new RTCSessionDescription(incomingSignal));
//         const answer = await pc.createAnswer();
//         await pc.setLocalDescription(answer);
//         console.log("📤 Sending answer");
//         socketRef.current.emit("signal", {
//           roomId: selectedChatRef.current?._id,
//           signal: answer,
//         });
//       }

//     } catch (err) {
//       console.error("❌ Media error:", err);
//       addSystemMessage("❌ Could not access camera/microphone. Check permissions.");
//       setCallActive(false);
//       setCallType(null);
//     }
//   };

//   // ---------- Start call (caller) ----------
//   const startCall = async (type) => {
//     if (!selectedChat) return;
//     console.log("📞 Starting", type, "call in room:", selectedChat._id);
//     setCallType(type);
//     setCallActive(true);
//     setRemoteStreamActive(false);
//     addSystemMessage(type === "audio" ? "📞 Audio call started..." : "🎥 Video call started...");
//     await initStream(type === "video", true);
//   };

//   // ---------- Answer call (receiver) ----------
//   const answerCall = async () => {
//     if (!incomingCall) return;
//     console.log("✅ Answering call");
//     const signal = incomingCall.signal;
//     const type = callType;
//     setIncomingCall(null);
//     setCallActive(true);
//     setRemoteStreamActive(false);
//     // ✅ FIX 8: Pass signal directly to initStream
//     await initStream(type === "video", false, signal);
//     addSystemMessage("✅ Call connected");
//   };

//   // ---------- Decline call ----------
//   const declineCall = () => {
//     socketRef.current?.emit("end-call", { roomId: selectedChat?._id });
//     setIncomingCall(null);
//     addSystemMessage("❌ Call declined");
//   };

//   // ---------- Toggle mic ----------
//   const toggleMute = () => {
//     if (!localStreamRef.current) return;
//     localStreamRef.current.getAudioTracks().forEach((t) => {
//       t.enabled = !t.enabled;
//     });
//     setIsMuted((m) => !m);
//   };

//   // ---------- Toggle camera ----------
//   const toggleCamera = async () => {
//     if (!localStreamRef.current) return;
//     localStreamRef.current.getVideoTracks().forEach((t) => t.stop());
//     const newFacing = !usingFrontCamera;
//     setUsingFrontCamera(newFacing);
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({
//         video: { facingMode: newFacing ? "user" : "environment" },
//         audio: true,
//       });
//       localStreamRef.current = stream;
//       if (localVideoRef.current) localVideoRef.current.srcObject = stream;
//       // Replace track in peer connection
//       if (peerRef.current) {
//         const videoTrack = stream.getVideoTracks()[0];
//         const sender = peerRef.current
//           .getSenders?.()
//           ?.find((s) => s.track?.kind === "video");
//         if (sender && videoTrack) sender.replaceTrack(videoTrack);
//       }
//     } catch (err) {
//       console.error("Camera switch error:", err);
//     }
//   };

//   // ---------- Toggle speaker ----------
//   const toggleSpeaker = () => {
//     setSpeakerOn((prev) => {
//       if (remoteVideoRef.current) remoteVideoRef.current.muted = prev;
//       return !prev;
//     });
//   };

//   // ---------- End call ----------
//   const endCall = (who = "self") => {
//     if (who === "self") {
//       socketRef.current?.emit("end-call", { roomId: selectedChatRef.current?._id });
//     }
//     const duration = callDuration;
//     if (who !== "error") {
//       addSystemMessage(
//         duration < 3 ? "❌ Missed call" : `🔚 Call ended (${formatDuration(duration)})`
//       );
//     }

//     if (peerRef.current) {
//       peerRef.current.close();
//     }
//     peerRef.current = null;

//     localStreamRef.current?.getTracks().forEach((t) => t.stop());
//     localStreamRef.current = null;

//     if (localVideoRef.current) localVideoRef.current.srcObject = null;
//     if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

//     setCallActive(false);
//     setCallType(null);
//     setCallStartedAt(null);
//     setRemoteStreamActive(false);
//     setIsMuted(false);
//   };

//   // ---------- Drag local video ----------
//   const onMouseDown = (e) => {
//     setDragging(true);
//     setDragOffset({ x: e.clientX - localVideoPos.x, y: e.clientY - localVideoPos.y });
//   };
//   const onMouseMove = (e) => {
//     if (dragging) setLocalVideoPos({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
//   };
//   const onMouseUp = () => setDragging(false);

//   useEffect(() => {
//     window.addEventListener("mousemove", onMouseMove);
//     window.addEventListener("mouseup", onMouseUp);
//     return () => {
//       window.removeEventListener("mousemove", onMouseMove);
//       window.removeEventListener("mouseup", onMouseUp);
//     };
//   });

//   // ---------- Delete Chat ----------
//   const confirmDeleteChat = async (id) => {
//     if (!window.confirm("Delete this chat?")) return;
//     try {
//       await axios.delete(`${SOCKET_URL}/api/chat/${id}`, { withCredentials: true });
//     } catch (err) {
//       console.log("Delete error:", err);
//     }
//     const updatedChats = chats.filter((c) => c._id !== id);
//     setChats(updatedChats);
//     localStorage.setItem("chats", JSON.stringify(updatedChats));
//     if (selectedChat?._id === id) setSelectedChat(updatedChats[0] || null);
//   };

//   const trailingActions = (chatId) => (
//     <TrailingActions>
//       <SwipeAction destructive onClick={() => confirmDeleteChat(chatId)}>
//         <div className="flex items-center justify-center bg-red-500 text-white h-full px-6 font-semibold">
//           Delete
//         </div>
//       </SwipeAction>
//     </TrailingActions>
//   );

//   const displayName = userData?.name || userData?.username || "User";
//   const displayHandle = userData?.username || "username";

//   return (
//     <div className="min-h-screen flex bg-[#0d1117] text-white font-sans overflow-hidden">

//       {/* ===== SIDEBAR ===== */}
//       <div
//         className={`${sidebarOpen ? "w-80" : "w-0 overflow-hidden"} transition-all duration-300 flex flex-col bg-[#161b22] border-r border-white/10 relative`}
//         style={{ minHeight: "100vh" }}
//       >
//         {/* Profile header */}
//         <div
//           onClick={() => navigate("/profile")}
//           className="flex items-center gap-3 p-4 cursor-pointer border-b border-white/10 hover:bg-white/5 transition group"
//         >
//           <div className="relative">
//             <img
//               src={userData?.avatar || "https://www.w3schools.com/howto/img_avatar.png"}
//               alt="User"
//               className="w-11 h-11 rounded-full object-cover ring-2 ring-violet-500"
//             />
//             <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-[#161b22]" />
//           </div>
//           <div className="flex-1 min-w-0">
//             <p className="font-semibold text-sm text-white truncate">{displayName}</p>
//             <p className="text-xs text-gray-400 truncate">@{displayHandle}</p>
//           </div>
//           <span className="text-xs text-gray-500 group-hover:text-violet-400 transition">Edit ›</span>
//         </div>

//         {/* Chats header */}
//         <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
//           <span className="text-sm font-semibold text-gray-300">Chats</span>
//           <button
//             onClick={() => setShowAddChat(true)}
//             className="w-7 h-7 flex items-center justify-center rounded-full bg-violet-600 hover:bg-violet-500 text-white text-lg leading-none transition"
//             title="New Chat"
//           >
//             +
//           </button>
//         </div>

//         {/* Add Chat Input */}
//         {showAddChat && (
//           <div className="flex items-center gap-2 px-3 py-2 bg-[#1c2128] border-b border-white/10">
//             <input
//               autoFocus
//               type="text"
//               placeholder="Chat name..."
//               value={newChatName}
//               onChange={(e) => setNewChatName(e.target.value)}
//               onKeyDown={(e) => {
//                 if (e.key === "Enter") handleAddChat();
//                 if (e.key === "Escape") { setShowAddChat(false); setNewChatName(""); }
//               }}
//               className="flex-1 px-3 py-1.5 rounded-lg bg-[#0d1117] border border-white/20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
//             />
//             <button
//               onClick={handleAddChat}
//               disabled={addingChat}
//               className="px-3 py-1.5 text-sm bg-violet-600 hover:bg-violet-500 rounded-lg transition disabled:opacity-50"
//             >
//               {addingChat ? "..." : "Add"}
//             </button>
//             <button
//               onClick={() => { setShowAddChat(false); setNewChatName(""); }}
//               className="text-gray-500 hover:text-white text-lg"
//             >
//               ✕
//             </button>
//           </div>
//         )}

//         {/* Chat list */}
//         <div className="flex-1 overflow-y-auto custom-scrollbar">
//           {chats.length === 0 ? (
//             <div className="flex flex-col items-center justify-center h-40 gap-2 text-gray-500 text-sm">
//               <span>No chats yet</span>
//               <button
//                 onClick={() => setShowAddChat(true)}
//                 className="text-violet-400 hover:text-violet-300 underline"
//               >
//                 Create one
//               </button>
//             </div>
//           ) : (
//             <SwipeableList>
//               {chats.map((chat) => (
//                 <SwipeableListItem key={chat._id} trailingActions={trailingActions(chat._id)}>
//                   <div
//                     className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition border-b border-white/5 hover:bg-white/5 w-full ${
//                       selectedChat?._id === chat._id
//                         ? "bg-violet-600/20 border-l-2 border-l-violet-500"
//                         : ""
//                     }`}
//                     onClick={() => setSelectedChat(chat)}
//                   >
//                     <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
//                       {chat.name?.[0]?.toUpperCase()}
//                     </div>
//                     <div className="flex-1 min-w-0">
//                       <p className="font-medium text-sm text-white truncate">{chat.name}</p>
//                       <p className="text-xs text-gray-500 truncate">
//                         {chat.messages?.[chat.messages.length - 1]?.text || "No messages yet"}
//                       </p>
//                     </div>
//                   </div>
//                 </SwipeableListItem>
//               ))}
//             </SwipeableList>
//           )}
//         </div>

//         {/* Logout */}
//         <div className="p-4 border-t border-white/10">
//           <button
//             onClick={handleLogout}
//             className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 transition text-sm font-medium"
//           >
//             <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
//             </svg>
//             Logout
//           </button>
//         </div>
//       </div>

//       {/* ===== MAIN CHAT AREA ===== */}
//       <div className="flex-1 flex flex-col min-w-0 relative">
//         {selectedChat ? (
//           <>
//             {/* Chat header */}
//             <div className="flex items-center gap-3 px-4 py-3 bg-[#161b22] border-b border-white/10 sticky top-0 z-10">
//               <button
//                 onClick={() => setSidebarOpen((p) => !p)}
//                 className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-400 transition"
//               >
//                 ☰
//               </button>
//               <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center font-bold text-sm">
//                 {selectedChat.name?.[0]?.toUpperCase()}
//               </div>
//               <div className="flex-1 min-w-0">
//                 <p className="font-semibold text-sm">{selectedChat.name}</p>
//                 <p className="text-xs text-green-400">Online</p>
//               </div>
//               {/* Call buttons */}
//               <div className="flex gap-2">
//                 <button
//                   onClick={() => startCall("audio")}
//                   className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/15 hover:bg-green-500/30 text-green-400 border border-green-500/20 text-sm transition"
//                 >
//                   <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
//                   </svg>
//                   Call
//                 </button>
//                 <button
//                   onClick={() => startCall("video")}
//                   className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/30 text-blue-400 border border-blue-500/20 text-sm transition"
//                 >
//                   <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
//                   </svg>
//                   Video
//                 </button>
//               </div>
//             </div>

//             {/* Messages */}
//             <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 custom-scrollbar bg-[#0d1117]">
//               {(!selectedChat.messages || selectedChat.messages.length === 0) && (
//                 <div className="flex flex-col items-center justify-center h-40 text-gray-600 text-sm">
//                   <p>No messages yet</p>
//                   <p className="text-xs mt-1">Say hello! 👋</p>
//                 </div>
//               )}
//               {selectedChat.messages?.map((msg, i) => {
//                 const isMe =
//                   msg.sender === (userData?.name || userData?.username || "Anonymous");
//                 const isSystem = msg.sender === "system" || msg.sender === "System";
//                 return (
//                   <div
//                     key={msg._id || i}
//                     className={`flex ${
//                       isSystem
//                         ? "justify-center"
//                         : isMe
//                         ? "justify-end"
//                         : "justify-start"
//                     }`}
//                   >
//                     {isSystem ? (
//                       <span className="text-xs text-gray-500 bg-white/5 px-3 py-1 rounded-full">
//                         {msg.text}
//                       </span>
//                     ) : (
//                       <div className={`max-w-xs lg:max-w-md ${isMe ? "items-end" : "items-start"} flex flex-col gap-1`}>
//                         {!isMe && (
//                           <span className="text-xs text-gray-500 ml-1">{msg.sender}</span>
//                         )}
//                         <div
//                           className={`px-4 py-2.5 rounded-2xl text-sm break-words ${
//                             isMe
//                               ? "bg-violet-600 text-white rounded-br-sm"
//                               : "bg-[#21262d] text-gray-100 rounded-bl-sm border border-white/10"
//                           }`}
//                         >
//                           {msg.mediaUrl ? (
//                             msg.mediaType?.startsWith("image") ? (
//                               <img
//                                 src={msg.mediaUrl}
//                                 alt={msg.text}
//                                 className="max-w-full max-h-48 rounded-xl"
//                               />
//                             ) : msg.mediaType?.startsWith("video") ? (
//                               <video
//                                 src={msg.mediaUrl}
//                                 controls
//                                 className="max-w-full max-h-48 rounded-xl"
//                               />
//                             ) : (
//                               <a
//                                 href={msg.mediaUrl}
//                                 target="_blank"
//                                 rel="noopener noreferrer"
//                                 className="underline text-blue-400 flex items-center gap-1"
//                               >
//                                 📎 {msg.text}
//                               </a>
//                             )
//                           ) : (
//                             msg.text
//                           )}
//                         </div>
//                       </div>
//                     )}
//                   </div>
//                 );
//               })}
//               <div ref={messagesEndRef} />
//             </div>

//             {/* Input bar */}
//             <div className="flex items-center gap-2 px-4 py-3 bg-[#161b22] border-t border-white/10">
//               <label className="w-9 h-9 flex items-center justify-center rounded-lg cursor-pointer hover:bg-white/10 text-gray-400 hover:text-white transition flex-shrink-0">
//                 <input type="file" hidden onChange={handleMediaUpload} />
//                 <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
//                 </svg>
//               </label>
//               <input
//                 type="text"
//                 placeholder="Type a message..."
//                 value={message}
//                 onChange={(e) => setMessage(e.target.value)}
//                 onKeyDown={(e) => e.key === "Enter" && handleSend()}
//                 className="flex-1 px-4 py-2 rounded-xl bg-[#0d1117] border border-white/10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition"
//               />
//               <button
//                 onClick={handleSend}
//                 disabled={!message.trim()}
//                 className="w-9 h-9 flex items-center justify-center rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
//               >
//                 <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
//                 </svg>
//               </button>
//             </div>
//           </>
//         ) : (
//           <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-[#0d1117]">
//             <button
//               onClick={() => setSidebarOpen(true)}
//               className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-400 transition absolute top-4 left-4"
//             >
//               ☰
//             </button>
//             <div className="w-16 h-16 rounded-full bg-violet-600/20 flex items-center justify-center text-4xl">💬</div>
//             <p className="text-gray-400 text-sm">Select a chat or create a new one</p>
//             <button
//               onClick={() => { setSidebarOpen(true); setShowAddChat(true); }}
//               className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm transition"
//             >
//               + New Chat
//             </button>
//           </div>
//         )}
//       </div>

//       {/* ===== VIDEO/AUDIO CALL OVERLAY ===== */}
//       {callActive && (
//         <div className="fixed inset-0 z-50 flex flex-col bg-black">
//           {/* Remote video */}
//           <video
//             ref={remoteVideoRef}
//             autoPlay
//             playsInline
//             className="absolute inset-0 w-full h-full object-cover"
//             style={{ display: remoteStreamActive && callType === "video" ? "block" : "none" }}
//           />

//           {/* Waiting / audio placeholder */}
//           <div
//             className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#1a1a2e] to-[#16213e]"
//             style={{ display: remoteStreamActive && callType === "video" ? "none" : "flex" }}
//           >
//             <div className="flex flex-col items-center gap-4 text-white/70">
//               <div className="w-24 h-24 rounded-full bg-violet-600/30 flex items-center justify-center text-5xl animate-pulse">
//                 {callType === "audio" ? "🎧" : "📹"}
//               </div>
//               <p className="text-lg font-medium text-white">{selectedChat?.name}</p>
//               <p className="text-sm">
//                 {remoteStreamActive ? "Connected" : "Calling... waiting for answer"}
//               </p>
//               {callStartedAt && (
//                 <p className="text-sm text-violet-300">{formatDuration(callDuration)}</p>
//               )}
//             </div>
//           </div>

//           {/* Local video (draggable, video calls only) */}
//           {callType === "video" && (
//             <video
//               ref={localVideoRef}
//               autoPlay
//               muted
//               playsInline
//               onMouseDown={onMouseDown}
//               style={{
//                 position: "absolute",
//                 top: localVideoPos.y,
//                 left: localVideoPos.x,
//                 width: "160px",
//                 height: "120px",
//                 borderRadius: "12px",
//                 cursor: dragging ? "grabbing" : "grab",
//                 zIndex: 60,
//                 border: "2px solid rgba(255,255,255,0.3)",
//                 objectFit: "cover",
//                 background: "#000",
//               }}
//             />
//           )}

//           {/* Top bar: name + timer */}
//           <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/50 px-5 py-2 rounded-full z-60 backdrop-blur-sm">
//             <span className="text-sm text-white font-medium">{selectedChat?.name}</span>
//             {callStartedAt && (
//               <span className="text-xs text-green-400">{formatDuration(callDuration)}</span>
//             )}
//           </div>

//           {/* Controls */}
//           <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 z-60">
//             {/* Mute */}
//             <button
//               onClick={toggleMute}
//               className={`w-14 h-14 rounded-full flex items-center justify-center text-xl transition backdrop-blur-sm border ${
//                 isMuted
//                   ? "bg-red-500/30 border-red-500/50 text-red-300"
//                   : "bg-white/20 border-white/20 text-white hover:bg-white/30"
//               }`}
//               title={isMuted ? "Unmute" : "Mute"}
//             >
//               {isMuted ? "🔇" : "🎤"}
//             </button>

//             {/* Camera flip (video only) */}
//             {callType === "video" && (
//               <button
//                 onClick={toggleCamera}
//                 className="w-14 h-14 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center text-xl transition backdrop-blur-sm border border-white/20"
//                 title="Flip Camera"
//               >
//                 🔄
//               </button>
//             )}

//             {/* Speaker */}
//             <button
//               onClick={toggleSpeaker}
//               className={`w-14 h-14 rounded-full flex items-center justify-center text-xl transition backdrop-blur-sm border ${
//                 speakerOn
//                   ? "bg-white/20 border-white/20 text-white hover:bg-white/30"
//                   : "bg-white/10 border-white/10 text-white/40"
//               }`}
//               title="Toggle Speaker"
//             >
//               {speakerOn ? "🔊" : "🔈"}
//             </button>

//             {/* End call */}
//             <button
//               onClick={() => endCall("self")}
//               className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center text-2xl transition shadow-xl border-4 border-red-400/30"
//               title="End Call"
//             >
//               📵
//             </button>
//           </div>
//         </div>
//       )}

//       {/* ===== INCOMING CALL MODAL ===== */}
//       {incomingCall && !callActive && (
//         <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50 backdrop-blur-sm">
//           <div className="bg-[#1c2128] border border-white/10 rounded-2xl p-8 flex flex-col items-center gap-5 shadow-2xl min-w-72">
//             <div className="w-20 h-20 rounded-full bg-violet-600/30 flex items-center justify-center text-5xl animate-pulse">
//               {callType === "video" ? "🎥" : "📞"}
//             </div>
//             <div className="text-center">
//               <p className="font-bold text-white text-lg">{incomingCall.from || "Someone"}</p>
//               <p className="text-sm text-gray-400 mt-1">
//                 Incoming {callType === "video" ? "video" : "audio"} call...
//               </p>
//             </div>
//             <div className="flex gap-6 mt-2">
//               <button
//                 onClick={declineCall}
//                 className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-2xl transition shadow-lg"
//                 title="Decline"
//               >
//                 📵
//               </button>
//               <button
//                 onClick={answerCall}
//                 className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center text-2xl transition shadow-lg"
//                 title="Answer"
//               >
//                 📞
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// export default Home;

import React, { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, Link } from "react-router-dom"; 
import { SwipeableList, SwipeableListItem } from "react-swipeable-list";
import "react-swipeable-list/dist/styles.css";
import { clearUserData } from "../redux/userSlice";
import io from "socket.io-client";
import axios from "axios";
import { serverUrl } from "../main";
import CallButtons from "../components/CallButtons";
import CallManager from "../components/CallManager";

// LIVE BACKEND SOCKET LINK ADDED
const SOCKET_URL = "https://realtimechatapp-index.onrender.com";

function Home() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const userData = useSelector((state) => state.user.userData);

  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [message, setMessage] = useState("");
  const [showAddChatModal, setShowAddChatModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const socketRef = useRef();

  const fetchChats = async () => {
    if (!userData?._id) return;
    try {
      const res = await axios.get(`${serverUrl}/api/chat?userId=${userData._id}`);
      setChats(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Fetch chats error:", err);
    }
  };

  useEffect(() => {
    if (!userData) return;

    socketRef.current = io(SOCKET_URL);
    
    socketRef.current.emit("join-room", userData._id);

    fetchChats();

    socketRef.current.on("receive-message", (data) => {
      setSelectedChat((prev) => {
        if (prev && prev._id === data.chatId) {
          return { ...prev, messages: [...(prev.messages || []), data.message] };
        }
        return prev;
      });
      fetchChats();
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [userData]);

  useEffect(() => {
    if (selectedChat?._id && socketRef.current) {
      socketRef.current.emit("join-room", selectedChat._id);
    }
  }, [selectedChat?._id]);

  const handleSearch = async (val) => {
    setSearchQuery(val);
    if (val.trim().length > 0) {
      try {
        const res = await axios.get(`${serverUrl}/api/chat/search?query=${val}&myId=${userData._id}`);
        setSearchResults(res.data || []);
      } catch (err) { console.error(err); }
    } else { setSearchResults([]); }
  };

  const handleAddChat = async (recipientId) => {
    try {
      const res = await axios.post(`${serverUrl}/api/chat`, {
        myId: userData._id,
        recipientId,
      });
      const newChat = res.data;
      if (!chats.find((c) => c._id === newChat._id)) {
        setChats([newChat, ...chats]);
      }
      setSelectedChat(newChat);
      setShowAddChatModal(false);
      setSearchQuery("");
      setSearchResults([]);
    } catch (err) { console.error(err); }
  };

  const handleSend = async () => {
    if (!message.trim() || !selectedChat) return;
    
    const msgData = {
      chatId: selectedChat._id,
      sender: userData.username,
      text: message,
    };

    try {
      const res = await axios.post(`${serverUrl}/api/chat/message`, msgData);
      const savedMsg = res.data;

      socketRef.current.emit("send-message", {
        roomId: selectedChat._id,
        chatId: selectedChat._id,
        message: savedMsg,
      });
      
      setSelectedChat((prev) => ({
        ...prev,
        messages: [...(prev.messages || []), savedMsg],
      }));
      setMessage("");
      fetchChats();
    } catch (err) { console.error("Send error:", err); }
  };

  const handleLogout = () => {
    dispatch(clearUserData());
    navigate("/login");
  };

  return (
    <div className="flex h-screen bg-[#0d1117] text-white overflow-hidden font-sans">
      <div className={`w-full md:w-96 border-r border-white/10 flex-col bg-[#161b22]/50 backdrop-blur-xl ${selectedChat ? "hidden md:flex" : "flex"}`}>
        <div className="p-6 flex justify-between items-center border-b border-white/10 bg-[#161b22]/80">
          <div className="flex flex-col">
            <h1 className="text-2xl font-black bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">B Chat</h1>
            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Realtime</span>
          </div>
          <div className="flex gap-2">
             <Link to="/profile" className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
                👤
             </Link>
             <button onClick={() => setShowAddChatModal(true)} className="w-10 h-10 rounded-xl bg-violet-600 hover:bg-violet-500 flex items-center justify-center shadow-lg shadow-violet-600/20">+</button>
             <button onClick={handleLogout} className="text-xs bg-red-500/10 text-red-500 px-3 py-1 rounded-lg border border-red-500/20 hover:bg-red-500 transition-all">Logout</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {chats.map((chat) => {
            const recipient = chat.members?.find((m) => m._id !== userData?._id);
            return (
              <div
                key={chat._id}
                onClick={() => setSelectedChat(chat)}
                className={`mx-3 my-1 p-4 rounded-2xl cursor-pointer transition-all flex items-center gap-4 ${
                  selectedChat?._id === chat._id ? "bg-violet-600 shadow-lg scale-[1.02]" : "hover:bg-white/5"
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-violet-500 to-fuchsia-500 flex items-center justify-center font-bold text-lg">
                  {recipient?.username?.[0].toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{recipient?.username || "Unknown"}</p>
                  <p className="text-xs opacity-60 truncate">
                    {chat.messages && chat.messages.length > 0 
                      ? chat.messages[chat.messages.length - 1].text 
                      : "Click to message"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className={`flex-1 flex-col bg-[#0d1117] ${!selectedChat ? "hidden md:flex" : "flex"}`}>
        {selectedChat ? (
          <>
            <div className="p-4 bg-[#161b22]/80 backdrop-blur-md border-b border-white/10 flex justify-between items-center z-10">
              <div className="flex items-center gap-3">
                 <button 
                   onClick={() => setSelectedChat(null)} 
                   className="md:hidden text-2xl pr-2 text-violet-400 hover:text-violet-300 transition-colors"
                 >
                   ←
                 </button>
                 <div className="w-10 h-10 rounded-full bg-violet-600/20 flex items-center justify-center text-violet-400 font-bold border border-violet-500/30">
                   {selectedChat.members?.find(m => m._id !== userData?._id)?.username?.[0].toUpperCase()}
                 </div>
                 <span className="font-bold text-lg">{selectedChat.members?.find(m => m._id !== userData?._id)?.username}</span>
              </div>
              <CallButtons socket={socketRef.current} roomId={selectedChat._id} currentUser={userData} />
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {selectedChat.messages?.map((m, i) => (
                <div key={i} className={`flex ${m.sender === userData.username ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[70%] p-3 px-4 rounded-2xl ${
                    m.sender === userData.username ? "bg-violet-600 rounded-tr-none shadow-lg shadow-violet-600/10" : "bg-[#21262d] rounded-tl-none border border-white/5"
                  }`}>
                    <p className="text-sm">{m.text}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-[#161b22]/50 border-t border-white/10 flex gap-2">
                <input
                  className="flex-1 bg-white/5 border border-white/10 p-3 rounded-xl outline-none focus:border-violet-500 transition-all text-sm"
                  placeholder="Type a message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
                <button onClick={handleSend} className="bg-violet-600 px-6 rounded-xl font-bold hover:bg-violet-500 transition-all text-sm">Send</button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <div className="text-4xl mb-4">💬</div>
            <p>Select a friend to start chatting</p>
          </div>
        )}
      </div>

      {showAddChatModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-[#1c2128] w-full max-w-md rounded-3xl border border-white/10 shadow-2xl">
            <div className="p-6 border-b border-white/5">
              <h2 className="text-xl font-bold">Search Users</h2>
            </div>
            <div className="p-6">
              <input
                autoFocus
                className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-violet-500 transition-all"
                placeholder="Search by username..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
              />
              <div className="mt-4 max-h-60 overflow-y-auto space-y-2">
                {searchResults.map((u) => (
                  <div 
                    key={u._id} 
                    onClick={() => handleAddChat(u._id)} 
                    className="p-4 bg-white/5 hover:bg-violet-600 rounded-2xl cursor-pointer flex items-center gap-3 transition-all"
                  >
                    <div className="w-10 h-10 rounded-full bg-violet-500 flex items-center justify-center font-bold">
                        {u.username?.[0].toUpperCase()}
                    </div>
                    <span className="font-medium">{u.username}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 flex justify-end">
              <button onClick={() => { setShowAddChatModal(false); setSearchResults([]); }} className="text-sm font-bold text-gray-400 hover:text-white px-4 py-2">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <CallManager socket={socketRef.current} roomId={selectedChat?._id} currentUser={userData} />
    </div>
  );
}

export default Home;