import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api";
import Toast from "../components/Toast";
import styles from "./FileOpen.module.css";

// ── Types ────────────────────────────────────────────────────────────────────

interface Session {
  id: string;
  timestamp: number;
  words: number;
  chars: number;
  edits: number;
  pastes: number;
  wpm: number;
  pauses: number;
  duration: number; // seconds
  content: string;
}

interface FileData {
  id: string;
  name: string;
  content: string; // HTML string from contenteditable
  sessions: Session[];
  lastModified: number;
  // Formatting state - per file
  font: string;
  fontSize: number;
  textColor: string;
  bgColor: string;
  customColor: string;
  customBg: string;
  // Scroll position
  scrollPosition: number;
}

interface DocumentDetail {
  _id: string;
  name: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface EditorProps {
  fileId: string; // The ID of the file being edited
  fileName: string;
  onClose?: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = "writing_tracker_files";

// Default formatting values
const DEFAULT_FORMATTING = {
  font: "Calibri",
  fontSize: 14,
  textColor: "#ffffff",
  bgColor: "#f59e0b",
  customColor: "#ffffff",
  customBg: "#000000",
  scrollPosition: 0,
};

// Migrate old data structure to new one with formatting properties
function migrationFileData(file: any): FileData {
  return {
    id: file.id || "",
    name: file.name || "",
    content: file.content || "",
    sessions: file.sessions || [],
    lastModified: file.lastModified || Date.now(),
    font: file.font || DEFAULT_FORMATTING.font,
    fontSize: file.fontSize || DEFAULT_FORMATTING.fontSize,
    textColor: file.textColor || DEFAULT_FORMATTING.textColor,
    bgColor: file.bgColor || DEFAULT_FORMATTING.bgColor,
    customColor: file.customColor || DEFAULT_FORMATTING.customColor,
    customBg: file.customBg || DEFAULT_FORMATTING.customBg,
    scrollPosition: file.scrollPosition || DEFAULT_FORMATTING.scrollPosition,
  };
}

function loadFiles(): Record<string, FileData> {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    // Migrate all old data to new format
    const migratedData: Record<string, FileData> = {};
    for (const fileId in data) {
      migratedData[fileId] = migrationFileData(data[fileId]);
    }
    return migratedData;
  } catch {
    return {};
  }
}

function saveFiles(files: Record<string, FileData>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
}

function getFileData(fileId: string, fileName: string): FileData {
  const files = loadFiles();
  if (files[fileId]) {
    // Ensure all properties exist
    return migrationFileData(files[fileId]);
  }
  return {
    id: fileId,
    name: fileName,
    content: "",
    sessions: [],
    lastModified: Date.now(),
    font: DEFAULT_FORMATTING.font,
    fontSize: DEFAULT_FORMATTING.fontSize,
    textColor: DEFAULT_FORMATTING.textColor,
    bgColor: DEFAULT_FORMATTING.bgColor,
    customColor: DEFAULT_FORMATTING.customColor,
    customBg: DEFAULT_FORMATTING.customBg,
    scrollPosition: DEFAULT_FORMATTING.scrollPosition,
  };
}

function countWords(html: string): number {
  const text = html.replace(/<[^>]*>/g, " ").trim();
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

function countChars(html: string): number {
  return html.replace(/<[^>]*>/g, "").length;
}

// ── Component ────────────────────────────────────────────────────────────────

const FONTS = [
  "Calibri",
  "Georgia",
  "Times New Roman",
  "Arial",
  "Courier New",
  "Verdana",
  "Trebuchet MS",
];
const FONT_SIZES = [10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72];

const FONT_CLASS_MAP: Record<string, string> = {
  Calibri: styles.fontCalibri,
  Georgia: styles.fontGeorgia,
  "Times New Roman": styles.fontTimesNewRoman,
  Arial: styles.fontArial,
  "Courier New": styles.fontCourierNew,
  Verdana: styles.fontVerdana,
  "Trebuchet MS": styles.fontTrebuchetMs,
};

const FONT_SIZE_CLASS_MAP: Record<number, string> = {
  10: styles.fontSize10,
  11: styles.fontSize11,
  12: styles.fontSize12,
  13: styles.fontSize13,
  14: styles.fontSize14,
  16: styles.fontSize16,
  18: styles.fontSize18,
  20: styles.fontSize20,
  24: styles.fontSize24,
  28: styles.fontSize28,
  32: styles.fontSize32,
  36: styles.fontSize36,
  48: styles.fontSize48,
  72: styles.fontSize72,
};

const PAUSE_THRESHOLD_MS = 3000; // 3s of inactivity = a pause

function Editor({ fileId, fileName, onClose }: EditorProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "sessions" | "write">(
    "write",
  );
  const [fileData, setFileData] = useState<FileData>(() =>
    getFileData(fileId, fileName),
  );
  const [toastMessage, setToastMessage] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // Write-tab state - Initialize from DEFAULT_FORMATTING (will be updated by useEffect)
  const editorRef = useRef<HTMLDivElement>(null);
  const [font, setFont] = useState(DEFAULT_FORMATTING.font);
  const [fontSize, setFontSize] = useState(DEFAULT_FORMATTING.fontSize);
  const [textColor, setTextColor] = useState(DEFAULT_FORMATTING.textColor);
  const [bgColor, setBgColor] = useState(DEFAULT_FORMATTING.bgColor);
  const [customColor, setCustomColor] = useState(
    DEFAULT_FORMATTING.customColor,
  );
  const [customBg, setCustomBg] = useState(DEFAULT_FORMATTING.customBg);

  // Session tracking
  const [wpm, setWpm] = useState(0);
  const [pauses, setPauses] = useState(0);
  const [edits, setEdits] = useState(0);
  const [pastes, setPastes] = useState(0);

  const sessionStartRef = useRef<number>(Date.now());
  const lastKeystrokeRef = useRef<number>(Date.now());
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wordCountRef = useRef<number>(0);
  const startWordCountRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [pasteDetected, setPasteDetected] = useState(false);

  // ── Fetch document from database and sync to localStorage ────────────────

  useEffect(() => {
    const fetchAndInitDocument = async () => {
      try {
        const response = await api.get<DocumentDetail>(
          `/api/documents/${fileId}`,
        );
        const dbDocument = response.data;

        // Always load or initialize file data properly
        const files = loadFiles();

        if (!files[fileId]) {
          // New file: create with database content and empty sessions
          files[fileId] = {
            id: fileId,
            name: dbDocument.name,
            content: dbDocument.content,
            sessions: [],
            lastModified: Date.now(),
            font: DEFAULT_FORMATTING.font,
            fontSize: DEFAULT_FORMATTING.fontSize,
            textColor: DEFAULT_FORMATTING.textColor,
            bgColor: DEFAULT_FORMATTING.bgColor,
            customColor: DEFAULT_FORMATTING.customColor,
            customBg: DEFAULT_FORMATTING.customBg,
            scrollPosition: DEFAULT_FORMATTING.scrollPosition,
          };
          saveFiles(files);
          setFileData(files[fileId]);
        } else {
          // Existing file: ensure migration of old data, preserve all local data
          files[fileId] = migrationFileData(files[fileId]);
          files[fileId].name = dbDocument.name;
          saveFiles(files);
          // Use the existing localStorage data (with all sessions)
          setFileData(files[fileId]);
        }
      } catch (error) {
        console.error("Failed to fetch document from database:", error);
        // Fall back to localStorage data if fetch fails
        const fallbackData = getFileData(fileId, fileName);
        setFileData(fallbackData);
      }
    };

    void fetchAndInitDocument();
  }, [fileId]);

  // ── Init editor content ────────────────────────────────────────────────────

  useEffect(() => {
    // Load content even if isLoadingFromDb is true, as long as we have fileData
    if (!fileData) return;

    // Load content from the latest saved session, or fall back to the generic content property
    const contentToLoad =
      fileData.sessions && fileData.sessions.length > 0
        ? fileData.sessions[fileData.sessions.length - 1].content
        : fileData.content || "";

    if (editorRef.current) {
      editorRef.current.innerHTML = contentToLoad;
      // Restore scroll position for this file
      editorRef.current.scrollTop = fileData.scrollPosition || 0;
    }
    // Snapshot starting words
    startWordCountRef.current = countWords(contentToLoad);
    wordCountRef.current = startWordCountRef.current;
    sessionStartRef.current = Date.now();
  }, [fileData, activeTab]);

  // ── Reset formatting state when switching files ──────────────────────────

  useEffect(() => {
    // Reset all formatting to match the current file's settings
    setFont(fileData.font || DEFAULT_FORMATTING.font);
    setFontSize(fileData.fontSize || DEFAULT_FORMATTING.fontSize);
    setTextColor(fileData.textColor || DEFAULT_FORMATTING.textColor);
    setBgColor(fileData.bgColor || DEFAULT_FORMATTING.bgColor);
    setCustomColor(fileData.customColor || DEFAULT_FORMATTING.customColor);
    setCustomBg(fileData.customBg || DEFAULT_FORMATTING.customBg);

    // Reset session counters
    setEdits(0);
    setPastes(0);
    setPauses(0);
    setWpm(0);
  }, [fileId]);

  // ── WPM ticker ────────────────────────────────────────────────────────────

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - sessionStartRef.current) / 1000 / 60; // minutes
      const currentWords = countWords(editorRef.current?.innerHTML || "");
      const wordsTyped = Math.max(0, currentWords - startWordCountRef.current);
      setWpm(elapsed > 0 ? Math.round(wordsTyped / elapsed) : 0);
    }, 2000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // ── Keystroke handler ─────────────────────────────────────────────────────

