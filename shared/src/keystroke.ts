// All optional fields are number | null for Mongoose compatibility.
// Backend normalization must convert null to undefined or 0 as appropriate before analytics logic.
export interface Keystroke {
  action: "down" | "up" | "paste" | "edit";
  timestamp: number;
  rawTimestamp?: number | null;
  duration?: number | null;
  rawDuration?: number | null;
  pasteLength?: number | null;
  pasteSelectionStart?: number | null;
  pasteSelectionEnd?: number | null;
  editedLater?: boolean | null;
  editStart?: number | null;
  editEnd?: number | null;
  insertedLength?: number | null;
  removedLength?: number | null;
}
