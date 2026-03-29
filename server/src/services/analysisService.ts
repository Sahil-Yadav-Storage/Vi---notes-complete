// Strict normalizer: only real strings, arrays of strings, or arrays with anomalyFlags; all else collapses to []
const toStringArray = (value: unknown): string[] => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    // Handles accidental JSON-stringified arrays/objects
    try {
      return toStringArray(JSON.parse(trimmed));
    } catch {
      return [trimmed];
    }
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      if (typeof item === "string") {
        const trimmed = item.trim();
        return trimmed ? [trimmed] : [];
      }
      if (item && typeof item === "object" && "anomalyFlags" in item) {
        return toStringArray((item as { anomalyFlags?: unknown }).anomalyFlags);
      }
      return [];
    });
  }
  return [];
};
import type { Keystroke, SessionAnalytics } from "@shared/index";
import { analyzeText } from "./textAnalysisService.js";
import { calculateAuthenticityScore } from "./scoringService.js";
import { detectAnomalies } from "./anomalyService.js";

const CHARS_PER_WORD = 5;
const PAUSE_THRESHOLD_MS = 2_000;
const ANALYTICS_VERSION = 1;

const roundTo = (value: number, decimals: number) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const getNumericValue = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

const getPreferredTimestamp = (event: Keystroke): number | undefined => {
  // Prefer rawTimestamp (original Date.now()) over smoothed timestamp
  // to avoid normalizeKeystrokeTiming compression distorting WPM/pause calc
  if (typeof event.rawTimestamp === "number" && Number.isFinite(event.rawTimestamp)) {
    return event.rawTimestamp;
  }
  if (typeof event.timestamp === "number" && Number.isFinite(event.timestamp)) {
    return event.timestamp;
  }
  return undefined;
};

const getSortedEvents = (keystrokes: Keystroke[]) =>
  [...keystrokes].sort(
    (a, b) => (getPreferredTimestamp(a) ?? 0) - (getPreferredTimestamp(b) ?? 0),
  );

