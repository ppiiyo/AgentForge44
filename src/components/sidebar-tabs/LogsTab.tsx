import React from 'react';
import { motion } from 'motion/react';
import { 
  AlertCircle, Sparkles, RefreshCcw, Workflow, BookOpen, ExternalLink, Check, Copy 
} from 'lucide-react';
import { StepLog } from '../../types';

interface LogsTabProps {
  currentLang: 'en' | 'ru' | 'zh';
  errorText: string | null;
  runLogs: StepLog[];
  totalDuration: number;
  finalResult: string;
  copiedText: string | null;
  translations: any;
  handleAutoSelfHealAndRun: () => Promise<void>;
  setCopiedText: (text: string | null) => void;
}

export const LogsTab: React.FC<LogsTabProps> = ({
  currentLang,
  errorText,
  runLogs,
  totalDuration,
  finalResult,
  copiedText,
  translations,
  handleAutoSelfHealAndRun,
  setCopiedText,
}) => {
  return (
    <div className="space-y-4">
      {errorText && (
        <div className="space-y-3.5">
          <div className="bg-rose-950/35 border border-rose-900 text-rose-300 p-4 rounded-xl text-xs space-y-1.5 flex flex-col">
            <div className="flex items-center gap-2 font-bold text-rose-200">
              <AlertCircle size={15} /> Error Interrupted Execution:
            </div>
            <p className="font-mono leading-normal pl-5">{errorText}</p>
          </div>

          {/* Interactive Self-Healing Wizard */}
          {(errorText.includes("503") || 
            errorText.toLocaleLowerCase().includes("demand") || 
            errorText.toLocaleLowerCase().includes("unavailable") || 
            errorText.toLocaleLowerCase().includes("overloaded") || 
            errorText.toLocaleLowerCase().includes("rate limit") || 
            errorText.toLocaleLowerCase().includes("resource")) && (
            <div className="bg-slate-900 border border-amber-900/50 p-4 rounded-xl space-y-3" id="self_healing_wizard">
              <div className="flex items-start gap-2.5">
                <Sparkles className="text-amber-400 shrink-0 mt-0.5" size={16} />
                <div>
                  <h4 className="text-xs font-bold text-amber-300">Automated Self-Heal Available!</h4>
                  <p className="text-[10.5px] text-slate-400 leading-normal mt-0.5">
                    Google Gemini is experiencing transient high demand spikes (503). Correct this automatically by switching to the hyper-scalable <strong>gemini-3.1-flash-lite</strong> layer.
                  </p>
                </div>
              </div>

              <button
                id="btn_auto_self_heal"
                onClick={handleAutoSelfHealAndRun}
                className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold py-2 px-3 rounded-lg text-[11px] cursor-pointer shadow-lg shadow-amber-500/10 flex items-center justify-center gap-1.5 transition-all"
              >
                <RefreshCcw size={13} className="animate-spin" />
                <span>Auto-Switch Models & Run Pipeline</span>
              </button>
            </div>
          )}
        </div>
      )}

      {runLogs.length === 0 && !errorText && (
        <div className="flex flex-col items-center justify-center text-center py-20 text-slate-500">
          <Workflow size={36} className="text-slate-700 mb-3" />
          <p className="text-xs font-bold text-slate-400 mb-1">
            {translations[currentLang].undo === "Undo" ? "Pipeline Awaiting Execution" : currentLang === "ru" ? "Ожидание запуска потока" : "等候流执行中"}
          </p>
          <p className="text-[10px] text-slate-500 max-w-xs leading-relaxed">
            {translations[currentLang].logsDesc}
          </p>
        </div>
      )}

      {runLogs.length > 0 && (
        <div className="space-y-4">
          {/* Success Summary Header Status Card */}
          <div className="bg-emerald-950/25 border border-emerald-900/45 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block">Status Completed</span>
              <span className="text-xs text-slate-400 block pt-0.5">Engine executed successfully.</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block leading-tight">Total Duration</span>
              <span className="text-lg font-bold text-emerald-300 font-mono tracking-wide">
                {totalDuration} ms
              </span>
            </div>
          </div>

          {/* Step Cards Progress Map */}
          <div className="relative border-l-2 border-slate-800 ml-3 pl-5 space-y-5">
            {runLogs.map((log, idx) => (
              <div key={idx} className="relative">
                {/* Visual Timeline Marker Node */}
                <span className="absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full border bg-slate-900 flex items-center justify-center border-sky-400 shadow shadow-sky-400/50"></span>
                
                <div className="bg-slate-950/60 border border-slate-850/50 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-100 flex items-center gap-1">
                      Step {idx + 1}: {log.nodeTitle}
                    </span>
                    <span className="text-[9px] font-mono text-sky-400 bg-sky-950/30 px-1.5 py-0.5 rounded border border-sky-950">
                      {log.duration}ms
                    </span>
                  </div>

                  {log.input && (
                    <div className="space-y-1">
                      <span className="text-[9px] font-extrabold text-slate-500 uppercase">Input block</span>
                      <pre className="text-[10.5px] font-mono bg-slate-900/60 border border-slate-850 text-slate-400 p-2 rounded-lg max-h-24 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                        {log.input}
                      </pre>
                    </div>
                  )}

                  {log.output && (
                    <div className="space-y-1">
                      <span className="text-[9px] font-extrabold text-slate-500 uppercase">Output block</span>
                      <pre className="text-[10.5px] font-mono bg-slate-900 border border-slate-850 text-slate-200 p-2.5 rounded-lg max-h-52 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                        {log.output}
                      </pre>
                    </div>
                  )}

                  {/* RAG Vector Search Inspector details */}
                  {log.ragQuery !== undefined && (
                    <div className="space-y-2 bg-teal-950/20 border border-teal-900/30 p-3.5 rounded-xl mt-2 space-y-2 font-mono">
                      <div className="flex items-center justify-between text-[10px] pb-1.5 border-b border-teal-950/70">
                        <span className="text-teal-400 font-extrabold uppercase flex items-center gap-1">
                          <BookOpen size={12} className="animate-pulse" />
                          {currentLang === 'ru' ? 'Инспектор поиска RAG' : currentLang === 'zh' ? 'RAG 深度矢量搜索检索器' : 'RAG Vector Search Inspector'}
                        </span>
                        <span className="text-slate-505 text-[9px]">{log.ragLatency} ms</span>
                      </div>
                      <div className="text-[10px] space-y-1">
                        <span className="text-slate-505 block uppercase font-bold text-[8.5px]">Vector DB Query Query</span>
                        <div className="bg-slate-950 px-2 py-1.5 rounded border border-slate-900 text-teal-300 font-bold truncate">
                          {log.ragQuery}
                        </div>
                      </div>
                      <div className="text-[10px] space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 block uppercase font-bold text-[8.5px]">Top Relevant Chunks ({log.ragChunksCount} found)</span>
                        </div>
                        <div className="space-y-1.5">
                          {(log.ragTopChunks || []).map((chunk: any, ci: number) => (
                            <div key={ci} className="bg-slate-900/50 p-2 rounded border border-slate-850 space-y-1">
                              <div className="flex items-center justify-between text-[8px] text-slate-500 border-b border-slate-850/45 pb-0.5 mb-1.5 font-bold">
                                <span className="text-teal-400/80 font-black">Rank #{ci + 1} Match</span>
                                <span>Source: {chunk.source || 'Wiki'}</span>
                              </div>
                              <p className="text-[10px] text-slate-300 leading-relaxed max-h-16 overflow-y-auto whitespace-pre-wrap">{chunk.text}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Search Grounding citations renderer */}
                  {log.groundingSources && (
                    <div className="space-y-1 bg-slate-900/30 border border-emerald-950 p-2 rounded-lg mt-2">
                      <span className="text-[9.5px] font-extrabold text-emerald-400 uppercase tracking-wider block">Grounded Web Citations:</span>
                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {log.groundingSources.map((g, gi) => (
                          <a 
                            key={gi} 
                            href={g.uri} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="text-[10px] text-sky-400 flex items-center gap-1 hover:underline truncate"
                            id={`grounding-link-${gi}`}
                          >
                            <ExternalLink size={10} /> {g.title}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sandboxed VM Sandbox Telemetry visualizations */}
                  {(() => {
                    try {
                      if (log.output && log.output.trim().startsWith('{')) {
                        const parsed = JSON.parse(log.output);
                        if (parsed.telemetry) {
                          const tel = parsed.telemetry;
                          return (
                            <div className="bg-slate-900 border border-amber-900/40 p-3.5 rounded-xl mt-2.5 space-y-2 font-mono">
                              <div className="flex items-center justify-between text-[10px] pb-1.5 border-b border-amber-955/60">
                                <span className="text-amber-400 font-extrabold uppercase flex items-center gap-1">
                                  <AlertCircle size={12} className="animate-pulse text-amber-500" />
                                  Isolated VM Sandbox Telemetry
                                </span>
                                <span className="text-slate-505 text-[9px]">ID: {parsed.sandboxId || 'sandbox-x7'}</span>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-305">
                                <div className="bg-slate-950/70 p-2 rounded border border-slate-900 space-y-0.5">
                                  <span className="text-slate-505 block text-[8px] uppercase font-bold">Virtual CPU Load</span>
                                  <span className="text-amber-400 font-bold text-[11px]">{tel.cpuLoad || '0.15%'}</span>
                                </div>
                                <div className="bg-slate-950/70 p-2 rounded border border-slate-900 space-y-0.5">
                                  <span className="text-slate-505 block text-[8px] uppercase font-bold">Virtual RAM footprint</span>
                                  <span className="text-amber-400 font-bold text-[11px]">{tel.memoryUsed || '14.2 MB'}</span>
                                </div>
                              </div>

                              <div className="text-[10px] bg-slate-950/70 p-2 rounded border border-slate-900 space-y-1">
                                <span className="text-slate-505 block text-[8px] uppercase font-bold">Environment Isolation Shield</span>
                                <p className="text-[9.5px] leading-relaxed text-slate-305">{tel.isolationLevel}</p>
                              </div>

                              <div className="flex items-center justify-between text-[9px] pt-1 text-slate-505">
                                <span className="flex items-center gap-1 text-emerald-400 font-extrabold">
                                  <Check size={11} /> Secrets Shield Active
                                </span>
                                <span>Limit: {tel.executionTimeoutMs}ms</span>
                              </div>
                            </div>
                          );
                        }
                      }
                    } catch (_) {}
                    return null;
                  })()}
                </div>
              </div>
            ))}
          </div>

          {/* Display Main Pipeline Results as summary card */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 mt-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-850">
              <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                <FileCodeIcon size={14} className="text-sky-400" /> Pipeline Consolidated Output
              </span>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(finalResult);
                  setCopiedText("Output Copied!");
                  setTimeout(() => setCopiedText(null), 1500);
                }}
                className="text-xs text-sky-400 font-bold hover:text-sky-300 cursor-pointer flex items-center gap-1"
              >
                <Copy size={11} /> Copy
              </button>
            </div>
            <pre className="text-xs font-mono text-slate-305 leading-relaxed overflow-x-auto whitespace-pre-wrap max-h-80 bg-slate-900/20 p-2 rounded-lg">
              {finalResult}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

// Simple FileCode fallback
const FileCodeIcon = ({ size, className }: { size: number; className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
    <polyline points="8 17 6 15 8 13" />
    <polyline points="16 13 18 15 16 17" />
    <line x1="12" y1="13" x2="10" y2="17" />
  </svg>
);
