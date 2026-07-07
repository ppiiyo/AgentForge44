import React, { useState, useEffect } from 'react';
import { Play, Pause, ChevronLeft, ChevronRight, Terminal, Clock, RefreshCw, Trash2, ShieldAlert, Zap, RotateCcw } from 'lucide-react';
import { playClickSound } from '../utils/audio';

interface Snapshot {
  nodeId: string;
  nodeTitle: string;
  timestamp: string;
  input: any;
  output: any;
  duration: number;
}

interface DebugSession {
  id: string;
  timestamp: string;
  snapshots: Snapshot[];
}

interface AsyncPipelineRun {
  id: string;
  graphId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  stepCount: number;
  error?: string | null;
  createdAt: string;
  updatedAt: string;
  logsCount: number;
}

interface TimeTravelDebuggerProps {
  currentLang: 'en' | 'ru' | 'zh';
  onHighlightNode: (nodeId: string | null) => void;
  onSetDryRunOutput: (output: Record<string, string>) => void;
  nodes: any[];
  connections: any[];
}

export function TimeTravelDebugger({ currentLang, onHighlightNode, onSetDryRunOutput, nodes, connections }: TimeTravelDebuggerProps) {
  const [sessions, setSessions] = useState<DebugSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionDetails, setSessionDetails] = useState<DebugSession | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);

  // Phase 2 Async Checkpoint Queue State
  const [activeTabSub, setActiveTabSub] = useState<'sync' | 'async'>('sync');
  const [asyncRuns, setAsyncRuns] = useState<AsyncPipelineRun[]>([]);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [pollingRunId, setPollingRunId] = useState<string | null>(null);
  const [resumingRunId, setResumingRunId] = useState<string | null>(null);

  const t = {
    en: {
      title: "Micro-Step Visual Debugger",
      desc: "Replay past workflow runs step-by-step. Inspect exact variable bindings, node inputs, model prompts, and real-time execution outputs with time-travel.",
      sessionsHeader: "Recent Session Runs",
      noSessions: "No debug traces logged from pipeline runs yet. Start workflow runs to gather snapshot traces.",
      stepInput: "Step Inputs & Arguments",
      stepOutput: "Node Real-time Output",
      duration: "Calculated Latency",
      stepIndex: "Trace step",
      clearAll: "Clear sessions history",
      playSpeed: "Autoplay step by step",
      diagnostics: "Live Debug Snapshots",
      asyncTab: "Checkpoint Queue",
      syncTab: "In-Memory Traces",
      runStatus: "Status",
      resumeBtn: "Resume Failpoint",
      resuming: "Resuming...",
      polling: "Executing...",
      failPoint: "Failed Checkpoint Detour",
      noRuns: "No queued execution runs yet.",
      clearRuns: "Clear queue history"
    },
    ru: {
      title: "Визуальный дебаггер",
      desc: "Пошагово проигрывайте историю выполнения графа. Проверяйте точное состояние переменных, входы и выходы каждого модуля с эффектом перемещения во времени.",
      sessionsHeader: "Прошлые запуски",
      noSessions: "Запуски не зарегистрированы. Нажмите 'Запустить поток', чтобы увидеть отладочные снимки.",
      stepInput: "Параметры и входы шага",
      stepOutput: "Вывод модуля на шаге",
      duration: "Задержка шага",
      stepIndex: "Шаг выполнения",
      clearAll: "Очистить историю отладки",
      playSpeed: "Автопроигрывание шагов",
      diagnostics: "Диагностика во времени",
      asyncTab: "Очередь контрольных точек",
      syncTab: "Трассировки памяти",
      runStatus: "Статус",
      resumeBtn: "Продолжить работу",
      resuming: "Восстановление...",
      polling: "Выполняется...",
      failPoint: "Ошибка на контрольной точке",
      noRuns: "Нет запущенных отложенных потоков.",
      clearRuns: "Очистить историю очереди"
    },
    zh: {
      title: "微步时间巡航调试器 (Time-Travel)",
      desc: "逐帧重放或反向回滚过去任何一次工作流执行。瞬时提取对应节点在各微步绑定的输入参数、提示词及大模型返回结果。",
      sessionsHeader: "历史运行跟踪 (Traces)",
      noSessions: "当前尚未捕获到任何工作流执行快照。点击顶部'运行工作流'编译启动后自动存储单步性能追踪。",
      stepInput: "当前步骤输入明细",
      stepOutput: "节点输出结果 (Output)",
      duration: "当前帧计算耗时",
      stepIndex: "运行跟踪帧",
      clearAll: "清空调试记录点",
      playSpeed: "全自动循迹重播",
      diagnostics: "时间流跟踪实录",
      asyncTab: "断点控制台队列",
      syncTab: "内存堆栈追踪",
      runStatus: "当前状态",
      resumeBtn: "断点处唤醒恢复",
      resuming: "正在重连恢复...",
      polling: "异步编译运行中...",
      failPoint: "断点异常拦截",
      noRuns: "暂未发现队列后台进程。",
      clearRuns: "清空后台进程历史"
    }
  }[currentLang];

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/debug/sessions');
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
        if (data.length > 0 && !activeSessionId && activeTabSub === 'sync') {
          // Select newest run by default
          loadSessionDetails(data[0].id);
        }
      }
    } catch (e) {
      console.error("Failed to load debug sessions", e);
    } finally {
      setLoading(false);
    }
  };

  const loadSessionDetails = async (id: string) => {
    setActiveSessionId(id);
    setActiveRunId(null);
    setLoading(true);
    try {
      const response = await fetch(`/api/debug/sessions/${id}`);
      if (response.ok) {
        const data = await response.json();
        setSessionDetails(data);
        setCurrentStepIndex(0);
        setIsPlaying(false);
        // Highlight first node
        if (data.snapshots && data.snapshots.length > 0) {
          onHighlightNode(data.snapshots[0].nodeId);
          updateDryRunPreview(data.snapshots[0]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Phase 2 Async Runs lists fetcher
  const fetchAsyncRuns = async () => {
    try {
      const response = await fetch('/api/runs', {
        headers: { 'Authorization': 'Bearer forge_production_admin_token' }
      });
      if (response.ok) {
        const data = await response.json();
        setAsyncRuns(data);
        if (data.length > 0 && !activeRunId && activeTabSub === 'async') {
          loadAsyncRunDetails(data[0].id);
        }
      }
    } catch (e) {
      console.error("Failed to load async checkpoint runs", e);
    }
  };

  const loadAsyncRunDetails = async (runId: string) => {
    setActiveRunId(runId);
    setActiveSessionId(null);
    setLoading(true);
    try {
      const response = await fetch(`/api/runs/${runId}`, {
        headers: { 'Authorization': 'Bearer forge_production_admin_token' }
      });
      if (response.ok) {
        const data = await response.json();
        
        // Convert step execution logs to snapshots
        const snapshots: Snapshot[] = (data.logs || []).map((l: any, idx: number) => ({
          nodeId: l.nodeId,
          nodeTitle: l.nodeTitle || `Node ${idx + 1}`,
          timestamp: new Date().toISOString(),
          input: l.input || {},
          output: l.output || "",
          duration: l.duration || 0
        }));

        setSessionDetails({
          id: data.id,
          timestamp: new Date().toISOString(),
          snapshots: snapshots
        });
        setCurrentStepIndex(0);
        setIsPlaying(false);

        if (snapshots.length > 0) {
          onHighlightNode(snapshots[0].nodeId);
          updateDryRunPreview(snapshots[0]);
        }
      }
    } catch (e) {
      console.error("Failed to fetch async run details", e);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    try {
      await fetch('/api/debug/sessions', { method: 'DELETE' });
      setSessions([]);
      setSessionDetails(null);
      setActiveSessionId(null);
      setCurrentStepIndex(0);
      setIsPlaying(false);
      onHighlightNode(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearAsyncRuns = async () => {
    try {
      await fetch('/api/runs', { 
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer forge_production_admin_token' }
      });
      setAsyncRuns([]);
      setSessionDetails(null);
      setActiveRunId(null);
      setCurrentStepIndex(0);
      setIsPlaying(false);
      onHighlightNode(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleResumeRun = async (runId: string) => {
    setResumingRunId(runId);
    try {
      const response = await fetch(`/api/runs/${runId}/resume`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer forge_production_admin_token'
        },
        body: JSON.stringify({
          nodes: nodes,
          connections: connections
        })
      });
      if (response.ok) {
        setPollingRunId(runId);
        fetchAsyncRuns();
      } else {
        const data = await response.json();
        alert(`Failed to resume pipeline execution checkpoint: ${data.error || "Unknown error"}`);
      }
    } catch (err: any) {
      console.error("Failed to resume run:", err);
      alert(`Resume operation failed: ${err.message || String(err)}`);
    } finally {
      setResumingRunId(null);
    }
  };

  useEffect(() => {
    fetchSessions();
    fetchAsyncRuns();
  }, []);

  useEffect(() => {
    if (activeTabSub === 'sync') {
      if (sessions.length > 0 && !activeSessionId) {
        loadSessionDetails(sessions[0].id);
      }
    } else {
      if (asyncRuns.length > 0 && !activeRunId) {
        loadAsyncRunDetails(asyncRuns[0].id);
      }
    }
  }, [activeTabSub]);

  // Phase 2 Async Run Polling Effect
  useEffect(() => {
    let timer: any = null;
    if (pollingRunId) {
      timer = setInterval(async () => {
        try {
          const response = await fetch(`/api/runs/${pollingRunId}`, {
            headers: { 'Authorization': 'Bearer forge_production_admin_token' }
          });
          if (response.ok) {
            const data = await response.json();
            
            // update this specific run in list
            setAsyncRuns(prev => prev.map(r => r.id === pollingRunId ? {
              ...r,
              status: data.status,
              stepCount: data.completedNodes?.length || 0,
              error: data.error
            } : r));

            if (data.status === 'completed' || data.status === 'failed') {
              setPollingRunId(null);
              loadAsyncRunDetails(pollingRunId);
              fetchAsyncRuns();
            }
          }
        } catch (e) {
          console.error("Polling run failed", e);
          setPollingRunId(null);
        }
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [pollingRunId]);

  // Sync session state to canvas node highlighting and simulator logs
  const handleStepChange = (index: number) => {
    if (!sessionDetails || !sessionDetails.snapshots || sessionDetails.snapshots.length === 0) return;
    const clampedIndex = Math.max(0, Math.min(index, sessionDetails.snapshots.length - 1));
    setCurrentStepIndex(clampedIndex);
    const snap = sessionDetails.snapshots[clampedIndex];
    onHighlightNode(snap.nodeId);
    updateDryRunPreview(snap);
    playClickSound();
  };

  const updateDryRunPreview = (snap: Snapshot) => {
    const formattedOutput = typeof snap.output === 'string' 
      ? snap.output 
      : JSON.stringify(snap.output, null, 2);
    onSetDryRunOutput({ [snap.nodeId]: formattedOutput });
  };

  // Autoplay effect
  useEffect(() => {
    let timer: any = null;
    if (isPlaying && sessionDetails && sessionDetails.snapshots) {
      timer = setInterval(() => {
        if (currentStepIndex < sessionDetails.snapshots.length - 1) {
          handleStepChange(currentStepIndex + 1);
        } else {
          setIsPlaying(false); // Stop when end reached
        }
      }, 1500);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, currentStepIndex, sessionDetails]);

  const activeStep = sessionDetails?.snapshots?.[currentStepIndex] || null;

  // Find corresponding run for active details
  const activeAsyncRun = activeRunId ? asyncRuns.find(r => r.id === activeRunId) : null;

  return (
    <div className="space-y-4" id="time_travel_debugger_outer">
      {/* Visual Sub-tabs: In-Memory Sync Traces vs Async Checkpoint Queues */}
      <div className="flex bg-slate-950/60 p-0.5 rounded-xl border border-slate-850" id="debugger_subtabs">
        <button
          type="button"
          onClick={() => setActiveTabSub('sync')}
          className={`flex-1 py-2 px-3 rounded-lg text-[10px] font-extrabold uppercase tracking-widest text-center cursor-pointer transition-all ${
            activeTabSub === 'sync'
              ? 'bg-sky-500/10 border border-sky-500/20 text-sky-400 font-black'
              : 'text-slate-500 border border-transparent hover:text-slate-300'
          }`}
        >
          {t.syncTab}
        </button>
        <button
          type="button"
          onClick={() => setActiveTabSub('async')}
          className={`flex-1 py-2 px-3 rounded-lg text-[10px] font-extrabold uppercase tracking-widest text-center cursor-pointer transition-all ${
            activeTabSub === 'async'
              ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400 font-black'
              : 'text-slate-500 border border-transparent hover:text-slate-300'
          }`}
        >
          {t.asyncTab}
        </button>
      </div>

      {/* Directory Section */}
      <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-extrabold uppercase tracking-widest text-slate-350 flex items-center gap-1.5">
            <Terminal size={12} className={activeTabSub === 'async' ? "text-amber-500 animate-pulse" : "text-sky-500 animate-pulse"} />
            {activeTabSub === 'async' ? "Background Queue Runs" : t.sessionsHeader}
          </label>
          <button
            id="btn_clear_debug_sessions"
            onClick={activeTabSub === 'async' ? handleClearAsyncRuns : handleClear}
            className="text-[9px] font-bold text-slate-550 hover:text-rose-450 uppercase flex items-center gap-1 transition-all cursor-pointer"
          >
            <Trash2 size={10} /> {activeTabSub === 'async' ? t.clearRuns : t.clearAll}
          </button>
        </div>

        {activeTabSub === 'sync' ? (
          /* Synchronous sessions list */
          sessions.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto pr-1">
              {sessions.map((sess) => (
                <button
                  id={`debug-sess-btn-${sess.id}`}
                  key={sess.id}
                  onClick={() => loadSessionDetails(sess.id)}
                  className={`py-1.5 px-3 rounded-md text-[10.5px] font-mono border flex items-center gap-1 cursor-pointer transition-all ${
                    activeSessionId === sess.id 
                      ? 'bg-sky-950/35 border-sky-900/60 text-sky-300 font-bold' 
                      : 'bg-slate-900 border-slate-850 text-slate-450 hover:text-slate-200'
                  }`}
                >
                  <Clock size={10} /> 
                  <span>Run {sess.timestamp.split('T')[1]?.slice(0, 8) || sess.id.slice(-6)}</span>
                  <span className="text-[9px] px-1 py-0.2 bg-slate-950/50 rounded text-slate-500">
                    {sess.snapshots?.length || 0}s
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-[10px] text-slate-650 p-3 italic text-center">
              {t.noSessions}
            </div>
          )
        ) : (
          /* Asynchronous queue runs list */
          asyncRuns.length > 0 ? (
            <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
              {asyncRuns.map((run) => (
                <button
                  type="button"
                  key={run.id}
                  onClick={() => loadAsyncRunDetails(run.id)}
                  className={`w-full text-left p-2.5 rounded-lg border flex flex-col gap-1 cursor-pointer transition-all ${
                    activeRunId === run.id
                      ? 'bg-amber-950/30 border-amber-800/50 text-amber-300'
                      : 'bg-slate-900 border-slate-850 text-slate-400 hover:text-slate-250'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono font-bold">
                    <span className="flex items-center gap-1">
                      <Zap size={10} className={run.status === 'running' ? 'text-amber-400 animate-bounce' : 'text-slate-500'} />
                      <span>Queue Run {run.id.slice(-8)}</span>
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-bold uppercase tracking-wider ${
                      run.status === 'completed' ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-900/40' :
                      run.status === 'failed' ? 'bg-rose-950/50 text-rose-400 border border-rose-900/40' :
                      run.status === 'running' ? 'bg-sky-950/50 text-sky-400 border border-sky-900/40' :
                      'bg-slate-950 text-slate-500'
                    }`}>
                      {run.status === 'running' || pollingRunId === run.id ? t.polling : run.status}
                    </span>
                  </div>
                  {run.error && (
                    <p className="text-[9px] text-rose-450 truncate mt-0.5 font-mono italic">
                      Err: {run.error}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-[8px] text-slate-550 font-mono mt-1 pt-1 border-t border-slate-950/50">
                    <span>{run.stepCount} nodes completed</span>
                    <span>{run.createdAt.split('T')[1]?.slice(0, 8) || 'Just now'}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-[10px] text-slate-650 p-3 italic text-center">
              {t.noRuns}
            </div>
          )
        )}
      </div>

      {sessionDetails && activeStep && (
        <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
          
          {/* Deck Player control controls */}
          <div className="bg-slate-900 border border-slate-850 rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-extrabold text-amber-400 capitalize flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 bg-amber-500 rounded-full animate-ping" />
                {activeStep.nodeTitle}
              </span>
              <span className="text-[10.5px] text-slate-500">
                {t.stepIndex}: {currentStepIndex + 1} / {sessionDetails.snapshots.length}
              </span>
            </div>

            {/* Timetravel scrub bar */}
            <input
              id="time_travel_scrubber"
              type="range"
              min={0}
              max={sessionDetails.snapshots.length - 1}
              value={currentStepIndex}
              onChange={(e) => handleStepChange(Number(e.target.value))}
              className="w-full accent-amber-550 bg-slate-950 h-1.5 rounded-lg appearance-none cursor-pointer"
            />

            {/* Deck buttons */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[9.5px] text-slate-500 font-mono font-bold uppercase tracking-wider">
                {t.playSpeed}
              </span>

              <div className="flex items-center gap-2">
                <button
                  id="btn_prev_debug_step"
                  onClick={() => handleStepChange(currentStepIndex - 1)}
                  disabled={currentStepIndex === 0}
                  className="p-1 rounded bg-slate-950 hover:bg-slate-800 disabled:opacity-30 border border-slate-850 text-slate-350 cursor-pointer"
                >
                  <ChevronLeft size={14} />
                </button>

                <button
                  id="btn_play_pause_debug"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-1.5 rounded-full bg-amber-600 hover:bg-amber-555 text-white shadow-md active:scale-95 cursor-pointer flex items-center justify-center"
                >
                  {isPlaying ? <Pause size={12} /> : <Play size={12} className="ml-0.5" />}
                </button>

                <button
                  id="btn_next_debug_step"
                  onClick={() => handleStepChange(currentStepIndex + 1)}
                  disabled={currentStepIndex === sessionDetails.snapshots.length - 1}
                  className="p-1 rounded bg-slate-950 hover:bg-slate-800 disabled:opacity-30 border border-slate-850 text-slate-355 cursor-pointer"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* If background queue run failed, show the interactive Failpoint Checkpoint Resume controls */}
          {activeAsyncRun && activeAsyncRun.status === 'failed' && (
            <div className="bg-rose-950/20 border border-rose-900/40 p-3.5 rounded-xl space-y-3">
              <div className="flex items-start gap-2">
                <ShieldAlert size={14} className="text-rose-450 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-[10px] font-black uppercase text-rose-400 tracking-wider">
                    {t.failPoint}
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-1 leading-normal font-mono">
                    {activeAsyncRun.error || "Workflow processing interrupted."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleResumeRun(activeAsyncRun.id)}
                disabled={resumingRunId === activeAsyncRun.id || pollingRunId === activeAsyncRun.id}
                className="w-full bg-amber-500 hover:bg-amber-450 text-slate-950 font-black py-2 px-3 rounded-lg text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-lg active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {resumingRunId === activeAsyncRun.id ? (
                  <>
                    <RefreshCw size={11} className="animate-spin" />
                    <span>{t.resuming}</span>
                  </>
                ) : pollingRunId === activeAsyncRun.id ? (
                  <>
                    <RefreshCw size={11} className="animate-spin" />
                    <span>{t.polling}</span>
                  </>
                ) : (
                  <>
                    <RotateCcw size={11} />
                    <span>{t.resumeBtn}</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Diagnostic values logs */}
          <div className="space-y-3">
            {/* Input logs */}
            <div className="space-y-1.5">
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-550 block">
                {t.stepInput}
              </span>
              <pre className="text-[10.5px] font-mono text-slate-300 bg-slate-900 border border-slate-850 p-2.5 rounded-lg overflow-x-auto max-h-[140px]">
                {typeof activeStep.input === 'string' 
                  ? activeStep.input 
                  : JSON.stringify(activeStep.input, null, 2)}
              </pre>
            </div>

            {/* Output logs */}
            <div className="space-y-1.5">
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-550 block">
                {t.stepOutput}
              </span>
              <pre className="text-[10.5px] font-mono text-emerald-400 bg-slate-900 border border-slate-850 p-2.5 rounded-lg overflow-x-auto max-h-[160px]">
                {typeof activeStep.output === 'string' 
                  ? activeStep.output 
                  : JSON.stringify(activeStep.output, null, 2)}
              </pre>
            </div>

            {/* Latencies metrics log */}
            <div className="flex items-center justify-between border-t border-slate-900 pt-3 text-[10.5px]">
              <span className="text-slate-500 font-bold uppercase tracking-wider">{t.duration}</span>
              <span className="font-mono text-amber-400 font-bold text-xs bg-amber-950/20 px-2 py-0.5 rounded border border-amber-950/40">
                {activeStep.duration || 0} ms
              </span>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
