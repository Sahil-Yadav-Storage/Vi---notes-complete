import type { Keystroke } from '../../../shared/src/keystroke';

interface SuspiciousSegment {
  startIndex: number;
  endIndex: number;
  reason: string;
  severity: 'low' | 'medium' | 'high';
}

interface AnomalyReport {
  hasAnomalies: boolean;
  suspiciousSegments: SuspiciousSegment[];
  uniformityScore: number;
  anomalyFlags: string[];
}

const PAUSE_THRESHOLD = 3000;
const BURST_THRESHOLD = 50;

export const detectAnomalies = (keystrokes: unknown): AnomalyReport => {
  const events = Array.isArray(keystrokes) ? keystrokes : [];

  if (events.length === 0) {
    return {
      hasAnomalies: false,
      suspiciousSegments: [],
      uniformityScore: 0,
      anomalyFlags: [],
    };
  }

  const segments: SuspiciousSegment[] = [];
  const flags: string[] = [];
  
  if (events.length < 10) {
    return {
      hasAnomalies: false,
      suspiciousSegments: [],
      uniformityScore: 0,
      anomalyFlags: [],
    };
  }
  
  const downEvents = events.filter((k: any) => k.action === 'down');
  const pasteEvents = events.filter((k: any) => k.action === 'paste');
  
  // Detect suspicious uniformity in typing intervals
  const intervals: number[] = [];
  for (let i = 1; i < downEvents.length; i++) {
    intervals.push(downEvents[i].timestamp - downEvents[i - 1].timestamp);
  }
  
  if (intervals.length > 20) {
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, val) => sum + (val - mean) ** 2, 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = mean > 0 ? stdDev / mean : 0;
    
    if (coefficientOfVariation < 0.3) {
      flags.push('Suspiciously uniform typing rhythm detected');
      segments.push({
        startIndex: 0,
        endIndex: downEvents.length - 1,
        reason: 'Robotic typing pattern - too consistent',
        severity: 'high',
      });
    }
  }
  
  // Detect burst typing (too fast for human)
  let burstStart = -1;
  for (let i = 0; i < intervals.length; i++) {
    if (intervals[i] < BURST_THRESHOLD) {
      if (burstStart === -1) burstStart = i;
    } else {
      if (burstStart !== -1 && i - burstStart > 15) {
        segments.push({
          startIndex: burstStart,
          endIndex: i,
          reason: 'Sustained burst typing exceeds human capability',
          severity: 'high',
        });
        flags.push('Unnatural typing burst detected');
      }
      burstStart = -1;
    }
  }
  
  // Detect large pastes with no subsequent editing
  for (const paste of pasteEvents) {
    if (paste.length && paste.length > 100) {
      const pasteTime = paste.timestamp;
      const subsequentEdits = events.filter(
        (k: any) => k.timestamp > pasteTime && 
             k.timestamp < pasteTime + 30000 &&
             (k.action === 'down' || k.action === 'up')
      );
      
      if (subsequentEdits.length < 5) {
        const pasteIndex = events.indexOf(paste);
        segments.push({
          startIndex: pasteIndex,
          endIndex: pasteIndex,
          reason: 'Large paste with no revision',
          severity: 'medium',
        });
        flags.push('Unedited pasted content detected');
      }
    }
  }
  
  // Detect absence of natural pauses
  let longStretchStart = 0;
  for (let i = 1; i < downEvents.length; i++) {
    const gap = downEvents[i].timestamp - downEvents[i - 1].timestamp;
    
    if (gap > PAUSE_THRESHOLD) {
      longStretchStart = i;
    } else if (i - longStretchStart > 200) {
      segments.push({
        startIndex: longStretchStart,
        endIndex: i,
        reason: 'Extended typing without natural pauses',
        severity: 'medium',
      });
      flags.push('Missing natural thinking pauses');
      longStretchStart = i;
    }
  }
  
  // Calculate uniformity score (0-100, higher = more suspicious)
  const uniformityScore = Math.min(100, Math.round(
    (segments.filter(s => s.severity === 'high').length * 30) +
    (segments.filter(s => s.severity === 'medium').length * 15) +
    (flags.length * 10)
  ));
  
  return {
    hasAnomalies: segments.length > 0 || flags.length > 0,
    suspiciousSegments: segments,
    uniformityScore,
    anomalyFlags: flags,
  };
};
