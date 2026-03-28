// Helper to robustly extract a single param
const getSingleParam = (
  value: string | string[] | undefined,
  name: string,
): string => {
  const normalized = Array.isArray(value) ? value[0] : value;
  if (typeof normalized !== "string" || normalized.trim() === "") {
    throw new Error(`Missing ${name}`);
  }
  return normalized;
};

// Helper to normalize keystroke fields (null → undefined or 0 as appropriate)
import type { Keystroke } from "@shared/keystroke";
const toNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;
const normalizeKeystroke = (item: any): Keystroke => ({
  action: item.action,
  timestamp: toNumber(item.timestamp) ?? 0,
  rawTimestamp: toNumber(item.rawTimestamp) ?? null,
  rawDuration: toNumber(item.rawDuration) ?? null,
  duration: toNumber(item.duration) ?? null,
  pasteLength: toNumber(item.pasteLength) ?? null,
  pasteSelectionStart: toNumber(item.pasteSelectionStart) ?? null,
  pasteSelectionEnd: toNumber(item.pasteSelectionEnd) ?? null,
  editedLater: typeof item.editedLater === "boolean" ? item.editedLater : null,
  editStart: toNumber(item.editStart) ?? null,
  editEnd: toNumber(item.editEnd) ?? null,
  insertedLength: toNumber(item.insertedLength) ?? null,
  removedLength: toNumber(item.removedLength) ?? null,
});
import type { Request, Response } from "express";
import Session from "../models/Session.js";
import Document from "../models/Document.js";
import { computeSessionAnalytics } from "../services/analysisService.js";
import { generatePDF } from "../services/reportService.js";

const refreshVerificationSession = async (sessionId: string) => {
  const session = await Session.findById(sessionId);
  if (!session) return null;

  const document = session.documentId
    ? await Document.findById(session.documentId).lean()
    : null;

  // Always normalize keystrokes before analytics
  const keystrokes = Array.isArray(session.keystrokes)
    ? session.keystrokes.map((k) =>
        normalizeKeystroke(k.toObject ? k.toObject() : k),
      )
    : [];
  const analytics = computeSessionAnalytics(
    keystrokes,
    document?.content ?? "",
  );

  session.analytics = {
    ...analytics,
    flags: Array.isArray(analytics.flags)
      ? analytics.flags.filter(
          (flag) => typeof flag === "string" && flag.trim().length > 0,
        )
      : [],
  };
  session.status = "closed";
  if (!session.closedAt) {
    session.closedAt = new Date();
  }

  await session.save();
  return session.toObject();
};

export const getVerificationReport = async (req: Request, res: Response) => {
  try {
    const sessionId = getSingleParam(req.params.sessionId, "sessionId");
    const session = await refreshVerificationSession(sessionId);

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    return res.json({
      success: true,
      data: {
        analytics: session.analytics,
        createdAt: session.createdAt,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const downloadReport = async (req: Request, res: Response) => {
  try {
    const sessionId = getSingleParam(req.params.sessionId, "sessionId");
    const session = await refreshVerificationSession(sessionId);

    if (!session) {
      return res.status(404).send();
    }

    return generatePDF(res, session);
  } catch (error) {
    console.error(error);
    return res.status(500).send();
  }
};
