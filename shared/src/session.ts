export interface SessionTextAnalysis {
  avgSentenceLength: number;
  sentenceVariance: number;
  lexicalDiversity: number;
  totalWords: number;
  totalSentences: number;
}

export interface SessionAuthenticity {
  score: number;
  label: string;
}
import type { Keystroke } from "./keystroke";

export interface CreateSessionInput {
  documentId: string;
  keystrokes: Keystroke[];
}

export interface SessionUpsertInput {
  keystrokes: Keystroke[];
}

export interface SessionStartResponse {
  sessionId: string;
  resumed: boolean;
}

export interface SessionSummary {
  _id: string;
  documentId?: string;
  status: "active" | "closed";
  createdAt: string;
  closedAt?: string;
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
  microPauseCount: number;
  textAnalysis: SessionTextAnalysis;
  authenticity: SessionAuthenticity;
  flags: string[];
}

export interface SessionDerivedStats {
  wordCount: number;
  charCount: number;
  edits: number;
  keystrokes: number;
  pastes: number;
}

// Only stats and analytics are returned. Remove flat fields (words, chars, edits, pastes) for clean contract.
// If backward compatibility is needed, add them back temporarily, but plan to remove.
export interface SessionListItem {
  _id: string;
  documentId?: string;
  status: "active" | "closed";
  createdAt: number;
  closedAt?: number;
  stats: SessionDerivedStats;
  analytics?: SessionAnalytics;
}

export interface CloseSessionResponse {
  message: string;
  sessionId: string;
  documentId?: string;
  analytics: SessionAnalytics;
  closedAt: string;
  alreadyClosed: boolean;
}
