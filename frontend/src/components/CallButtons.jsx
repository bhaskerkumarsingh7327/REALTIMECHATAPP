/**
 * CallButtons.jsx
 * 
 * Drop these buttons in your chat header to start calls.
 * 
 * Usage:
 *   <CallButtons
 *     socket={socket}
 *     roomId={currentChatId}
 *     currentUser={userData}
 *   />
 */

export default function CallButtons({ socket, roomId, currentUser }) {
  const startCall = (type) => {
    if (window.__startCall) {
      window.__startCall(type, roomId);
    } else {
      console.warn("CallManager not mounted. Add <CallManager> to your component tree.");
    }
  };

  return (
    <div style={{ display: "flex", gap: "8px" }}>
      <button
        onClick={() => startCall("audio")}
        title="Audio Call"
        style={btnStyle}
      >
        📞
      </button>
      <button
        onClick={() => startCall("video")}
        title="Video Call"
        style={btnStyle}
      >
        📹
      </button>
    </div>
  );
}

const btnStyle = {
  background: "transparent",
  border: "1px solid #374151",
  borderRadius: "8px",
  padding: "6px 10px",
  fontSize: "18px",
  cursor: "pointer",
  transition: "background 0.2s",
};