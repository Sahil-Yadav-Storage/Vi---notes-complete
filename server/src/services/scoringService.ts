import type { SessionTextAnalysis } from "../../../shared/src/session";

type BehavioralMetrics = {
  approximateWpmVariance: number;
  pauseFrequency: number;
  editRatio: number;
  pasteRatio: number;
};

// Returns { score, label } contract
export const calculateAuthenticityScore = (
  behavioral: BehavioralMetrics,
  textAnalysis: SessionTextAnalysis,
): { score: number; label: string } => {
  const flags: string[] = [];

  // Behavioral scoring (0-100)
  let behavioralScore = 50;

  if (behavioral.approximateWpmVariance > 20) {
    behavioralScore += 15;
  } else if (behavioral.approximateWpmVariance < 5) {
    behavioralScore -= 20;
    flags.push("Unusually consistent typing speed");
  }

  if (behavioral.pauseFrequency > 3) {
    behavioralScore += 10;
  } else if (behavioral.pauseFrequency < 1) {
    behavioralScore -= 15;
    flags.push("Very few natural pauses");
  }

  if (behavioral.editRatio > 0.15) {
    behavioralScore += 15;
  } else if (behavioral.editRatio < 0.02) {
    behavioralScore -= 10;
    flags.push("Minimal editing behavior");
  }

  if (behavioral.pasteRatio > 0.5) {
    behavioralScore -= 25;
    flags.push("High paste ratio detected");
  } else if (behavioral.pasteRatio > 0.2) {
    behavioralScore -= 10;
  }

  // Textual scoring (0-100)
  let textualScore = 50;

  if (textAnalysis.sentenceVariance > 15) {
    textualScore += 15;
  } else if (textAnalysis.sentenceVariance < 5) {
    textualScore -= 15;
    flags.push("Low sentence length variation");
  }

  if (textAnalysis.lexicalDiversity > 100) {
    textualScore += 10;
  } else if (textAnalysis.lexicalDiversity < 30) {
    textualScore -= 10;
    flags.push("Repetitive vocabulary");
  }

  // Cross-verification (0-100)
  let crossScore = 50;
  const expectedEditRatio = 0.1 + textAnalysis.sentenceVariance / 200;
  const editMismatch = Math.abs(behavioral.editRatio - expectedEditRatio);
  if (editMismatch < 0.05) {
    crossScore += 20;
  } else if (editMismatch > 0.2) {
    crossScore -= 20;
    flags.push("Behavioral-textual mismatch detected");
  }
  if (behavioral.pasteRatio < 0.1 && textAnalysis.lexicalDiversity > 100) {
    crossScore += 15;
  }
  if (behavioral.pasteRatio > 0.3 && behavioral.editRatio < 0.05) {
    crossScore -= 25;
    flags.push("Pasted content with minimal revision");
  }
  behavioralScore = Math.max(0, Math.min(100, behavioralScore));
  textualScore = Math.max(0, Math.min(100, textualScore));
  crossScore = Math.max(0, Math.min(100, crossScore));
  const score =
    Math.round(
      (behavioralScore * 0.4 + textualScore * 0.3 + crossScore * 0.3) * 100,
    ) / 100;
  let label = "unknown";
  if (score > 80) label = "human";
  else if (score > 60) label = "likely human";
  else if (score > 40) label = "uncertain";
  else label = "likely ai";
  return { score, label };
};
