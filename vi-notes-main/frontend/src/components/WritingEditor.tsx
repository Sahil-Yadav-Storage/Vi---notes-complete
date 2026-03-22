import { useState } from 'react';
import { useKeystrokeTracker } from '../hooks/useKeystrokeTracker';
import { usePasteDetector } from '../hooks/usePasteDetector';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import AuthenticityReport from './AuthenticityReport';
import SessionHistory from './SessionHistory';
import type { SessionPayload, AuthenticityReport as ReportType } from '../types/session';
import { 
  Keyboard, 
  Delete, 
  Timer, 
  Activity, 
  ClipboardPaste, 
  FileText, 
  Loader2,
  LogOut,
  AlertTriangle
} from 'lucide-react';

export default function WritingEditor() {
  const { user, logout } = useAuth();
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [report, setReport] = useState<ReportType | null>(null);

  const { events, stats, handleKeyDown, reset, sessionStartRef } = useKeystrokeTracker();
  const { pasteEvents, pasteCount, totalPastedChars, handlePaste, resetPaste } = usePasteDetector(sessionStartRef);

  const combinedStats = {
    ...stats,
    pasteCount,
    totalPastedChars,
  };

  const handleSave = async () => {
    if (events.length === 0 && pasteEvents.length === 0) {
      setMessage({ type: 'error', text: 'Nothing to save — start typing first.' });
      return;
    }

    setSaving(true);
    setMessage(null);
    setReport(null);

    const payload: SessionPayload = {
      events: [...events, ...pasteEvents].sort((a, b) => a.timestamp - b.timestamp),
      stats: combinedStats,
      textLength: text.length,
      text,
    };

    try {
      const data = await api.saveSession(payload);
      setMessage({ type: 'success', text: `Analysis complete.` });
      setReport(data.report as ReportType);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      setMessage({ type: 'error', text: `Failed to analyze: ${errMsg}` });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setText('');
    reset();
    resetPaste();
    setMessage(null);
    setReport(null);
  };

  const metrics = [
    { label: 'Keystrokes', value: combinedStats.totalKeystrokes, icon: Keyboard, warn: false },
    { label: 'Backspaces', value: combinedStats.totalBackspaces, icon: Delete, warn: false },
    { label: 'Pauses (>1s)', value: combinedStats.totalPauses, icon: Timer, warn: false },
    { label: 'Speed (cpm)', value: combinedStats.avgTypingSpeed, icon: Activity, warn: false },
    { label: 'Pastes', value: pasteCount, icon: ClipboardPaste, warn: pasteCount > 0 },
    { label: 'Pasted Chars', value: totalPastedChars, icon: FileText, warn: totalPastedChars > 0 },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-indigo-500/30">
      {/* Top Bar */}
      <header className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-indigo-600 bg-clip-text text-transparent">
              Vi-Notes
            </h1>
            <p className="text-xs font-medium tracking-wide text-slate-500 uppercase hidden sm:block">
              Authenticity Verification
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"></div>
              <span className="text-sm text-slate-400 font-medium">
                {user?.name}
              </span>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-800/50 hover:bg-slate-700/80 border border-slate-700/50 rounded-lg transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        
        {/* Editor Area */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-b from-indigo-500/20 to-purple-500/20 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition duration-500"></div>
          <textarea
            id="writing-editor"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            rows={10}
            placeholder="Start typing your document here. Keystroke timing and behavioral patterns will be analyzed..."
            className="relative w-full p-6 bg-slate-900 border border-slate-700/50 rounded-xl text-slate-200 placeholder-slate-500 text-lg leading-relaxed resize-y focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-xl transition-all font-sans"
            spellCheck="false"
          />
        </div>

        {/* Live Status Board */}
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-4">Live Metrics</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {metrics.map((stat) => {
              const Icon = stat.icon;
              return (
                <div 
                  key={stat.label} 
                  className={`relative overflow-hidden bg-slate-900/50 border rounded-xl p-4 transition-all duration-300 ${
                    stat.warn 
                      ? 'border-amber-500/30 bg-amber-500/5' 
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-4 h-4 ${stat.warn ? 'text-amber-500' : 'text-slate-500'}`} />
                    <p className="text-[0.65rem] font-medium uppercase tracking-wider text-slate-400 truncate">
                      {stat.label}
                    </p>
                  </div>
                  <p className={`text-2xl font-semibold tabular-nums tracking-tight ${
                    stat.warn ? 'text-amber-400' : 'text-slate-200'
                  }`}>
                    {stat.value.toLocaleString()}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mt-8 items-center justify-between border-t border-slate-800/60 pt-6">
          <div className="flex-1 w-full">
            {/* Paste Warning Banner */}
            {pasteCount > 0 && (
              <div className="flex items-center gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-sm animate-in zoom-in-95 font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Detected {pasteCount} paste event{pasteCount > 1 ? 's' : ''} ({totalPastedChars} total characters appended)
              </div>
            )}
            
            {message && message.type === 'error' && (
              <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm animate-in fade-in">
                {message.text}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
            <button
              id="reset-btn"
              onClick={handleReset}
              disabled={saving}
              className="px-5 py-2.5 bg-transparent border border-slate-700 hover:bg-slate-800 text-slate-300 font-medium rounded-lg transition-all active:scale-[0.98] disabled:opacity-50"
            >
              Clear
            </button>
            <button
              id="save-session-btn"
              onClick={handleSave}
              disabled={saving || (events.length === 0 && pasteEvents.length === 0)}
              className="flex items-center justify-center min-w-[160px] px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_20px_rgba(79,70,229,0.5)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Analyzing
                </>
              ) : (
                'Run Analysis'
              )}
            </button>
          </div>
        </div>

        {/* Report Section */}
        {report && (
          <div className="mt-8 pt-8 border-t border-slate-800/60 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <AuthenticityReport report={report} />
          </div>
        )}

        {/* History Section */}
        <SessionHistory />
      </main>
    </div>
  );
}
