import express from "express";
import {
  logCall,
  getMyCallLogs,
  clearMyCallLogs,
} from "../controller/callLog.controllers.js";

const router = express.Router();

router.get("/", getMyCallLogs);
router.post("/log", logCall);
router.delete("/clear", clearMyCallLogs);

export default router;

