import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "../components/ui/button";
import Toast from "../components/Toast";
import Editor from "../components/Editor";
import { SessionProvider } from "../contexts/SessionContext";
import { useDocument } from "../hooks/useDocument";

const SAVE_DEBOUNCE_MS = 700;

const DashboardPage = () => {
  const [searchParams] = useSearchParams();
  const documentId = searchParams.get("documentId");

  const { openDocument, updateDocumentContent } = useDocument({
    autoLoad: false,
  });

  const [isOpening, setIsOpening] = useState(false);
  const [content, setContent] = useState("");
  const [openedSessionId, setOpenedSessionId] = useState<string | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!documentId) {
      setContent("");
      setOpenedSessionId(null);
      setOpenError(null);
      return;
    }

    let cancelled = false;
    setIsOpening(true);
    setOpenError(null);

    void (async () => {
      try {
        const opened = await openDocument(documentId);
        if (cancelled) {
          return;
        }

        setContent(opened.document.content);
        setOpenedSessionId(opened.sessionId);
      } catch {
        if (cancelled) {
          return;
        }

        setOpenError("Unable to open the selected file.");
      } finally {
        if (!cancelled) {
          setIsOpening(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [documentId, openDocument]);

  useEffect(() => {
    if (!documentId) {
      return;
    }

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      void updateDocumentContent(documentId, content).catch(() => {
        setOpenError("Unable to save your latest changes.");
      });
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [content, documentId, updateDocumentContent]);

  if (!documentId) {
    return (
      <section className="dashboard-page">
        <div className="dashboard-headline">
          <h1>Writing Dashboard</h1>
          <p>
            Capture typing behavior and continue editing your notes seamlessly.
          </p>
        </div>

        <div className="dashboard-empty-state">
          <h2>No file selected</h2>
          <p>
            Open a file from Files or create your first one to start writing.
          </p>
          <Button asChild>
            <Link to="/files">Go to Files</Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="dashboard-page">
      <div className="dashboard-headline">
        <h1>Writing Dashboard</h1>
        <p>
          Capture typing behavior and continue editing your notes seamlessly.
        </p>
      </div>

      {isOpening ? (
        <div className="loading-card">Opening file...</div>
      ) : (
        <SessionProvider
          key={documentId}
          activeDocumentId={documentId}
          initialSessionId={openedSessionId}
        >
          <Editor value={content} onChange={setContent} />
        </SessionProvider>
      )}

      {openError && (
        <Toast
          message={openError}
          type="error"
          onClose={() => setOpenError(null)}
        />
      )}
    </section>
  );
};

export default DashboardPage;
