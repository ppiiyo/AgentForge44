import React, { useState, useEffect } from 'react';
import { Play, Pause, ChevronLeft, ChevronRight, Terminal, Clock, RefreshCw, Trash2, ShieldAlert } from 'lucide-react';

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

interface TimeTravelDebuggerProps {
  currentLang: 'en' | 'ru' | 'zh';
  onHighlightNode: (nodeId: string | null) => void;
  onSetDryRunOutput: (output: Record<string, string>) => void;
}

export function TimeTravelDebugger({ currentLang, onHighlightNode, onSetDryRunOutput }: TimeTravelDebuggerProps) {
  const [sessions, setSessions] = useState<DebugSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionDetails, setSessionDetails] = useState<DebugSession | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);

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
      diagnostics: "Live Debug Snapshots"
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
      diagnostics: "Диагностика во времени"
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
      diagnostics: "时间流跟踪实录"
    }
  }[currentLang];

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/debug/sessions');
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
        if (data.length > 0 && !activeSessionId) {
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

  useEffect(() => {
    fetchSessions();
  }, []);

  // Sync session state to canvas node highlighting and simulator logs
  const handleStepChange = (index: number) => {
    if (!sessionDetails || !sessionDetails.snapshots || sessionDetails.snapshots.length === 0) return;
    const clampedIndex = Math.max(0, Math.min(index, sessionDetails.snapshots.length - 1));
    setCurrentStepIndex(clampedIndex);
    const snap = sessionDetails.snapshots[clampedIndex];
    onHighlightNode(snap.nodeId);
    updateDryRunPreview(snap);
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

  return (
    <div className="space-y-4" id="time_travel_debugger_outer">
      {/* Sessions history directory lists */}
      <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-extrabold uppercase tracking-widest text-slate-350 flex items-center gap-1.5">
            <Terminal size={12} className="text-amber-500 animate-pulse" />
            {t.sessionsHeader}
          </label>
          <button
            id="btn_clear_debug_sessions"
            onClick={handleClear}
            className="text-[9px] font-bold text-slate-500 hover:text-rose-450 uppercase flex items-center gap-1 transition-all cursor-pointer"
          >
            <Trash2 size={10} /> {t.clearAll}
          </button>
        </div>

        {sessions.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto pr-1">
            {sessions.map((sess) => (
              <button
                id={`debug-sess-btn-${sess.id}`}
                key={sess.id}
                onClick={() => loadSessionDetails(sess.id)}
                className={`py-1.5 px-3 rounded-md text-[10.5px] font-mono border flex items-center gap-1 cursor-pointer transition-all ${
                  activeSessionId === sess.id 
                    ? 'bg-amber-950/35 border-amber-900/60 text-amber-300 font-bold' 
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
