import { useCallback, useRef, useState } from 'react';
import type { KeystrokeEvent, SessionStats } from '../types/session';

const PAUSE_THRESHOLD_MS = 1000; // 1 second counts as a "pause"

export function useKeystrokeTracker() {
  const [events, setEvents] = useState<KeystrokeEvent[]>([]);
  const [stats, setStats] = useState<SessionStats>({
    totalKeystrokes: 0,
    totalBackspaces: 0,
    totalPauses: 0,
    avgTypingSpeed: 0,
    pasteCount: 0,
    totalPastedChars: 0,
  });

  const sessionStartRef = useRef<number>(Date.now());
  const lastEventTimeRef = useRef<number>(Date.now());
  const keystrokeCountRef = useRef<number>(0);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const now = Date.now();
    const pause = now - lastEventTimeRef.current;
    lastEventTimeRef.current = now;

    const isBackspace = e.key === 'Backspace' || e.key === 'Delete';
    const eventType = isBackspace ? 'backspace' : 'keydown';

    // Ignore modifier-only keys (Shift, Ctrl, Alt, Meta, etc.)
    if (
      !isBackspace &&
      (e.key.length > 1 && !['Enter', 'Tab', ' '].includes(e.key))
    ) {
      return;
    }

    const newEvent: KeystrokeEvent = {
      type: eventType,
      timestamp: now - sessionStartRef.current,
      meta: {
        pause,
        charCount: 0,
      },
    };

    keystrokeCountRef.current += 1;

    setEvents((prev) => [...prev, newEvent]);

    setStats((prev) => {
      const totalKeystrokes = isBackspace ? prev.totalKeystrokes : prev.totalKeystrokes + 1;
      const totalBackspaces = isBackspace ? prev.totalBackspaces + 1 : prev.totalBackspaces;
      const totalPauses = pause > PAUSE_THRESHOLD_MS ? prev.totalPauses + 1 : prev.totalPauses;

      // Calculate avg typing speed: keystrokes per minute
      const elapsedMinutes = (now - sessionStartRef.current) / 60000;
      const avgTypingSpeed = elapsedMinutes > 0
        ? Math.round(totalKeystrokes / elapsedMinutes)
        : 0;

      return {
        ...prev,
        totalKeystrokes,
        totalBackspaces,
        totalPauses,
        avgTypingSpeed,
      };
    });
  }, []);

  const reset = useCallback(() => {
    setEvents([]);
    setStats({
      totalKeystrokes: 0,
      totalBackspaces: 0,
      totalPauses: 0,
      avgTypingSpeed: 0,
      pasteCount: 0,
      totalPastedChars: 0,
    });
    sessionStartRef.current = Date.now();
    lastEventTimeRef.current = Date.now();
    keystrokeCountRef.current = 0;
  }, []);

  return { events, stats, handleKeyDown, reset, sessionStartRef };
}
