import React from 'react';
import { motion } from 'motion/react';
import { 
  AlertCircle, Sparkles, RefreshCcw, Workflow, BookOpen, ExternalLink, Check, Copy,
  Search, Filter, X
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

const Sparkline: React.FC<{ data: number[]; steps: string[] }> = ({ data, steps }) => {
  const cleanData = data.map(val => {
    const num = Number(val);
    return isNaN(num) || !isFinite(num) ? 0 : num;
  });

  if (cleanData.length === 0) return null;
  const height = 28;
  const width = 140;
  const padding = 2;
  const max = Math.max(...cleanData, 1);
  const min = Math.min(...cleanData, 0);
  const range = (max - min) || 1;

  const points = cleanData.map((val, index) => {
    const x = padding + (index / Math.max(cleanData.length - 1, 1)) * (width - padding * 2);
    const y = height - (padding + ((val - min) / range) * (height - padding * 2));
    const safeX = isNaN(x) || !isFinite(x) ? 0 : x;
    const safeY = isNaN(y) || !isFinite(y) ? 0 : y;
    return `${safeX},${safeY}`;
  }).join(' ');

  return (
    <div className="flex flex-col items-center space-y-1 select-none">
      <span className="text-[8px] text-slate-500 font-extrabold uppercase tracking-widest">Latency Sparkline</span>
      <div className="flex items-center gap-1.5">
        <span className="text-[7.5px] font-mono text-slate-500">{min}ms</span>
        <svg width={width} height={height} className="overflow-visible">
          {cleanData.length > 1 && (
            <path
              d={`M ${padding},${height} L ${points} L ${width - padding},${height} Z`}
              className="fill-sky-500/10"
            />
          )}
          {cleanData.length > 1 ? (
            <polyline
              fill="none"
              stroke="#0ea5e9"
              strokeWidth="1.25"
              points={points}
            />
          ) : (
            <circle cx={width / 2} cy={height / 2} r="2" fill="#0ea5e9" />
          )}
          {cleanData.map((val, idx) => {
            const x = padding + (idx / Math.max(cleanData.length - 1, 1)) * (width - padding * 2);
            const y = height - (padding + ((val - min) / range) * (height - padding * 2));
            const safeX = isNaN(x) || !isFinite(x) ? 0 : x;
            const safeY = isNaN(y) || !isFinite(y) ? 0 : y;
            return (
              <circle
                key={idx}
                cx={safeX}
                cy={safeY}
                r="1.75"
                className="fill-sky-400 stroke-slate-950 stroke-[0.75px] hover:r-3.5 transition-all cursor-crosshair"
              >
                <title>{`Step ${idx + 1} (${steps[idx] || 'Step'}): ${val}ms`}</title>
              </circle>
            );
          })}
        </svg>
        <span className="text-[7.5px] font-mono text-sky-400 font-bold">{max}ms</span>
      </div>
    </div>
  );
};

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
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'completed' | 'failed' | 'simulated'>('all');
  const [minDuration, setMinDuration] = React.useState<number>(0);
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  // Filter logs dynamically
  const filteredLogs = React.useMemo(() => {
    return runLogs.filter((log) => {
      // 1. Status/Simulated Filter
      if (statusFilter === 'completed' && log.status !== 'completed') return false;
      if (statusFilter === 'failed' && log.status !== 'failed') return false;
      if (statusFilter === 'simulated' && !log.simulated) return false;

      // 2. Minimum Duration Filter
      if (minDuration > 0 && (log.duration || 0) < minDuration) return false;

      // 3. Text Query Search (title, inputs, outputs, nodeId)
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const titleMatch = log.nodeTitle.toLowerCase().includes(q);
        const inputMatch = log.input ? log.input.toLowerCase().includes(q) : false;
        const outputMatch = log.output ? log.output.toLowerCase().includes(q) : false;
        const ragMatch = log.ragQuery ? log.ragQuery.toLowerCase().includes(q) : false;
        const idMatch = log.nodeId.toLowerCase().includes(q);

        return titleMatch || inputMatch || outputMatch || ragMatch || idMatch;
      }

      return true;
    });
  }, [runLogs, statusFilter, minDuration, searchQuery]);

  // Escape special regex characters
  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  // Helper to highlight matching text queries inside pre/code blocks safely
  const highlightText = (text: string | undefined, query: string) => {
    if (!text) return '';
    if (!query.trim()) return text;

    const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-sky-500/35 text-sky-200 rounded px-0.5 border-b border-sky-400/50">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

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
          {/* Search & Filtering Panel */}
          <div className="bg-slate-900/85 border border-slate-800 p-3.5 rounded-xl space-y-3 shadow-md">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder={currentLang === 'ru' ? "Поиск по логам, шагам, входам..." : currentLang === 'zh' ? "搜索日志、输入、输出..." : "Search steps, inputs, outputs..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-8 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500/50 transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                  showAdvanced || minDuration > 0
                    ? 'bg-sky-500/10 border-sky-500/30 text-sky-400'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-305'
                }`}
              >
                <Filter size={12} />
                <span>{currentLang === 'ru' ? 'Фильтры' : currentLang === 'zh' ? '筛选' : 'Filters'}</span>
                {minDuration > 0 && <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>}
              </button>
            </div>

            {/* Quick Status / Categories Selector */}
            <div className="flex flex-wrap gap-1.5 text-[10.5px]">
              {(['all', 'completed', 'failed', 'simulated'] as const).map((filter) => {
                const count = runLogs.filter((log) => {
                  if (filter === 'all') return true;
                  if (filter === 'completed') return log.status === 'completed';
                  if (filter === 'failed') return log.status === 'failed';
                  if (filter === 'simulated') return log.simulated;
                  return true;
                }).length;

                return (
                  <button
                    key={filter}
                    onClick={() => setStatusFilter(filter)}
                    className={`px-2.5 py-1 rounded-md font-bold border transition-all cursor-pointer ${
                      statusFilter === filter
                        ? 'bg-sky-500/10 border-sky-500/30 text-sky-400'
                        : 'bg-slate-950 border-slate-850 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <span className="capitalize">
                      {filter === 'all' 
                        ? (currentLang === 'ru' ? 'Все' : currentLang === 'zh' ? '全部' : 'All')
                        : filter === 'completed'
                        ? (currentLang === 'ru' ? 'Завершено' : currentLang === 'zh' ? '已完成' : 'Completed')
                        : filter === 'failed'
                        ? (currentLang === 'ru' ? 'Ошибка' : currentLang === 'zh' ? '失败' : 'Failed')
                        : (currentLang === 'ru' ? 'Симуляция' : currentLang === 'zh' ? '模拟' : 'Simulated')}
                    </span>
                    <span className="ml-1.5 px-1 py-0.2 bg-slate-900 rounded text-[9px] text-slate-400">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Collapsible Advanced Filters (Duration Slider) */}
            {showAdvanced && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="pt-2.5 border-t border-slate-850 space-y-2 text-xs"
              >
                <div className="space-y-1.5">
                  <div className="flex justify-between text-slate-400 text-[10.5px]">
                    <span className="font-medium">
                      {currentLang === 'ru' ? 'Минимальная длительность:' : currentLang === 'zh' ? '最小执行时间:' : 'Min Duration:'}
                    </span>
                    <span className="font-mono text-sky-400 font-bold">{minDuration} ms</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="10000"
                      step="100"
                      value={minDuration}
                      onChange={(e) => setMinDuration(Number(e.target.value))}
                      className="flex-1 h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-sky-500"
                    />
                    {minDuration > 0 && (
                      <button
                        onClick={() => setMinDuration(0)}
                        className="text-[10px] text-slate-500 hover:text-slate-300 underline font-bold"
                      >
                        {currentLang === 'ru' ? 'Сброс' : currentLang === 'zh' ? '重置' : 'Reset'}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Success Summary Header Status Card */}
          <div className="bg-emerald-950/25 border border-emerald-900/45 p-3 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm shadow-emerald-950/10">
            <div>
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block">Status Completed</span>
              <span className="text-xs text-slate-400 block pt-0.5">Engine executed successfully.</span>
            </div>

            {/* Sparkline Latency Metric */}
            <div className="bg-slate-950/45 px-3 py-1.5 rounded-xl border border-slate-900 flex items-center justify-center self-stretch sm:self-auto shrink-0">
              <Sparkline 
                data={runLogs.map(log => log.duration || 0)} 
                steps={runLogs.map(log => log.nodeTitle)} 
              />
            </div>

            <div className="text-left sm:text-right">
              <span className="text-[10px] text-slate-400 block leading-tight">Total Duration</span>
              <span className="text-lg font-bold text-emerald-300 font-mono tracking-wide">
                {totalDuration} ms
              </span>
            </div>
          </div>

          {/* Step Cards Progress Map */}
          <div className="relative border-l-2 border-slate-800 ml-3 pl-5 space-y-5">
            {filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-12 text-slate-500 bg-slate-950/20 rounded-xl border border-dashed border-slate-850">
                <Workflow size={24} className="text-slate-700 mb-2" />
                <p className="text-xs font-bold text-slate-400">
                  {currentLang === 'ru' ? 'Шаги не найдены' : currentLang === 'zh' ? '未找到匹配的日志' : 'No matching logs found'}
                </p>
                <p className="text-[10px] text-slate-500 mt-1 max-w-xs leading-relaxed">
                  {currentLang === 'ru' ? 'Попробуйте изменить параметры поискового запроса или настройки фильтрации.' : currentLang === 'zh' ? '请尝试调整搜索字词或筛选器。' : 'Try adjusting your search query or filters to locate specific execution outputs.'}
                </p>
              </div>
            ) : (
              filteredLogs.map((log) => {
                // Find original index inside complete runLogs array to keep step numbers constant
                const originalIndex = runLogs.findIndex((l) => l.nodeId === log.nodeId);
                const stepNum = originalIndex !== -1 ? originalIndex + 1 : 1;

                return (
                  <div key={log.nodeId} className="relative">
                    {/* Visual Timeline Marker Node */}
                    <span className="absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full border bg-slate-900 flex items-center justify-center border-sky-400 shadow shadow-sky-400/50"></span>
                    
                    <div className="bg-slate-950/60 border border-slate-850/50 rounded-xl p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-100 flex items-center gap-2">
                          Step {stepNum}: {highlightText(log.nodeTitle, searchQuery)}
                          {log.simulated && (
                            <span className="text-[9px] font-extrabold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/25 px-1.5 py-0.5 rounded">
                              Simulated
                            </span>
                          )}
                        </span>
                        <span className="text-[9px] font-mono text-sky-400 bg-sky-950/30 px-1.5 py-0.5 rounded border border-sky-950">
                          {log.duration}ms
                        </span>
                      </div>

                      {log.input && (
                        <div className="space-y-1">
                          <span className="text-[9px] font-extrabold text-slate-500 uppercase">Input block</span>
                          <pre className="text-[10.5px] font-mono bg-slate-900/60 border border-slate-850 text-slate-400 p-2 rounded-lg max-h-24 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                            {highlightText(log.input, searchQuery)}
                          </pre>
                        </div>
                      )}

                      {log.output && (
                        <div className="space-y-1">
                          <span className="text-[9px] font-extrabold text-slate-500 uppercase">Output block</span>
                          <pre className="text-[10.5px] font-mono bg-slate-900 border border-slate-850 text-slate-200 p-2.5 rounded-lg max-h-52 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                            {highlightText(log.output, searchQuery)}
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
                              {highlightText(log.ragQuery, searchQuery)}
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
                                  <p className="text-[10px] text-slate-300 leading-relaxed max-h-16 overflow-y-auto whitespace-pre-wrap">
                                    {highlightText(chunk.text, searchQuery)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Search Grounding citations renderer */}
                      {log.groundingSources && (
                        <div className="space-y-1 bg-slate-900/30 border border-emerald-955 p-2 rounded-lg mt-2">
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
                );
              })
            )}
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
