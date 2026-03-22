import { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { SessionSummary, AuthenticityReport } from '../types/session';
import { History, ChevronDown, ChevronUp, AlertTriangle, ShieldCheck, Loader2, X, Activity, Info } from 'lucide-react';

export default function SessionHistory() {
  const [isOpen, setIsOpen] = useState(false);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [selectedSession, setSelectedSession] = useState<SessionSummary | null>(null);
  const [reportData, setReportData] = useState<AuthenticityReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const loadSessions = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.getSessions();
      setSessions(data as SessionSummary[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && sessions.length === 0) {
      loadSessions();
    }
  }, [isOpen]);

  const handleSessionClick = async (session: SessionSummary) => {
    setSelectedSession(session);
    setReportData(null);
    setReportLoading(true);
    try {
      const data = await api.getReport(session._id);
      setReportData(data as AuthenticityReport);
    } catch (err) {
      console.error('Failed to load report', err);
    } finally {
      setReportLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedSession(null);
    setReportData(null);
  };

  return (
    <div className="mt-12 border-t border-slate-800/60 pt-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <History className="w-5 h-5 text-indigo-400" />
          Session History
        </h3>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-sm font-semibold text-slate-400 hover:text-indigo-400 transition-colors flex items-center gap-1"
        >
          {isOpen ? 'Hide History' : 'View Past Sessions'}
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isOpen && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
          {loading ? (
            <div className="flex items-center justify-center p-8 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              Loading history...
            </div>
          ) : error ? (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-xl">
              <p className="text-slate-500">No past sessions found. Start writing to save history!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {sessions.map((session) => {
                const score = session.report?.confidenceScore ?? 0;
                const isSuspicious = session.report?.label === 'Suspicious' || score < 0.5;

                return (
                  <div
                    key={session._id}
                    className="overflow-hidden bg-slate-900/40 border border-slate-800 rounded-xl hover:border-slate-700 transition-all cursor-pointer group"
                    onClick={() => handleSessionClick(session)}
                  >
                    <div className="p-4 flex items-center justify-between gap-4">
                      
                      {/* Text Snippet */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-300 font-medium truncate group-hover:text-indigo-300 transition-colors">
                           {session.text ? session.text : <span className="text-slate-600 italic">Empty text</span>}
                        </p>
                        <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-3">
                          <span>{new Date(session.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                          <span>•</span>
                          <span>{session.textLength} chars</span>
                        </p>
                      </div>

                      {/* Score Badge */}
                      {session.report && (
                        <div className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border ${
                          isSuspicious
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}>
                          {isSuspicious ? <AlertTriangle className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                          {Math.round(score * 100)}%
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between p-5 bg-slate-900/95 backdrop-blur border-b border-slate-800">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-bold text-white">Session Details</h2>
                {selectedSession.report && (
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border ${
                    (selectedSession.report.label === 'Suspicious' || selectedSession.report.confidenceScore < 0.5)
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  }`}>
                    {Math.round(selectedSession.report.confidenceScore * 100)}% — {selectedSession.report.label}
                  </span>
                )}
              </div>
              <button onClick={closeModal} className="p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-8">
              {/* Full Text */}
              <section>
                <p className="text-xs uppercase tracking-widest font-semibold text-slate-500 mb-3">Written Content</p>
                <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800 text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                  {selectedSession.text || <span className="text-slate-600 italic">No content.</span>}
                </div>
              </section>

              {/* Data Loading */}
              {reportLoading ? (
                <div className="flex items-center justify-center py-8 text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  Loading analysis data...
                </div>
              ) : reportData ? (
                <>
                  {/* Flags Section */}
                  {reportData.flags && reportData.flags.length > 0 && (
                     <section>
                       <p className="text-xs uppercase tracking-widest font-semibold text-slate-500 mb-3 flex items-center gap-2">
                         <AlertTriangle className="w-3.5 h-3.5" /> Behavioral Flags
                       </p>
                       <div className="space-y-2">
                         {reportData.flags.map((idx, i) => {
                           const flagStr = String(idx);
                           const isHigh = flagStr.includes('[HIGH]');
                           const isMed = flagStr.includes('[MEDIUM]');
                           const badgeColor = isHigh ? 'bg-rose-500/20 text-rose-400' : isMed ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700/50 text-slate-400';
                           const severityMatch = flagStr.match(/\[(.*?)\]/);
                           const severity = severityMatch ? severityMatch[1] : 'INFO';
                           const message = flagStr.replace(/\[.*?\]\s*/, '');

                           return (
                             <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-slate-950/40 border border-slate-800">
                               <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${badgeColor}`}>
                                 {severity}
                               </span>
                               <p className="text-sm text-slate-300">{message}</p>
                             </div>
                           );
                         })}
                       </div>
                     </section>
                  )}

                  {/* Metrics Grid */}
                  {reportData.metrics && (
                    <section>
                      <p className="text-xs uppercase tracking-widest font-semibold text-slate-500 mb-3 flex items-center gap-2">
                         <Activity className="w-3.5 h-3.5" /> Extracted Metrics
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {Object.entries(reportData.metrics)
                          .filter(([key]) => !key.startsWith('_'))
                          .map(([key, value]) => (
                            <div key={key} className="p-3 bg-slate-950/40 border border-slate-800 rounded-lg">
                              <p className="text-[10px] uppercase font-semibold text-slate-500 mb-1 truncate">
                                {key.replace(/([A-Z])/g, ' $1').trim()}
                              </p>
                              <p className="text-sm font-mono text-slate-200">
                                {typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(3) : value}
                              </p>
                            </div>
                        ))}
                      </div>
                    </section>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center py-8 text-slate-500 gap-2">
                  <Info className="w-5 h-5" />
                  No extra report data available.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
