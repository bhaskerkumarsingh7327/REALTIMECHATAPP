import jwt from "jsonwebtoken";

const isAuth = async (req, res, next) => {
  try {
    let token = req.cookies?.token;

    // Check Authorization header fallback
    if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({ message: "Authentication required. Token missing." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_jwt_secret_pulsechat");
    req.userId = decoded.id;
    next();
  } catch (error) {
    return res.status(401).json({ message: `Auth error: ${error.message}` });
  }
};

export default isAuth;
