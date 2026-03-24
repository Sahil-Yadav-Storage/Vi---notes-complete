import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import Toast from "../components/Toast";

// Define the shape of the data we expect from the backend
interface AnalyticsData {
  aiProbability: number;
  wordCount: number;
  suggestions: string[];
}

const AnalyticsPage = () => {
  const [searchParams] = useSearchParams();
  const documentId = searchParams.get("documentId");
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    // If there is no documentId in the URL, stop loading
    if (!documentId) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const fetchAnalytics = async () => {
      try {
        // Call the new backend endpoint we are creating below
        const response = await fetch(`/api/analytics/${documentId}`);
        
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }

        const data: AnalyticsData = await response.json();

        if (!cancelled) {
          setAnalyticsData(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError("Failed to load analytics data. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void fetchAnalytics();

    // Cleanup function
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  if (!documentId) {
    return (
      <section className="analytics-page p-8">
        <div className="analytics-empty-state text-center space-y-4">
          <h2 className="text-2xl font-bold">No Document Selected</h2>
          <p>Please select a document from your dashboard to view its analytics.</p>
          <Button onClick={() => navigate("/")}>Back to Dashboard</Button>
        </div>
      </section>
    );
  }

  return (
    <section className="analytics-page p-8 max-w-4xl mx-auto">
      <div className="analytics-header flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Document Analytics</h1>
        <Button variant="outline" onClick={() => navigate(`/?documentId=${documentId}`)}>
          &larr; Back to Editor
        </Button>
      </div>

      {isLoading ? (
        <div className="loading-card p-6 border rounded-lg text-center">
          Analyzing document...
        </div>
      ) : analyticsData ? (
        <div className="analytics-content grid gap-6 md:grid-cols-2">
          
          <div className="metric-card p-6 border rounded-lg bg-white shadow-sm">
            <h3 className="text-lg font-semibold text-gray-600 mb-2">AI Generation Probability</h3>
            <p className="text-4xl font-bold text-blue-600">{analyticsData.aiProbability}%</p>
          </div>
          
          <div className="metric-card p-6 border rounded-lg bg-white shadow-sm">
            <h3 className="text-lg font-semibold text-gray-600 mb-2">Word Count</h3>
            <p className="text-4xl font-bold text-gray-800">{analyticsData.wordCount}</p>
          </div>

          <div className="suggestions-list p-6 border rounded-lg bg-white shadow-sm md:col-span-2">
            <h3 className="text-lg font-semibold text-gray-600 mb-4">Writing Suggestions</h3>
            <ul className="list-disc pl-5 space-y-2">
              {analyticsData.suggestions.map((suggestion, index) => (
                <li key={index} className="text-gray-700">{suggestion}</li>
              ))}
            </ul>
          </div>

        </div>
      ) : null}

      {error && (
        <Toast
          message={error}
          type="error"
          onClose={() => setError(null)}
        />
      )}
    </section>
  );
};

export default AnalyticsPage;