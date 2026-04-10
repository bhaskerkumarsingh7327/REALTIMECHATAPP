// /**
//  * CallManager.jsx
//  * 
//  * Complete WebRTC Audio/Video Call Component
//  * 
//  * Usage:
//  *   <CallManager
//  *     socket={socket}           // your socket.io instance
//  *     roomId={currentChatId}    // chat room id
//  *     currentUser={userData}    // { username, _id, avatar }
//  *     onClose={() => {}}        // optional callback when call ends
//  *   />
//  * 
//  * Also exports: useCallManager hook for triggering calls from outside
//  */

// import { useEffect, useRef, useState, useCallback } from "react";

// // ─── ICE Servers (STUN) ───────────────────────────────────────────────────────
// const ICE_SERVERS = {
//   iceServers: [
//     { urls: "stun:stun.l.google.com:19302" },
//     { urls: "stun:stun1.l.google.com:19302" },
//   ],
// };

// // ─── CallManager Component ────────────────────────────────────────────────────
// export default function CallManager({ socket, roomId, currentUser, onClose }) {
//   const [callState, setCallState] = useState("idle"); 
//   // idle | calling | incoming | in-call

//   const [callType, setCallType] = useState(null); // "audio" | "video"
//   const [callerInfo, setCallerInfo] = useState(null);
//   const [isMuted, setIsMuted] = useState(false);
//   const [isVideoOff, setIsVideoOff] = useState(false);
//   const [callDuration, setCallDuration] = useState(0);

//   const localVideoRef = useRef(null);
//   const remoteVideoRef = useRef(null);
//   const peerRef = useRef(null);
//   const localStreamRef = useRef(null);
//   const incomingSignalRef = useRef(null);
//   const timerRef = useRef(null);
//   const pendingCandidates = useRef([]);

//   // ─── Cleanup ──────────────────────────────────────────────────────────────
//   const cleanup = useCallback(() => {
//     clearInterval(timerRef.current);
//     setCallDuration(0);

//     if (localStreamRef.current) {
//       localStreamRef.current.getTracks().forEach((t) => t.stop());
//       localStreamRef.current = null;
//     }
//     if (peerRef.current) {
//       peerRef.current.close();
//       peerRef.current = null;
//     }
//     if (localVideoRef.current) localVideoRef.current.srcObject = null;
//     if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

//     pendingCandidates.current = [];
//     incomingSignalRef.current = null;
//     setCallState("idle");
//     setCallType(null);
//     setCallerInfo(null);
//     setIsMuted(false);
//     setIsVideoOff(false);
//   }, []);

//   // ─── Get local media stream ───────────────────────────────────────────────
//   const getLocalStream = useCallback(async (type) => {
//     const constraints = {
//       audio: true,
//       video: type === "video" ? { width: 640, height: 480 } : false,
//     };
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia(constraints);
//       localStreamRef.current = stream;
//       if (localVideoRef.current) {
//         localVideoRef.current.srcObject = stream;
//         localVideoRef.current.muted = true; // don't play own audio back
//       }
//       return stream;
//     } catch (err) {
//       console.error("Media error:", err);
//       throw err;
//     }
//   }, []);

//   // ─── Create RTCPeerConnection ─────────────────────────────────────────────
//   const createPeer = useCallback(
//     (stream) => {
//       const peer = new RTCPeerConnection(ICE_SERVERS);

//       // Add local tracks
//       stream.getTracks().forEach((track) => peer.addTrack(track, stream));

//       // ICE candidate → send via socket
//       peer.onicecandidate = (e) => {
//         if (e.candidate) {
//           socket.emit("signal", {
//             roomId,
//             signal: { type: "candidate", candidate: e.candidate },
//           });
//         }
//       };

//       // Remote track arrived
//       peer.ontrack = (e) => {
//         if (remoteVideoRef.current && e.streams[0]) {
//           remoteVideoRef.current.srcObject = e.streams[0];
//         }
//       };

