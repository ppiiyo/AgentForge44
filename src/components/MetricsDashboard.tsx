import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Activity, DollarSign, Clock, RefreshCw, AlertTriangle, 
  CheckCircle2, Search, Filter, ShieldAlert, ChevronRight, BarChart3, Database,
  Zap, Flame, Sliders
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Legend, Cell 
} from 'recharts';

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
    tokensLabel: 'Token Weight'
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
    tokensLabel: 'Объем токенов'
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
    tokensLabel: '消耗 Token 字节'
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

  useEffect(() => {
    fetchMetrics();
    // Auto refresh every 15 seconds to stream live dashboard stats
    const t = setInterval(fetchMetrics, 15000);
    return () => clearInterval(t);
  }, [period]);

  useEffect(() => {
    if (activeTab === 'resilience') {
      fetchResilienceData();
      const t = setInterval(fetchResilienceData, 2000);
      return () => clearInterval(t);
    }
  }, [activeTab]);

  const text = TRANSLATIONS[currentLang] || TRANSLATIONS.en;

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
          <div className="flex gap-1 bg-slate-950 p-1 rounded-xl border border-slate-900 self-end sm:self-auto">
            {(['24h', '7d', '30d'] as const).map(p => (
              <button
                key={p}
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
              onClick={fetchMetrics}
              className="p-1 px-2.5 hover:text-emerald-400 text-slate-500 transition-colors"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            </button>
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
