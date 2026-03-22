import type { AuthenticityReport as ReportType } from '../types/session';
import { ShieldCheck, ShieldAlert, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle, Info, Activity } from 'lucide-react';
import { useState } from 'react';

interface Props {
  report: ReportType;
}

function getScoreConfig(score: number) {
  if (score >= 0.7) {
    return {
      color: 'text-emerald-400',
      bgBase: 'bg-emerald-950/30',
      bgFill: 'bg-emerald-500',
      border: 'border-emerald-500/20',
      shadow: 'shadow-[0_0_20px_rgba(16,185,129,0.15)]',
      icon: ShieldCheck,
      ring: 'ring-emerald-500/30'
    };
  }
  if (score >= 0.4) {
    return {
      color: 'text-amber-400',
      bgBase: 'bg-amber-950/30',
      bgFill: 'bg-amber-500',
      border: 'border-amber-500/20',
      shadow: 'shadow-[0_0_20px_rgba(245,158,11,0.15)]',
      icon: AlertTriangle,
      ring: 'ring-amber-500/30'
    };
  }
  return {
    color: 'text-rose-400',
    bgBase: 'bg-rose-950/30',
    bgFill: 'bg-rose-500',
    border: 'border-rose-500/20',
    shadow: 'shadow-[0_0_20px_rgba(244,63,94,0.15)]',
    icon: ShieldAlert,
    ring: 'ring-rose-500/30'
  };
}

export default function AuthenticityReport({ report }: Props) {
  const scorePercent = Math.round(report.confidenceScore * 100);
  const isSuspicious = report.label === 'Suspicious';
  const config = getScoreConfig(report.confidenceScore);
  const StatusIcon = config.icon;
  
  const [showMetrics, setShowMetrics] = useState(false);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-both">
      <div className="flex items-center gap-3 mb-2">
        <h3 className="text-xl font-bold tracking-tight text-white">Trust Analysis Results</h3>
        <div className="h-px bg-gradient-to-r from-slate-700 to-transparent flex-1" />
      </div>

      {/* Main Hero Card */}
      <div className={`relative overflow-hidden rounded-2xl border ${config.border} bg-slate-900/40 backdrop-blur-sm p-8 ${config.shadow} transition-all duration-500`}>
        {/* Background glow */}
        <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full ${config.bgFill} blur-[100px] opacity-20`} />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-8">
          
          {/* Circular/Gauge visual proxy -> Text block */}
          <div className="flex items-center gap-6">
            <div className={`flex items-center justify-center w-20 h-20 rounded-full border-4 ${config.border} bg-slate-950 ring-4 ${config.ring}`}>
              <StatusIcon className={`w-8 h-8 ${config.color}`} />
            </div>
            
            <div>
              <p className="text-sm font-semibold tracking-widest uppercase text-slate-400 mb-1">Authenticity Score</p>
              <div className="flex items-baseline gap-2">
                <span className={`text-5xl font-extrabold tracking-tighter tabular-nums ${config.color}`}>
                  {scorePercent}
                </span>
                <span className={`text-xl font-medium ${config.color} opacity-80`}>/ 100</span>
              </div>
            </div>
          </div>

          {/* Label Badge */}
          <div className="flex flex-col items-start md:items-end">
             <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold tracking-wide uppercase shadow-sm border ${
              isSuspicious
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            }`}>
              {isSuspicious ? <ShieldAlert className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
              {report.label}
            </span>
            <p className="text-sm text-slate-500 mt-3 max-w-xs md:text-right">
              {isSuspicious 
                ? 'Behavioral patterns deviate significantly from natural human typing.'
                : 'Pacing, edits, and variance strongly match human writing profiles.'}
            </p>
          </div>
        </div>

        {/* Animated Progress Bar */}
        <div className="mt-8">
          <div className="flex justify-between text-xs font-medium text-slate-500 uppercase tracking-widest mb-2 px-1">
            <span>Suspicious</span>
            <span>Human</span>
          </div>
          <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800/50 shadow-inner">
            <div 
              className={`h-full ${config.bgFill} transition-all duration-1000 ease-out`}
              style={{ width: `${scorePercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Behavioral Flags Section */}
      {report.flags && report.flags.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5" /> Found Anomalies
          </p>
          <div className="grid gap-2">
            {report.flags.map((flag, i) => {
              const isHigh = flag.includes('[HIGH]');
              const isMed = flag.includes('[MEDIUM]');
              
              const border = isHigh ? 'border-rose-500/30' : isMed ? 'border-amber-500/30' : 'border-slate-700';
              const bg = isHigh ? 'bg-rose-500/5' : isMed ? 'bg-amber-500/5' : 'bg-slate-800/30';
              const textColor = isHigh ? 'text-rose-200' : isMed ? 'text-amber-200' : 'text-slate-300';
              const badgeColor = isHigh ? 'bg-rose-500/20 text-rose-400' : isMed ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700/50 text-slate-400';

              const message = flag.replace(/\[.*?\]\s*/, '');
              const severity = flag.match(/\[(.*?)\]/)?.[1] || 'INFO';

              return (
                <div key={i} className={`flex items-start gap-3 p-4 rounded-xl border ${border} ${bg} transition-colors`}>
                  <div className="mt-0.5">
                    {isHigh ? <ShieldAlert className="w-5 h-5 text-rose-400" /> : <Info className={`w-5 h-5 ${isMed ? 'text-amber-400' : 'text-slate-400'}`} />}
                  </div>
                  <div>
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-1.5 ${badgeColor}`}>
                      {severity} SEVERITY
                    </span>
                    <p className={`text-sm tracking-wide ${textColor}`}>
                      {message}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Extracted Metrics / Deep Dive */}
      {report.metrics && (
        <div className="border border-slate-800 bg-slate-900/20 rounded-xl overflow-hidden">
          <button 
            onClick={() => setShowMetrics(!showMetrics)}
            className="w-full flex items-center justify-between p-4 bg-slate-900 hover:bg-slate-800/80 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-300">Raw Data & Deep Dive</span>
            </div>
            {showMetrics ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          
          {showMetrics && (
            <div className="p-4 border-t border-slate-800 animate-in slide-in-from-top-2 duration-200">
               {/* Model Scores */}
              {report.metrics._mlRawScore !== undefined && (
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-950/50 rounded-lg p-4 border border-slate-800/50 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400">ML Base Confidence</span>
                    <span className="text-sm font-bold text-slate-200 tabular-nums">
                      {Math.round(report.metrics._mlRawScore * 100)}%
                    </span>
                  </div>
                  <div className="bg-slate-950/50 rounded-lg p-4 border border-slate-800/50 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400">Heuristic Engine</span>
                    <span className="text-sm font-bold text-slate-200 tabular-nums">
                      {Math.round(report.metrics._heuristicBaseScore! * 100)}%
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                {Object.entries(report.metrics)
                  .filter(([key]) => !key.startsWith('_'))
                  .map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center py-2 border-b border-slate-800/50 last:border-0 last:pb-0">
                      <span className="text-xs tracking-wide text-slate-500 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <span className="text-sm font-mono text-slate-300">
                        {typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(3) : value}
                      </span>
                    </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
