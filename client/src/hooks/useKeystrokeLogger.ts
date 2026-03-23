import { useRef, useState } from "react";
import type { Keystroke } from "@shared/keystroke";

type ActivePasteRange = {
  index: number;
  start: number;
  end: number;
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const applyEditToActivePastes = (
  activePastes: ActivePasteRange[],
  changeStart: number,
  changeEnd: number,
  insertedLength: number,
  events: Keystroke[],
) => {
  const delta = insertedLength - (changeEnd - changeStart);
  const next: ActivePasteRange[] = [];

  for (const pasteRange of activePastes) {
    if (pasteRange.end <= changeStart) {
      next.push(pasteRange);
      continue;
    }

    if (pasteRange.start >= changeEnd) {
      next.push({
        ...pasteRange,
        start: pasteRange.start + delta,
        end: pasteRange.end + delta,
      });
      continue;
    }

    const pasteEvent = events[pasteRange.index];
    if (pasteEvent?.action === "paste") {
      pasteEvent.editedLater = true;
    }
  }

  return next;
};

const enrichPastesWithEditedLater = (events: Keystroke[]): Keystroke[] => {
  const enriched = events.map((event) => ({ ...event }));
  let activePastes: ActivePasteRange[] = [];

  for (let index = 0; index < enriched.length; index += 1) {
    const event = enriched[index];

    if (event.action === "edit") {
      if (
        isFiniteNumber(event.editStart) &&
        isFiniteNumber(event.editEnd) &&
        isFiniteNumber(event.insertedLength)
      ) {
        activePastes = applyEditToActivePastes(
          activePastes,
          event.editStart,
          event.editEnd,
          event.insertedLength,
          enriched,
        );
      }

      continue;
    }

    if (event.action === "paste") {
      if (
        isFiniteNumber(event.pasteSelectionStart) &&
        isFiniteNumber(event.pasteSelectionEnd) &&
        isFiniteNumber(event.pasteLength)
      ) {
        activePastes = applyEditToActivePastes(
          activePastes,
          event.pasteSelectionStart,
          event.pasteSelectionEnd,
          event.pasteLength,
          enriched,
        );

        activePastes.push({
          index,
          start: event.pasteSelectionStart,
          end: event.pasteSelectionStart + event.pasteLength,
        });
      }

      continue;
    }
  }

  return enriched;
};

const getChangeBounds = (before: string, after: string) => {
  const maxPrefix = Math.min(before.length, after.length);
  let prefix = 0;

  while (prefix < maxPrefix && before[prefix] === after[prefix]) {
    prefix += 1;
  }

  const maxSuffix = Math.min(before.length - prefix, after.length - prefix);
  let suffix = 0;

  while (
    suffix < maxSuffix &&
    before[before.length - 1 - suffix] === after[after.length - 1 - suffix]
  ) {
    suffix += 1;
  }

  const removedLength = before.length - prefix - suffix;
  const insertedLength = after.length - prefix - suffix;

  if (removedLength === 0 && insertedLength === 0) {
    return null;
  }

  return {
    start: prefix,
    end: prefix + removedLength,
    insertedLength,
    removedLength,
  };
};

export const useKeystrokeLogger = () => {
  const [keystrokes, setKeystrokes] = useState<Keystroke[]>([]);
  const downTimestamps = useRef<Map<string, number>>(new Map());

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const now = Date.now();
    downTimestamps.current.set(e.code, now);

    setKeystrokes((prev) => [...prev, { action: "down", timestamp: now }]);
  };

  const handleKeyUp = (e: React.KeyboardEvent) => {
    const now = Date.now();
    const downAt = downTimestamps.current.get(e.code);
    downTimestamps.current.delete(e.code);

    const duration = downAt !== undefined ? now - downAt : undefined;

    setKeystrokes((prev) => [
      ...prev,
      {
        action: "up",
        timestamp: now,
        ...(duration !== undefined && { duration }),
      },
    ]);
  };

  const logPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pasteLength = e.clipboardData.getData("text").length;
    const selectionStart = e.currentTarget.selectionStart;
    const selectionEnd = e.currentTarget.selectionEnd;
    const timestamp = Date.now();

    setKeystrokes((prev) => [
      ...prev,
      {
        action: "paste",
        timestamp,
        pasteLength,
        pasteSelectionStart: selectionStart,
        pasteSelectionEnd: selectionEnd,
      },
    ]);
  };

  const logTextChange = (before: string, after: string) => {
    const change = getChangeBounds(before, after);
    if (!change) {
      return;
    }

    setKeystrokes((prev) => [
      ...prev,
      {
        action: "edit",
        timestamp: Date.now(),
        editStart: change.start,
        editEnd: change.end,
        insertedLength: change.insertedLength,
        removedLength: change.removedLength,
      },
    ]);
  };

  // drains accumulated keystrokes and resets state for the next sync window
  const flushKeystrokes = (): Keystroke[] => {
    const pending = enrichPastesWithEditedLater(keystrokes);
    setKeystrokes([]);
    return pending;
  };

  return {
    keystrokes,
    handleKeyDown,
    handleKeyUp,
    logPaste,
    logTextChange,
    flushKeystrokes,
  };
};
