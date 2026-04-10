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
import { useEffect, useRef, useState, useCallback } from "react";

const ICE_SERVERS = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export default function CallManager({ socket, roomId, currentUser }) {
  const [callState, setCallState] = useState("idle"); 
  const [callType, setCallType] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const peerConnection = useRef(null);
  const localStream = useRef(null);

  useEffect(() => {
    if (!socket) return;

    // Start Call function for global access
    window.__startCall = async (type) => {
      setCallType(type);
      setCallState("calling");
      
      localStream.current = await navigator.mediaDevices.getUserMedia({
        video: type === "video",
        audio: true
      });

      socket.emit("call-user", {
        roomId,
        callType: type,
        from: currentUser.username
      });
    };

    socket.on("incoming-call", (data) => {
      setIncomingCall(data);
      setCallState("incoming");
    });

    socket.on("end-call", () => {
      endCall();
    });

    return () => {
      socket.off("incoming-call");
      socket.off("end-call");
    };
  }, [socket, roomId, currentUser]);

  const endCall = () => {
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop());
    }
    setCallState("idle");
    setIncomingCall(null);
    socket.emit("end-call", { roomId });
  };

  if (callState === "idle") return null;

  return (
    <div className="fixed inset-0 bg-black/90 z-[100] flex flex-col items-center justify-center p-6 text-white">
      <div className="w-24 h-24 bg-violet-600 rounded-full flex items-center justify-center text-4xl mb-4 animate-pulse">
        {callType === "video" ? "🎥" : "📞"}
      </div>
      <h2 className="text-2xl font-bold mb-2">
        {callState === "incoming" ? incomingCall?.from : "Calling..."}
      </h2>
      <p className="text-gray-400 mb-8">
        {callState === "incoming" ? "Incoming Call" : "Waiting for answer..."}
      </p>
      
      <div className="flex gap-8">
        {callState === "incoming" && (
          <button className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-2xl">✔️</button>
        )}
        <button onClick={endCall} className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center text-2xl">✖️</button>
      </div>
    </div>
  );
}