//       peer.onconnectionstatechange = () => {
//         if (
//           peer.connectionState === "disconnected" ||
//           peer.connectionState === "failed" ||
//           peer.connectionState === "closed"
//         ) {
//           handleHangUp(false);
//         }
//       };

//       peerRef.current = peer;
//       return peer;
//     },
//     [socket, roomId]
//   );

//   // ─── INITIATE call (caller side) ─────────────────────────────────────────
//   const startCall = useCallback(
//     async (type) => {
//       if (!socket || !roomId) return;
//       try {
//         setCallType(type);
//         setCallState("calling");

//         const stream = await getLocalStream(type);
//         const peer = createPeer(stream);

//         const offer = await peer.createOffer();
//         await peer.setLocalDescription(offer);

//         socket.emit("call-user", {
//           roomId,
//           signal: offer,
//           callType: type,
//           from: currentUser?.username || "Someone",
//         });
//       } catch (err) {
//         alert("Could not access microphone/camera: " + err.message);
//         cleanup();
//       }
//     },
//     [socket, roomId, currentUser, getLocalStream, createPeer, cleanup]
//   );

//   // ─── ANSWER call (receiver side) ─────────────────────────────────────────
//   const answerCall = useCallback(async () => {
//     try {
//       setCallState("in-call");

//       const stream = await getLocalStream(callType);
//       const peer = createPeer(stream);

//       await peer.setRemoteDescription(
//         new RTCSessionDescription(incomingSignalRef.current)
//       );

//       // Add any pending ICE candidates
//       for (const c of pendingCandidates.current) {
//         await peer.addIceCandidate(new RTCIceCandidate(c));
//       }
//       pendingCandidates.current = [];

//       const answer = await peer.createAnswer();
//       await peer.setLocalDescription(answer);

//       socket.emit("signal", { roomId, signal: answer });

//       // Start timer
//       timerRef.current = setInterval(
//         () => setCallDuration((d) => d + 1),
//         1000
//       );
//     } catch (err) {
//       alert("Could not access microphone/camera: " + err.message);
//       cleanup();
//     }
//   }, [socket, roomId, callType, getLocalStream, createPeer, cleanup]);

//   // ─── Hang up ──────────────────────────────────────────────────────────────
//   const handleHangUp = useCallback(
//     (notifyRemote = true) => {
//       if (notifyRemote && socket && roomId) {
//         socket.emit("end-call", { roomId });
//       }
//       cleanup();
//       if (onClose) onClose();
//     },
//     [socket, roomId, cleanup, onClose]
//   );

//   // ─── Toggle mic ───────────────────────────────────────────────────────────
//   const toggleMute = () => {
//     if (!localStreamRef.current) return;
//     localStreamRef.current.getAudioTracks().forEach((t) => {
//       t.enabled = !t.enabled;
//     });
//     setIsMuted((m) => !m);
//   };

//   // ─── Toggle video ─────────────────────────────────────────────────────────
//   const toggleVideo = () => {
//     if (!localStreamRef.current) return;
//     localStreamRef.current.getVideoTracks().forEach((t) => {
//       t.enabled = !t.enabled;
//     });
//     setIsVideoOff((v) => !v);
//   };

//   // ─── Socket listeners ─────────────────────────────────────────────────────
//   useEffect(() => {
//     if (!socket) return;

//     // Incoming call
//     const onIncomingCall = ({ from, signal, callType: type }) => {
//       incomingSignalRef.current = signal;
//       setCallerInfo({ name: from });
//       setCallType(type);
//       setCallState("incoming");
//     };

//     // Signal (SDP answer or ICE candidate)
//     const onSignal = async ({ signal }) => {
//       if (!peerRef.current) return;
//       try {
//         if (signal.type === "answer") {
//           await peerRef.current.setRemoteDescription(
//             new RTCSessionDescription(signal)
//           );
//           // Start timer after answer received
//           clearInterval(timerRef.current);
//           timerRef.current = setInterval(
//             () => setCallDuration((d) => d + 1),
//             1000
//           );
//           setCallState("in-call");
//         } else if (signal.type === "candidate") {
//           if (peerRef.current.remoteDescription) {
//             await peerRef.current.addIceCandidate(
//               new RTCIceCandidate(signal.candidate)
//             );
//           } else {
//             pendingCandidates.current.push(signal.candidate);
//           }
//         }
//       } catch (e) {
//         console.error("Signal handling error:", e);
//       }
//     };

