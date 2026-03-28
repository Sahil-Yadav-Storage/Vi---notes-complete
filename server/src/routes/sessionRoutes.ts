import express from "express";
import {
  closeSessionById,
  saveSession,
  updateSession,
  getSessions,
  getSession,
} from "../controllers/sessionController.js";
import {
  getVerificationReport,
  downloadReport,
} from "../controllers/verificationController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { stripKeystrokeContent } from "../middleware/keystrokeSanitization.js";

const router = express.Router();

router.post("/", authMiddleware, stripKeystrokeContent, saveSession);
router.patch("/:id", authMiddleware, stripKeystrokeContent, updateSession);
router.get("/", authMiddleware, getSessions);
router.get("/verify/:sessionId", getVerificationReport);
router.get("/verify/:sessionId/pdf", downloadReport);
router.get("/:id", authMiddleware, getSession);
router.post("/:id/close", authMiddleware, closeSessionById);

export default router;
