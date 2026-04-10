import jwt from "jsonwebtoken";

const isAuth = async (req, res, next) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ message: "Token not found" });

    const verifyToken = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = verifyToken.id; // ✅ id from JWT
    next();
  } catch (error) {
    return res.status(401).json({ message: `Auth error: ${error.message}` });
  }
};

export default isAuth;
