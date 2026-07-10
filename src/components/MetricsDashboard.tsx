import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Activity, DollarSign, Clock, RefreshCw, AlertTriangle, 
  CheckCircle2, Search, Filter, ShieldAlert, ChevronRight, BarChart3, Database,
  Zap, Flame, Sliders, Brain, GitFork, Network, Cpu
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Legend, Cell 
} from 'recharts';
import { useEditorStore } from '../store/useEditorStore';

interface ExecutionDetail {
  id: string;
  graphId: string;
  graphName: string;
  startedAt: string;
  finishedAt: string;
  status: 'success' | 'failed';
  totalTokens: number;
  totalCostUsd: number;
  totalLatencyMs: number;
  errorMessage?: string;
  nodeExecutions: any[];
}

interface SummaryData {
  totalRuns: number;
  successRate: number;
  totalCostUsd: number;
  averageLatencyMs: number;
  daily: Array<{
    date: string;
    runs: number;
    cost: number;
    tokens: number;
  }>;
  executions: ExecutionDetail[];
}

interface MetricsDashboardProps {
  currentLang?: 'en' | 'ru' | 'zh';
  activeGraphId?: string;
}

const TRANSLATIONS = {
  en: {
    title: 'Agent Observability & Telemetry Metrics',
    periodSelect: 'Time Interval',
    totalRuns: 'Total Executions',
    totalCost: 'Aggregated LLM Cost',
    avgLatency: 'Mean Performance Delay',
    successRate: 'Execution Safety (Success)',
    recentExecs: 'Global Execution Sandbox Log',
    byStatus: 'Status Filter',
    all: 'All Traces',
    success: 'Success Runs',
    failed: 'Failed Runs',
    graphSearch: 'Filter by Flow ID or Name',
    date: 'Timestamp',
    flow: 'Workflow Graph',
    latency: 'Delay',
    cost: 'Cost',
    tokens: 'Tokens',
    status: 'Status',
    actions: 'Details',
    noData: 'No logged analytics records in matching period. Run a pipeline to generate dataset.',
    dailyTrend: 'Operational Velocity (Daily Runs & Cost)',
    tokenConsumption: 'Semantic Resource Allocations (Token Density per Node Class)',
    geminiNode: 'Gemini Agent Tokens',
    reviewerNode: 'Self-Critique Auditor Tokens',
    others: 'Other Nodes',
    runsLabel: 'Runs Count',
    costLabel: 'Cost (USD)',
    tokensLabel: 'Token Weight',
    complexityTitle: 'Active Workspace Blueprint Complexity',
    complexityDesc: 'An interactive heuristic assessment of cognitive weight, routing depth, and semantic density on your canvas.',
    complexityScore: 'Complexity Score',
    complexityTier: 'Structural Tier',
    nodesConnected: 'Connected Active Nodes',
    logicOverhead: 'Logic & Routing Depth',
    semanticDensity: 'RAG & Semantic Operations',
    scaleLabel: 'Scale',
    complexityBreakdown: 'Heuristic Operator Distribution'
  },
  ru: {
    title: 'Метрики обсервабилити и телеметрии',
    periodSelect: 'Временной интервал',
    totalRuns: 'Всего запусков',
    totalCost: 'Суммарная стоимость LLM',
    avgLatency: 'Средняя задержка работы',
    successRate: 'Успешность выполнения',
    recentExecs: 'Глобальный лог выполнения',
    byStatus: 'Фильтр статуса',
    all: 'Все запуски',
    success: 'Успешные',
    failed: 'С ошибкой',
    graphSearch: 'Поиск по ID или названию',
    date: 'Дата и время',
    flow: 'Граф / Конструктор',
    latency: 'Задержка',
    cost: 'Стоимость',
    tokens: 'Токены',
    status: 'Статус',
    actions: 'Детали',
    noData: 'Аналитические записи телеметрии не найдены. Запустите граф для генерации метрик.',
    dailyTrend: 'Операционная скорость (Запуски и стоимость по дням)',
    tokenConsumption: 'Распределение ресурсов (Плотность токенов по классам узлов)',
    geminiNode: 'Токены Gemini узлов',
    reviewerNode: 'Токены Самопроверки',
    others: 'Прочие узлы',
    runsLabel: 'Количество запусков',
    costLabel: 'Стоимость (USD)',
    tokensLabel: 'Объем токенов',
    complexityTitle: 'Сложность активного шаблона',
    complexityDesc: 'Интерактивная эвристическая оценка когнитивного веса, глубины маршрутизации и семантической плотности на холсте.',
    complexityScore: 'Показатель сложности',
    complexityTier: 'Уровень структуры',
    nodesConnected: 'Подключенные активные узлы',
    logicOverhead: 'Глубина логики и маршрутизации',
    semanticDensity: 'RAG и семантические операции',
    scaleLabel: 'Масштаб',
    complexityBreakdown: 'Эвристический структурный анализ'
  },
  zh: {
    title: '智能代理工作流可观测性与监控仪表盘',
    periodSelect: '查询时间窗口',
    totalRuns: '累计执行次数',
    totalCost: 'LLM 消耗账单 (估算)',
    avgLatency: '平均执行延迟 (Latency)',
    successRate: '执行成功率 (Success Rate)',
    recentExecs: '全局运行沙盒执行链路 Trace 历史',
    byStatus: '执行状态过滤',
    all: '全部执行链路',
    success: '成功链路',
    failed: '异常链路',
    graphSearch: '输入工作流名称进行过滤查找',
    date: '触发时间',
    flow: '智能代理流名称',
    latency: '运行延迟',
    cost: '计费消耗',
    tokens: '总 Token 权重',
    status: '最终状态',
    actions: '链路透视',
    noData: '该筛选区间下暂无可观测性日志。请调试运行您的多代理系统以激活看板。',
    dailyTrend: '日均工作负载承载情况 (运行次数与资费趋势)',
    tokenConsumption: '语义资源吞吐分布 (不同类型智能节点的 Token 承载体积)',
    geminiNode: 'Gemini 代理消耗',
    reviewerNode: '自愈与批评消耗',
    others: '其他业务节点',
    runsLabel: '执行次数',
    costLabel: '资费金额 (USD)',
    tokensLabel: '消耗 Token 字节',
    complexityTitle: '当前工作区蓝图复杂度指标',
    complexityDesc: '基于节点拓扑结构、认知决策链深度、语义检索密度的多维综合复杂度评估。',
    complexityScore: '综合复杂度评分',
    complexityTier: '架构等级',
    nodesConnected: '已关联的有源节点',
    logicOverhead: '逻辑分流控制深度',
    semanticDensity: '语义索引与RAG算子占比',
    scaleLabel: '阶梯比率',
    complexityBreakdown: '拓扑算子权重分配柱状图'
  }
};

