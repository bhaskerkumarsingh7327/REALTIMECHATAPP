import genToken from "../config/token.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";

// SIGNUP
export const signUp = async (req, res) => {
  try {
    const { username, email, password, name } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "Username, email, and password are required" });
    }

    const trimmedUsername = username.trim().toLowerCase();
    const trimmedEmail = email.trim().toLowerCase();

    const checkUserByUserName = await User.findOne({ username: trimmedUsername });
    if (checkUserByUserName) {
      return res.status(400).json({ message: "Username already exists" });
    }

    const checkUserByEmail = await User.findOne({ email: trimmedEmail });
    if (checkUserByEmail) {
      return res.status(400).json({ message: "Email already registered" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      username: trimmedUsername,
      email: trimmedEmail,
      name: name?.trim() || trimmedUsername,
      password: hashedPassword,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${trimmedUsername}`,
      about: "Hey there! I am using PulseChat.",
    });

    const token = genToken(newUser._id);

    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: "Lax",
      secure: false,
    });

    const safeUser = {
      _id: newUser._id,
      name: newUser.name,
      username: newUser.username,
      email: newUser.email,
      avatar: newUser.avatar,
      about: newUser.about,
      isOnline: true,
    };

    return res.status(201).json({ user: safeUser, token });
  } catch (error) {
    return res.status(500).json({ message: `Signup error: ${error.message}` });
  }
};

// LOGIN
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const trimmedIdentifier = email.trim().toLowerCase();

    // Allow login via email OR username
    const user = await User.findOne({
      $or: [{ email: trimmedIdentifier }, { username: trimmedIdentifier }],
    });

    if (!user) {
      return res.status(400).json({ message: "User not found with this email/username" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = genToken(user._id);

    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: "Lax",
      secure: false,
    });

    const safeUser = {
      _id: user._id,
      name: user.name || user.username,
      username: user.username,
      email: user.email,
      avatar: user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`,
      about: user.about || "Hey there! I am using PulseChat.",
      isOnline: true,
    };

    return res.status(200).json({ user: safeUser, token });
  } catch (error) {
    return res.status(500).json({ message: `Login error: ${error.message}` });
  }
};

// LOGOUT
export const logOut = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
    });
    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    return res.status(500).json({ message: `Logout error: ${error.message}` });
  }
};
