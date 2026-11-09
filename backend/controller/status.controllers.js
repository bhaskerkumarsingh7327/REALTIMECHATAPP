import Status from "../models/status.model.js";
import User from "../models/user.model.js";

// 1. CREATE STATUS (Text or Photo/Video)
export const createStatus = async (req, res) => {
  try {
    const { userId, mediaUrl, mediaType, text, backgroundColor } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    if (!text && !mediaUrl) {
      return res.status(400).json({ error: "Status must have text or media" });
    }

    const newStatus = new Status({
      user: userId,
      mediaUrl: mediaUrl || "",
      mediaType: mediaType || (mediaUrl ? "image" : "text"),
      text: text ? text.trim() : "",
      backgroundColor: backgroundColor || "linear-gradient(135deg, #2563eb, #7c3aed)",
      views: [],
      createdAt: new Date(),
    });

    await newStatus.save();

    const populated = await Status.findById(newStatus._id).populate(
      "user",
      "username name avatar"
    );

    res.status(201).json(populated);
  } catch (err) {
    console.error("Create status error:", err);
    res.status(500).json({ error: err.message });
  }
};

// 2. GET ACTIVE 24H STATUSES
export const getActiveStatuses = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const statuses = await Status.find({ createdAt: { $gte: since } })
      .populate("user", "username name avatar isOnline lastSeen")
      .populate("views.user", "username name avatar")
      .sort({ createdAt: -1 });

    // Group statuses by user
    const userStatusMap = new Map();

    statuses.forEach((st) => {
      if (!st.user) return;
      const uid = String(st.user._id);
      if (!userStatusMap.has(uid)) {
        userStatusMap.set(uid, {
          user: st.user,
          statuses: [],
          hasUnviewed: false,
          lastUpdated: st.createdAt,
        });
      }

      const isViewedByMe = st.views?.some(
        (v) => String(v.user?._id || v.user) === String(userId)
      );

      userStatusMap.get(uid).statuses.push({
        ...st.toObject(),
        isViewedByMe,
      });

      if (!isViewedByMe && uid !== String(userId)) {
        userStatusMap.get(uid).hasUnviewed = true;
      }
    });

    const myStatusGroup = userStatusMap.get(String(userId)) || null;
    userStatusMap.delete(String(userId));

    const otherStatuses = Array.from(userStatusMap.values()).sort((a, b) => {
      // Unviewed stories first, then most recently updated
      if (a.hasUnviewed && !b.hasUnviewed) return -1;
      if (!a.hasUnviewed && b.hasUnviewed) return 1;
      return new Date(b.lastUpdated) - new Date(a.lastUpdated);
    });

    res.status(200).json({
      myStatus: myStatusGroup,
      otherStatuses,
    });
  } catch (err) {
    console.error("Get statuses error:", err);
    res.status(500).json({ error: err.message });
  }
};

// 3. MARK STATUS AS VIEWED
export const markStatusViewed = async (req, res) => {
  try {
    const { statusId } = req.params;
    const { userId } = req.body;

    if (!statusId || !userId) {
      return res.status(400).json({ error: "statusId and userId are required" });
    }

    const status = await Status.findById(statusId);
    if (!status) {
      return res.status(404).json({ error: "Status not found" });
    }

    // Don't record view if viewing own status
    if (String(status.user) === String(userId)) {
      return res.status(200).json({ success: true, message: "Own status" });
    }

    const alreadyViewed = status.views.some(
      (v) => String(v.user) === String(userId)
    );

    if (!alreadyViewed) {
      status.views.push({ user: userId, viewedAt: new Date() });
      await status.save();
    }

    res.status(200).json({ success: true, viewsCount: status.views.length });
  } catch (err) {
    console.error("Mark status viewed error:", err);
    res.status(500).json({ error: err.message });
  }
};

// 4. DELETE STATUS
export const deleteStatus = async (req, res) => {
  try {
    const { statusId } = req.params;
    const { userId } = req.query;

    const status = await Status.findById(statusId);
    if (!status) {
      return res.status(404).json({ error: "Status not found" });
    }

    if (String(status.user) !== String(userId)) {
      return res.status(403).json({ error: "Unauthorized to delete this status" });
    }

    await Status.findByIdAndDelete(statusId);
    res.status(200).json({ success: true, message: "Status deleted" });
  } catch (err) {
    console.error("Delete status error:", err);
    res.status(500).json({ error: err.message });
  }
};

