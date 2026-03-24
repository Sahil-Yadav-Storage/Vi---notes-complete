import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom"; // Removed useNavigate
import { Button } from "../components/ui/button";
import Toast from "../components/Toast";
import Editor from "../components/Editor";
import { SessionProvider } from "../contexts/SessionContext";
import { useDocument } from "../hooks/useDocument";

const SAVE_DEBOUNCE_MS = 700;

// 1. Define the shape of the analytics data we expect
interface AnalyticsData {
  aiProbability: number;
  wordCount: number;
  suggestions: string[];
}

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
  
  // 2. New states for the overlay and analytics data
  const [isSubmitting, setIsSubmitting] = useState(false); 
  const [showOverlay, setShowOverlay] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ... (Keep your existing useEffects for opening and auto-saving the document) ...
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
        if (cancelled) return;
        setContent(opened.document.content);
        setOpenedSessionId(opened.sessionId);
      } catch {
        if (cancelled) return;
        setOpenError("Unable to open the selected file.");
      } finally {
        if (!cancelled) setIsOpening(false);
      }
    })();

    return () => { cancelled = true; };
  }, [documentId, openDocument]);

  useEffect(() => {
    if (!documentId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

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

  // 3. Updated Submit Handler: Opens overlay and fetches data
  const handleSubmitForAiCheck = async () => {
    if (!documentId || !content.trim()) return; 

    setIsSubmitting(true);
    setOpenError(null);
    setShowOverlay(true);          // Open the overlay immediately
    setIsAnalyticsLoading(true);   // Start the loading state in the overlay

    try {
      // Force save the latest content first
      await updateDocumentContent(documentId, content);

      // Fetch the analytics data from your backend
      const response = await fetch(`/api/analytics/${documentId}`);
      if (!response.ok) throw new Error("Failed to fetch analytics");
      
      const data: AnalyticsData = await response.json();
      setAnalyticsData(data); // Set the data to be displayed in the overlay

    } catch (error) {
      setOpenError("Unable to complete AI check. Please try again.");
      setShowOverlay(false); // Close overlay on error
    } finally {
      setIsSubmitting(false);
      setIsAnalyticsLoading(false);
    }
  };

  if (!documentId) {
    return (
      <section className="dashboard-page">
        {/* ... (Keep your existing empty state code here) ... */}
        <div className="dashboard-empty-state">
          <h2>No file selected</h2>
          <Button asChild><Link to="/files">Go to Files</Link></Button>
        </div>
      </section>
    );
  }

  return (
    <section className="dashboard-page relative"> {/* Added relative positioning */}
      <div className="dashboard-headline">
        <h1>Writing Dashboard</h1>
        
        <Button 
          onClick={handleSubmitForAiCheck} 
          disabled={isSubmitting || !content.trim()}
        >
          {isSubmitting ? "Checking..." : "Check AI & View Analytics"}
        </Button>
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
        <Toast message={openError} type="error" onClose={() => setOpenError(null)} />
      )}

      {/* 4. THE STYLISH OVERLAY (MODAL) */}
      {showOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-2xl w-full mx-4 relative">
            
            {/* Close Button */}
            <button 
              onClick={() => setShowOverlay(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 font-bold text-xl"
            >
              &times;
            </button>

            <h2 className="text-2xl font-bold mb-6">Document Analytics</h2>

            {isAnalyticsLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-500">Our AI is analyzing your text...</p>
              </div>
            ) : analyticsData ? (
              <div className="grid gap-6 md:grid-cols-2">
                <div className="p-4 border rounded-lg bg-gray-50">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">AI Probability</h3>
                  <p className="text-3xl font-bold text-blue-600">{analyticsData.aiProbability}%</p>
                </div>
                
                <div className="p-4 border rounded-lg bg-gray-50">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Word Count</h3>
                  <p className="text-3xl font-bold text-gray-800">{analyticsData.wordCount}</p>
                </div>

                <div className="md:col-span-2 p-4 border rounded-lg bg-gray-50">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Suggestions</h3>
                  <ul className="list-disc pl-5 space-y-2 text-gray-700">
                    {analyticsData.suggestions.map((suggestion, index) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <p className="text-red-500">Something went wrong loading the data.</p>
            )}

            <div className="mt-8 flex justify-end">
              <Button onClick={() => setShowOverlay(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default DashboardPage;