export const computeSessionAnalytics = (
  keystrokes: Keystroke[],
  documentContent: string = "",
): SessionAnalytics => {
  const safeKeystrokes = Array.isArray(keystrokes) ? keystrokes : [];

  if (safeKeystrokes.length === 0) {
    return {
      version: ANALYTICS_VERSION,
      approximateWpmVariance: 0,
      pauseFrequency: 0,
      editRatio: 0,
      pasteRatio: 0,
      totalInsertedChars: 0,
      totalDeletedChars: 0,
      finalChars: 0,
      totalPastedChars: 0,
      pauseCount: 0,
      durationMs: 0,
      microPauseCount: 0,
      textAnalysis: {
        avgSentenceLength: 0,
        sentenceVariance: 0,
        lexicalDiversity: 0,
        totalWords: 0,
        totalSentences: 0,
      },
      authenticity: {
        score: 0,
        label: "unknown",
      },
      flags: [],
    };
  }

  const orderedEvents = getSortedEvents(safeKeystrokes);
  const firstEvent = orderedEvents[0];
  const lastEvent = orderedEvents[orderedEvents.length - 1];
  const firstTimestamp = firstEvent
    ? (getPreferredTimestamp(firstEvent) ?? 0)
    : 0;
  const lastTimestamp = lastEvent
    ? (getPreferredTimestamp(lastEvent) ?? firstTimestamp)
    : firstTimestamp;
  const durationMs = Math.max(0, lastTimestamp - firstTimestamp);

  const downEvents = orderedEvents.filter(e => e.action === "down");

  let totalInsertedChars = 0;
  let totalDeletedChars = 0;
  let totalPastedChars = 0;

  for (const event of orderedEvents) {
    if (event.action === "edit") {
      totalInsertedChars += getNumericValue(event.insertedLength);
      totalDeletedChars += getNumericValue(event.removedLength);
    }
    if (event.action === "paste") {
      totalPastedChars += getNumericValue(event.pasteLength);
    }
  }

  // WPM: use keystroke count as proxy (every ~5 keystrokes ≈ 1 word)
  // Use raw timestamps from down events for duration to avoid smoothing distortion
  let wpm = 0;
  if (downEvents.length >= 2) {
    const firstDown = getPreferredTimestamp(downEvents[0]!) ?? 0;
    const lastDown = getPreferredTimestamp(downEvents[downEvents.length - 1]!) ?? 0;
    const downDurationMs = Math.max(0, lastDown - firstDown);
    const downDurationMin = downDurationMs / 60_000;
    if (downDurationMin > 0) {
      wpm = roundTo(downEvents.length / CHARS_PER_WORD / downDurationMin, 1);
    }
  }

  // Pauses: gaps >= PAUSE_THRESHOLD_MS between consecutive down events
  let pauseCount = 0;
  for (let i = 1; i < downEvents.length; i++) {
    const gap = (getPreferredTimestamp(downEvents[i]!) ?? 0) -
                (getPreferredTimestamp(downEvents[i - 1]!) ?? 0);
    if (gap >= PAUSE_THRESHOLD_MS) pauseCount++;
  }

  const finalChars = Math.max(totalInsertedChars - totalDeletedChars, 0);
  const totalProducedChars = Math.max(totalInsertedChars, 0);
  const editRatio = finalChars > 0 ? totalDeletedChars / finalChars : 0;
  const pasteRatio = totalProducedChars > 0 ? totalPastedChars / totalProducedChars : 0;

  const baseAnalytics = {
    version: ANALYTICS_VERSION,
    approximateWpmVariance: wpm,
    pauseFrequency: pauseCount,
    editRatio: roundTo(editRatio, 4),
    pasteRatio: roundTo(pasteRatio, 4),
    totalInsertedChars,
    totalDeletedChars,
    finalChars,
    totalPastedChars,
    pauseCount,
    durationMs,
  };

  // Strict normalization: never trust analyzeText() output shape
  const rawTextStats = analyzeText(documentContent) as unknown as Record<
    string,
    number
  >;
  const textAnalysis = {
    avgSentenceLength: rawTextStats.avgSentenceLength ?? 0,
    sentenceVariance:
      rawTextStats.sentenceVariance ?? rawTextStats.sentenceLengthVariance ?? 0,
    lexicalDiversity:
      rawTextStats.lexicalDiversity ?? rawTextStats.vocabularyDiversity ?? 0,
    totalWords: rawTextStats.totalWords ?? rawTextStats.wordCount ?? 0,
    totalSentences:
      rawTextStats.totalSentences ?? rawTextStats.sentenceCount ?? 0,
  };

  // Only pass behavioral metrics, not full analytics
  const behavioralMetrics = {
    approximateWpmVariance: baseAnalytics.approximateWpmVariance,
    pauseFrequency: baseAnalytics.pauseFrequency,
    editRatio: baseAnalytics.editRatio,
    pasteRatio: baseAnalytics.pasteRatio,
  };
  // calculateAuthenticityScore must return { score, label }
  const authenticity = calculateAuthenticityScore(
    behavioralMetrics,
    textAnalysis,
  );

  const anomalyReport = detectAnomalies(safeKeystrokes);
  // Always normalize flags before returning
  const flags = Array.isArray(anomalyReport?.anomalyFlags)
    ? anomalyReport.anomalyFlags.filter(
        (f) => typeof f === "string" && f.trim().length > 0,
      )
    : [];

  // STEP 9: Add micro-pause counting
  let microPauseCount = 0;
  for (let i = 1; i < orderedEvents.length; i++) {
    const gap =
      (getPreferredTimestamp(orderedEvents[i]!) ?? 0) -
      (getPreferredTimestamp(orderedEvents[i - 1]!) ?? 0);
    if (gap > 300 && gap < 2000) {
      microPauseCount++;
    }
  }

  return {
    ...baseAnalytics,
    textAnalysis,
    authenticity,
    flags,
    microPauseCount,
  };
};
