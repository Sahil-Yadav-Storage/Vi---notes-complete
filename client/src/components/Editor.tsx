import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api";
import { useKeystrokeLogger } from "../hooks/useKeystrokeLogger";
import type { CloseSessionResponse, SessionUpsertInput } from "@shared/session";
import Toast from "./Toast";

const DEBOUNCE_MS = 500;

const Editor = () => {
  const [text, setText] = useState("");
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const {
    handleKeyDown,
    handleKeyUp,
    logPaste,
    logTextChange,
    flushKeystrokes,
  } = useKeystrokeLogger();

  const sessionIdRef = useRef<string | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isClosingRef = useRef(false);
  const hasClosedRef = useRef(false);
  const closeSessionRef = useRef<() => Promise<void>>(async () => {});

  const ensureSession = useCallback(
    async (initialKeystrokes: ReturnType<typeof flushKeystrokes>) => {
      if (sessionIdRef.current) return sessionIdRef.current;

      if (initialKeystrokes.length === 0) {
        return null;
      }

      const payload: SessionUpsertInput = {
        keystrokes: initialKeystrokes,
      };

      const res = await api.post("/api/session", payload);

      sessionIdRef.current = res.data.sessionId;
      return sessionIdRef.current;
    },
    [],
  );

  const syncToServer = useCallback(
    async (pendingKeystrokes: ReturnType<typeof flushKeystrokes>) => {
      if (pendingKeystrokes.length === 0) {
        return;
      }

      try {
        if (!sessionIdRef.current) {
          await ensureSession(pendingKeystrokes);
          return;
        }

        const payload: SessionUpsertInput = {
          keystrokes: pendingKeystrokes,
        };

        await api.patch(`/api/session/${sessionIdRef.current}`, payload);
      } catch (err) {
        console.error(err);
        setToast({ message: "Failed to sync session.", type: "error" });
      }
    },
    [ensureSession],
  );

  const flushAndSync = useCallback(async () => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }

    const pending = flushKeystrokes();
    await syncToServer(pending);
  }, [flushKeystrokes, syncToServer]);

  const closeCurrentSession = useCallback(async () => {
    if (isClosingRef.current || hasClosedRef.current) {
      return;
    }

    isClosingRef.current = true;
    try {
      await flushAndSync();

      const id = sessionIdRef.current;
      if (!id) {
        hasClosedRef.current = true;
        return;
      }

      const response = await api.post<CloseSessionResponse>(
        `/api/session/${id}/close`,
      );

      if (response.status === 200) {
        hasClosedRef.current = true;
      }
    } catch (err) {
      console.error(err);
    } finally {
      isClosingRef.current = false;
    }
  }, [flushAndSync]);

  useEffect(() => {
    closeSessionRef.current = closeCurrentSession;
  }, [closeCurrentSession]);

  const scheduleSync = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
      const pending = flushKeystrokes();
      syncToServer(pending);
    }, DEBOUNCE_MS);
  }, [flushKeystrokes, syncToServer]);

  useEffect(() => {
    const handlePageHide = () => {
      void closeSessionRef.current();
    };

    window.addEventListener("pagehide", handlePageHide);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      window.removeEventListener("pagehide", handlePageHide);
      void closeSessionRef.current();
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    logTextChange(text, value);
    setText(value);
    scheduleSync();
  };

  return (
    <div className="editor-wrapper">
      <textarea
        placeholder="Start writing..."
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onPaste={(e) => {
          logPaste(e);
          scheduleSync();
        }}
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default Editor;
