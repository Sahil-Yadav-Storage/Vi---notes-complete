import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";

type VerificationData = {
  analytics?: {
    approximateWpmVariance?: number;
    pauseFrequency?: number;
    editRatio?: number;
    pasteRatio?: number;
    totalInsertedChars?: number;
    totalDeletedChars?: number;
    finalChars?: number;
    totalPastedChars?: number;
    pauseCount?: number;
    durationMs?: number;
    textAnalysis?: {
      avgSentenceLength?: number;
      sentenceVariance?: number;
      lexicalDiversity?: number;
      totalWords?: number;
      totalSentences?: number;
    };
    authenticity?: {
      score?: number;
      label?: string;
    };
    flags?: {
      type?: string;
      message?: string;
    }[];
  };
  createdAt?: string;
};

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:3001";

const fmt = (value: unknown, digits = 2) =>
  typeof value === "number" && Number.isFinite(value)
    ? value.toFixed(digits)
    : "N/A";

const fint = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString()
    : "N/A";

const fdur = (value: unknown) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "N/A";
  const totalSeconds = Math.max(0, Math.round(value / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}m ${s}s`;
};

export default function VerifyPage() {
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const [data, setData] = useState<VerificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      setError("Missing session id");
      return;
    }

    let cancelled = false;

    const fetchData = async () => {
      try {
        const res = await api.get(`/api/sessions/verify/${sessionId}`);
        if (cancelled) return;
        setData(res.data.data ?? null);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setError("Could not load verification data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchData();
    const interval = setInterval(fetchData, 2000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [sessionId]);

  const analytics = data?.analytics;
  const score = analytics?.authenticity?.score;
  const hasAnalytics = !!analytics;

  const scoreColor =
    typeof score === "number"
      ? score > 70
        ? "text-green-400"
        : score > 40
          ? "text-yellow-400"
          : "text-red-400"
      : "text-[var(--text-muted)]";

  const openPdf = () => {
    if (!sessionId) return;
    window.open(
      `${API_BASE_URL}/api/sessions/verify/${sessionId}/pdf`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
        <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-6 py-4 text-sm text-[var(--text-muted)]">
            Loading verification report...
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
        <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6">
          <Card className="w-full max-w-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold">Verification Report</h1>
                  <p className="mt-2 text-sm text-[var(--text-muted)]">
                    {error ?? "No report data found."}
                  </p>
                </div>
                <Button onClick={() => navigate(-1)}>Go back</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const scoreValue = typeof score === "number" ? score : 0;
  const label = analytics?.authenticity?.label ?? "Unknown";

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="mx-auto w-full max-w-6xl px-6 py-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
              ViNotes
            </p>
            <h1 className="mt-2 text-3xl font-bold">Verification Report</h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Session: {sessionId}
            </p>
          </div>

          <div className="flex gap-3">
            <Button onClick={openPdf}>Download PDF</Button>
            <Button variant="secondary" onClick={() => navigate(-1)}>
              Back
            </Button>
          </div>
        </div>

        <Card className="mb-6">
          <CardContent className="flex flex-wrap items-center justify-between gap-6 p-6">
            <div>
              <p className="text-sm text-[var(--text-muted)]">
                Authenticity Score
              </p>
              <h2 className={`mt-1 text-5xl font-bold ${scoreColor}`}>
                {hasAnalytics ? scoreValue : "N/A"}
              </h2>
            </div>

            <Badge className="rounded-full px-4 py-2 text-base">
              {hasAnalytics ? label : "Waiting for data"}
            </Badge>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card><CardContent className="p-5"><p className="text-sm text-[var(--text-muted)]">WPM Variance</p><p className="mt-2 text-2xl font-semibold">{hasAnalytics ? fmt(analytics?.approximateWpmVariance) : "N/A"}</p></CardContent></Card>
          <Card><CardContent className="p-5"><p className="text-sm text-[var(--text-muted)]">Pause Frequency</p><p className="mt-2 text-2xl font-semibold">{hasAnalytics ? fmt(analytics?.pauseFrequency) : "N/A"}</p></CardContent></Card>
          <Card><CardContent className="p-5"><p className="text-sm text-[var(--text-muted)]">Edit Ratio</p><p className="mt-2 text-2xl font-semibold">{hasAnalytics ? fmt(analytics?.editRatio) : "N/A"}</p></CardContent></Card>
          <Card><CardContent className="p-5"><p className="text-sm text-[var(--text-muted)]">Paste Ratio</p><p className="mt-2 text-2xl font-semibold">{hasAnalytics ? fmt(analytics?.pasteRatio) : "N/A"}</p></CardContent></Card>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card><CardContent className="p-5"><p className="text-sm text-[var(--text-muted)]">Total Inserted Chars</p><p className="mt-2 text-2xl font-semibold">{hasAnalytics ? fint(analytics?.totalInsertedChars) : "N/A"}</p></CardContent></Card>
          <Card><CardContent className="p-5"><p className="text-sm text-[var(--text-muted)]">Total Deleted Chars</p><p className="mt-2 text-2xl font-semibold">{hasAnalytics ? fint(analytics?.totalDeletedChars) : "N/A"}</p></CardContent></Card>
          <Card><CardContent className="p-5"><p className="text-sm text-[var(--text-muted)]">Total Pasted Chars</p><p className="mt-2 text-2xl font-semibold">{hasAnalytics ? fint(analytics?.totalPastedChars) : "N/A"}</p></CardContent></Card>
          <Card><CardContent className="p-5"><p className="text-sm text-[var(--text-muted)]">Session Time</p><p className="mt-2 text-2xl font-semibold">{hasAnalytics ? fdur(analytics?.durationMs) : "N/A"}</p></CardContent></Card>
        </div>

        <Separator className="my-6" />

        <div className="grid gap-4 md:grid-cols-2">
          <Card><CardContent className="p-5"><p className="text-sm text-[var(--text-muted)]">Sentence Variance</p><p className="mt-2 text-2xl font-semibold">{hasAnalytics ? fmt(analytics?.textAnalysis?.sentenceVariance) : "N/A"}</p><p className="mt-2 text-sm text-[var(--text-muted)]">Avg sentence length: {hasAnalytics ? fmt(analytics?.textAnalysis?.avgSentenceLength) : "N/A"}</p></CardContent></Card>
          <Card><CardContent className="p-5"><p className="text-sm text-[var(--text-muted)]">Vocabulary</p><p className="mt-2 text-2xl font-semibold">{hasAnalytics ? fint(analytics?.textAnalysis?.lexicalDiversity) : "N/A"}</p><p className="mt-2 text-sm text-[var(--text-muted)]">Total words: {hasAnalytics ? fint(analytics?.textAnalysis?.totalWords) : "N/A"}</p></CardContent></Card>
        </div>

        <Card className="mt-6">
          <CardContent className="p-5">
            <h3 className="text-lg font-semibold">Flags</h3>
            <div className="mt-4 space-y-3">
              {analytics?.flags?.length ? (
                analytics.flags.map((flag, index) => (
                  <div key={`${flag.type ?? "flag"}-${index}`} className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300">
                    ⚠ {flag.message ?? "Flag raised"}
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-3 text-sm text-green-300">
                  No suspicious behavior detected
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="mt-6 text-sm text-[var(--text-muted)]">
          Created: {data.createdAt ? new Date(data.createdAt).toLocaleString() : "N/A"}
        </p>
      </div>
    </div>
  );
}
