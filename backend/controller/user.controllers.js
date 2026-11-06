import User from "../models/user.model.js";

export const getCurrentUser = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId).select("-password").populate("blockedUsers", "username name avatar");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json({ user });
  } catch (error) {
    return res.status(500).json({ message: `Current user error: ${error.message}` });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const { name, about, avatar } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (about !== undefined) updates.about = about.trim();
    if (avatar !== undefined) updates.avatar = avatar.trim();

    const updatedUser = await User.findByIdAndUpdate(userId, updates, {
      new: true,
    }).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    return res.status(500).json({ message: `Update profile error: ${error.message}` });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const currentUserId = req.userId;
    const users = await User.find({ _id: { $ne: currentUserId } })
      .select("-password")
      .sort({ updatedAt: -1 })
      .limit(50);
    return res.status(200).json(users);
  } catch (error) {
    return res.status(500).json({ message: `Get all users error: ${error.message}` });
  }
};

export const toggleBlockUser = async (req, res) => {
  try {
    const userId = req.userId;
    const { targetUserId } = req.body;

    if (!targetUserId) {
      return res.status(400).json({ message: "targetUserId is required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.blockedUsers = user.blockedUsers || [];
    const index = user.blockedUsers.findIndex(
      (id) => String(id) === String(targetUserId)
    );

    let isBlocked = false;
    if (index > -1) {
      user.blockedUsers.splice(index, 1);
      isBlocked = false;
    } else {
      user.blockedUsers.push(targetUserId);
      isBlocked = true;
    }

    await user.save();
    const updated = await User.findById(userId).select("-password");

    return res.status(200).json({
      message: isBlocked ? "User blocked successfully" : "User unblocked successfully",
      isBlocked,
      blockedUsers: user.blockedUsers,
      user: updated,
    });
  } catch (error) {
    return res.status(500).json({ message: `Block user error: ${error.message}` });
  }
};
