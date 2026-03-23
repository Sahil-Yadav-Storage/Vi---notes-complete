import type { Request, Response } from "express";
import type { SessionUpsertInput } from "@shared/session";
import {
  appendToSession,
  closeSession,
  createSession,
  getSessionById,
  listSessions,
} from "../services/sessionService.js";
import { getServiceErrorResponse } from "../services/errors.js";

export const saveSession = async (req: Request, res: Response) => {
  try {
    const body = req.body as Partial<SessionUpsertInput>;
    const { sessionId } = await createSession(req.userId, body);

    return res.status(201).json({ message: "Session saved", sessionId });
  } catch (error) {
    const { statusCode, message } = getServiceErrorResponse(error);
    console.error(error);
    return res.status(statusCode).json({ error: message });
  }
};

// append new keystrokes on the active session
export const updateSession = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    if (typeof id !== "string" || id.trim() === "") {
      return res.status(400).json({ error: "Invalid session id" });
    }

    const body = req.body as Partial<SessionUpsertInput>;
    await appendToSession(req.userId, id, body);

    return res.json({ message: "Session updated" });
  } catch (error) {
    const { statusCode, message } = getServiceErrorResponse(error);
    console.error(error);
    return res.status(statusCode).json({ error: message });
  }
};

export const getSessions = async (req: Request, res: Response) => {
  try {
    const sessions = await listSessions(req.userId);

    return res.json(sessions);
  } catch (error) {
    const { statusCode, message } = getServiceErrorResponse(error);
    console.error(error);
    return res.status(statusCode).json({ error: message });
  }
};

export const getSession = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    if (typeof id !== "string" || id.trim() === "") {
      return res.status(400).json({ error: "Invalid session id" });
    }

    const session = await getSessionById(req.userId, id);

    return res.json(session);
  } catch (error) {
    const { statusCode, message } = getServiceErrorResponse(error);
    console.error(error);
    return res.status(statusCode).json({ error: message });
  }
};

export const closeSessionById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    if (typeof id !== "string" || id.trim() === "") {
      return res.status(400).json({ error: "Invalid session id" });
    }

    const result = await closeSession(req.userId, id);
    return res.status(200).json(result);
  } catch (error) {
    const { statusCode, message } = getServiceErrorResponse(error);
    console.error(error);
    return res.status(statusCode).json({ error: message });
  }
};
