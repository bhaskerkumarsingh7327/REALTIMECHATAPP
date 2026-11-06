import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "..", "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || "";
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max limit
});

router.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const mime = req.file.mimetype || "";
  let mediaType = "file";
  if (mime.startsWith("image/")) mediaType = "image";
  else if (mime.startsWith("audio/")) mediaType = "audio";
  else if (mime.startsWith("video/")) mediaType = "video";

  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({
    url: fileUrl,
    fileName: req.file.originalname,
    fileSize: (req.file.size / 1024).toFixed(1) + " KB",
    mediaType,
  });
});

export default router;
