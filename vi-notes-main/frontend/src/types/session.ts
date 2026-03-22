/**
 * Shared types for writing session data.
 */

export interface KeystrokeEvent {
  type: 'keydown' | 'backspace' | 'paste';
  timestamp: number;
  meta: {
    pause: number;
    charCount: number;
  };
}

export interface SessionStats {
  totalKeystrokes: number;
  totalBackspaces: number;
  totalPauses: number;
  avgTypingSpeed: number;
  pasteCount: number;
  totalPastedChars: number;
}

export interface SessionPayload {
  events: KeystrokeEvent[];
  stats: SessionStats;
  textLength: number;
  text: string;
}

export interface AuthenticityReport {
  confidenceScore: number;
  label: 'Likely Human' | 'Suspicious';
  flags: string[];
  metrics: Record<string, number>;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export interface SessionSummary {
  _id: string;
  text: string;
  textLength: number;
  report?: {
    confidenceScore: number;
    label: string;
  };
  createdAt: string;
}