  const handleKeyDown = useCallback(() => {
    setEdits((e) => e + 1);

    // Pause detection: if gap since last keystroke > threshold, count a pause
    const now = Date.now();
    if (now - lastKeystrokeRef.current > PAUSE_THRESHOLD_MS) {
      setPauses((p) => p + 1);
    }
    lastKeystrokeRef.current = now;

    // Reset pause timer
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    pauseTimerRef.current = setTimeout(() => {
      // After threshold, next keystroke will count as resuming from pause
      lastKeystrokeRef.current = 0;
    }, PAUSE_THRESHOLD_MS);
  }, []);

  // ── Paste handler ─────────────────────────────────────────────────────────

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
    setPastes((p) => p + 1);
    setPasteDetected(true);
    setTimeout(() => setPasteDetected(false), 2000);
  }, []);

  // ── Save formatting state to file data ─────────────────────────────────────

  useEffect(() => {
    const files = loadFiles();
    if (files[fileId]) {
      files[fileId].font = font;
      files[fileId].fontSize = fontSize;
      files[fileId].textColor = textColor;
      files[fileId].bgColor = bgColor;
      files[fileId].customColor = customColor;
      files[fileId].customBg = customBg;
      saveFiles(files);
    }
  }, [font, fontSize, textColor, bgColor, customColor, customBg, fileId]);

  // ── Save scroll position to file data ──────────────────────────────────────

  useEffect(() => {
    const handleScroll = () => {
      if (editorRef.current) {
        const files = loadFiles();
        if (files[fileId]) {
          files[fileId].scrollPosition = editorRef.current.scrollTop;
          saveFiles(files);
        }
      }
    };

    const editor = editorRef.current;
    if (editor) {
      editor.addEventListener("scroll", handleScroll);
      return () => {
        editor.removeEventListener("scroll", handleScroll);
      };
    }
  }, [fileId]);

  // ── Save session ──────────────────────────────────────────────────────────

  const handleSaveSession = useCallback(async () => {
    const content = editorRef.current?.innerHTML || "";
    const words = countWords(content);
    const chars = countChars(content);
    const elapsed = (Date.now() - sessionStartRef.current) / 1000;
    const elapsedMin = elapsed / 60;
    const wordsTyped = Math.max(0, words - startWordCountRef.current);
    const finalWpm = elapsedMin > 0 ? Math.round(wordsTyped / elapsedMin) : 0;

    const session: Session = {
      id: `${Date.now()}`,
      timestamp: Date.now(),
      words,
      chars,
      edits,
      pastes,
      wpm: finalWpm,
      pauses,
      duration: Math.round(elapsed),
      content,
    };

    // Update localStorage
    const updated: FileData = {
      ...fileData,
      content,
      sessions: [...(fileData.sessions || []), session],
      lastModified: Date.now(),
      // Preserve formatting state
      font,
      fontSize,
      textColor,
      bgColor,
      customColor,
      customBg,
      scrollPosition: editorRef.current?.scrollTop || 0,
    };

    const files = loadFiles();
    files[fileId] = updated;
    saveFiles(files);
    setFileData(updated);

    // Also save content to database
    try {
      await api.patch(`/api/documents/${fileId}/content`, { content });
    } catch (error) {
      console.error("Failed to save content to database:", error);
      setToastMessage({
        message: "Failed to save session to database",
        type: "error",
      });
      return;
    }

    // Reset session counters
    setEdits(0);
    setPastes(0);
    setPauses(0);
    setWpm(0);
    sessionStartRef.current = Date.now();
    startWordCountRef.current = words;
    setToastMessage({
      message: "Session saved successfully!",
      type: "success",
    });
  }, [
    fileData,
    fileId,
    edits,
    pastes,
    pauses,
    font,
    fontSize,
    textColor,
    bgColor,
    customColor,
    customBg,
  ]);

  // ── Ctrl+S save session handler ────────────────────────────────────────────

  useEffect(() => {
    const handleKeyboardShortcut = (e: KeyboardEvent) => {
      // Ctrl+S (or Cmd+S on Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        void handleSaveSession();
      }
    };

    window.addEventListener("keydown", handleKeyboardShortcut);
    return () => {
      window.removeEventListener("keydown", handleKeyboardShortcut);
    };
  }, [handleSaveSession]);

  // ── Toolbar commands ───────────────────────────────────────────────────────

  const exec = (cmd: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
  };

  const applyFont = (f: string) => {
    setFont(f);
    exec("fontName", f);
  };

  const applySize = (s: number) => {
    setFontSize(s);
    // execCommand fontSize uses 1-7, we map px via a workaround
    exec("fontSize", "7");
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const container = editorRef.current;
      if (container) {
        const fontEls = container.querySelectorAll('font[size="7"]');
        fontEls.forEach((el) => {
          (el as HTMLElement).removeAttribute("size");
          (el as HTMLElement).style.fontSize = `${s}px`;
        });
      }
    }
  };

  const applyTextColor = (c: string) => {
    setTextColor(c);
    exec("foreColor", c);
  };

  const applyBgColor = (c: string) => {
    setBgColor(c);
    exec("hiliteColor", c);
  };

  const applyHeading = (tag: string) => {
    exec("formatBlock", `<${tag}>`);
  };

  // ── Live stats ─────────────────────────────────────────────────────────────

  const currentContent = editorRef.current?.innerHTML || fileData.content;
  const words = countWords(currentContent);
  const chars = countChars(currentContent);
  const fontClass = FONT_CLASS_MAP[font] || styles.fontCalibri;
  const fontSizeClass = FONT_SIZE_CLASS_MAP[fontSize] || styles.fontSize14;

  // ── Overview ───────────────────────────────────────────────────────────────

  const totalWords = fileData.sessions.length
    ? fileData.sessions[fileData.sessions.length - 1].words
    : 0;
  const totalSessions = fileData.sessions.length;
  const avgWpm =
    totalSessions > 0
      ? Math.round(
          fileData.sessions.reduce((a, s) => a + s.wpm, 0) / totalSessions,
        )
      : 0;
  const totalDuration = fileData.sessions.reduce((a, s) => a + s.duration, 0);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div
        className={styles.root}
        style={{
          width: "min(85vw, calc(100vw - 2rem))",
          margin: "0 auto",
        }}
      >
        {/* ── Top Navigation ── */}
        <div className={styles.nav}>
          <div className={styles.navTabs}>
            {(["overview", "sessions", "write"] as const).map((tab) => (
              <button
                key={tab}
                className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
          {onClose && (
            <button className={styles.closeBtn} onClick={onClose}>
              ✕ Close
            </button>
          )}
        </div>

        <div className={styles.divider} />

        {/* ── Write Tab ── */}
        {activeTab === "write" && (
          <div className={styles.writeContainer}>
            {/* Status Badges */}
            <div className={styles.badges}>
              <Badge color="#4ade80" label="Keystroke capture active" />
              <Badge
                color={pasteDetected ? "#f59e0b" : "#f59e0b"}
                label={pasteDetected ? "Paste detected!" : "Paste detection on"}
                pulse={pasteDetected}
              />
              <Badge color="#4ade80" label={`WPM:  ${wpm}`} />
              <Badge color="#4ade80" label={`Pauses:  ${pauses}`} />
            </div>

            {/* Editor Card */}
            <div className={styles.editorCard}>
              {/* Toolbar Row 1 */}
              <div className={styles.toolbar}>
                {/* Font selector */}
                <select
                  className={styles.select}
                  aria-label="Font family"
                  title="Font family"
                  value={font}
                  onChange={(e) => applyFont(e.target.value)}
                >
                  {FONTS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>

                {/* Font size */}
                <select
                  className={`${styles.select} ${styles.selectSmall}`}
                  aria-label="Font size"
                  title="Font size"
                  value={fontSize}
                  onChange={(e) => applySize(Number(e.target.value))}
                >
                  {FONT_SIZES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>

                <div className={styles.toolbarSep} />

                {/* Format buttons */}
                <ToolBtn
                  label="B"
                  bold
                  onClick={() => exec("bold")}
                  title="Bold"
                />
                <ToolBtn
                  label="I"
                  italic
                  onClick={() => exec("italic")}
                  title="Italic"
                />
                <ToolBtn
                  label="U"
                  underline
                  onClick={() => exec("underline")}
                  title="Underline"
                />
                <ToolBtn
                  label="S"
                  strike
                  onClick={() => exec("strikeThrough")}
                  title="Strikethrough"
                />

                <div className={styles.toolbarSep} />

                {/* Headings */}
                <ToolBtn
                  label="H1"
                  onClick={() => applyHeading("h1")}
                  title="Heading 1"
                />
                <ToolBtn
                  label="H2"
                  onClick={() => applyHeading("h2")}
                  title="Heading 2"
                />
                <ToolBtn
                  label="H3"
                  onClick={() => applyHeading("h3")}
                  title="Heading 3"
                />
                <ToolBtn
                  label="¶"
                  onClick={() => applyHeading("p")}
                  title="Paragraph"
                />

                <div className={styles.toolbarSep} />

                {/* Align */}
                <ToolBtn
                  label="≡"
                  onClick={() => exec("justifyLeft")}
                  title="Align Left"
                />
                <ToolBtn
                  label="≡"
                  onClick={() => exec("justifyCenter")}
                  title="Center"
                  centerAlign
                />
                <ToolBtn
                  label="≡"
                  onClick={() => exec("justifyRight")}
                  title="Align Right"
                />
                <ToolBtn
                  label="≡"
                  onClick={() => exec("justifyFull")}
                  title="Justify"
                />
              </div>

              {/* Toolbar Row 2 — colors */}
              <div className={`${styles.toolbar} ${styles.toolbarCompact}`}>
                {/* Text color */}
                <div className={styles.colorGroup}>
                  <div
                    className={`${styles.colorSwatch} ${styles.colorSwatchWhite}`}
                    onClick={() => applyTextColor("#ffffff")}
                    title="White text"
                  />
                  <div
                    className={`${styles.colorSwatch} ${styles.colorSwatchAmber}`}
                    onClick={() => applyTextColor("#f59e0b")}
                    title="Amber text"
                  />
                </div>

                <div className={styles.toolbarSep} />

                {/* Custom colors */}
                <label
                  className={styles.colorPickerWrap}
                  title="Custom text color"
                >
                  <input
                    type="color"
                    value={customColor}
                    className={styles.colorInputVisible}
                    aria-label="Custom text color"
                    title="Custom text color"
                    onChange={(e) => {
                      setCustomColor(e.target.value);
                      applyTextColor(e.target.value);
                    }}
                  />
                </label>

                <label
                  className={styles.colorPickerWrap}
                  title="Custom highlight color"
                >
                  <input
                    type="color"
                    value={customBg}
                    className={styles.colorInputVisible}
                    aria-label="Custom highlight color"
                    title="Custom highlight color"
                    onChange={(e) => {
                      setCustomBg(e.target.value);
                      applyBgColor(e.target.value);
                    }}
                  />
                </label>

                <div className={styles.toolbarSep} />

                {/* List / indent */}
                <ToolBtn
                  label="• —"
                  onClick={() => exec("insertUnorderedList")}
                  title="Bullet List"
                />
                <ToolBtn
                  label="1."
                  onClick={() => exec("insertOrderedList")}
                  title="Numbered List"
                />
                <ToolBtn
                  label="→"
                  onClick={() => exec("indent")}
                  title="Indent"
                />
                <ToolBtn
                  label="←"
                  onClick={() => exec("outdent")}
                  title="Outdent"
                />
                <ToolBtn label="⎌" onClick={() => exec("undo")} title="Undo" />
                <ToolBtn label="⎋" onClick={() => exec("redo")} title="Redo" />
              </div>

              {/* Editable Area */}
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                className={`${styles.editorArea} ${fontClass} ${fontSizeClass}`}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                spellCheck
              />

              {/* Footer */}
              <div className={styles.footer}>
                <div className={styles.footerStats}>
                  <StatItem label="Words:" value={words} tone="muted" />
                  <StatItem label="Chars:" value={chars} tone="muted" />
                  <StatItem label="Edits:" value={edits} tone="accent" />
                  <StatItem label="Pastes:" value={pastes} tone="muted" />
                </div>
                <button className={styles.saveBtn} onClick={handleSaveSession}>
                  Save session
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Sessions Tab ── */}
        {activeTab === "sessions" && (
          <div className={styles.tabContent}>
            <h2 className={styles.sectionTitle}>
              Writing Sessions — {fileData.name}
            </h2>
            {fileData.sessions.length === 0 ? (
              <p className={styles.emptyMsg}>
                No sessions saved yet. Write something and click "Save session".
              </p>
            ) : (
              <div className={styles.sessionList}>
                {[...fileData.sessions].reverse().map((s, i) => (
                  <div key={s.id} className={styles.sessionCard}>
                    <div className={styles.sessionHeader}>
                      <span className={styles.sessionNum}>
                        Session #{fileData.sessions.length - i}
                      </span>
                      <span className={styles.sessionDate}>
                        {new Date(s.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className={styles.sessionStats}>
                      <SessionStat label="Words" value={s.words} />
                      <SessionStat label="Chars" value={s.chars} />
                      <SessionStat label="Edits" value={s.edits} />
                      <SessionStat label="Pastes" value={s.pastes} />
                      <SessionStat label="WPM" value={s.wpm} accent />
                      <SessionStat label="Pauses" value={s.pauses} />
                      <SessionStat
                        label="Duration"
                        value={`${Math.round(s.duration / 60)}m ${s.duration % 60}s`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Overview Tab ── */}
        {activeTab === "overview" && (
          <div className={styles.tabContent}>
            <h2 className={styles.sectionTitle}>Overview — {fileData.name}</h2>
            <div className={styles.overviewGrid}>
              <OverviewCard
                label="Total Sessions"
                value={totalSessions}
                icon="📝"
              />
              <OverviewCard label="Total Words" value={totalWords} icon="📖" />
              <OverviewCard label="Avg WPM" value={avgWpm} icon="⚡" accent />
              <OverviewCard
                label="Total Write Time"
                value={`${Math.floor(totalDuration / 60)}m ${totalDuration % 60}s`}
                icon="⏱️"
              />
              <OverviewCard
                label="Last Modified"
                value={new Date(fileData.lastModified).toLocaleDateString()}
                icon="📅"
              />
              <OverviewCard label="File Name" value={fileName} icon="📄" />
            </div>

            {fileData.sessions.length > 1 && (
              <>
                <h3 className={styles.sectionTitleSmall}>WPM Over Sessions</h3>
                <div className={styles.chart}>
                  <WpmChart sessions={fileData.sessions} />
                </div>
              </>
            )}
          </div>
        )}
      </div>
      {toastMessage && (
        <Toast
          message={toastMessage.message}
          type={toastMessage.type}
          onClose={() => setToastMessage(null)}
        />
      )}
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Badge({
  color,
  label,
  pulse,
}: {
  color: string;
  label: string;
  pulse?: boolean;
}) {
  const dotToneClass = color === "#f59e0b" ? styles.dotAmber : styles.dotGreen;
  const pulseClass = pulse ? styles.dotPulse : "";

  return (
    <div className={styles.badge}>
      <span className={`${styles.dot} ${dotToneClass} ${pulseClass}`} />
      <span className={styles.badgeLabel}>{label}</span>
    </div>
  );
}

function ToolBtn({
  label,
  onClick,
  bold,
  italic,
  underline,
  strike,
  title,
  centerAlign,
}: {
  label: string;
  onClick: () => void;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  title?: string;
  centerAlign?: boolean;
}) {
  const className = [
    styles.toolBtn,
    bold ? styles.toolBtnBold : "",
    italic ? styles.toolBtnItalic : "",
    underline ? styles.toolBtnUnderline : "",
    strike ? styles.toolBtnStrike : "",
    centerAlign ? styles.toolBtnCenter : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={className} onClick={onClick} title={title}>
      {label}
    </button>
  );
}

function StatItem({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone: "muted" | "accent";
}) {
  const toneClass =
    tone === "accent" ? styles.statItemAccent : styles.statItemMuted;

  return (
    <span className={`${styles.statItem} ${toneClass}`}>
      {label} <strong className={styles.statItemValue}>{value}</strong>
    </span>
  );
}

function SessionStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
}) {
  return (
    <div className={styles.sessionStat}>
      <div
        className={`${styles.sessionStatVal} ${accent ? styles.textAccent : styles.textDefault}`}
      >
        {value}
      </div>
      <div className={styles.sessionStatLabel}>{label}</div>
    </div>
  );
}

function OverviewCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number | string;
  icon: string;
  accent?: boolean;
}) {
  return (
    <div className={styles.overviewCard}>
      <div className={styles.overviewIcon}>{icon}</div>
      <div
        className={`${styles.overviewValue} ${accent ? styles.textAccent : styles.textDefault}`}
      >
        {value}
      </div>
      <div className={styles.overviewLabel}>{label}</div>
    </div>
  );
}

function WpmChart({ sessions }: { sessions: Session[] }) {
  const max = Math.max(...sessions.map((s) => s.wpm), 1);
  return (
    <>
      {sessions.map((s, i) => {
        const barHeight = Math.max(4, Math.round((s.wpm / max) * 100));
        const y = 100 - barHeight;

        return (
          <div key={s.id} className={styles.chartBarWrap}>
            <svg
              className={styles.chartSvg}
              viewBox="0 0 32 100"
              role="img"
              aria-label={`Session ${i + 1}: ${s.wpm} WPM`}
            >
              <rect
                x="0"
                y={y}
                width="32"
                height={barHeight}
                className={styles.chartBarRect}
                rx="4"
                ry="4"
              />
            </svg>
            <span className={styles.chartLabel}>{i + 1}</span>
          </div>
        );
      })}
    </>
  );
}

// ── Wrapper component that reads query parameters ──────────────────────────

export default function FileOpen() {
  const [searchParams] = useSearchParams();
  const fileId = searchParams.get("fileId");
  const fileName = searchParams.get("fileName");

  // If fileId or fileName are not provided, show an error
  if (!fileId || !fileName) {
    return (
      <div className={styles.root}>
        <div className={styles.nav}>
          <div className={styles.navTabs} />
        </div>
        <div className={styles.divider} />
        <div className={styles.tabContent}>
          <h2 className={styles.sectionTitle}>Error</h2>
          <p className={styles.emptyMsg}>
            No file specified. Please select a file from the files list.
          </p>
        </div>
      </div>
    );
  }

  return <Editor fileId={fileId} fileName={fileName} />;
}