//     // Remote ended call
//     const onEndCall = () => {
//       cleanup();
//     };

//     socket.on("incoming-call", onIncomingCall);
//     socket.on("signal", onSignal);
//     socket.on("end-call", onEndCall);

//     return () => {
//       socket.off("incoming-call", onIncomingCall);
//       socket.off("signal", onSignal);
//       socket.off("end-call", onEndCall);
//     };
//   }, [socket, cleanup]);

//   // ─── Format duration ──────────────────────────────────────────────────────
//   const formatTime = (s) => {
//     const m = Math.floor(s / 60)
//       .toString()
//       .padStart(2, "0");
//     const sec = (s % 60).toString().padStart(2, "0");
//     return `${m}:${sec}`;
//   };

//   // ─── Expose startCall via window for easy integration ────────────────────
//   useEffect(() => {
//     window.__startCall = startCall;
//     return () => { delete window.__startCall; };
//   }, [startCall]);

//   // ─── UI ───────────────────────────────────────────────────────────────────
//   if (callState === "idle") return null;

//   return (
//     <div style={styles.overlay}>
//       <div style={styles.modal}>
//         {/* VIDEO ELEMENTS — always mounted, hidden when audio only */}
//         <div
//           style={{
//             ...styles.videoContainer,
//             display: callType === "video" && callState === "in-call" ? "block" : "none",
//           }}
//         >
//           <video ref={remoteVideoRef} style={styles.remoteVideo} autoPlay playsInline />
//           <video ref={localVideoRef} style={styles.localVideo} autoPlay playsInline muted />
//         </div>

//         {/* Audio call / calling / incoming UI */}
//         {(callType === "audio" || callState !== "in-call") && (
//           <div style={styles.audioUI}>
//             <div style={styles.avatar}>
//               {callState === "incoming"
//                 ? (callerInfo?.name?.[0] || "?").toUpperCase()
//                 : (currentUser?.username?.[0] || "?").toUpperCase()}
//             </div>
//             <div style={styles.callerName}>
//               {callState === "incoming"
//                 ? callerInfo?.name
//                 : callState === "calling"
//                 ? "Calling..."
//                 : currentUser?.username}
//             </div>
//             <div style={styles.callStatus}>
//               {callState === "incoming"
//                 ? `Incoming ${callType} call`
//                 : callState === "calling"
//                 ? `${callType === "video" ? "📹" : "📞"} Ringing...`
//                 : `${callType === "video" ? "📹" : "📞"} ${formatTime(callDuration)}`}
//             </div>
//           </div>
//         )}

//         {/* Timer for in-call video */}
//         {callState === "in-call" && callType === "video" && (
//           <div style={styles.timer}>{formatTime(callDuration)}</div>
//         )}

//         {/* BUTTONS */}
//         <div style={styles.btnRow}>
//           {callState === "incoming" && (
//             <>
//               <button style={{ ...styles.btn, ...styles.greenBtn }} onClick={answerCall}>
//                 {callType === "video" ? "📹 Accept" : "📞 Accept"}
//               </button>
//               <button style={{ ...styles.btn, ...styles.redBtn }} onClick={() => handleHangUp(true)}>
//                 ✕ Decline
//               </button>
//             </>
//           )}

//           {callState === "calling" && (
//             <button style={{ ...styles.btn, ...styles.redBtn }} onClick={() => handleHangUp(true)}>
//               ✕ Cancel
//             </button>
//           )}

