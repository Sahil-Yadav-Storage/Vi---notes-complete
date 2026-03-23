import type { Keystroke } from "./keystroke";

export interface SessionUpsertInput {
  keystrokes: Keystroke[];
}

export interface SessionAnalytics {
  version: number;
  approximateWpmVariance: number;
  pauseFrequency: number;
  editRatio: number;
  pasteRatio: number;
  totalInsertedChars: number;
  totalDeletedChars: number;
  finalChars: number;
  totalPastedChars: number;
  pauseCount: number;
  durationMs: number;
}

export interface CloseSessionResponse {
  message: string;
  sessionId: string;
  analytics: SessionAnalytics;
  closedAt: string;
  alreadyClosed: boolean;
}
