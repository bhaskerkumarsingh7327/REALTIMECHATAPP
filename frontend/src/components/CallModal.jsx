import React, { useEffect, useRef, useState } from "react";
import {
  IconPhone,
  IconPhoneOff,
  IconVideo,
  IconMic,
  IconMicOff,
  IconCamera,
  IconCameraOff,
  IconScreenShare,
} from "./Icons";
import { sounds } from "../utils/soundEffects";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

export default function CallModal({
  callState, // 'idle' | 'outgoing' | 'incoming' | 'in-call'
  callType, // 'audio' | 'video'
  peerUser, // { _id, username, name, avatar }
  callerInfo, // { _id, username, name, avatar }
  socket,
  incomingOffer,
  onEndCall,
  onCallAccepted,
}) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState(callType === "audio");
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [duration, setDuration] = useState(0);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const timerRef = useRef(null);

  // Format call duration MM:SS
  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remainingSecs.toString().padStart(2, "0")}`;
  };

  // Timer for active call
  useEffect(() => {
    if (callState === "in-call") {
      setDuration(0);
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState]);

  // Handle sounds based on call state
  useEffect(() => {
    if (callState === "outgoing") {
      sounds.playOutgoingRing();
    } else if (callState === "incoming") {
      sounds.playIncomingRing();
    } else {
      sounds.stopAllSounds();
    }
    return () => sounds.stopAllSounds();
  }, [callState]);

  // Setup Peer Connection helper
  const setupPeerConnection = () => {
    if (peerConnectionRef.current) return peerConnectionRef.current;

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = pc;

    // When remote track arrives
    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // When ICE candidate is generated
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        const targetId = callerInfo?._id || peerUser?._id;
        socket.emit("ice-candidate", {
          to: targetId,
          candidate: event.candidate,
        });
      }
    };

    return pc;
  };

  // Get User Media Stream
  const getMediaStream = async (type = callType) => {
    try {
      const constraints = {
        audio: true,
        video:
          type === "video"
            ? {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: "user",
              }
            : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      return stream;
    } catch (err) {
      console.warn("Could not get requested media:", err);
      // Fallback to audio-only if video fails (e.g. no camera or permission denied)
      if (type === "video") {
        try {
          const audioOnlyStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          localStreamRef.current = audioOnlyStream;
          setIsVideoDisabled(true);
          return audioOnlyStream;
        } catch (e) {
          throw e;
        }
      }
      throw err;
    }
  };

  // 1. OUTGOING CALL INITIALIZATION
  useEffect(() => {
    if (callState === "outgoing" && peerUser?._id && socket) {
      let isMounted = true;

      const initOutgoing = async () => {
        try {
          const stream = await getMediaStream(callType);
          if (!isMounted) return;

          const pc = setupPeerConnection();
          stream.getTracks().forEach((track) => pc.addTrack(track, stream));

          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          socket.emit("call-user", {
            recipientId: peerUser._id,
            offer,
            callType,
            callerInfo: {
              _id: socket.userId,
              name: socket.userName,
              username: socket.userUsername,
              avatar: socket.userAvatar,
            },
          });
        } catch (err) {
          console.error("Failed to start outgoing call:", err);
          onEndCall();
        }
      };

      initOutgoing();

      return () => {
        isMounted = false;
      };
    }
  }, [callState]);

  // Socket event listeners for WebRTC signaling
  useEffect(() => {
    if (!socket) return;

    // Recipient answered the call
    const handleCallAnswered = async ({ answer }) => {
      sounds.stopAllSounds();
      const pc = peerConnectionRef.current;
      if (pc && pc.signalingState !== "closed") {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          if (onCallAccepted) onCallAccepted();
        } catch (err) {
          console.error("Error setting remote description:", err);
        }
      }
    };

    // Received ICE Candidate
    const handleIceCandidate = async ({ candidate }) => {
      const pc = peerConnectionRef.current;
      if (pc && pc.remoteDescription && candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn("Error adding ice candidate:", e);
        }
      }
    };

    // Call was rejected by recipient
    const handleCallRejected = () => {
      sounds.stopAllSounds();
      sounds.playCallEnded();
      cleanupMedia();
      onEndCall("Call was declined.");
    };

    // Call was ended by remote party
    const handleCallEnded = () => {
      sounds.stopAllSounds();
      sounds.playCallEnded();
      cleanupMedia();
      onEndCall();
    };

    // Remote media status changed
    const handleRemoteMediaToggled = ({ mediaType: mType, isEnabled }) => {
      // Can show notification if needed
    };

    socket.on("call-answered", handleCallAnswered);
    socket.on("ice-candidate", handleIceCandidate);
    socket.on("call-rejected", handleCallRejected);
    socket.on("call-ended", handleCallEnded);
    socket.on("remote-media-toggled", handleRemoteMediaToggled);

    return () => {
      socket.off("call-answered", handleCallAnswered);
      socket.off("ice-candidate", handleIceCandidate);
      socket.off("call-rejected", handleCallRejected);
      socket.off("call-ended", handleCallEnded);
      socket.off("remote-media-toggled", handleRemoteMediaToggled);
    };
  }, [socket, onEndCall, onCallAccepted]);

  // 2. ACCEPT INCOMING CALL
  const handleAcceptCall = async () => {
    sounds.stopAllSounds();
    try {
      const stream = await getMediaStream(callType);
      const pc = setupPeerConnection();

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      if (incomingOffer) {
        await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit("answer-call", {
          to: callerInfo._id,
          answer,
        });

        if (onCallAccepted) onCallAccepted();
      }
    } catch (err) {
      console.error("Error accepting call:", err);
      handleRejectCall();
    }
  };

  // 3. REJECT INCOMING CALL
  const handleRejectCall = () => {
    sounds.stopAllSounds();
    if (socket && callerInfo?._id) {
      socket.emit("reject-call", {
        to: callerInfo._id,
        reason: "Call declined",
      });
    }
    cleanupMedia();
    onEndCall();
  };

  // 4. HANG UP ACTIVE / OUTGOING CALL
  const handleHangUp = () => {
    sounds.stopAllSounds();
    sounds.playCallEnded();

    const targetId = callerInfo?._id || peerUser?._id;
    if (socket && targetId) {
      socket.emit("end-call", { to: targetId });
    }

    cleanupMedia();
    onEndCall();
  };

  // Cleanup helper
  const cleanupMedia = () => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  };

  // TOGGLE MIC
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        const targetId = callerInfo?._id || peerUser?._id;
        socket?.emit("toggle-media", {
          to: targetId,
          mediaType: "audio",
          isEnabled: audioTrack.enabled,
        });
      }
    }
  };

  // TOGGLE CAMERA
  const toggleVideo = async () => {
    if (localStreamRef.current) {
      let videoTrack = localStreamRef.current.getVideoTracks()[0];

      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoDisabled(!videoTrack.enabled);
      } else {
        // If starting from audio call, acquire video track
        try {
          const videoStream = await navigator.mediaDevices.getUserMedia({
            video: true,
          });
          const newVideoTrack = videoStream.getVideoTracks()[0];
          localStreamRef.current.addTrack(newVideoTrack);

          if (peerConnectionRef.current) {
            peerConnectionRef.current.addTrack(newVideoTrack, localStreamRef.current);
          }

          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
          }
          setIsVideoDisabled(false);
        } catch (e) {
          console.warn("Could not enable camera:", e);
        }
      }

      const targetId = callerInfo?._id || peerUser?._id;
      socket?.emit("toggle-media", {
        to: targetId,
        mediaType: "video",
        isEnabled: !isVideoDisabled,
      });
    }
  };

  // SCREEN SHARE
  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        screenStreamRef.current = stream;
        const screenTrack = stream.getVideoTracks()[0];

        if (peerConnectionRef.current) {
          const sender = peerConnectionRef.current
            .getSenders()
            .find((s) => s.track && s.track.kind === "video");
          if (sender) {
            sender.replaceTrack(screenTrack);
          }
        }

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        screenTrack.onended = () => {
          stopScreenShare();
        };

        setIsScreenSharing(true);
      } else {
        stopScreenShare();
      }
    } catch (e) {
      console.warn("Screen share cancelled or failed:", e);
    }
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (peerConnectionRef.current && videoTrack) {
        const sender = peerConnectionRef.current
          .getSenders()
          .find((s) => s.track && s.track.kind === "video");
        if (sender) sender.replaceTrack(videoTrack);
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
    }
    setIsScreenSharing(false);
  };

  if (callState === "idle") return null;

  const activeContact = callState === "incoming" ? callerInfo : peerUser;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-xl animate-fade-in font-sans">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/20 rounded-full blur-[120px] pointer-events-none"></div>

      {/* ==================================================== */}
      {/* 1. OUTGOING & INCOMING CALL SCREEN */}
      {/* ==================================================== */}
      {(callState === "outgoing" || callState === "incoming") && (
        <div className="relative w-full max-w-sm mx-4 bg-[#111622]/90 border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center">
          {/* Avatar with pulsing rings */}
          <div className="relative my-6">
            <div className="absolute -inset-4 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 rounded-full opacity-60 animate-ping"></div>
            <div className="absolute -inset-2 bg-violet-600/40 rounded-full animate-pulse"></div>
            <img
              src={
                activeContact?.avatar ||
                `https://api.dicebear.com/7.x/bottts/svg?seed=${activeContact?.username || "user"}`
              }
              alt={activeContact?.name || "User"}
              className="relative w-28 h-28 rounded-full object-cover border-4 border-white/20 shadow-xl"
            />
          </div>

          <h3 className="text-2xl font-bold text-white mb-1">
            {activeContact?.name || activeContact?.username || "User"}
          </h3>
          <p className="text-sm text-violet-300 font-medium mb-2">
            @{activeContact?.username || "user"}
          </p>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-gray-300 mb-8">
            {callType === "video" ? <IconVideo className="w-4 h-4 text-cyan-400" /> : <IconPhone className="w-4 h-4 text-emerald-400" />}
            <span>
              {callState === "incoming"
                ? `Incoming ${callType === "video" ? "Video" : "Voice"} Call...`
                : `Calling ${callType === "video" ? "Video" : "Voice"}...`}
            </span>
          </div>

          {/* Action buttons */}
          {callState === "incoming" ? (
            <div className="flex items-center justify-center gap-8 w-full mt-2">
              <button
                onClick={handleRejectCall}
                className="group flex flex-col items-center gap-2"
              >
                <div className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-600/30 transition transform group-hover:scale-110 active:scale-95">
                  <IconPhoneOff className="w-7 h-7" />
                </div>
                <span className="text-xs text-gray-400 font-medium">Decline</span>
              </button>

              <button
                onClick={handleAcceptCall}
                className="group flex flex-col items-center gap-2"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 transition transform group-hover:scale-110 active:scale-95 animate-bounce">
                  {callType === "video" ? <IconVideo className="w-7 h-7" /> : <IconPhone className="w-7 h-7" />}
                </div>
                <span className="text-xs text-emerald-400 font-medium">Accept</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 w-full mt-2">
              <button
                onClick={handleHangUp}
                className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-600/30 transition transform hover:scale-110 active:scale-95"
              >
                <IconPhoneOff className="w-7 h-7" />
              </button>
              <span className="text-xs text-gray-400 font-medium mt-1">Cancel</span>
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* 2. ACTIVE IN-CALL SCREEN */}
      {/* ==================================================== */}
      {callState === "in-call" && (
        <div className="relative w-full h-full flex flex-col bg-[#0b0e14]">
          {/* Header Bar */}
          <div className="absolute top-0 left-0 right-0 z-30 p-4 md:p-6 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent">
            <div className="flex items-center gap-3">
              <img
                src={
                  activeContact?.avatar ||
                  `https://api.dicebear.com/7.x/bottts/svg?seed=${activeContact?.username || "user"}`
                }
                alt="Avatar"
                className="w-10 h-10 rounded-full border border-white/20 object-cover"
              />
              <div>
                <h4 className="text-white font-bold text-sm md:text-base">
                  {activeContact?.name || activeContact?.username}
                </h4>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-xs text-gray-300 font-mono">
                    {formatTime(duration)}
                  </span>
                  <span className="text-[10px] text-gray-400">• End-to-End Encrypted</span>
                </div>
              </div>
            </div>

            <div className="px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-gray-300 border border-white/10">
              {callType === "video" ? "HD Video" : "HD Audio"}
            </div>
          </div>

          {/* Main Video View / Audio View */}
          <div className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden">
            {/* Remote Video Stream */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                callType === "video" ? "opacity-100" : "hidden"
              }`}
            />

            {/* Audio Mode Graphic or when Remote Video is Not Visible */}
            {callType === "audio" && (
              <div className="flex flex-col items-center justify-center z-10 text-center px-4">
                <div className="relative mb-6">
                  {/* Dynamic pulsing wave rings */}
                  <div className="absolute -inset-8 rounded-full border border-violet-500/20 animate-ping"></div>
                  <div className="absolute -inset-4 rounded-full border border-cyan-500/30 animate-pulse"></div>
                  <img
                    src={
                      activeContact?.avatar ||
                      `https://api.dicebear.com/7.x/bottts/svg?seed=${activeContact?.username || "user"}`
                    }
                    alt="Active"
                    className="relative w-32 h-32 rounded-full border-4 border-violet-500/50 shadow-2xl object-cover"
                  />
                </div>

                <h3 className="text-2xl font-bold text-white mb-2">
                  {activeContact?.name || activeContact?.username}
                </h3>
                <p className="text-sm text-gray-400 mb-6">Voice Connected</p>

                {/* Animated sound wave bars */}
                <div className="flex items-center gap-1.5 h-10">
                  {[20, 40, 60, 80, 50, 90, 70, 30, 80, 50, 30].map((h, i) => (
                    <div
                      key={i}
                      className="w-1.5 bg-gradient-to-t from-violet-500 to-cyan-400 rounded-full animate-pulse"
                      style={{
                        height: `${h}%`,
                        animationDelay: `${i * 0.1}s`,
                        animationDuration: "0.8s",
                      }}
                    ></div>
                  ))}
                </div>
              </div>
            )}

            {/* Floating Picture-in-Picture Local Video */}
            {callType === "video" && (
              <div className="absolute bottom-28 right-4 md:right-8 md:bottom-28 z-20 w-32 h-44 md:w-44 md:h-60 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-gray-900 group">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className={`w-full h-full object-cover ${isVideoDisabled ? "hidden" : "block"}`}
                />
                {isVideoDisabled && (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 text-gray-500 text-xs text-center p-2">
                    <IconCameraOff className="w-8 h-8 mb-2 opacity-50" />
                    <span>Camera Off</span>
                  </div>
                )}
                <div className="absolute bottom-2 left-2 text-[10px] bg-black/60 px-2 py-0.5 rounded text-white font-medium">
                  You
                </div>
              </div>
            )}
          </div>

          {/* Bottom Floating Controls Bar */}
          <div className="absolute bottom-0 left-0 right-0 z-30 pb-8 pt-6 px-4 flex justify-center items-center gap-4 md:gap-6 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
            {/* Mic Mute Toggle */}
            <button
              onClick={toggleMute}
              className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-lg ${
                isMuted
                  ? "bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30"
                  : "bg-white/10 hover:bg-white/20 text-white border border-white/10"
              }`}
              title={isMuted ? "Unmute Mic" : "Mute Mic"}
            >
              {isMuted ? <IconMicOff className="w-6 h-6" /> : <IconMic className="w-6 h-6" />}
            </button>

            {/* Video Toggle */}
            <button
              onClick={toggleVideo}
              className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-lg ${
                isVideoDisabled
                  ? "bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30"
                  : "bg-white/10 hover:bg-white/20 text-white border border-white/10"
              }`}
              title={isVideoDisabled ? "Turn On Camera" : "Turn Off Camera"}
            >
              {isVideoDisabled ? <IconCameraOff className="w-6 h-6" /> : <IconCamera className="w-6 h-6" />}
            </button>

            {/* Screen Share Toggle */}
            {callType === "video" && (
              <button
                onClick={toggleScreenShare}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-lg ${
                  isScreenSharing
                    ? "bg-cyan-500 text-white shadow-cyan-500/30"
                    : "bg-white/10 hover:bg-white/20 text-white border border-white/10"
                }`}
                title={isScreenSharing ? "Stop Screen Share" : "Share Screen"}
              >
                <IconScreenShare className="w-6 h-6" />
              </button>
            )}

            {/* Hang Up Button */}
            <button
              onClick={handleHangUp}
              className="w-16 h-14 rounded-2xl bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-xl shadow-red-600/40 transition transform hover:scale-105 active:scale-95"
              title="End Call"
            >
              <IconPhoneOff className="w-7 h-7" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