//           {callState === "in-call" && (
//             <>
//               <button
//                 style={{ ...styles.btn, isMuted ? styles.activeBtn : styles.grayBtn }}
//                 onClick={toggleMute}
//                 title={isMuted ? "Unmute" : "Mute"}
//               >
//                 {isMuted ? "🔇" : "🎤"}
//               </button>
//               {callType === "video" && (
//                 <button
//                   style={{ ...styles.btn, isVideoOff ? styles.activeBtn : styles.grayBtn }}
//                   onClick={toggleVideo}
//                   title={isVideoOff ? "Turn on camera" : "Turn off camera"}
//                 >
//                   {isVideoOff ? "📵" : "📷"}
//                 </button>
//               )}
//               <button style={{ ...styles.btn, ...styles.redBtn }} onClick={() => handleHangUp(true)}>
//                 📵 End
//               </button>
//             </>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

// // ─── Styles ───────────────────────────────────────────────────────────────────
// const styles = {
//   overlay: {
//     position: "fixed", inset: 0,
//     background: "rgba(0,0,0,0.75)",
//     display: "flex", alignItems: "center", justifyContent: "center",
//     zIndex: 9999,
//   },
//   modal: {
//     background: "#1a1a2e",
//     borderRadius: "16px",
//     padding: "24px",
//     minWidth: "320px",
//     maxWidth: "680px",
//     width: "90%",
//     display: "flex", flexDirection: "column", alignItems: "center", gap: "16px",
//     boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
//   },
//   videoContainer: { position: "relative", width: "100%", borderRadius: "12px", overflow: "hidden" },
//   remoteVideo: { width: "100%", maxHeight: "360px", background: "#000", borderRadius: "12px", display: "block" },
//   localVideo: {
//     position: "absolute", bottom: "12px", right: "12px",
//     width: "120px", height: "90px",
//     borderRadius: "8px", border: "2px solid #fff",
//     background: "#000", objectFit: "cover",
//   },
//   audioUI: { display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", padding: "16px 0" },
//   avatar: {
//     width: "80px", height: "80px", borderRadius: "50%",
//     background: "linear-gradient(135deg, #667eea, #764ba2)",
//     display: "flex", alignItems: "center", justifyContent: "center",
//     fontSize: "32px", fontWeight: "bold", color: "#fff",
//   },
//   callerName: { fontSize: "22px", fontWeight: "600", color: "#fff" },
//   callStatus: { fontSize: "14px", color: "#aaa" },
//   timer: {
//     position: "absolute", top: "16px", left: "50%", transform: "translateX(-50%)",
//     background: "rgba(0,0,0,0.5)", color: "#fff", padding: "4px 12px",
//     borderRadius: "20px", fontSize: "13px",
//   },
//   btnRow: { display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" },
//   btn: {
//     padding: "12px 24px", borderRadius: "50px", border: "none",
//     fontSize: "14px", fontWeight: "600", cursor: "pointer", transition: "all 0.2s",
//   },
//   greenBtn: { background: "#22c55e", color: "#fff" },
//   redBtn: { background: "#ef4444", color: "#fff" },
//   grayBtn: { background: "#374151", color: "#fff" },
//   activeBtn: { background: "#f59e0b", color: "#fff" },
// };
import React, { useEffect, useRef, useState } from "react";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export default function CallManager({ socket, roomId, currentUser }) {
  const [callState, setCallState] = useState("idle"); 
  const [incomingCall, setIncomingCall] = useState(null);
  const [callType, setCallType] = useState("video");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [facingMode, setFacingMode] = useState("user"); // Front ya Back camera ke liye
  const [callDuration, setCallDuration] = useState(0); // Timer ke liye
  
  const localStream = useRef(null);
  const remoteVideo = useRef();
  const localVideo = useRef(null);
  const peerRef = useRef(null);
  const activeRoomRef = useRef(null);
  const pendingCandidates = useRef([]); // Connection stable rakhne ke liye buffer
  const timerRef = useRef(null);
  
  const ringtoneAudio = useRef(new Audio("/ringing.mp3"));
  const dialingAudio = useRef(new Audio("/dialing.mp3"));

  useEffect(() => {
    if (!socket) return;

    // Call Timer Loop
    if (callState === "in-call") {
      timerRef.current = setInterval(() => setCallDuration(prev => prev + 1), 1000);
    } else {
      clearInterval(timerRef.current);
      setCallDuration(0);
    }
    return () => clearInterval(timerRef.current);
  }, [callState, socket]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  useEffect(() => {
    if (!socket) return;

    const handleIncoming = (data) => {
      setCallState((prev) => {
        if (prev !== "idle") return prev; // Busy check
        setIncomingCall(data);
        setCallType(data.callType);
        ringtoneAudio.current.loop = true;
        ringtoneAudio.current.play().catch(() => {});
        return "incoming";
      });
    };

    const handleAccepted = async (signal) => {
      stopAllSounds();
      if (peerRef.current) {
        try {
          await peerRef.current.setRemoteDescription(new RTCSessionDescription(signal));
          setCallState("in-call");
          pendingCandidates.current.forEach(c => peerRef.current.addIceCandidate(new RTCIceCandidate(c)));
          pendingCandidates.current = [];
          
          // Call connect hone ke baad Renegotiation on karo (Audio -> Video switch ke liye)
          peerRef.current.onnegotiationneeded = async () => {
            try {
              const offer = await peerRef.current.createOffer();
              await peerRef.current.setLocalDescription(offer);
              socket.emit("webrtc-signal", { roomId: activeRoomRef.current, signal: peerRef.current.localDescription });
            } catch(e) {}
          };
        } catch(e) { console.error(e); }
      }
    };

    const handleIce = async (candidate) => {
      if (peerRef.current && peerRef.current.remoteDescription) {
        try { await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate)); } catch(e) {}
      } else {
        pendingCandidates.current.push(candidate);
      }
    };

    const handleWebRTCSignal = async (signal) => {
      if (!peerRef.current) return;
      try {
        if (signal.type === "offer") {
          await peerRef.current.setRemoteDescription(new RTCSessionDescription(signal));
          const answer = await peerRef.current.createAnswer();
          await peerRef.current.setLocalDescription(answer);
          socket.emit("webrtc-signal", { roomId: activeRoomRef.current, signal: peerRef.current.localDescription });
        } else if (signal.type === "answer") {
          await peerRef.current.setRemoteDescription(new RTCSessionDescription(signal));
        }
      } catch(e) { console.error("Negotiation err:", e); }
    };

    const handleEnd = () => handleEndCall(false);

    socket.on("incoming-call", handleIncoming);
    socket.on("call-accepted", handleAccepted);
    socket.on("webrtc-ice", handleIce);
    socket.on("webrtc-signal", handleWebRTCSignal);
    socket.on("end-call", handleEnd);

    return () => {
      socket.off("incoming-call", handleIncoming);
      socket.off("call-accepted", handleAccepted);
      socket.off("webrtc-ice", handleIce);
      socket.off("webrtc-signal", handleWebRTCSignal);
      socket.off("end-call", handleEnd);
    };
  }, [socket]); // 👈 callState hata diya taaki events disconnect na hon re-render par

  useEffect(() => {
    window.__startCall = (type, targetRoomId) => startCall(type, targetRoomId);
  }); // 👈 Isko alag rakha taaki memory me always latest version rahe

  const stopAllSounds = () => {
    ringtoneAudio.current.pause();
    ringtoneAudio.current.currentTime = 0;
    dialingAudio.current.pause();
    dialingAudio.current.currentTime = 0;
  };

  // Setup Peer connection function
  const setupPeer = () => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pc.onicecandidate = (e) => {
      if (e.candidate && socket && activeRoomRef.current) {
        socket.emit("webrtc-ice", { roomId: activeRoomRef.current, candidate: e.candidate });
      }
    };
    pc.ontrack = (e) => {
      if (remoteVideo.current) remoteVideo.current.srcObject = e.streams[0];
      
      // Agar beech call me video track receive hota hai toh automatically video UI pe switch karo
      if (e.track.kind === "video") {
        setCallType("video");
        setIsVideoOff(false);
      }
    };
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => pc.addTrack(track, localStream.current));
    }
    peerRef.current = pc;
    return pc;
  };

  const startCall = async (type, targetRoomId) => {
    setCallType(type);
    setCallState("calling");
    activeRoomRef.current = targetRoomId || roomId;
    dialingAudio.current.loop = true;
    dialingAudio.current.play().catch(() => {});

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === "video" ? { facingMode } : false,
        audio: true,
      });
      localStream.current = stream;
      if (localVideo.current) localVideo.current.srcObject = stream;

      const pc = setupPeer();
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit("call-user", {
        roomId: activeRoomRef.current,
        signal: offer,
        callType: type,
        from: JSON.stringify({ name: currentUser.username, id: currentUser._id }),
      });
    } catch (err) {
      console.error("Mic/Camera error:", err);
      alert("Camera or Microphone access denied! Please check browser permissions.");
      handleEndCall(true);
    }
  };

  const answerCall = async () => {
    stopAllSounds();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: callType === "video" ? { facingMode } : false,
        audio: true,
      });
      localStream.current = stream;
      if (localVideo.current) localVideo.current.srcObject = stream;
      setCallState("in-call");

      let callerId = incomingCall.roomId || roomId;
      try {
        const parsed = JSON.parse(incomingCall.from);
        if (parsed.id) callerId = parsed.id;
      } catch (e) {}
      activeRoomRef.current = callerId;

      const pc = setupPeer();
      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.signal));
      pendingCandidates.current.forEach(c => pc.addIceCandidate(new RTCIceCandidate(c)));
      pendingCandidates.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("answer-call", { roomId: activeRoomRef.current, signal: answer });

      // Answer karne ke baad Renegotiation on karo
      pc.onnegotiationneeded = async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit("webrtc-signal", { roomId: activeRoomRef.current, signal: pc.localDescription });
        } catch(e) {}
      };
    } catch (err) {
      console.error("Answer error:", err);
      alert("Camera or Microphone access denied! Please check browser permissions.");
      handleEndCall(true);
    }
  };

  const handleEndCall = (emit = false) => {
    stopAllSounds();
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => track.stop());
      localStream.current = null;
    }
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    if (emit && socket && activeRoomRef.current) {
      socket.emit("end-call", { roomId: activeRoomRef.current });
    }
    pendingCandidates.current = [];
    setCallState("idle");
    setIncomingCall(null);
      activeRoomRef.current = null;
    setIsMuted(false);
    setIsVideoOff(false);
  };

  const toggleMute = () => {
    if (localStream.current) {
      const audioTrack = localStream.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = async () => {
    if (!localStream.current) return;
    const videoTrack = localStream.current.getVideoTracks()[0];
    
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoOff(!videoTrack.enabled);
    } else {
      // WhatsApp jaisa Audio se Video me Upgrade logic
      try {
        const vs = await navigator.mediaDevices.getUserMedia({ video: { facingMode } });
        const newVideoTrack = vs.getVideoTracks()[0];
        localStream.current.addTrack(newVideoTrack);
        
        if (localVideo.current) localVideo.current.srcObject = localStream.current;
        if (peerRef.current) peerRef.current.addTrack(newVideoTrack, localStream.current);
        
        setCallType("video");
        setIsVideoOff(false);
      } catch (err) { alert("Camera access denied!"); }
    }
  };

  const flipCamera = async () => {
    if (callType !== "video" || !localStream.current) return;
    const newMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(newMode);
    try {
      const vs = await navigator.mediaDevices.getUserMedia({ video: { facingMode: newMode } });
      const newTrack = vs.getVideoTracks()[0];
      const oldTrack = localStream.current.getVideoTracks()[0];
      
      if (oldTrack) {
        oldTrack.stop();
        localStream.current.removeTrack(oldTrack);
      }
      
      localStream.current.addTrack(newTrack);
      if (localVideo.current) localVideo.current.srcObject = localStream.current;
      
      if (peerRef.current) {
        const sender = peerRef.current.getSenders().find(s => s.track && s.track.kind === "video");
        if (sender) sender.replaceTrack(newTrack);
      }
    } catch (e) { console.error(e); }
  };

  if (callState === "idle") return null;

  let displayName = "Unknown";
  if (callState === "incoming" && incomingCall) {
    try {
      displayName = JSON.parse(incomingCall.from).name;
    } catch (e) {
      displayName = incomingCall.from;
    }
  }

  return (
    <div className="fixed inset-0 bg-black/95 z-[200] flex flex-col items-center justify-center p-4 md:p-10 text-white backdrop-blur-lg">
      <div className="relative w-full max-w-4xl aspect-video bg-[#111] rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
        <video ref={remoteVideo} autoPlay playsInline className={`w-full h-full object-cover ${callType === "video" && callState === "in-call" ? "block" : "hidden"}`} />
        
        {callType === "video" && (
           <video ref={localVideo} autoPlay muted playsInline className={`absolute bottom-4 right-4 md:bottom-6 md:right-6 w-28 h-40 md:w-36 md:h-52 bg-black/50 border-2 border-white/20 rounded-2xl object-cover shadow-2xl transition-all ${callState === "in-call" ? "opacity-100" : "opacity-0"}`} />
        )}

        {(callState !== "in-call" || callType === "audio") && (
           <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-md">
              <div className="w-24 h-24 bg-violet-600/30 border border-violet-500/50 shadow-[0_0_30px_rgba(139,92,246,0.3)] rounded-full flex items-center justify-center text-4xl animate-pulse mb-6">
                 {callType === "video" ? "🎥" : "📞"}
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-wide">{callState === "incoming" ? displayName : (callState === "in-call" ? displayName : "Calling...")}</h2>
              <p className="text-gray-300 mt-2 text-lg">{callState === "incoming" ? "Incoming Call" : (callState === "in-call" ? formatTime(callDuration) : "Waiting for answer...")}</p>
           </div>
        )}
      </div>

      <div className="mt-10 flex gap-4 md:gap-6">
        {callState === "incoming" ? (
          <>
            <button onClick={answerCall} className="bg-green-500 hover:bg-green-400 w-16 h-16 rounded-full text-2xl shadow-lg shadow-green-500/30 transition-transform hover:scale-110 flex items-center justify-center">📞</button>
            <button onClick={() => handleEndCall(true)} className="bg-red-500 hover:bg-red-400 w-16 h-16 rounded-full text-2xl shadow-lg shadow-red-500/30 transition-transform hover:scale-110 flex items-center justify-center">✖️</button>
          </>
        ) : (
          <>
            {callState === "in-call" && (
              <>
                <button onClick={toggleMute} className={`w-14 h-14 md:w-16 md:h-16 rounded-full text-2xl shadow-lg transition-transform hover:scale-110 flex items-center justify-center ${isMuted ? 'bg-gray-600 text-gray-300' : 'bg-white/20 hover:bg-white/30'}`}>
                  {isMuted ? "🔇" : "🎤"}
                </button>
                
                <button onClick={toggleVideo} className={`w-14 h-14 md:w-16 md:h-16 rounded-full text-2xl shadow-lg transition-transform hover:scale-110 flex items-center justify-center ${(isVideoOff || callType === "audio") ? 'bg-gray-600 text-gray-300' : 'bg-white/20 hover:bg-white/30'}`}>
                  {(isVideoOff || callType === "audio") ? "🚫" : "📷"}
                </button>

                {callType === "video" && !isVideoOff && (
                  <button onClick={flipCamera} className="w-14 h-14 md:w-16 md:h-16 rounded-full text-2xl shadow-lg transition-transform hover:scale-110 flex items-center justify-center bg-white/20 hover:bg-white/30">
                    🔄
                  </button>
                )}
              </>
            )}
            <button onClick={() => handleEndCall(true)} className="bg-red-500 hover:bg-red-400 w-14 h-14 md:w-16 md:h-16 rounded-full text-2xl shadow-lg shadow-red-500/30 transition-transform hover:scale-110 flex items-center justify-center">📵</button>
          </>
        )}
      </div>
    </div>
  );
}