import User from "../models/user.model.js";

export const getCurrentUser = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId).select("-password");
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