export const MetricsDashboard: React.FC<MetricsDashboardProps> = ({
  currentLang = 'en',
  activeGraphId
}) => {
  const [activeTab, setActiveTab] = useState<'metrics' | 'resilience'>('metrics');
  const [period, setPeriod] = useState<'24h' | '7d' | '30d'>('7d');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected detail drawer/modal trace
  const [selectedTrace, setSelectedTrace] = useState<ExecutionDetail | null>(null);

  // Resilience & Chaos states
  const [breakers, setBreakers] = useState<any[]>([]);
  const [resilienceLoading, setResilienceLoading] = useState(false);
  const [chaosConfig, setChaosConfig] = useState<any>({
    dbFailureActive: false,
    dbLatencyMs: 0,
    llmFailureActive: {},
    llmLatencyMs: {},
    nodeHangActive: {},
    nodeHangMs: {},
  });

  const [readinessData, setReadinessData] = useState<{
    score: number;
    checklist: Array<{ key: string; status: 'pass' | 'fail' | 'warning'; name: string; description: string }>;
    meta: {
      appName: string;
      appDescription: string;
      dbType: string;
      nodeEnv: string;
      geminiConfigured: boolean;
      agentForgeConfigured: boolean;
    };
  } | null>(null);
  const [readinessLoading, setReadinessLoading] = useState(false);

  // Auto-Refresh and Sandbox Memory states
  const [refreshInterval, setRefreshInterval] = useState<number | 'manual'>(15000);
  const [sandboxMemory, setSandboxMemory] = useState<{
    usedBytes: number;
    totalBytes: number;
    percentage: number;
    limitMB: number;
    usedMB: number;
    status: 'ok' | 'warning';
  } | null>(null);

  const [promData, setPromData] = useState<{
    success: boolean;
    source: string;
    sandboxMemory: number;
    httpRequestCount: number;
    llmCallsCount: number;
    timestamp: string;
  } | null>(null);

  const [promLoading, setPromLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<'clear' | 'stop' | 'simulate' | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const fetchSandboxMemory = async () => {
    try {
      const res = await fetch('/api/metrics/sandbox-memory');
      if (res.ok) {
        const data = await res.json();
        setSandboxMemory(data);
      }
    } catch (err) {
      console.error('Failed to load sandbox memory:', err);
    }
  };

  const fetchPromData = async () => {
    setPromLoading(true);
    try {
      const res = await fetch('/api/metrics/prometheus');
      if (res.ok) {
        const data = await res.json();
        setPromData(data);
      }
    } catch (err) {
      console.error('Failed to load Prometheus data:', err);
    } finally {
      setPromLoading(false);
    }
  };

  const fetchAllDashboardData = async () => {
    fetchMetrics();
    fetchReadinessData();
    fetchSandboxMemory();
    fetchPromData();
  };

  const handleSimulateHighLoad = async () => {
    setActionLoading('simulate');
    try {
      const res = await fetch('/api/metrics/simulate-high-load', { method: 'POST' });
      if (res.ok) {
        await fetchSandboxMemory();
        await fetchPromData();
        setActionSuccessMessage(
          currentLang === 'ru' 
            ? 'Симуляция критической утилизации памяти (> 85%) успешно запущена!' 
            : 'Critical sandbox memory stress test simulation (> 85%) started!'
        );
        setTimeout(() => setActionSuccessMessage(null), 5000);
      }
    } catch (err) {
      console.error('Failed to start high load simulation:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleClearCache = async () => {
    setActionLoading('clear');
    try {
      const res = await fetch('/api/metrics/clear-cache', { method: 'POST' });
      if (res.ok) {
        await fetchSandboxMemory();
        await fetchPromData();
        setActionSuccessMessage(
          currentLang === 'ru' 
            ? 'Память успешно оптимизирована! Кэш песочницы сброшен.' 
            : 'Sandbox cache successfully cleared and memory usage optimized!'
        );
        setTimeout(() => setActionSuccessMessage(null), 5000);
      }
    } catch (err) {
      console.error('Failed to clear cache:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleStopPipelines = async () => {
    setActionLoading('stop');
    try {
      const res = await fetch('/api/metrics/stop-pipelines', { method: 'POST' });
      if (res.ok) {
        await fetchSandboxMemory();
        await fetchPromData();
        setActionSuccessMessage(
          currentLang === 'ru' 
            ? 'Все выполняющиеся конвейеры принудительно остановлены. Нагрузка сброшена.' 
            : 'All heavy pipelines and execution threads stopped successfully.'
        );
        setTimeout(() => setActionSuccessMessage(null), 5000);
      }
    } catch (err) {
      console.error('Failed to stop pipelines:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const fetchReadinessData = async () => {
    setReadinessLoading(true);
    try {
      const res = await fetch('/api/metrics/readiness');
      if (res.ok) {
        const data = await res.json();
        setReadinessData(data);
      }
    } catch (err) {
      console.error('Failed to load readiness data:', err);
    } finally {
      setReadinessLoading(false);
    }
  };

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/metrics/summary?period=${period}`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (err) {
      console.error('Failed to load metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchResilienceData = async () => {
    try {
      const [cbRes, ccRes] = await Promise.all([
        fetch('/api/resilience/circuit-breakers'),
        fetch('/api/resilience/chaos-config')
      ]);
      if (cbRes.ok) {
        const cbData = await cbRes.json();
        setBreakers(cbData);
      }
      if (ccRes.ok) {
        const ccData = await ccRes.json();
        setChaosConfig(ccData);
      }
    } catch (err) {
      console.error('Failed to fetch resilience data:', err);
    }
  };

  const handleUpdateChaosConfig = async (update: any) => {
    setResilienceLoading(true);
    try {
      const res = await fetch('/api/resilience/chaos-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update)
      });
      if (res.ok) {
        const data = await res.json();
        setChaosConfig(data.config);
      }
    } catch (err) {
      console.error('Failed to update chaos config:', err);
    } finally {
      setResilienceLoading(false);
    }
  };

  const handleResetChaos = async () => {
    setResilienceLoading(true);
    try {
      const res = await fetch('/api/resilience/chaos-reset', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setChaosConfig(data.config);
        await fetchResilienceData();
      }
    } catch (err) {
      console.error('Failed to reset chaos:', err);
    } finally {
      setResilienceLoading(false);
    }
  };

  // Main effect to trigger data refresh on period/interval change
  useEffect(() => {
    fetchAllDashboardData();
  }, [period]);

  useEffect(() => {
    if (refreshInterval === 'manual') return;

    const t = setInterval(() => {
      fetchAllDashboardData();
    }, refreshInterval);

    return () => clearInterval(t);
  }, [refreshInterval, period]);

  useEffect(() => {
    if (activeTab === 'resilience') {
      fetchResilienceData();
      const t = setInterval(fetchResilienceData, 2000);
      return () => clearInterval(t);
    }
  }, [activeTab]);

  const text = TRANSLATIONS[currentLang] || TRANSLATIONS.en;

  // Fetch active canvas nodes and connections for live complexity calculations
  const canvasNodes = useEditorStore((state) => state.nodes) || [];
  const canvasConnections = useEditorStore((state) => state.connections) || [];

  // Heuristic logic to calculate live workflow complexity
  const {
    totalNodesCount,
    connectedNodesCount,
    connectionDensity,
    complexityScore,
    complexityPercent,
    nodeBreakdown,
    complexityTier,
    complexityColor,
    complexityAdvice
  } = React.useMemo(() => {
    const totalNodes = canvasNodes.length;
    const totalConnections = canvasConnections.length;

    // Get list of connected node IDs (nodes with at least one connection incoming or outgoing)
    const connectedNodeIds = new Set<string>();
    canvasConnections.forEach(c => {
      connectedNodeIds.add(c.sourceId);
      connectedNodeIds.add(c.targetId);
    });
    const connectedCount = Array.from(connectedNodeIds).filter(id => canvasNodes.some(n => n.id === id)).length;

    // Categorize nodes for heuristic breakdown & scoring
    let baseIOCount = 0; // input, output, prompt
    let llmCount = 0;    // gemini, prompt_optimizer
    let logicCount = 0;  // router, tool, human_confirmation, webhook
    let semanticCount = 0; // rag, vector-search, multimodal, reviewer

    canvasNodes.forEach(node => {
      const type = node.type;
      if (type === 'input' || type === 'output' || type === 'prompt') {
        baseIOCount++;
      } else if (type === 'gemini' || type === 'prompt_optimizer') {
        llmCount++;
      } else if (type === 'router' || type === 'tool' || type === 'human_confirmation' || type === 'webhook') {
        logicCount++;
      } else if (type === 'rag' || type === 'vector-search' || type === 'multimodal' || type === 'reviewer') {
        semanticCount++;
      } else {
        baseIOCount++; // Fallback
      }
    });

    // Calculate score based on node types
    const baseScore = (baseIOCount * 1.5) + (llmCount * 3.5) + (logicCount * 5.0) + (semanticCount * 7.5);
    // Add connection density weight (connections provide flow complexity)
    const connectionScore = totalConnections * 2.5;

    const rawScore = baseScore + connectionScore;
    // Normalize to 100 max, assume a score of 45 is a 100% highly dense agentic loop
    const percent = Math.min(100, Math.round((rawScore / 45) * 100));

    // Determine tier
    let tier = '';
    let color = '';
    let advice = '';

    if (percent <= 20) {
      if (currentLang === 'ru') {
        tier = 'Базовый (Линейный)';
        color = 'text-sky-450 bg-sky-950/20 border-sky-900/35';
        advice = 'Простой линейный поток. Отлично подходит для базовых шаблонов запросов без разветвления логики.';
      } else if (currentLang === 'zh') {
        tier = '基础线性工作流';
        color = 'text-sky-450 bg-sky-950/20 border-sky-900/35';
        advice = '结构极为简练的线性流。适合单步 Prompt 拼装，不涉及任何条件分支或自主反馈循环。';
      } else {
        tier = 'Basic Linear Utility';
        color = 'text-sky-450 bg-sky-950/20 border-sky-900/35';
        advice = 'A simple linear pipeline. Great for single-step template rendering and direct input-output workflows.';
      }
    } else if (percent <= 50) {
      if (currentLang === 'ru') {
        tier = 'Умеренный (Интерактивный)';
        color = 'text-emerald-400 bg-emerald-950/20 border-emerald-900/35';
        advice = 'Сбалансированный поток. Содержит ИИ-агентов с базовыми связями для структурированных ответов.';
      } else if (currentLang === 'zh') {
        tier = '中等交互智能体';
        color = 'text-emerald-400 bg-emerald-950/20 border-emerald-900/35';
        advice = '具备一定交互能力的标准智能体。包含了大语言模型算子，适用于常规结构化生成任务。';
      } else {
        tier = 'Moderate Interactive Agent';
        color = 'text-emerald-400 bg-emerald-950/20 border-emerald-900/35';
        advice = 'A well-rounded agent configuration. Integrates discrete LLM invocations with solid structural bindings.';
      }
    } else if (percent <= 80) {
      if (currentLang === 'ru') {
        tier = 'Сложная система (Оркестрация)';
        color = 'text-amber-400 bg-amber-950/20 border-amber-900/35';
        advice = 'Высокая сложность. Использует условную маршрутизацию, инструменты или самопроверку для надежности.';
      } else if (currentLang === 'zh') {
        tier = '高级决策编排系统';
        color = 'text-amber-400 bg-amber-950/20 border-amber-900/35';
        advice = '高度复杂的系统编排。引人了条件路由决策、自定义函数工具或自我纠错审查机制。';
      } else {
        tier = 'Orchestrated Complex System';
        color = 'text-amber-400 bg-amber-950/20 border-amber-900/35';
        advice = 'High structural density. Leverages conditional routers, tool calls, or review loops for advanced decision making.';
      }
    } else {
      if (currentLang === 'ru') {
        tier = 'Когнитивный супер-агент';
        color = 'text-purple-400 bg-purple-950/20 border-purple-900/35';
        advice = 'Предельная автономность. Многократная самокоррекция, семантический поиск RAG и глубокие циклы обратной связи.';
      } else if (currentLang === 'zh') {
        tier = '自主深度认知网络';
        color = 'text-purple-400 bg-purple-950/20 border-purple-900/35';
        advice = '极致的自主执行力。深度整合了多轮反馈自愈回路、高维向量检索 (RAG) 与智能工具协作网。';
      } else {
        tier = 'Autonomous Cognitive Network';
        color = 'text-purple-400 bg-purple-950/20 border-purple-900/35';
        advice = 'Maximum autonomy. Combines iterative self-correction, dynamic RAG document search, and deep cyclic feedback loops.';
      }
    }

    return {
      totalNodesCount: totalNodes,
      connectedNodesCount: connectedCount,
      connectionDensity: totalNodes > 0 ? (totalConnections / totalNodes).toFixed(1) : '0.0',
      complexityScore: rawScore.toFixed(1),
      complexityPercent: percent,
      nodeBreakdown: [
        { name: currentLang === 'ru' ? 'Ввод/Вывод' : currentLang === 'zh' ? '基础 I/O' : 'Base I/O', value: baseIOCount, color: '#64748b' },
        { name: currentLang === 'ru' ? 'Модели ИИ' : currentLang === 'zh' ? '大模型算子' : 'LLM Brains', value: llmCount, color: '#10b981' },
        { name: currentLang === 'ru' ? 'Логика/Роутинг' : currentLang === 'zh' ? '逻辑路由' : 'Logic Ops', value: logicCount, color: '#f59e0b' },
        { name: currentLang === 'ru' ? 'Семантика/RAG' : currentLang === 'zh' ? '语义检索' : 'Semantic/RAG', value: semanticCount, color: '#8b5cf6' },
      ],
      complexityTier: tier,
      complexityColor: color,
      complexityAdvice: advice
    };
  }, [canvasNodes, canvasConnections, currentLang]);

  // Filter local executions inside UI for high-fidelity client sorting
  const filteredExecutions = summary?.executions ? summary.executions.filter(e => {
    const matchStatus = statusFilter === 'all' || e.status === statusFilter;
    const matchSearch = !searchQuery.trim() || 
      e.graphName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      e.graphId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchSpecificActive = !activeGraphId || e.graphId === activeGraphId;

    return matchStatus && matchSearch && matchSpecificActive;
  }) : [];

  // Approximate Stacked data chart calculation
  const chartData = summary?.daily ? summary.daily.map(day => {
    return {
      name: day.date,
      runs: day.runs,
      cost: Number(day.cost.toFixed(5)),
      // Artificially distribute token classification weight cleanly based on aggregate tokens
      geminiTokens: Math.round(day.tokens * 0.65),
      reviewerTokens: Math.round(day.tokens * 0.25),
      otherTokens: Math.round(day.tokens * 0.1)
    };
  }) : [];

  // Dynamic Provider breakdown values for separate pie chart layout helper
  const providerDistribution = [
    { name: text.geminiNode, value: Number((chartData.reduce((acc, d) => acc + d.geminiTokens, 0)).toFixed(0)), color: '#10b981' },
    { name: text.reviewerNode, value: Number((chartData.reduce((acc, d) => acc + d.reviewerTokens, 0)).toFixed(0)), color: '#8b5cf6' },
    { name: text.others, value: Number((chartData.reduce((acc, d) => acc + d.otherTokens, 0)).toFixed(0)), color: '#0ea5e9' }
  ];

  return (
    <div className="space-y-6">
      {/* Dashboard Top Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-900 pb-4 bg-slate-950/60 p-4 rounded-2xl">
        <div>
          <h2 className="text-sm font-black text-slate-100 flex items-center gap-2">
            <Activity className="text-emerald-400 animate-pulse animate-duration-3000" size={16} />
            {text.title}
          </h2>
          <p className="text-[11px] text-slate-500 mt-1">
            {currentLang === 'ru' 
              ? 'Контроль за бюджетом, нагрузками и скоростью работы автоматизированных ИИ-агентов.' 
              : 'Continuous auditing, LLM cost estimation, and pipeline latency tracking feedback.'}
          </p>
        </div>

        {activeTab === 'metrics' && (
          <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
            {/* Auto-Refresh dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-900">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                {currentLang === 'ru' ? 'Обновление:' : 'Auto-Refresh:'}
              </span>
              <select
                value={refreshInterval === 'manual' ? 'manual' : refreshInterval}
                onChange={(e) => {
                  const val = e.target.value;
                  setRefreshInterval(val === 'manual' ? 'manual' : Number(val));
                }}
                className="bg-transparent text-xs font-bold text-emerald-400 focus:outline-none cursor-pointer border-none py-0.5"
                id="auto-refresh-select"
              >
                <option value="2000" className="bg-slate-950 text-slate-300">2s</option>
                <option value="5000" className="bg-slate-950 text-slate-300">5s</option>
                <option value="15000" className="bg-slate-950 text-slate-300">15s</option>
                <option value="30000" className="bg-slate-950 text-slate-300">30s</option>
                <option value="manual" className="bg-slate-950 text-slate-300">
                  {currentLang === 'ru' ? 'Вручную' : 'Manual'}
                </option>
              </select>
            </div>

            {/* Period selector */}
            <div className="flex gap-1 bg-slate-950 p-1 rounded-xl border border-slate-900">
              {(['24h', '7d', '30d'] as const).map(p => (
                <button
                  key={p}
                  id={`period-btn-${p}`}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    period === p 
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
                      : 'text-slate-500 hover:text-slate-300 border border-transparent'
                  }`}
                >
                  {p.toUpperCase()}
                </button>
              ))}
              <button
                id="manual-refresh-btn"
                onClick={fetchAllDashboardData}
                className="p-1 px-2.5 hover:text-emerald-400 text-slate-500 transition-colors cursor-pointer"
                title={currentLang === 'ru' ? 'Обновить данные' : 'Refresh Metrics'}
              >
                <RefreshCw size={12} className={loading || promLoading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-slate-905 gap-6">
        <button
          onClick={() => setActiveTab('metrics')}
          className={`pb-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
            activeTab === 'metrics'
              ? 'border-emerald-500 text-emerald-400 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-350'
          }`}
        >
          📊 {currentLang === 'ru' ? 'Аналитика и Телеметрия' : 'Observability Metrics'}
        </button>
        <button
          onClick={() => setActiveTab('resilience')}
          className={`pb-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
            activeTab === 'resilience'
              ? 'border-purple-500 text-purple-400 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-350'
          }`}
        >
          🛡️ {currentLang === 'ru' ? 'Отказоустойчивость и Хаос' : 'Circuit Breakers & Chaos'}
        </button>
      </div>

      {/* Action Success Toast Notification */}
      <AnimatePresence>
        {actionSuccessMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="bg-emerald-950/90 border border-emerald-500/30 text-emerald-300 p-4 rounded-xl flex items-center gap-3 shadow-xl backdrop-blur-md z-50 my-4"
          >
            <CheckCircle2 className="text-emerald-400 shrink-0" size={18} />
            <span className="text-xs font-bold font-sans">{actionSuccessMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* High Sandbox Memory Warning Notification Block (>85%) */}
      <AnimatePresence>
        {sandboxMemory && sandboxMemory.percentage > 85 && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            className="overflow-hidden mb-6 mt-4"
          >
            <div className="bg-red-950/80 border border-red-500/30 rounded-2xl p-4.5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-lg backdrop-blur-md relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-xl rounded-full pointer-events-none" />
              
              <div className="flex items-start gap-3.5">
                <div className="bg-red-500/10 p-2.5 rounded-xl border border-red-500/20 text-red-400 shrink-0 animate-bounce">
                  <AlertTriangle size={20} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-red-200 uppercase tracking-wide flex items-center gap-2">
                    {currentLang === 'ru' 
                      ? 'ВНИМАНИЕ: Превышен критический лимит памяти песочницы!' 
                      : 'WARNING: Critical Sandbox Memory Threshold Exceeded!'}
                    <span className="font-mono bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded text-xs border border-red-500/20">
                      {sandboxMemory.percentage}%
                    </span>
                  </h4>
                  <p className="text-xs text-red-300 leading-relaxed max-w-xl">
                    {currentLang === 'ru' 
                      ? `Текущее потребление V8 Isolate составляет ${sandboxMemory.usedMB} MB (лимит: ${sandboxMemory.limitMB} MB). Ваши цепочки агентов KostromAi44 могут аварийно завершиться с ошибкой Out-of-Memory (OOM). Очистите кэш или остановите тяжелые конвейеры.` 
                      : `Active IsolatedVM heap usage is at ${sandboxMemory.usedMB} MB (cap: ${sandboxMemory.limitMB} MB). Your executing KostromAi44 pipelines may experience fatal Out-of-Memory (OOM) crashes. Clear sandbox memory or halt executing threads immediately.`}
                  </p>
                </div>
              </div>

              {/* Proactive mitigation buttons */}
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto md:shrink-0">
                <button
                  onClick={handleClearCache}
                  disabled={actionLoading !== null}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-black bg-emerald-500 border border-emerald-600 text-slate-950 hover:bg-emerald-400 transition-all shadow-md hover:shadow-emerald-500/10 active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RefreshCw size={12} className={actionLoading === 'clear' ? 'animate-spin' : ''} />
                  {currentLang === 'ru' ? 'Очистить кэш песочницы' : 'Clear Sandbox Cache'}
                </button>
                <button
                  onClick={handleStopPipelines}
                  disabled={actionLoading !== null}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-black bg-slate-900 border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all hover:border-red-500/50 active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <AlertTriangle size={12} className={actionLoading === 'stop' ? 'animate-ping' : ''} />
                  {currentLang === 'ru' ? 'Остановить конвейер' : 'Stop Heavy Pipelines'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {activeTab === 'metrics' ? (
        <div className="space-y-6">
          {/* Observability Highlight Cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total executions */}
            <div className="bg-slate-950 border border-slate-900 rounded-2xl p-4.5 flex items-center justify-between shadow-sm relative overflow-hidden">
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-slate-505 tracking-wider">{text.totalRuns}</span>
                <h3 className="text-xl font-black text-slate-100 font-mono">
                  {summary?.totalRuns ?? 0}
                </h3>
                <p className="text-[9px] text-slate-500 flex items-center gap-1 leading-none mt-1">
                  <TrendingUp size={10} className="text-emerald-400" />
                  <span>{period === '24h' ? 'Past 24 hours' : period === '30d' ? 'Past 30 days' : 'Past 7 days'}</span>
                </p>
              </div>
              <div className="bg-slate-900 p-2.5 rounded-2xl border border-slate-850 text-slate-400 shrink-0">
                <Activity size={18} className="text-sky-450" />
              </div>
            </div>

            {/* Card 2: Cumulative Expense USD */}
            <div className="bg-slate-950 border border-slate-900 rounded-2xl p-4.5 flex items-center justify-between shadow-sm relative overflow-hidden">
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-slate-505 tracking-wider">{text.totalCost}</span>
                <h3 className="text-xl font-black text-emerald-400 font-mono">
                  ${summary?.totalCostUsd ? summary.totalCostUsd.toFixed(5) : '0.00000'}
                </h3>
                <p className="text-[9px] text-slate-500 flex items-center gap-1 leading-none mt-1">
                  <span>Weighted estimation</span>
                </p>
              </div>
              <div className="bg-emerald-950/20 p-2.5 rounded-2xl border border-emerald-900/30 text-emerald-400 shrink-0">
                <DollarSign size={18} />
              </div>
            </div>

            {/* Card 3: Performance Latency */}
            <div className="bg-slate-950 border border-slate-900 rounded-2xl p-4.5 flex items-center justify-between shadow-sm relative overflow-hidden">
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-slate-505 tracking-wider">{text.avgLatency}</span>
                <h3 className="text-xl font-black text-slate-100 font-mono">
                  {summary?.averageLatencyMs ? (summary.averageLatencyMs / 1000).toFixed(2) : '0.00'}<span className="text-xs text-slate-450 font-normal font-sans ml-0.5">s</span>
                </h3>
                <p className="text-[9px] text-slate-500 leading-none mt-1">
                  Per graph compiler execution
                </p>
              </div>
              <div className="bg-slate-900 p-2.5 rounded-2xl border border-slate-850 text-slate-400 shrink-0">
                <Clock size={18} className="text-amber-450" />
              </div>
            </div>

            {/* Card 4: Quality Success Guard */}
            <div className="bg-slate-950 border border-slate-900 rounded-2xl p-4.5 flex items-center justify-between shadow-sm relative overflow-hidden">
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-slate-505 tracking-wider">{text.successRate}</span>
                <h3 className="text-xl font-black text-purple-400 font-mono">
                  {summary?.successRate ?? 0}%
                </h3>
                <p className="text-[9px] text-slate-500 flex items-center gap-1 leading-none mt-1">
                  <span>Compilation & Node integrity</span>
                </p>
              </div>
              <div className="bg-purple-950/20 p-2.5 rounded-2xl border border-purple-900/30 text-purple-400 shrink-0">
                <CheckCircle2 size={18} />
              </div>
            </div>
          </div>

          {/* Workflow Structural & Heuristic Complexity Analyzer Section */}
          <div className="bg-slate-950 border border-slate-900 rounded-2xl p-5 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 relative overflow-hidden">
            {/* Ambient subtle glowing background effect */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/5 blur-[120px] rounded-full pointer-events-none" />

            {/* Left Column (Span 2): Complexity Gauge, Meters, and Metrics */}
            <div className="lg:col-span-2 space-y-5 relative">
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-100 flex items-center gap-2">
                  <Brain className="text-emerald-400" size={16} />
                  {text.complexityTitle}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {text.complexityDesc}
                </p>
              </div>

              {/* Meter and percentage details row */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center bg-slate-900/20 border border-slate-900 p-4.5 rounded-2xl">
                
                {/* Circular styled glow percentage display */}
                <div className="md:col-span-4 flex flex-col items-center justify-center text-center p-3 border-b md:border-b-0 md:border-r border-slate-900">
                  <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                    {text.complexityScore}
                  </span>
                  
                  <div className="relative flex items-center justify-center my-3 w-28 h-28">
                    {/* SVG background circle and progress track */}
                    <svg className="w-full h-full -rotate-90">
                      <circle
                        cx="56"
                        cy="56"
                        r="46"
                        className="stroke-slate-900"
                        strokeWidth="8"
                        fill="transparent"
                      />
                      <motion.circle
                        cx="56"
                        cy="56"
                        r="46"
                        className="stroke-emerald-500"
                        strokeWidth="8"
                        strokeDasharray={289}
                        initial={{ strokeDashoffset: 289 }}
                        animate={{ strokeDashoffset: 289 - (289 * complexityPercent) / 100 }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        strokeLinecap="round"
                        fill="transparent"
                      />
                    </svg>
                    
                    {/* Inner Text with active rating */}
                    <div className="absolute flex flex-col items-center">
                      <span className="text-2xl font-black text-slate-100 font-mono tracking-tight">
                        {complexityPercent}%
                      </span>
                      <span className="text-[9px] font-mono text-slate-450 mt-0.5">
                        {complexityScore} pt
                      </span>
                    </div>
                  </div>
                </div>

                {/* Heuristic stats column */}
                <div className="md:col-span-8 space-y-4">
                  {/* Status Tier Badge */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-extrabold uppercase text-slate-500 tracking-wider">
                        {text.complexityTier}
                      </span>
                      <div className={`px-2.5 py-1 rounded-xl border text-xs font-black uppercase tracking-wide inline-block ${complexityColor}`}>
                        {complexityTier}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[9px] font-extrabold uppercase text-slate-505 tracking-wider block">
                        Workspace Health
                      </span>
                      <span className="text-xs font-bold text-emerald-400 font-mono">
                        Active & Synced
                      </span>
                    </div>
                  </div>

                  {/* Micro Heuristics Grid */}
                  <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-slate-900/60">
                    <div className="bg-slate-950/40 p-2 rounded-xl border border-slate-900/50">
                      <span className="text-[8px] font-extrabold uppercase text-slate-500 tracking-wide block leading-none">
                        Nodes Connected
                      </span>
                      <span className="text-xs font-black text-slate-200 font-mono mt-1.5 block">
                        {connectedNodesCount} <span className="text-[9px] text-slate-500 font-sans font-normal">/ {totalNodesCount}</span>
                      </span>
                    </div>

                    <div className="bg-slate-950/40 p-2 rounded-xl border border-slate-900/50">
                      <span className="text-[8px] font-extrabold uppercase text-slate-500 tracking-wide block leading-none">
                        Connection Ratio
                      </span>
                      <span className="text-xs font-black text-slate-200 font-mono mt-1.5 block">
                        {connectionDensity} <span className="text-[9px] text-slate-500 font-sans font-normal">conn/nd</span>
                      </span>
                    </div>

                    <div className="bg-slate-950/40 p-2 rounded-xl border border-slate-900/50">
                      <span className="text-[8px] font-extrabold uppercase text-slate-500 tracking-wide block leading-none">
                        Active Loop Logic
                      </span>
                      <span className="text-xs font-black text-purple-400 font-mono mt-1.5 block">
                        {canvasConnections.length} paths
                      </span>
                    </div>
                  </div>

                  {/* Actionable advice note */}
                  <p className="text-[10px] text-slate-400 leading-relaxed italic bg-slate-950/25 p-2 rounded-xl border border-slate-900/30">
                    💡 {complexityAdvice}
                  </p>
                </div>

              </div>
            </div>

            {/* Right Column (Span 1): Pure HTML/Tailwind Horizontal Operator Bar Graph */}
            <div className="bg-slate-900/20 border border-slate-900 p-4.5 rounded-2xl flex flex-col justify-between">
              <div className="space-y-1 pb-3 border-b border-slate-900">
                <h4 className="text-[11px] font-extrabold uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                  <Cpu size={12} className="text-emerald-400" />
                  {text.complexityBreakdown}
                </h4>
                <p className="text-[9px] text-slate-500">
                  Workspace token and logical operator distribution weight.
                </p>
              </div>

              {/* Progress bars list */}
              <div className="space-y-3.5 my-4 flex-1 flex flex-col justify-center">
                {nodeBreakdown.map((item, idx) => {
                  const maxVal = Math.max(...nodeBreakdown.map(b => b.value)) || 1;
                  const ratioPercent = Math.max(8, Math.round((item.value / maxVal) * 100));
                  
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-450 font-bold flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                          {item.name}
                        </span>
                        <span className="text-slate-300 font-mono font-black bg-slate-900 px-1.5 py-0.5 rounded">
                          {item.value} {item.value === 1 ? 'node' : 'nodes'}
                        </span>
                      </div>
                      
                      {/* Visual progress bar layout */}
                      <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-850/40">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${ratioPercent}%` }}
                          transition={{ duration: 0.8, delay: idx * 0.1, ease: 'easeOut' }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Heuristic validation summary */}
              <div className="text-[9px] text-slate-500 font-mono flex justify-between items-center pt-2.5 border-t border-slate-900 leading-none">
                <span>Metric Baseline: Heuristics v3.1</span>
                <span className="text-emerald-500">✔ Live Update</span>
              </div>
            </div>
          </div>

          {/* Deployment Readiness Module Card */}
          <div className="bg-slate-950 border border-slate-900 rounded-2xl p-5 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-80 h-80 bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-80 h-80 bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />

            {/* Left Column (Span 2): Checklist detail */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-slate-100 flex items-center gap-2">
                    <TrendingUp className="text-blue-400" size={16} />
                    Cloud Deployment Readiness Compliance
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Systematically audits active env secrets, cloud database engines, secure cryptography keys, and project identity configurations prior to public cloud container deployment.
                  </p>
                </div>
                <button
                  onClick={fetchReadinessData}
                  disabled={readinessLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-850 text-slate-350 font-bold rounded-xl border border-slate-850 hover:border-slate-800 text-[10px] transition cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw size={12} className={readinessLoading ? "animate-spin text-blue-400" : "text-blue-400"} />
                  Re-Scan
                </button>
              </div>

              {/* Checklist rendering */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                {readinessData?.checklist.map((check, idx) => {
                  let Icon = CheckCircle2;
                  let iconColor = "text-emerald-400 bg-emerald-950/20 border-emerald-900/30";
                  if (check.status === 'fail') {
                    Icon = ShieldAlert;
                    iconColor = "text-rose-400 bg-rose-950/20 border-rose-900/30";
                  } else if (check.status === 'warning') {
                    Icon = AlertTriangle;
                    iconColor = "text-amber-400 bg-amber-950/20 border-amber-900/30";
                  }

                  return (
                    <div key={idx} className="bg-slate-900/20 border border-slate-900/70 rounded-xl p-3 flex gap-3 items-start">
                      <div className={`p-1.5 rounded-lg border shrink-0 ${iconColor}`}>
                        <Icon size={14} />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-[11px] font-bold text-slate-200">{check.name}</h4>
                        <p className="text-[10px] text-slate-400 leading-normal">{check.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column (Span 1): Dynamic Gauge */}
            <div className="bg-slate-900/20 border border-slate-900 p-4.5 rounded-2xl flex flex-col justify-between">
              <div className="space-y-1 pb-3 border-b border-slate-900">
                <h4 className="text-[11px] font-extrabold uppercase text-slate-305 tracking-wider flex items-center gap-1.5">
                  <Activity size={12} className="text-blue-400" />
                  Compliance Score Card
                </h4>
                <p className="text-[9px] text-slate-500">
                  Calculated health evaluation based on strict enterprise checklist.
                </p>
              </div>

              {/* Circle progress display */}
              <div className="flex flex-col items-center justify-center py-4 relative">
                <div className="relative flex items-center justify-center w-28 h-28">
                  <svg className="w-full h-full -rotate-90">
                    <circle
                      cx="56"
                      cy="56"
                      r="46"
                      className="stroke-slate-900"
                      strokeWidth="8"
                      fill="transparent"
                    />
                    <motion.circle
                      cx="56"
                      cy="56"
                      r="46"
                      className={
                        (readinessData?.score ?? 0) === 100 ? "stroke-emerald-500" :
                        (readinessData?.score ?? 0) >= 70 ? "stroke-amber-500" : "stroke-rose-500"
                      }
                      strokeWidth="8"
                      strokeDasharray={289}
                      initial={{ strokeDashoffset: 289 }}
                      animate={{ strokeDashoffset: 289 - (289 * (readinessData?.score ?? 0)) / 100 }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-2xl font-black text-slate-100 font-mono tracking-tight">
                      {readinessData?.score ?? 0}%
                    </span>
                    <span className="text-[9px] font-mono text-slate-500 mt-0.5">
                      Compliant
                    </span>
                  </div>
                </div>

                <div className="mt-4 text-center">
                  <span className="text-[9px] font-extrabold uppercase text-slate-500 tracking-wider block mb-1">
                    Readiness Rating
                  </span>
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wide inline-block ${
                    (readinessData?.score ?? 0) === 100 ? "bg-emerald-950/40 text-emerald-400 border border-emerald-900/30" :
                    (readinessData?.score ?? 0) >= 70 ? "bg-amber-950/40 text-amber-400 border border-amber-900/30" :
                    "bg-rose-950/40 text-rose-400 border border-rose-900/30"
                  }`}>
                    {(readinessData?.score ?? 0) === 100 ? "🎖️ Production Grade" :
                     (readinessData?.score ?? 0) >= 70 ? "⚡ Ready with Warnings" :
                     "⚠️ Non-compliant"}
                  </span>
                </div>
              </div>

              {/* Footer summary */}
              <div className="text-[9px] text-slate-500 font-mono flex justify-between items-center pt-2.5 border-t border-slate-900 leading-none">
                <span>Profile: {readinessData?.meta.nodeEnv?.toUpperCase() || 'DEVELOPMENT'}</span>
                <span className="text-slate-450">DB: {readinessData?.meta.dbType?.toUpperCase() || 'SQLITE'}</span>
              </div>
            </div>
          </div>

          {/* Prometheus & Sandbox Observability Control Plane */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left Card: Sandbox Memory & Lifecycle Controls */}
            <div className="bg-slate-950 border border-slate-900 rounded-2xl p-5 md:p-6 relative overflow-hidden space-y-4">
              <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 blur-[80px] rounded-full pointer-events-none" />
              
              <div className="flex justify-between items-start border-b border-slate-900 pb-3">
                <div className="space-y-1">
                  <h3 className="text-xs font-black text-slate-100 flex items-center gap-2 uppercase tracking-wide">
                    <Cpu className="text-amber-450" size={14} />
                    {currentLang === 'ru' ? 'Песочница Кода (Когнитивная память)' : 'Sandbox Memory Allocation'}
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    {currentLang === 'ru' ? 'Выделенная оперативная память V8 Isolate' : 'V8 execution sandbox heap slice allocation'}
                  </p>
                </div>
                
                <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                  (sandboxMemory?.percentage ?? 0) > 85
                    ? 'bg-red-500/10 border-red-500/20 text-red-400'
                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                }`}>
                  {(sandboxMemory?.percentage ?? 0) > 85 
                    ? (currentLang === 'ru' ? 'Критично (>85%)' : 'Critical (>85%)') 
                    : (currentLang === 'ru' ? 'Норма' : 'Healthy')}
                </span>
              </div>

              {/* Memory progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400 font-sans">{currentLang === 'ru' ? 'Утилизация памяти:' : 'Memory Utilization:'}</span>
                  <span className={`font-bold ${
                    (sandboxMemory?.percentage ?? 0) > 85 ? 'text-red-400 font-extrabold' : 'text-slate-200'
                  }`}>
                    {sandboxMemory?.usedMB ?? '14.2'} MB / {sandboxMemory?.limitMB ?? '64.0'} MB ({sandboxMemory?.percentage ?? '22.1'}%)
                  </span>
                </div>

                {/* Outer Track */}
                <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden p-[2px] border border-slate-850">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      (sandboxMemory?.percentage ?? 0) > 85
                        ? 'bg-gradient-to-r from-red-500 to-rose-600 animate-pulse'
                        : (sandboxMemory?.percentage ?? 0) > 50
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                        : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                    }`}
                    style={{ width: `${Math.min(100, sandboxMemory?.percentage ?? 22.1)}%` }}
                  />
                </div>
              </div>

              {/* Lifecycle operations */}
              <div className="space-y-2 pt-1">
                <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider block">
                  {currentLang === 'ru' ? 'Управление нагрузкой и песочницей:' : 'Sandbox Lifecycle Control Plane:'}
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    onClick={handleSimulateHighLoad}
                    disabled={actionLoading !== null}
                    className={`px-3 py-2 rounded-xl text-xs font-black transition-all border cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                      (sandboxMemory?.percentage ?? 0) > 85
                        ? 'bg-slate-900/40 border-slate-850 text-slate-500 cursor-not-allowed border-dashed'
                        : 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
                    }`}
                  >
                    <Flame size={12} className={actionLoading === 'simulate' ? 'animate-pulse' : ''} />
                    {currentLang === 'ru' ? 'Стресс-тест' : 'Stress Test'}
                  </button>

                  <button
                    onClick={handleClearCache}
                    disabled={actionLoading !== null}
                    className="px-3 py-2 rounded-xl text-xs font-black bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer text-center flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw size={12} className={actionLoading === 'clear' ? 'animate-spin' : ''} />
                    {currentLang === 'ru' ? 'Сбросить кэш' : 'Clear Cache'}
                  </button>

                  <button
                    onClick={handleStopPipelines}
                    disabled={actionLoading !== null}
                    className="px-3 py-2 rounded-xl text-xs font-black bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer text-center flex items-center justify-center gap-1.5"
                  >
                    <AlertTriangle size={12} className={actionLoading === 'stop' ? 'animate-bounce' : ''} />
                    {currentLang === 'ru' ? 'Остановить' : 'Stop Threads'}
                  </button>
                </div>
              </div>
            </div>

            {/* Right Card: Prometheus Live Scraping Metrics */}
            <div className="bg-slate-950 border border-slate-900 rounded-2xl p-5 md:p-6 relative overflow-hidden space-y-4">
              <div className="absolute top-0 right-0 w-48 h-48 bg-sky-500/5 blur-[80px] rounded-full pointer-events-none" />
              
              <div className="flex justify-between items-start border-b border-slate-900 pb-3">
                <div className="space-y-1">
                  <h3 className="text-xs font-black text-slate-100 flex items-center gap-2 uppercase tracking-wide">
                    <Activity className="text-sky-400" size={14} />
                    {currentLang === 'ru' ? 'Потоковая телеметрия Prometheus' : 'Prometheus Live Scrape Stream'}
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    {currentLang === 'ru' ? 'Реальные метрики, собираемые из Grafana/Prometheus' : 'Operational metrics scraped directly from local daemon'}
                  </p>
                </div>
                
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border flex items-center gap-1.5 ${
                  promData?.source === 'prometheus_server'
                    ? 'bg-sky-500/10 border-sky-500/20 text-sky-400'
                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    promData?.source === 'prometheus_server' ? 'bg-sky-400 animate-ping' : 'bg-emerald-400 animate-pulse'
                  }`} />
                  {promData?.source === 'prometheus_server' ? 'PROMETHEUS-DAEMON' : 'LOCAL-REGISTRY'}
                </span>
              </div>

              {/* Scraped metrics list */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900/40 border border-slate-900 p-3.5 rounded-xl space-y-1.5">
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">
                    {currentLang === 'ru' ? 'HTTP Запросы (Всего)' : 'HTTP Requests (Scraped)'}
                  </span>
                  <div className="text-xl font-black text-sky-400 font-mono">
                    {promLoading ? '...' : (promData?.httpRequestCount ?? 0)}
                  </div>
                  <span className="text-[8px] text-slate-500 block">
                    {currentLang === 'ru' ? 'Запуски REST API и Webhook портов' : 'Collected via express_prom_client'}
                  </span>
                </div>

                <div className="bg-slate-900/40 border border-slate-900 p-3.5 rounded-xl space-y-1.5">
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">
                    {currentLang === 'ru' ? 'LLM Запросы (Всего)' : 'LLM Calls (Scraped)'}
                  </span>
                  <div className="text-xl font-black text-purple-400 font-mono">
                    {promLoading ? '...' : (promData?.llmCallsCount ?? 0)}
                  </div>
                  <span className="text-[8px] text-slate-500 block">
                    {currentLang === 'ru' ? 'Когнитивные вызовы моделей Gemini' : 'Scraped via gemini_api_counter'}
                  </span>
                </div>
              </div>

              {/* Telemetry info row */}
              <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1 font-mono">
                <span>
                  {currentLang === 'ru' ? 'Метод сбора: Pull-Scrape' : 'Ingress transport: Pull-Scrape'}
                </span>
                <span>
                  {currentLang === 'ru' ? 'Обновлено:' : 'Last pull:'} {promData?.timestamp ? new Date(promData.timestamp).toLocaleTimeString() : '...'}
                </span>
              </div>
            </div>
            
          </div>

          {/* Visual Charts Layout Dashboard Block */}
          {chartData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Chart 1 AreaChart: Load profile */}
              <div className="bg-slate-950 border border-slate-905 p-4 rounded-2xl lg:col-span-2 space-y-4">
                <h4 className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-2">
                  <BarChart3 size={13} className="text-emerald-400" />
                  {text.dailyTrend}
                </h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRuns" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#10172a" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={9} fontStyle="italic" />
                      <YAxis yAxisId="left" stroke="#10b981" fontSize={9} />
                      <YAxis yAxisId="right" orientation="right" stroke="#8b5cf6" fontSize={9} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '12px' }}
                        labelStyle={{ color: '#94a3b8', fontSize: '10px', fontWeight: 'bold' }}
                        itemStyle={{ fontSize: '11px', padding: '1px' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                      <Area yAxisId="left" type="monotone" dataKey="runs" name={text.runsLabel} stroke="#10b981" fillOpacity={1} fill="url(#colorRuns)" strokeWidth={2.5} />
                      <Area yAxisId="right" type="monotone" dataKey="cost" name={text.costLabel} stroke="#8b5cf6" fillOpacity={1} fill="url(#colorCost)" strokeWidth={2.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2 Stacked Bar: Tokens Breakdown */}
              <div className="bg-slate-950 border border-slate-905 p-4 rounded-2xl space-y-4">
                <h4 className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-2">
                  <Database size={13} className="text-sky-400" />
                  {text.tokenConsumption}
                </h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#10172a" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={9} />
                      <YAxis stroke="#475569" fontSize={9} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '12px' }}
                        labelStyle={{ color: '#94a3b8', fontSize: '10px' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '9px', paddingTop: '10px' }} />
                      <Bar dataKey="geminiTokens" name="Gemini Nodes" stackId="tokens" fill="#10b981" />
                      <Bar dataKey="reviewerTokens" name="Self-Critic reviewer" stackId="tokens" fill="#8b5cf6" />
                      <Bar dataKey="otherTokens" name="HTTP/RAG local ops" stackId="tokens" fill="#0ea5e9" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Interactive Logger Logs Sandbox Table */}
          <div className="bg-slate-950 border border-slate-900 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-900 pb-4">
              <h4 className="text-xs font-black uppercase text-slate-200 tracking-wider">
                {text.recentExecs}
              </h4>

              {/* Table Control Filters */}
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                {/* Search Input Filter */}
                <div className="relative flex-1 md:w-64 max-w-sm">
                  <span className="absolute left-3 top-2.5 text-slate-500">
                    <Search size={12} />
                  </span>
                  <input
                    type="text"
                    placeholder={text.graphSearch}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-850 hover:border-slate-800 rounded-xl px-9 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/40"
                  />
                </div>

                {/* Status Select Filter */}
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="bg-slate-900 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-350 focus:outline-none hover:border-slate-800 cursor-pointer"
                  >
                    <option value="all">📁 {text.all}</option>
                    <option value="success">🟢 {text.success}</option>
                    <option value="failed">🔴 {text.failed}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Execution entries table */}
            {filteredExecutions.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-slate-900 rounded-2xl">
                <Activity size={24} className="text-slate-600 mb-2 mx-auto" />
                <p className="text-xs text-slate-400 font-bold max-w-md mx-auto leading-relaxed">{text.noData}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300 border-collapse">
                  <thead>
                    <tr className="border-b border-slate-900 text-slate-550 font-extrabold uppercase tracking-wider text-[10px] bg-slate-900/10">
                      <th className="py-3 px-3">{text.date}</th>
                      <th className="py-3 px-3">{text.flow}</th>
                      <th className="py-3 px-3">{text.latency}</th>
                      <th className="py-3 px-3">{text.cost}</th>
                      <th className="py-3 px-3">{text.tokens}</th>
                      <th className="py-3 px-3">{text.status}</th>
                      <th className="py-3 px-3 text-right">{text.actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900">
                    {filteredExecutions.map((log) => {
                      const statusCol = log.status === 'success' ? 'text-emerald-400 bg-emerald-950/20 border-emerald-900/40' : 'text-rose-400 bg-rose-950/20 border-rose-900/40';
                      return (
                        <tr key={log.id} className="hover:bg-slate-900/20 transition-all">
                          <td className="py-3 px-3 font-mono text-[10px] text-slate-450">
                            {new Date(log.startedAt).toLocaleString()}
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-slate-200 block truncate max-w-xs">{log.graphName}</span>
                            <span className="font-mono text-[9px] text-slate-500 block">ID: {log.graphId}</span>
                          </td>
                          <td className="py-3 px-3 font-mono text-[10px] text-slate-300 font-bold">
                            {(log.totalLatencyMs / 1000).toFixed(2)}s
                          </td>
                          <td className="py-3 px-3 font-mono text-[10px] text-emerald-450 font-extrabold">
                            ${log.totalCostUsd.toFixed(5)}
                          </td>
                          <td className="py-3 px-3 font-mono text-[10px] text-slate-300">
                            {log.totalTokens}
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded border text-[9px] font-extrabold uppercase ${statusCol}`}>
                              {log.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => setSelectedTrace(log)}
                              className="text-slate-400 hover:text-emerald-450 transition-colors p-1.5 bg-slate-900 rounded-lg hover:bg-slate-850 inline-flex items-center gap-1 text-[10px] font-bold cursor-pointer border border-transparent hover:border-emerald-500/20"
                            >
                              <span>Trace Diagnostics</span>
                              <ChevronRight size={10} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Section 1: Circuit Breaker Panel */}
          <div className="bg-slate-950 border border-slate-900 rounded-2xl p-5 space-y-4 animate-fadeIn">
            <div className="flex justify-between items-center border-b border-slate-900 pb-3">
              <div>
                <h3 className="text-xs font-black uppercase text-slate-100 flex items-center gap-1.5">
                  <Zap size={14} className="text-purple-400" />
                  {currentLang === 'ru' ? 'Предохранители ИИ Провайдеров' : 'AI Provider Circuit Breakers'}
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {currentLang === 'ru' 
                    ? 'Живой мониторинг блокировок вызовов для падающих или перегруженных LLM API.' 
                    : 'Real-time watch loops blocking connection flooding to failing AI models.'}
                </p>
              </div>
              <button
                onClick={fetchResilienceData}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 hover:text-purple-400 text-slate-500 transition-colors border border-slate-850 cursor-pointer"
              >
                <RefreshCw size={11} className={resilienceLoading ? 'animate-spin' : ''} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {breakers.map((cb) => {
                const isClosed = cb.state === 'CLOSED';
                const isOpen = cb.state === 'OPEN';
                const isHalfOpen = cb.state === 'HALF_OPEN';

                let stateBadge = 'bg-emerald-950/40 text-emerald-450 border-emerald-900/40';
                let stateLabel = 'HEALTHY / CLOSED';
                if (isOpen) {
                  stateBadge = 'bg-rose-950/40 text-rose-450 border-rose-900/40 animate-pulse';
                  stateLabel = 'TRIPPED / OPEN';
                } else if (isHalfOpen) {
                  stateBadge = 'bg-amber-950/40 text-amber-450 border-amber-900/40';
                  stateLabel = 'RECOVERING / HALF';
                }

                return (
                  <div key={cb.name} className="bg-slate-900/40 border border-slate-900 rounded-xl p-4 space-y-3 relative overflow-hidden">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-bold text-slate-200">{cb.name}</h4>
                        <span className="text-[9px] text-slate-500 font-mono">cb_llm_{cb.name.toLowerCase()}</span>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded border text-[8px] font-extrabold uppercase ${stateBadge}`}>
                        {stateLabel}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono bg-slate-950/40 p-2 rounded-lg border border-slate-900">
                      <div>
                        <span className="text-slate-500 block text-[8px] uppercase">Failures</span>
                        <span className={`font-bold ${cb.failureCount > 0 ? 'text-rose-450' : 'text-slate-400'}`}>
                          {cb.failureCount} / {cb.failureThreshold}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[8px] uppercase">Successes</span>
                        <span className="text-emerald-450 font-bold">{cb.successCount}</span>
                      </div>
                    </div>

                    <div className="text-[9px] text-slate-500 font-mono flex justify-between items-center leading-none pt-1">
                      <span>Timeout: {(cb.resetTimeout / 1000).toFixed(0)}s</span>
                      {cb.lastFailureTime && (
                        <span className="text-rose-500/80">
                          {new Date(cb.lastFailureTime).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Chaos Engineering Control Panel */}
          <div className="bg-slate-950 border border-slate-900 rounded-2xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-900 pb-3">
              <div>
                <h3 className="text-xs font-black uppercase text-slate-100 flex items-center gap-1.5">
                  <Flame size={14} className="text-rose-500" />
                  {currentLang === 'ru' ? 'Режим Chaos Engineering & Внедрение Сбоев' : 'Chaos Engineering Sandbox Panel'}
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {currentLang === 'ru'
                    ? 'Тестирование устойчивости ИИ-оркестратора при падении БД, задержках или зависании узлов.'
                    : 'Force failure states to witness self-healing circuit breakers in action.'}
                </p>
              </div>
              <button
                onClick={handleResetChaos}
                className="text-[10px] font-black uppercase tracking-wider px-3 py-1.5 bg-rose-950/20 text-rose-400 border border-rose-900/30 hover:bg-rose-950/40 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw size={10} />
                {currentLang === 'ru' ? 'Сбросить все сбои' : 'Reset All Disruptions'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card A: Database Disruption */}
              <div className="bg-slate-900/30 border border-slate-900 rounded-xl p-4 space-y-4">
                <h4 className="text-[11px] font-extrabold uppercase text-slate-300 flex items-center gap-1.5 border-b border-slate-900 pb-2">
                  <Database size={12} className="text-sky-450" />
                  {currentLang === 'ru' ? 'Уровень Базы Данных' : 'Database Persistence Layer'}
                </h4>

                <div className="space-y-3">
                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-[11px] text-slate-400 group-hover:text-slate-300 transition-colors">
                      {currentLang === 'ru' ? 'Симулировать падение БД' : 'Forced Database Outage'}
                    </span>
                    <input
                      type="checkbox"
                      checked={!!chaosConfig.dbFailureActive}
                      onChange={(e) => handleUpdateChaosConfig({ dbFailureActive: e.target.checked })}
                      className="accent-purple-500 cursor-pointer w-4 h-4"
                    />
                  </label>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-slate-500">{currentLang === 'ru' ? 'Задержка БД' : 'Injected DB Latency'}</span>
                      <span className="text-purple-400 font-bold">{chaosConfig.dbLatencyMs || 0} ms</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1500"
                      step="50"
                      value={chaosConfig.dbLatencyMs || 0}
                      onChange={(e) => handleUpdateChaosConfig({ dbLatencyMs: Number(e.target.value) })}
                      className="w-full accent-purple-500 bg-slate-900 h-1 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Card B: LLM Provider Disruption */}
              <div className="bg-slate-900/30 border border-slate-900 rounded-xl p-4 space-y-4">
                <h4 className="text-[11px] font-extrabold uppercase text-slate-300 flex items-center gap-1.5 border-b border-slate-900 pb-2">
                  <Sliders size={12} className="text-emerald-400" />
                  {currentLang === 'ru' ? 'ИИ Провайдеры (API)' : 'AI Provider API Channels'}
                </h4>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Inject Failures (429 Quota Exceeded)</span>
                    {['Gemini', 'OpenAI', 'Anthropic', 'Ollama'].map((prov) => (
                      <label key={prov} className="flex items-center justify-between cursor-pointer group">
                        <span className="text-[10px] text-slate-400 group-hover:text-slate-300 transition-colors">
                          Crash {prov} calls
                        </span>
                        <input
                          type="checkbox"
                          checked={!!chaosConfig.llmFailureActive?.[prov]}
                          onChange={(e) => {
                            const active = { ...(chaosConfig.llmFailureActive || {}), [prov]: e.target.checked };
                            handleUpdateChaosConfig({ llmFailureActive: active });
                          }}
                          className="accent-purple-500 cursor-pointer w-3.5 h-3.5"
                        />
                      </label>
                    ))}
                  </div>

                  <div className="space-y-1 pt-1 border-t border-slate-900">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-slate-500">{currentLang === 'ru' ? 'Задержка всех LLM' : 'Global LLM Delay'}</span>
                      <span className="text-emerald-450 font-bold">{chaosConfig.llmLatencyMs?.all || 0} ms</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="3000"
                      step="100"
                      value={chaosConfig.llmLatencyMs?.all || 0}
                      onChange={(e) => {
                        const lat = { ...(chaosConfig.llmLatencyMs || {}), all: Number(e.target.value) };
                        handleUpdateChaosConfig({ llmLatencyMs: lat });
                      }}
                      className="w-full accent-emerald-500 bg-slate-900 h-1 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Card C: Orchestrator Node Hanging */}
              <div className="bg-slate-900/30 border border-slate-900 rounded-xl p-4 space-y-4">
                <h4 className="text-[11px] font-extrabold uppercase text-slate-300 flex items-center gap-1.5 border-b border-slate-900 pb-2">
                  <Clock size={12} className="text-amber-450" />
                  {currentLang === 'ru' ? 'Зависание Рабочих Узлов' : 'Workflow Worker Nodes'}
                </h4>

                <div className="space-y-3">
                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-[11px] text-slate-400 group-hover:text-slate-300 transition-colors">
                      {currentLang === 'ru' ? 'Имитировать зависание узла' : 'Simulate Node Execution Hang'}
                    </span>
                    <input
                      type="checkbox"
                      checked={!!chaosConfig.nodeHangActive?.all}
                      onChange={(e) => {
                        const active = { ...(chaosConfig.nodeHangActive || {}), all: e.target.checked };
                        handleUpdateChaosConfig({ nodeHangActive: active });
                      }}
                      className="accent-purple-500 cursor-pointer w-4 h-4"
                    />
                  </label>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-slate-500">{currentLang === 'ru' ? 'Время зависания' : 'Forced Hang Duration'}</span>
                      <span className="text-amber-400 font-bold">{chaosConfig.nodeHangMs?.all || 5000} ms</span>
                    </div>
                    <input
                      type="range"
                      min="1000"
                      max="10000"
                      step="500"
                      value={chaosConfig.nodeHangMs?.all || 5000}
                      onChange={(e) => {
                        const ms = { ...(chaosConfig.nodeHangMs || {}), all: Number(e.target.value) };
                        handleUpdateChaosConfig({ nodeHangMs: ms });
                      }}
                      className="w-full accent-amber-500 bg-slate-900 h-1 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div className="p-3 bg-amber-950/10 border border-amber-900/20 text-amber-500/95 rounded-xl text-[9px] font-medium leading-relaxed">
                    💡 {currentLang === 'ru' 
                      ? 'При активации каждый узел графа будет принудительно задерживать выполнение, симулируя тайм-аут или зависший поток.' 
                      : 'Hangs execution of every pipeline step, testing scheduler concurrency and timeout thresholds.'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detailing diagnostics log Drawer sliding modal */}
      <AnimatePresence>
        {selectedTrace && (
          <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-sm">
            {/* Close trigger overlay area */}
            <div className="absolute inset-0" onClick={() => setSelectedTrace(null)} />

            {/* Panel sliding sheet container */}
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-2xl bg-slate-950 border-l border-slate-900 h-screen flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Drawer header */}
              <div className="p-5 border-b border-slate-900 flex justify-between items-center bg-slate-950">
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-100 flex items-center gap-1.5">
                    <Database size={13} className="text-emerald-400" />
                    Telepath Trace Diagnostics
                  </h3>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">{selectedTrace.id}</p>
                </div>
                <button
                  onClick={() => setSelectedTrace(null)}
                  className="text-slate-400 hover:text-slate-100 font-bold p-1 text-lg"
                >
                  &times;
                </button>
              </div>

              {/* Drawer content body scroll */}
              <div className="p-6 overflow-y-auto space-y-5 flex-1 select-none">
                {/* Highlights telemetry details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 bg-slate-900/40 p-3.5 rounded-xl border border-slate-900 font-mono text-[10px]">
                  <div>
                    <span className="text-slate-500 block text-[8px] uppercase font-bold">Total tokens density</span>
                    <span className="text-slate-200 mt-0.5 block font-bold">{selectedTrace.totalTokens} tkn</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[8px] uppercase font-bold">Aggregate dollar cost</span>
                    <span className="text-emerald-450 mt-0.5 block font-extrabold">${selectedTrace.totalCostUsd.toFixed(5)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[8px] uppercase font-bold">Step execution Delay</span>
                    <span className="text-slate-200 mt-0.5 block font-bold">{(selectedTrace.totalLatencyMs / 1000).toFixed(2)}s</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[8px] uppercase font-bold">Workflow safety outcomes</span>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold mt-0.5 block inline-block truncate max-w-[100px] text-center ${selectedTrace.status === 'success' ? 'bg-emerald-950 text-emerald-450 border border-emerald-900' : 'bg-rose-950 text-rose-450 border border-rose-900'}`}>
                      {selectedTrace.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                {selectedTrace.errorMessage && (
                  <div className="p-4 rounded-xl border border-rose-950 bg-rose-950/20 text-rose-400 space-y-1">
                    <h5 className="text-[10px] font-bold uppercase flex items-center gap-1">
                      <ShieldAlert size={12} /> System Interruption Message
                    </h5>
                    <p className="text-xs font-mono whitespace-pre-wrap">{selectedTrace.errorMessage}</p>
                  </div>
                )}

                {/* List of node-level operations */}
                <div className="space-y-3.5">
                  <h4 className="text-[10px] font-black uppercase text-slate-450 tracking-wider">
                    Trace Step-by-Step Node Executions
                  </h4>

                  {selectedTrace.nodeExecutions.length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic bg-slate-900/20 p-4 rounded-xl text-center">
                      No incremental sub-node logs captured for this workflow trigger.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {selectedTrace.nodeExecutions.map((nExec, idx) => {
                        const tokenString = nExec.tokensUsed > 0 ? `${nExec.tokensUsed} tokens (~$${nExec.costUsd.toFixed(5)})` : 'Negligible local call ($0)';
                        return (
                          <div key={nExec.id || idx} className="p-4 bg-slate-950 rounded-xl border border-slate-900 hover:border-slate-850 transition-all space-y-3">
                            {/* Inner header */}
                            <div className="flex justify-between items-center text-[10px] border-b border-slate-900 pb-1.5">
                              <span className="font-extrabold text-slate-200 flex items-center gap-1.5 uppercase font-mono">
                                <span className="text-slate-500 text-[8px]">#{idx+1}</span>
                                {nExec.nodeId}
                              </span>
                              <div className="font-mono text-[9px] text-slate-450 flex items-center gap-2">
                                <span>{tokenString}</span>
                                <span className="text-slate-600">|</span>
                                <span className="font-bold text-slate-350">{nExec.latencyMs}ms</span>
                              </div>
                            </div>

                            {/* Previews inputs outputs */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[10px] font-mono">
                              <div className="space-y-1">
                                <span className="text-slate-550 block text-[8px] uppercase font-bold">Input Payload preview</span>
                                <pre className="p-2.5 rounded bg-slate-950 border border-slate-900 text-slate-400 whitespace-pre-wrap select-text selection:bg-slate-800 line-clamp-4 leading-normal">
                                  {nExec.inputPreview || '[Empty Input]'}
                                </pre>
                              </div>
                              <div className="space-y-1">
                                <span className="text-slate-550 block text-[8px] uppercase font-bold">Outcome Response preview</span>
                                <pre className="p-2.5 rounded bg-slate-950 border border-slate-900 text-slate-300 whitespace-pre-wrap select-text selection:bg-slate-800 line-clamp-4 leading-normal">
                                  {nExec.outputPreview || '[Empty Output]'}
                                </pre>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Drawer footer */}
              <div className="p-4 border-t border-slate-900 text-right bg-slate-950">
                <button
                  onClick={() => setSelectedTrace(null)}
                  className="px-4 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-850 rounded-lg text-slate-400 border border-slate-850 cursor-pointer"
                >
                  Close Diagnostic view
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
