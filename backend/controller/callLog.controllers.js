import CallLog from "../models/callLog.model.js";

// 1. LOG A COMPLETED / MISSED / DECLINED CALL
export const logCall = async (req, res) => {
  try {
    const { callerId, recipientId, callType, status, duration } = req.body;

    if (!callerId || !recipientId) {
      return res.status(400).json({ error: "callerId and recipientId are required" });
    }

    const newLog = new CallLog({
      caller: callerId,
      recipient: recipientId,
      callType: callType || "audio",
      status: status || "completed",
      duration: duration || 0,
      createdAt: new Date(),
    });

    await newLog.save();

    const populated = await CallLog.findById(newLog._id)
      .populate("caller", "username name avatar isOnline lastSeen")
      .populate("recipient", "username name avatar isOnline lastSeen");

    res.status(201).json(populated);
  } catch (err) {
    console.error("Log call error:", err);
    res.status(500).json({ error: err.message });
  }
};

// 2. GET USER'S CALL HISTORY
export const getMyCallLogs = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const logs = await CallLog.find({
      $or: [{ caller: userId }, { recipient: userId }],
    })
      .populate("caller", "username name avatar isOnline lastSeen")
      .populate("recipient", "username name avatar isOnline lastSeen")
      .sort({ createdAt: -1 })
      .limit(60);

    res.status(200).json(logs || []);
  } catch (err) {
    console.error("Get call logs error:", err);
    res.status(500).json({ error: err.message });
  }
};

// 3. CLEAR ALL CALL LOGS FOR A USER
export const clearMyCallLogs = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    await CallLog.deleteMany({
      $or: [{ caller: userId }, { recipient: userId }],
    });

    res.status(200).json({ success: true, message: "Call logs cleared" });
  } catch (err) {
    console.error("Clear call logs error:", err);
    res.status(500).json({ error: err.message });
  }
};

