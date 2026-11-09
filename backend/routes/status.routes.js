import express from "express";
import {
  createStatus,
  getActiveStatuses,
  markStatusViewed,
  deleteStatus,
} from "../controller/status.controllers.js";

const router = express.Router();

router.get("/", getActiveStatuses);
router.post("/", createStatus);
router.post("/:statusId/view", markStatusViewed);
router.delete("/:statusId", deleteStatus);

export default router;
