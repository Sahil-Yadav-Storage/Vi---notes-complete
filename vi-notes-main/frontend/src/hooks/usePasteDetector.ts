import { useCallback, useState } from 'react';
import type { KeystrokeEvent } from '../types/session';

export function usePasteDetector(sessionStartRef: React.RefObject<number>) {
  const [pasteEvents, setPasteEvents] = useState<KeystrokeEvent[]>([]);
  const [pasteCount, setPasteCount] = useState(0);
  const [totalPastedChars, setTotalPastedChars] = useState(0);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData('text/plain');
    const charCount = pastedText.length;

    if (charCount === 0) return;

    const now = Date.now();
    const newEvent: KeystrokeEvent = {
      type: 'paste',
      timestamp: now - (sessionStartRef.current ?? now),
      meta: {
        pause: 0,
        charCount,
      },
    };

    setPasteEvents((prev) => [...prev, newEvent]);
    setPasteCount((prev) => prev + 1);
    setTotalPastedChars((prev) => prev + charCount);
  }, [sessionStartRef]);

  const resetPaste = useCallback(() => {
    setPasteEvents([]);
    setPasteCount(0);
    setTotalPastedChars(0);
  }, []);

  return { pasteEvents, pasteCount, totalPastedChars, handlePaste, resetPaste };
}
