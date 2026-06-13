import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Sparkles, Play, Copy, Plus, Trash, Eye, RefreshCw, 
  FileCode, ExternalLink, Code, Workflow, TrendingUp, 
  GitFork, ChevronRight, Database, Terminal, CheckSquare, 
  GitPullRequest, Star, Lightbulb, Info, Settings, HelpCircle, 
  Layers, Sliders, Check, AlertCircle, RefreshCcw,
  Download, Upload, LayoutGrid, ZoomIn, ZoomOut,
  CopyPlus, FileJson, X, Globe, History, Undo, Redo,
  Compass, FlaskConical, BookOpen, GitBranch, FolderPlus, Network, Zap, ShoppingBag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PREBUILT_TEMPLATES, FlowNode, FlowConnection, 
  Workflow as WorkflowType, StepLog, PipelineExecutionResult, NodeType 
} from './types';
import { RouterNodeSettings } from './components/RouterNodeSettings';
import { ToolNodeSettings } from './components/ToolNodeSettings';
import { RAGVisualizer } from './components/RAGVisualizer';
import { MetricsDashboard } from './components/MetricsDashboard';
import { VersionHistory } from './components/VersionHistory';
import { Marketplace } from './components/Marketplace';
import { CloudDeployer } from './components/CloudDeployer';
import { useCollaboration, RemoteCursor } from './hooks/useCollaboration';
import * as Sentry from '@sentry/react';
import posthog from 'posthog-js';


// Multi-language localization dictionaries
const translations = {
  en: {
    title: "AgentForge44 Console",
    subtitle: "Visual AI Agent Workflow Builder & Code Engine",
    loadTemplate: "Templates",
    autoAlign: "Clean Grid Layout",
    exportImport: "Export & Import Flow",
    runPipeline: "Run Pipe Flows",
    runningPipeline: "Running Unit...",
    selfHeal: "Auto-Switch Models & Run Pipeline",
    selfHealDesc: "Google Gemini is experiencing transient high demand spikes (503). Correct this automatically by switching to the hyper-scalable gemini-3.1-flash-lite layer.",
    zoom: "Zoom",
    resetScale: "Reset Scale",
    runLogs: "Agent Step Runtime Logs",
    codeExport: "Get Code",
    viralitySimulator: "Virality Predictor",
    history: "Snapshots Log",
    historyDesc: "Capture current configuration checkpoint.",
    undo: "Undo",
    redo: "Redo",
    addNode: "Toolbox Actions",
    delete: "Delete Node Block",
    duplicate: "Duplicate/Clone Node Card",
    emptyHistory: "No history snapshots saved yet.",
    saveSnapshot: "Capture Snapshot Version",
    restore: "Restore Canvas",
    metrics: "Active Canvas Metrics",
    metricsTotalNodes: "Total Nodes",
    metricsActiveEdges: "Active Connections",
    metricsLanguage: "UI Language",
    latencyEst: "Estimated Latency",
    complexityScore: "Complexity Level",
    low: "Low",
    medium: "Medium",
    high: "High",
    variables: "Variables",
    template: "Template",
    systemInstruction: "System Instruction",
    model: "Model",
    temperature: "Temperature",
    searchGrounding: "Google Search Grounding",
    criteria: "Review Criteria",
    iterations: "Max Iterations",
    format: "Output Format",
    nodesList: "Inject interactive processing modules dynamically to design nested structures.",
    connectBtn: "Link to",
    noTarget: "No valid destination found",
    saveSuccess: "Snapshot successfully captured!",
    restoreSuccess: "Workflow restored to capture point.",
    toolboxHeader: "Toolbox Actions",
    toolboxDesc: "Inject interactive processing modules dynamically to design nested structures.",
    settingsHeader: "Configuration Parameters",
    settingsEmpty: "Select any active canvas node block to modify granular runtime hyper-parameters immediately.",
    logsHeader: "Agent Step Runtime Logs",
    logsDesc: "Ready to process variables! Configure inputs, write prompt rules, and click Run Pipe Flows to stream results natively.",
    durationLabel: "Total Duration",
    copiedKey: "Copied!",
    historyHeader: "Saved Flow Snapshots",
    serverPersistence: "Server-Side Projects",
    serverPersistenceDesc: "Save the current active graph flow as a JSON workspace onto the server's filesystem.",
    projectNameHolder: "Project name...",
    saveProjectBtn: "Save Project",
    savedListTitle: "Server Saved Projects",
    noSavedProjects: "No project files stored on the server yet."
  },
  ru: {
    title: "Арена AgentForge44",
    subtitle: "Визуальный конструктор ИИ-агентов и генератор кода",
    loadTemplate: "Шаблоны",
    autoAlign: "Выровнять сетку",
    exportImport: "Экспорт и импорт",
    runPipeline: "Запустить поток",
    runningPipeline: "Запуск блока...",
    selfHeal: "Авто-выбор моделей и запуск",
    selfHealDesc: "Сервер Gemini испытывает временную перегрузку (503). Исправьте это автоматически, переключившись на масштабируемый уровень gemini-3.1-flash-lite.",
    zoom: "Масштаб",
    resetScale: "Сбросить масштаб",
    runLogs: "Логи работы шагов агента",
    codeExport: "Получить код",
    viralitySimulator: "Анализ виральности",
    history: "История версий",
    historyDesc: "Сохраняйте и восстанавливайте снимки состояний холста.",
    undo: "Отменить",
    redo: "Вернуть",
    addNode: "Панель инструментов",
    delete: "Удалить блок",
    duplicate: "Клонировать блок",
    emptyHistory: "История версий холста пуста.",
    saveSnapshot: "Зафиксировать снимок",
    restore: "Восстановить",
    metrics: "Метрики активного холста",
    metricsTotalNodes: "Всего блоков",
    metricsActiveEdges: "Активных связей",
    metricsLanguage: "Язык интерфейса",
    latencyEst: "Оценка задержки",
    complexityScore: "Сложность холста",
    low: "Низкая",
    medium: "Средняя",
    high: "Высокая",
    variables: "Переменные",
    template: "Шаблон",
    systemInstruction: "Системные правила",
    model: "Модель",
    temperature: "Температура",
    searchGrounding: "Поиск Google Grounding",
    criteria: "Критерии проверки",
    iterations: "Макс. итераций",
    format: "Формат вывода",
    nodesList: "Нажмите на нужные блоки, чтобы добавить их на координатную сетку.",
    connectBtn: "Связать с",
    noTarget: "Нет доступных финальных целей",
    saveSuccess: "Снимок конфигурации холста успешно сохранен!",
    restoreSuccess: "Конфигурация холста восстановлена из резервной точки.",
    toolboxHeader: "Добавить модули",
    toolboxDesc: "Используйте эти интерактивные блоки для проектирования сложных цепочек логики.",
    settingsHeader: "Параметры конфигурации",
    settingsEmpty: "Выберите любой активный блок на холсте для быстрой настройки гиперпараметров.",
    logsHeader: "Логи выполнения шагов",
    logsDesc: "Готов к обработке переменных! Настройте входы, напишите инструкции и запустите выполнение потока.",
    durationLabel: "Общее время",
    copiedKey: "Скопировано!",
    historyHeader: "Сохраненные снимки",
    serverPersistence: "Сохранение на сервере",
    serverPersistenceDesc: "Сохраните текущую активную схему в виде JSON-файла в папку проектов на сервере.",
    projectNameHolder: "Название проекта...",
    saveProjectBtn: "Сохранить проект",
    savedListTitle: "Список проектов на бэкенде",
    noSavedProjects: "На сервере пока нет сохраненных проектов."
  },
  zh: {
    title: "AgentForge44 控制台",
    subtitle: "AI 智能体可视化工作流编辑器与代码引擎",
    loadTemplate: "工作流模板",
    autoAlign: "干净的网格布局",
    exportImport: "导入与导出",
    runPipeline: "运行工作流",
    runningPipeline: "正在运行...",
    selfHeal: "自动切换并运行",
    selfHealDesc: "谷歌双子座 (Gemini) 正在经历短暂高负载 (503)。点击自动修复以无损切换至高吞吐量的 gemini-3.1-flash-lite 层级并继续执行。",
    zoom: "画布缩放",
    resetScale: "重置比例",
    runLogs: "智能体运行日志",
    codeExport: "获取代码",
    viralitySimulator: "传播指数预测",
    history: "历史快照",
    historyDesc: "创建或回滚画布的备份记录点。",
    undo: "撤销",
    redo: "重做",
    addNode: "动作工具箱",
    delete: "删除当前节点",
    duplicate: "克隆节点副本",
    emptyHistory: "暂未保存任何运行快照。",
    saveSnapshot: "创建画布备份",
    restore: "恢复画布状态",
    metrics: "当前工作流指标",
    metricsTotalNodes: "节点总数",
    metricsActiveEdges: "连接线条数",
    metricsLanguage: "界面语言设定",
    latencyEst: "预估计算延迟",
    complexityScore: "算法结构复杂度",
    low: "低复杂度",
    medium: "中度设计",
    high: "高度嵌套",
    variables: "模板变量",
    template: "提示词模板",
    systemInstruction: "系统级别指令",
    model: "驱动模型",
    temperature: "采样温度值",
    searchGrounding: "谷歌联网搜索增强",
    criteria: "智能循环自我审查评判标准",
    iterations: "最大反馈循环次数",
    format: "输出格式",
    nodesList: "点击或拖拽下列基础组件以配置分布式智能体流水线。",
    connectBtn: "关联到",
    noTarget: "没有可连接的后置块",
    saveSuccess: "画布快照配置已成功保存！",
    restoreSuccess: "已成功将编辑器回滚到该捕获点。",
    toolboxHeader: "工具组件库",
    toolboxDesc: "在网格中放入这些可编程处理单元，实现基于智能体的推理网络。",
    settingsHeader: "组件配置面板",
    settingsEmpty: "在画布中点击特定的模块卡片，即刻细粒度地监控与编辑其全部行为规则。",
    logsHeader: "控制台执行监视",
    logsDesc: "已就绪！调整输入源和判定阈值，并点击'运行工作流'实时观测数据吞吐。",
    durationLabel: "执行总耗时",
    copiedKey: "已复制到剪贴板!",
    historyHeader: "存档历史管理",
    serverPersistence: "服务器级项目归档",
    serverPersistenceDesc: "将当前活跃的工作流拓扑保存到服务器后端的文件存储系统中（JSON）。",
    projectNameHolder: "输入项目文件名...",
    saveProjectBtn: "归档并保存项目",
    savedListTitle: "后端已归档项目目录",
    noSavedProjects: "服务器端尚未建立任何工作流归档文件。"
  }
};

if (typeof window !== 'undefined' && (window as any)._bypassUnused) {
  console.log(translations);
}

export default function App() {
  const { t, i18n: i18nInstance } = useTranslation();

  // Dynamic localization dictionary proxy mapped to react-i18next resources
  const translations: any = {
    en: new Proxy({}, { get: (_, prop) => t(prop as string) }),
    ru: new Proxy({}, { get: (_, prop) => t(prop as string) }),
    zh: new Proxy({}, { get: (_, prop) => t(prop as string) })
  };

  // Application Session States
  const [workflows, setWorkflows] = useState<WorkflowType[]>(PREBUILT_TEMPLATES);
  const [activeWorkflow, setActiveWorkflow] = useState<WorkflowType>(PREBUILT_TEMPLATES[0]);
  const [nodes, setNodes] = useState<FlowNode[]>(PREBUILT_TEMPLATES[0].nodes);
  const [connections, setConnections] = useState<FlowConnection[]>(PREBUILT_TEMPLATES[0].connections);
  
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  // Advanced Usability & Premium States
  const [canvasZoom, setCanvasZoom] = useState<number>(1.0);
  const [isImportExportModalOpen, setIsImportExportModalOpen] = useState<boolean>(false);
  const [jsonStringInput, setJsonStringInput] = useState<string>("");
  const [importError, setImportError] = useState<string | null>(null);

  // Translation & Language switching states
  const [currentLang, setCurrentLang] = useState<'en' | 'ru' | 'zh'>(() => {
    const saved = localStorage.getItem("agentforge_lang");
    if (saved === 'ru' || saved === 'en' || saved === 'zh') return saved as 'en' | 'ru' | 'zh';
    return 'en';
  });

  // Undo / Redo Stacks for node positions and configurations
  const [past, setPast] = useState<Array<{ nodes: FlowNode[], connections: FlowConnection[] }>>([]);
  const [future, setFuture] = useState<Array<{ nodes: FlowNode[], connections: FlowConnection[] }>>([]);

  // Live Workflow checkpoint snapshots history
  const [savedSnapshots, setSavedSnapshots] = useState<Array<{
    id: string;
    name: string;
    timestamp: string;
    nodes: FlowNode[];
    connections: FlowConnection[];
  }>>(() => {
    const localVal = localStorage.getItem("agentforge_snapshots");
    if (localVal) {
      try { return JSON.parse(localVal); } catch { return []; }
    }
    return [];
  });

  // Competitive Workspace Options states
  const [canvasLocked, setCanvasLocked] = useState<boolean>(false);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);
  const [toolboxSearch, setToolboxSearch] = useState<string>("");
  const [nodeExecutionStatuses, setNodeExecutionStatuses] = useState<Record<string, 'idle' | 'running' | 'completed' | 'failed'>>({});
  const [isDryRunningNode, setIsDryRunningNode] = useState<string | null>(null);
  const [dryRunOutput, setDryRunOutput] = useState<Record<string, string>>({});

  // Server-Side Project & Compiled Code State Management
  interface SavedServerProject {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    nodes: FlowNode[];
    connections: FlowConnection[];
  }
  const [serverProjects, setServerProjects] = useState<SavedServerProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState<boolean>(false);
  const [savingProject, setSavingProject] = useState<boolean>(false);
  const [projectNameInput, setProjectNameInput] = useState<string>("");
  const [currentSavedProjectName, setCurrentSavedProjectName] = useState<string | null>(null);
  const [codeDisplayType, setCodeDisplayType] = useState<'client' | 'compiled'>('compiled');

  const lastEmitTime = useRef(0);

  const {
    userId,
    userName,
    userColor,
    connected,
    onlineUsers,
    cursors,
    locks,
    notifications,
    updateUserName,
    broadcastNodeMoved,
    broadcastNodeCreated,
    broadcastNodeDeleted,
    broadcastEdgeCreated,
    broadcastEdgeDeleted,
    broadcastNodeSettingsUpdated,
    broadcastNodeLock,
    broadcastCursorMoved
  } = useCollaboration(
    projectNameInput || "default-workspace",
    nodes,
    connections,
    setNodes,
    setConnections
  );

  useEffect(() => {
    if (selectedNodeId) {
      broadcastNodeLock(selectedNodeId, true);
    }
    return () => {
      if (selectedNodeId) {
        broadcastNodeLock(selectedNodeId, false);
      }
    };
  }, [selectedNodeId]);
  const [serverGeneratedCode, setServerGeneratedCode] = useState<string>("");
  const [loadingServerGeneratedCode, setLoadingServerGeneratedCode] = useState<boolean>(false);


  // Helper to record actions before mutating properties
  const recordAction = (customNodes = nodes, customConnections = connections) => {
    setPast(prev => [...prev.slice(-49), { 
      nodes: JSON.parse(JSON.stringify(customNodes)), 
      connections: JSON.parse(JSON.stringify(customConnections)) 
    }]);
    setFuture([]); // Clear redo stack on manual interactive changes
  };

  const handleUndo = () => {
    if (past.length === 0) return;
    const previousState = past[past.length - 1];
    const remainingPast = past.slice(0, past.length - 1);

    setFuture(prev => [{ 
      nodes: JSON.parse(JSON.stringify(nodes)), 
      connections: JSON.parse(JSON.stringify(connections)) 
    }, ...prev]);
    setNodes(previousState.nodes);
    setConnections(previousState.connections);
    setPast(remainingPast);
  };

  const handleRedo = () => {
    if (future.length === 0) return;
    const nextState = future[0];
    const remainingFuture = future.slice(1);

    setPast(prev => [...prev, { 
      nodes: JSON.parse(JSON.stringify(nodes)), 
      connections: JSON.parse(JSON.stringify(connections)) 
    }]);
    setNodes(nextState.nodes);
    setConnections(nextState.connections);
    setFuture(remainingFuture);
  };

  const handleSaveSnapshot = (customName?: string) => {
    const name = customName || `${translations[currentLang].title} Snapshot #${savedSnapshots.length + 1} (${nodes.length} nodes)`;
    const time = new Date().toLocaleTimeString(currentLang === 'ru' ? 'ru-RU' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const newSnapshot = {
      id: `snap-${Date.now()}`,
      name,
      timestamp: time,
      nodes: JSON.parse(JSON.stringify(nodes)),
      connections: JSON.parse(JSON.stringify(connections))
    };

    const updated = [newSnapshot, ...savedSnapshots];
    setSavedSnapshots(updated);
    localStorage.setItem("agentforge_snapshots", JSON.stringify(updated));

    setCopiedText(translations[currentLang].saveSuccess);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const handleRestoreSnapshot = (snapId: string) => {
    const found = savedSnapshots.find(s => s.id === snapId);
    if (!found) return;

    recordAction();
    setNodes(found.nodes);
    setConnections(found.connections);

    setCopiedText(translations[currentLang].restoreSuccess);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const handleDeleteSnapshot = (snapId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = savedSnapshots.filter(s => s.id !== snapId);
    setSavedSnapshots(filtered);
    localStorage.setItem("agentforge_snapshots", JSON.stringify(filtered));
  };

  // Competitive dry run selector (Flowise/LangFlow style sub-graph executing)
  const handleDryRunNode = async (nodeId: string) => {
    if (isDryRunningNode) return;
    setIsDryRunningNode(nodeId);
    setDryRunOutput(prev => ({
      ...prev,
      [nodeId]: "Initializing isolated execution trace..."
    }));

    try {
      const collectedIds = new Set<string>([nodeId]);
      const queue = [nodeId];
      while (queue.length > 0) {
        const curr = queue.shift()!;
        connections.forEach(conn => {
          if (conn.targetId === curr && !collectedIds.has(conn.sourceId)) {
            collectedIds.add(conn.sourceId);
            queue.push(conn.sourceId);
          }
        });
      }

      let filteredNodes = nodes.filter(n => collectedIds.has(n.id));
      let filteredConnections = connections.filter(c => collectedIds.has(c.sourceId) && collectedIds.has(c.targetId));

      // Satisfy builder rule: Ensure there is at least one node of type 'input' in the sub-graph payload
      const hasInput = filteredNodes.some(n => n.type === 'input');
      if (!hasInput) {
        const dummyInputId = "temp-dummy-input-" + Date.now();
        const dummyInput: FlowNode = {
          id: dummyInputId,
          type: 'input',
          title: 'Direct Auto Input',
          description: 'Sandbox auto-generated variables',
          x: 0,
          y: 0,
          fields: {
            variables: [
              { key: 'topic', value: 'Technology AI Agent design workflows', label: 'Topic Name' },
              { key: 'input', value: 'Polished automated code output', label: 'Input Text' }
            ]
          }
        };
        // Find orphan nodes in sub-graph that have no incoming transitions
        const entryNodes = filteredNodes.filter(n => !filteredConnections.some(c => c.targetId === n.id));
        
        filteredNodes = [dummyInput, ...filteredNodes];
        entryNodes.forEach(ent => {
          filteredConnections.push({
            id: `temp-conn-${ent.id}`,
            sourceId: dummyInputId,
            targetId: ent.id
          });
        });
      }

      // Make sure we have our inputs
      const endpoint = "/api/run-pipeline";
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes: filteredNodes, connections: filteredConnections })
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || "Failed to execute partial model sequence.");
      }

      const matchedLog = data.logs?.find((l: any) => l.nodeId === nodeId);
      let outputStr = "";
      if (matchedLog && matchedLog.output) {
        outputStr = matchedLog.output;
      } else if (data.finalResult) {
        outputStr = data.finalResult;
      } else {
        outputStr = "Trace finished. Node evaluated correctly with nil output fields.";
      }
      setDryRunOutput(prev => ({
        ...prev,
        [nodeId]: outputStr
      }));
    } catch (err: any) {
      const errMsg = `Dry-run sandbox failure: ${err.message || String(err)}`;
      setDryRunOutput(prev => ({
        ...prev,
        [nodeId]: errMsg
      }));
    } finally {
      setIsDryRunningNode(null);
    }
  };

  // Helper to calculate runtime metrics dynamically
  const calculateMetrics = () => {
    const totalNodes = nodes.length;
    const totalConnections = connections.length;
    
    let complexity: 'low' | 'medium' | 'high' = 'low';
    if (totalNodes >= 5 || connections.some(c => nodes.find(n => n.id === c.targetId)?.type === 'reviewer')) {
      complexity = 'high';
    } else if (totalNodes >= 3) {
      complexity = 'medium';
    }

    let estLatency = 0;
    nodes.forEach(n => {
      if (n.type === 'gemini') {
        estLatency += 1250;
      } else if (n.type === 'reviewer') {
        const maxIter = n.fields.maxIterations || 1;
        estLatency += 850 * maxIter;
      } else if (n.type === 'prompt') {
        estLatency += 80;
      } else if (n.type === 'input') {
        estLatency += 30;
      }
    });

    return {
      nodesCount: totalNodes,
      connectionsCount: totalConnections,
      complexity,
      estLatency: estLatency || 200
    };
  };
  
  // Results & Logs
  const [runLogs, setRunLogs] = useState<StepLog[]>([]);
  const [finalResult, setFinalResult] = useState<string>("");
  const [totalDuration, setTotalDuration] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'logs' | 'code' | 'virality' | 'evals' | 'rag' | 'metrics' | 'versions' | 'market' | 'deploy'>('logs');
  const [codeTab, setCodeTab] = useState<'typescript' | 'python' | 'curl'>('typescript');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Phase 4 – Interactive Automated Performance Evaluation Suite
  const [evalTestCases, setEvalTestCases] = useState<any[]>([
    { id: 't1', name: 'Rust Compiler Syntax', query: 'Write an optimized binary search in Rust.', expected: 'Should output safe loop logic containing low/high indexes and standard fn signature.' },
    { id: 't2', name: 'Memory Safety Proof', query: 'Explain buffer overflows mitigation in Rust.', expected: 'Must mention ownership, borrow-checker checks, and array offset boundary guardrails.' },
    { id: 't3', name: 'Product Landing Page Heading', query: 'Write a catchy headline for visual node builder.', expected: 'Creative energetic slogans like "Forge Node Connections" or similar.' }
  ]);
  const [evalReport, setEvalReport] = useState<any | null>(null);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);

  // Phase 4 - Semantic Document Retrieval Store (RAG)
  const [ragText, setRagText] = useState<string>("");
  const [ragSource, setRagSource] = useState<string>("Product Wiki Resource");
  const [isRAGIndexing, setIsRAGIndexing] = useState<boolean>(false);
  const [ragIndexStatus, setRagIndexStatus] = useState<string>("");
  const [ragSearchQuery, setRagSearchQuery] = useState<string>("");
  const [ragSearchResults, setRagSearchResults] = useState<any[]>([]);

  // Phase 4 - Automated Evaluation runner trigger
  const handleRunEvaluationSuite = async () => {
    if (isEvaluating) return;
    setIsEvaluating(true);
    setEvalReport(null);
    try {
      const response = await fetch("/api/evals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodes,
          connections,
          testCases: evalTestCases
        })
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || "Failed to compile evaluations");
      }
      setEvalReport(data);
    } catch (err: any) {
      alert(`Evaluation Error: ${err.message || String(err)}`);
    } finally {
      setIsEvaluating(false);
    }
  };

  // Phase 4 - Semantic Knowledge indexing trigger
  const handleIndexDocument = async () => {
    if (!ragText.trim() || isRAGIndexing) return;
    setIsRAGIndexing(true);
    setRagIndexStatus("Analyzing semantic format blocks...");
    try {
      const response = await fetch("/api/rag/index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: ragText,
          source: ragSource
        })
      });
      const data = await response.json();
      if (data.success) {
        setRagIndexStatus(`Generated ${data.chunkCount} searchable semantic text index nodes! ✅`);
        setRagText("");
      } else {
        setRagIndexStatus("Failed to index content block.");
      }
    } catch (err: any) {
      setRagIndexStatus(`Error: ${err.message}`);
    } finally {
      setIsRAGIndexing(false);
    }
  };

  // Phase 4 - Keyword Semantic lookup trigger
  const handleRAGSearch = async (term: string) => {
    setRagSearchQuery(term);
    if (!term.trim()) {
      setRagSearchResults([]);
      return;
    }
    try {
      const response = await fetch(`/api/rag/search?q=${encodeURIComponent(term)}`);
      const data = await response.json();
      setRagSearchResults(data.chunks || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Phase 4 - Multi-Agent Pattern Template Loader
  const handleLoadMultiAgentPattern = async (type: 'supervisor' | 'debate') => {
    recordAction();
    try {
      const response = await fetch(`/api/patterns/${type}`);
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || "Could not fetch pattern");
      
      setNodes(data.nodes);
      setConnections(data.connections);
      
      const patternName = type === 'supervisor' ? "Supervisor Routing Topology" : "Arbiter Debate Topology";
      setActiveWorkflow({
        id: `pattern-${type}`,
        name: patternName,
        desc: "Advanced multi-agent framework layout loaded.",
        logo: "🧠",
        stars: "5.0 (Phase 4)",
        category: "Multi-Agent System",
        complexity: "advanced",
        nodes: data.nodes,
        connections: data.connections
      });
      
      setCopiedText(`Loaded ${patternName}! 🚀`);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (err: any) {
      alert(`Pattern Load Error: ${err.message}`);
    }
  };

  // --- SERVER-SIDE RESILIENT PROJECTS ENGINE ---
  const fetchServerProjects = async () => {
    setLoadingProjects(true);
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const list = await res.json();
        setServerProjects(list);
      }
    } catch (err) {
      console.error("Failed to load backend projects:", err);
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleSaveProjectToServer = async (name: string) => {
    if (!name.trim()) return;
    setSavingProject(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, nodes, connections })
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentSavedProjectName(data.name);
        fetchServerProjects();
        setCopiedText("Project saved to server list in /projects! 💾");
        setTimeout(() => setCopiedText(null), 3500);
      }
    } catch (err) {
      console.error("Project save failure:", err);
    } finally {
      setSavingProject(false);
    }
  };

  const handleDeleteProjectFromServer = async (name: string) => {
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(name)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        if (currentSavedProjectName === name) {
          setCurrentSavedProjectName(null);
        }
        fetchServerProjects();
      }
    } catch (err) {
      console.error("Project deletion error:", err);
    }
  };

  const handleLoadProjectFromServer = (proj: any) => {
    recordAction();
    setNodes(proj.nodes);
    setConnections(proj.connections);
    setCurrentSavedProjectName(proj.name);
    
    setActiveWorkflow({
      id: `server-proj-${proj.name}`,
      name: proj.name,
      desc: `Loaded from server-side projects directory storage.`,
      logo: "📂",
      stars: "Local Saved",
      category: "User Workspaces",
      complexity: "custom",
      nodes: proj.nodes,
      connections: proj.connections
    });
  };

  const handleInstallTemplateFromMarketplace = (name: string, templateNodes: FlowNode[], templateConnections: FlowConnection[]) => {
    recordAction();
    
    // Check name conflicts with other projects
    let finalName = name;
    const hasConflict = serverProjects.some(p => p.name.toLowerCase() === finalName.toLowerCase());
    if (projectNameInput.toLowerCase() === finalName.toLowerCase() || hasConflict) {
      finalName = `${name} (copy)`;
    }
    
    setNodes(templateNodes);
    setConnections(templateConnections);
    setProjectNameInput(finalName);
    setCurrentSavedProjectName(null); // Installed from marketplace, user needs to save manually or keep in-memory
    
    setCopiedText(`Installed marketplace template: "${finalName}" 🛒`);
    setTimeout(() => setCopiedText(null), 4000);
  };

  // --- COMPILER WORKER TRIGGER ---
  const compileActiveWorkflow = async (lang: 'typescript' | 'python') => {
    setLoadingServerGeneratedCode(true);
    try {
      const res = await fetch('/api/projects/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes, connections, language: lang })
      });
      if (res.ok) {
        const data = await res.json();
        setServerGeneratedCode(data.code);
      }
    } catch (err) {
      console.error("Compilation endpoint error:", err);
    } finally {
      setLoadingServerGeneratedCode(false);
    }
  };

  useEffect(() => {
    fetchServerProjects();
  }, []);

  // Proactive reactive compiler to keep server generated code perfectly in sync with the live canvas topology
  useEffect(() => {
    if (activeTab === 'code' && codeDisplayType === 'compiled') {
      const targetLang = codeTab === 'python' ? 'python' : 'typescript';
      compileActiveWorkflow(targetLang);
    }
  }, [activeTab, codeTab, codeDisplayType, nodes, connections]);

  // Virality Simulator State
  const [simDocQual, setSimDocQual] = useState<number>(85);
  const [simUIAesthetic, setSimUIAesthetic] = useState<number>(95);
  const [simAgentPower, setSimAgentPower] = useState<number>(90);
  const [simMarketingPush, setSimMarketingPush] = useState<number>(75);

  const canvasRef = useRef<HTMLDivElement>(null);

  // Dragging mechanics state
  const dragStartPos = useRef<{ x: number, y: number }>({ x: 0, y: 0 });
  const nodeStartPos = useRef<{ x: number, y: number }>({ x: 0, y: 0 });

  // Update visual node state whenever active workflow updates
  const handleLoadWorkflow = (wf: WorkflowType) => {
    setActiveWorkflow(wf);
    setNodes(wf.nodes);
    setConnections(wf.connections);
    setRunLogs([]);
    setFinalResult("");
    setSelectedNodeId(null);
    setErrorText(null);
  };

  // Drag drop coordinate tracking
  const handleNodeMouseDown = (nodeId: string, e: React.MouseEvent) => {
    // Exclude input/button elements from initiating drag
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.tagName === 'BUTTON' || target.closest('button')) {
      return;
    }
    
    setSelectedNodeId(nodeId);
    if (canvasLocked) {
      // Position is locked, skip actual drag registration
      return;
    }

    recordAction(); // Save state before drag starts
    setDraggedNodeId(nodeId);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      nodeStartPos.current = { x: node.x, y: node.y };
    }
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!draggedNodeId) return;
      
      const dx = (e.clientX - dragStartPos.current.x) / canvasZoom;
      const dy = (e.clientY - dragStartPos.current.y) / canvasZoom;
      
      let finalX = 0;
      let finalY = 0;
      
      setNodes(prev => prev.map(n => {
        if (n.id === draggedNodeId) {
          // Snap grid or boundary clamps
          let newX = nodeStartPos.current.x + dx;
          let newY = nodeStartPos.current.y + dy;

          if (snapToGrid) {
            newX = Math.round(newX / 15) * 15;
            newY = Math.round(newY / 15) * 15;
          }

          newX = Math.max(10, Math.min(1000, newX));
          newY = Math.max(10, Math.min(700, newY));
          
          finalX = newX;
          finalY = newY;
          return { ...n, x: newX, y: newY };
        }
        return n;
      }));

      const now = Date.now();
      if (now - lastEmitTime.current > 40) {
        broadcastNodeMoved(draggedNodeId, finalX, finalY);
        lastEmitTime.current = now;
      }
    };

    const handleGlobalMouseUp = () => {
      if (draggedNodeId) {
        // Enforce final accurate sync broadcast on drop
        setNodes(prev => {
          const matching = prev.find(n => n.id === draggedNodeId);
          if (matching) {
            broadcastNodeMoved(draggedNodeId, matching.x, matching.y);
          }
          return prev;
        });
      }
      setDraggedNodeId(null);
    };

    if (draggedNodeId) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [draggedNodeId]);

  // Trace animator to illuminate executing nodes in Flowise/Langflow style
  const animateNodeProgress = async (logsList: StepLog[]) => {
    // 1. Reset all nodes to idle
    const cleanStatuses: Record<string, 'idle' | 'running' | 'completed' | 'failed'> = {};
    nodes.forEach(n => { cleanStatuses[n.id] = 'idle'; });
    setNodeExecutionStatuses(cleanStatuses);

    // 2. Animate step transition sequence
    const logsAccumulator: StepLog[] = [];
    for (const logItem of logsList) {
      // Set to active processing
      setNodeExecutionStatuses(prev => ({ ...prev, [logItem.nodeId]: 'running' }));
      
      // Delay to simulate web request visual signals propagation
      await new Promise(resolve => setTimeout(resolve, 750));

      const finalStatus = logItem.status === 'completed' ? 'completed' : 'failed';
      setNodeExecutionStatuses(prev => ({ ...prev, [logItem.nodeId]: finalStatus }));

      // Incremental feedback console updater
      logsAccumulator.push(logItem);
      setRunLogs([...logsAccumulator]);
    }
  };

  // Execute actual Node Pipeline via full-stack middleware endpoint
  const handleRunPipeline = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setRunLogs([]);
    setNodeExecutionStatuses({});
    setFinalResult("");
    setErrorText(null);
    setActiveTab('logs');

    // Telemetry trace start
    posthog.capture('pipeline_run_started', {
      node_count: nodes.length,
      connection_count: connections.length
    });

    try {
      const response = await fetch('/api/run-pipeline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nodes: nodes,
          connections: connections
        }),
      });

      const data = await response.json();
      
      if (!response.ok || data.error) {
        const errorMsg = data.error || "Failed to execute visual agent pipeline.";
        const errObj = new Error(errorMsg);
        Sentry.captureException(errObj);
        throw errObj;
      }

      setFinalResult(data.finalResult || "");
      setTotalDuration(data.totalDuration || 0);
      
      posthog.capture('pipeline_run_success', {
        duration: data.totalDuration || 0,
        node_count: nodes.length
      });

      // Play high-fidelity sequential execution tracer
      await animateNodeProgress(data.logs || []);
    } catch (err: any) {
      console.error(err);
      setErrorText(err.message || String(err));
      posthog.capture('pipeline_run_failed', {
        error: err.message || String(err)
      });
      Sentry.captureException(err);
    } finally {
      setIsRunning(false);
    }
  };

  // Auto Self-Heal to gemini-3.1-flash-lite on demand/503 issues
  const handleAutoSelfHealAndRun = async () => {
    if (isRunning) return;
    const updatedNodes = nodes.map(n => {
      if (n.type === 'gemini') {
        return {
          ...n,
          fields: {
            ...n.fields,
            model: 'gemini-3.1-flash-lite'
          }
        };
      }
      return n;
    });
    setNodes(updatedNodes);
    setErrorText(null);
    setIsRunning(true);
    setRunLogs([]);
    setNodeExecutionStatuses({});
    setFinalResult("");
    setActiveTab('logs');

    try {
      const response = await fetch('/api/run-pipeline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nodes: updatedNodes,
          connections: connections
        }),
      });

      const data = await response.json();
      
      if (!response.ok || data.error) {
        throw new Error(data.error || "Failed to execute visual agent pipeline.");
      }

      setFinalResult(data.finalResult || "");
      setTotalDuration(data.totalDuration || 0);

      // Play sequential progress illumination
      await animateNodeProgress(data.logs || []);
    } catch (err: any) {
      console.error(err);
      setErrorText(err.message || String(err));
    } finally {
      setIsRunning(false);
    }
  };

  // Node editing actions
  const handleUpdateNodeField = (nodeId: string, fieldKey: string, value: any) => {
    recordAction();
    setNodes(prev => prev.map(n => {
      if (n.id === nodeId) {
        return {
          ...n,
          fields: {
            ...n.fields,
            [fieldKey]: value
          }
        };
      }
      return n;
    }));
    broadcastNodeSettingsUpdated(nodeId, { [fieldKey]: value });
  };

  const handleUpdateVariable = (nodeId: string, index: number, fieldKey: string, value: any) => {
    recordAction();
    let updatedVars: any[] = [];
    setNodes(prev => prev.map(n => {
      if (n.id === nodeId && n.type === 'input') {
        const nextVars = [...(n.fields.variables || [])];
        nextVars[index] = { ...nextVars[index], [fieldKey]: value };
        updatedVars = nextVars;
        return {
          ...n,
          fields: {
            ...n.fields,
            variables: nextVars
          }
        };
      }
      return n;
    }));
    broadcastNodeSettingsUpdated(nodeId, { variables: updatedVars });
  };

  const handleAddVariable = (nodeId: string) => {
    recordAction();
    let updatedVars: any[] = [];
    setNodes(prev => prev.map(n => {
      if (n.id === nodeId && n.type === 'input') {
        const nextVars = [...(n.fields.variables || [])];
        nextVars.push({ key: `key_${Date.now().toString().slice(-4)}`, value: 'New Value', label: 'Custom Label' });
        updatedVars = nextVars;
        return {
          ...n,
          fields: {
            ...n.fields,
            variables: nextVars
          }
        };
      }
      return n;
    }));
    broadcastNodeSettingsUpdated(nodeId, { variables: updatedVars });
  };

  const handleDeleteVariable = (nodeId: string, index: number) => {
    recordAction();
    let updatedVars: any[] = [];
    setNodes(prev => prev.map(n => {
      if (n.id === nodeId && n.type === 'input') {
        const nextVars = (n.fields.variables || []).filter((_: any, idx: number) => idx !== index);
        updatedVars = nextVars;
        return {
          ...n,
          fields: {
            ...n.fields,
            variables: nextVars
          }
        };
      }
      return n;
    }));
    broadcastNodeSettingsUpdated(nodeId, { variables: updatedVars });
  };

  // Auto-Align & Arrange Utility (Graph Layout Clean-up)
  const handleAutoAlignNodes = () => {
    recordAction();
    const typeOrder: Record<NodeType, number> = {
      'input': 0,
      'prompt': 1,
      'gemini': 2,
      'tool': 3,
      'router': 4,
      'rag': 5,
      'reviewer': 6,
      'output': 7
    };

    const counts: Record<NodeType, number> = {
      'input': 0,
      'prompt': 0,
      'gemini': 0,
      'tool': 0,
      'router': 0,
      'rag': 0,
      'reviewer': 0,
      'output': 0
    };

    setNodes(prev => {
      return prev.map(node => {
        const order = typeOrder[node.type] ?? 2;
        const count = counts[node.type] || 0;
        counts[node.type] = count + 1;

        // Space them elegantly along both dimensions
        const targetX = 50 + order * 230;
        const targetY = 120 + count * 165;

        return {
          ...node,
          x: targetX,
          y: targetY
        };
      });
    });
  };

  // Node duplication operation
  const handleDuplicateNode = (nodeId: string) => {
    recordAction();
    const nodeToClone = nodes.find(n => n.id === nodeId);
    if (!nodeToClone) return;

    const cloneId = `node-${nodeToClone.type}-${Date.now().toString().slice(-4)}`;
    const clonedNode: FlowNode = {
      ...nodeToClone,
      id: cloneId,
      title: `${nodeToClone.title} (Copy)`,
      x: Math.min(1000, nodeToClone.x + 40),
      y: Math.min(700, nodeToClone.y + 45),
      fields: JSON.parse(JSON.stringify(nodeToClone.fields)) // deep clone parameters
    };

    setNodes(prev => [...prev, clonedNode]);
    setSelectedNodeId(cloneId);
  };

  // Import JSON configuration schema 
  const handleImportWorkflowJSON = (jsonString: string) => {
    try {
      if (!jsonString.trim()) {
        throw new Error("Input string is empty. Please paste valid JSON configuration.");
      }
      const parsed = JSON.parse(jsonString);
      if (!parsed || !Array.isArray(parsed.nodes)) {
        throw new Error("Invalid format: Root Object must define a 'nodes' array list.");
      }
      
      const importedNodes = parsed.nodes.map((n: any) => ({
        id: n.id || `node-${n.type || 'custom'}-${Date.now().toString().slice(-4)}`,
        type: n.type || 'gemini',
        title: n.title || 'Dynamic Module',
        x: typeof n.x === 'number' ? Math.max(10, Math.min(1000, n.x)) : 100 + Math.random() * 120,
        y: typeof n.y === 'number' ? Math.max(10, Math.min(700, n.y)) : 100 + Math.random() * 125,
        description: n.description || 'Imported flow configuration',
        fields: n.fields || {}
      }));

      const importedConnections = Array.isArray(parsed.connections) 
        ? parsed.connections.map((c: any) => ({
            id: c.id || `conn-${c.sourceId}-${c.targetId}-${Date.now()}`,
            sourceId: c.sourceId,
            targetId: c.targetId
          }))
        : [];

      setNodes(importedNodes);
      setConnections(importedConnections);
      
      setActiveWorkflow({
        id: `imported-${Date.now()}`,
        name: parsed.name || "Custom Import Workspace",
        description: parsed.description || "Uploaded node topology structure",
        category: "User Layout",
        stars: "Upload ⭐",
        nodes: importedNodes,
        connections: importedConnections
      });

      setIsImportExportModalOpen(false);
      setImportError(null);
      return true;
    } catch (err: any) {
      setImportError(err.message || "Failed to parse JSON. Please review schema keys.");
      return false;
    }
  };

  // Addition of dynamic nodes
  const handleCreateNode = (type: NodeType) => {
    recordAction();
    const id = `node-${type}-${Date.now().toString().slice(-4)}`;
    let title = "Custom Node";
    let description = "Node definition";
    let initialFields: any = {};

    switch (type) {
      case 'input':
        title = "Input variables";
        description = "Initial template variable map definition.";
        initialFields = { variables: [{ key: 'topic', value: 'Open Source', label: 'Topic Key' }] };
        break;
      case 'prompt':
        title = "Prompt Template";
        description = "Custom blueprint rendering with variables.";
        initialFields = { template: "Write a short brief about {topic}." };
        break;
      case 'gemini':
        title = "Gemini LLM Unit";
        description = "Generators powered by Google Gemini.";
        initialFields = { model: 'gemini-3.5-flash', temperature: 0.7, systemInstruction: 'You are custom logic generator.', useSearchGrounding: false };
        break;
      case 'reviewer':
        title = "Critique & Review";
        description = "Automated loop review self-corrections.";
        initialFields = { criteria: "Check if outline is concise.", maxIterations: 1 };
        break;
      case 'output':
        title = "Final Output Display";
        description = "Aggregated result viewer.";
        initialFields = { format: 'markdown', value: '' };
        break;
      case 'router':
        title = "Execution Router";
        description = "Evaluate and branch traffic flows.";
        initialFields = { conditions: [], defaultTargetNodeId: '' };
        break;
      case 'tool':
        title = "External Tool API";
        description = "HTTP request connection controller.";
        initialFields = { url: 'https://api.github.com/zen', method: 'GET', headers: '{}', body: '' };
        break;
      case 'rag':
        title = "RAG Search Retriever";
        description = "Query your vector-indexed library database.";
        initialFields = { searchQuery: '{{topic}}', limit: 3, ragResults: [] };
        break;
    }

    const newNode: FlowNode = {
      id,
      type,
      title,
      x: 100 + Math.random() * 80,
      y: 100 + Math.random() * 80,
      description,
      fields: initialFields
    };

    setNodes(prev => [...prev, newNode]);
    setSelectedNodeId(id);
    broadcastNodeCreated(newNode);
  };

  const handleDeleteNode = (id: string) => {
    recordAction();
    setNodes(prev => prev.filter(n => n.id !== id));
    setConnections(prev => prev.filter(c => c.sourceId !== id && c.targetId !== id));
    if (selectedNodeId === id) setSelectedNodeId(null);
    broadcastNodeDeleted(id);
  };

  const handleConnectNodes = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    // Prevent duplicate connections from same source
    const alreadyConnected = connections.some(c => c.sourceId === sourceId && c.targetId === targetId);
    if (alreadyConnected) return;

    recordAction();
    const newConnection: FlowConnection = {
      id: `conn-${sourceId}-${targetId}-${Date.now()}`,
      sourceId,
      targetId
    };

    setConnections(prev => [...prev, newConnection]);
    broadcastEdgeCreated(newConnection);
  };

  // Automated Code Exporter
  const generateCopieableCode = () => {
    // Formulate variables
    const inputNode = nodes.find(n => n.type === 'input') as any;
    const promptNode = nodes.find(n => n.type === 'prompt') as any;
    const geminiNode = nodes.find(n => n.type === 'gemini') as any;
    const reviewerNode = nodes.find(n => n.type === 'reviewer') as any;

    const varsObject = inputNode ? inputNode.fields.variables.reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {}) : { "topic": "AI development" };

    const templateRaw = promptNode ? promptNode.fields.template : "Outline article for {topic}";
    const selectedModel = geminiNode ? geminiNode.fields.model : "gemini-3.5-flash";
    const selectedTemp = geminiNode ? geminiNode.fields.temperature : 0.7;
    const systemInstructionVal = geminiNode ? geminiNode.fields.systemInstruction : "You are a direct writer.";
    const hasSearch = geminiNode ? !!geminiNode.fields.useSearchGrounding : false;

    if (codeTab === 'typescript') {
      return `/**
 * @license Apache-2.0
 * Compiled from AgentForge44 Visual Flow Canvas
 */
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: { 'User-Agent': 'aistudio-build' }
  }
});

async function runAgent() {
  // 1. Initial Variables Map
  const variables = ${JSON.stringify(varsObject, null, 2)};
  
  // 2. Format Prompt Template
  let prompt = ${JSON.stringify(templateRaw)};
  Object.entries(variables).forEach(([key, val]) => {
    prompt = prompt.replace(new RegExp(\`\\\\{\${key}\\\\}\`, 'g'), String(val));
  });

  console.log("🚀 Rendered Prompt:", prompt);

  // 3. Initiate Gemini Generation Request
  const config = {
    temperature: ${selectedTemp},
    systemInstruction: "${systemInstructionVal.replace(/"/g, '\\"')}",
    ${hasSearch ? 'tools: [{ googleSearch: {} }]' : '// Search Grounding is disabled'}
  };

  const response = await ai.models.generateContent({
    model: "${selectedModel}",
    contents: prompt,
    config
  });

  const finalOutput = response.text;
  console.log("✨ Final Generation Output:\\n", finalOutput);
}

runAgent().catch(console.error);`;
    }

    if (codeTab === 'python') {
      return `"""
Refined code from AgentForge44 Visual agent flows
"""
import os
from google import genai
from google.genai import types

# Initialize SDK
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

def run_agent():
    # 1. Variables dictionary
    variables = ${JSON.stringify(varsObject, null, 4)}
    
    # 2. Template translation
    prompt = """${templateRaw.replace(/"""/g, '\\"\\"\\""')}"""
    for key, val in variables.items():
        prompt = prompt.replace(f"{{{key}}}", str(val))
        
    print("🚀 Prompt:", prompt)

    # 3. Model call parameters
    config = types.GenerateContentConfig(
        temperature=${selectedTemp},
        system_instruction="${systemInstructionVal.replace(/"/g, '\\"')}",
        ${hasSearch ? 'tools=[types.Tool(google_search=types.GoogleSearch())]' : '# Grounding disabled'}
    )

    response = client.models.generate_content(
        model="${selectedModel}",
        contents=prompt,
        config=config
    )

    print("✨ Agent output:\\n", response.text)

if __name__ == "__main__":
    run_agent()`;
    }

    return `# Safe server proxy curl payload structure
curl -X POST "${window.location.origin}/api/run-pipeline" \\
  -H "Content-Type: application/json" \\
  -d '{
    "nodes": ${JSON.stringify(nodes.map(n => ({ id: n.id, type: n.type, fields: n.fields })), null, 4).replace(/\n/g, '\n    ')},
    "connections": ${JSON.stringify(connections, null, 4).replace(/\n/g, '\n    ')}
  }'`;
  };

  const handleCopyCode = () => {
    const code = codeDisplayType === 'compiled' ? serverGeneratedCode : generateCopieableCode();
    navigator.clipboard.writeText(code);
    setCopiedText("Copied to clipboard!");
    setTimeout(() => setCopiedText(null), 2500);
  };

  // Virality index projections calculator
  const calculateViralityScore = () => {
    const rawVal = (simDocQual * 0.2) + (simUIAesthetic * 0.35) + (simAgentPower * 0.3) + (simMarketingPush * 0.15);
    return Math.round(rawVal);
  };

  const getViralityLabel = (score: number) => {
    if (score >= 93) return { text: "Ultra Viral (Potential GitHub Star Explosion 🚀)", color: "text-amber-400" };
    if (score >= 82) return { text: "Highly Popular (Viral Social sharing loops 🔥)", color: "text-emerald-400" };
    if (score >= 70) return { text: "Organic Growth (Moderate developers adoption 📈)", color: "text-sky-400" };
    return { text: "Niche Target (Stagnant metrics risk 💤)", color: "text-slate-400" };
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left + canvasRef.current.scrollLeft) / canvasZoom;
    const y = (e.clientY - rect.top + canvasRef.current.scrollTop) / canvasZoom;
    broadcastCursorMoved(x, y);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-x-hidden" id="app_root">
      
      {/* Dynamic Top Navigation HUD */}
      <header className="border-b border-slate-800 bg-slate-900/95 sticky top-0 z-50 px-6 py-4 flex items-center justify-between backdrop-blur-md" id="app_nav">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-tr from-sky-600 to-indigo-600 p-2.5 rounded-xl text-white shadow-lg shadow-sky-500/10">
            <Workflow size={24} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-xl tracking-wide bg-gradient-to-r from-sky-400 via-teal-200 to-indigo-400 bg-clip-text text-transparent">
                AgentForge44
              </span>
              <span className="text-[10px] font-semibold bg-sky-950 text-sky-400 border border-sky-800 px-2 py-0.5 rounded-full">
                V2.6 BETA
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">{translations[currentLang].subtitle}</p>
          </div>
        </div>

        {/* Templates Quick Load Pills */}
        <div className="hidden lg:flex items-center space-x-2 border border-slate-850 px-3 py-1.5 rounded-full bg-slate-950/50" id="template_loader_tray">
          <span className="text-xs text-slate-500 pl-1 pr-2 flex items-center gap-1">
            <Layers size={12} /> {translations[currentLang].loadTemplate}:
          </span>
          {workflows.map(wf => (
            <button
              id={`btn-load-${wf.id}`}
              key={wf.id}
              onClick={() => handleLoadWorkflow(wf)}
              className={`text-xs px-3.5 py-1.5 rounded-full transition-all duration-300 font-semibold cursor-pointer flex items-center gap-1.5 ${
                activeWorkflow.id === wf.id 
                  ? 'bg-sky-500/15 text-sky-300 border border-sky-500/35 shadow-inner' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/65 border border-transparent'
              }`}
            >
              <span>{wf.name.split(' ').slice(0, 2).join(' ')}</span>
              <span className="text-[10px] scale-95 opacity-65 bg-slate-850 text-slate-300 px-1 py-0.5 rounded">
                ★ {wf.stars.split(' ')[0]}
              </span>
            </button>
          ))}

          <span className="text-slate-700 text-xs px-1">|</span>

          {/* Phase 4 Multi-Agent Patterns */}
          <button
            id="btn_load_pattern_supervisor"
            onClick={() => handleLoadMultiAgentPattern('supervisor')}
            className="text-[11px] px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/20 font-bold transition-all flex items-center gap-1 cursor-pointer"
            title="Load Multi-Agent Supervisor / Router Pattern"
          >
            <GitBranch size={11} />
            <span>Supervisor Patterns</span>
          </button>
          
          <button
            id="btn_load_pattern_debate"
            onClick={() => handleLoadMultiAgentPattern('debate')}
            className="text-[11px] px-3 py-1 rounded-full bg-teal-500/10 text-teal-300 border border-teal-505/30 hover:bg-teal-500/20 font-bold transition-all flex items-center gap-1 cursor-pointer"
            title="Load Multi-Agent Consensus / Debate Pattern"
          >
            <Sparkles size={11} />
            <span>Debate/Referee</span>
          </button>
        </div>

        {/* Operational buttons */}
        <div className="flex items-center space-x-3" id="app_controls">
          {/* Undo / Redo controls */}
          <div className="flex items-center space-x-1 border border-slate-800 bg-slate-950/40 p-1.5 rounded-xl">
            <button 
              id="btn_undo"
              onClick={handleUndo}
              disabled={past.length === 0}
              className={`p-1 rounded-md transition-all ${past.length === 0 ? 'text-slate-600 opacity-40 cursor-not-allowed' : 'text-slate-300 hover:text-sky-400 hover:bg-slate-800/60 cursor-pointer'}`}
              title={translations[currentLang].undo}
            >
              <Undo size={14} />
            </button>
            <button 
              id="btn_redo"
              onClick={handleRedo}
              disabled={future.length === 0}
              className={`p-1 rounded-md transition-all ${future.length === 0 ? 'text-slate-600 opacity-40 cursor-not-allowed' : 'text-slate-300 hover:text-sky-400 hover:bg-slate-800/60 cursor-pointer'}`}
              title={translations[currentLang].redo}
            >
              <Redo size={14} />
            </button>
          </div>

          {/* Lang Selector */}
          <div className="flex items-center space-x-1 border border-slate-800 bg-slate-950/40 p-1.5 rounded-xl">
            <Globe size={13} className="text-slate-400 mx-1" />
            {(['en', 'ru', 'zh'] as const).map(lang => (
              <button
                id={`lang_btn_${lang}`}
                key={lang}
                onClick={() => {
                  setCurrentLang(lang);
                  i18nInstance.changeLanguage(lang);
                  localStorage.setItem("agentforge_lang", lang);
                  posthog.capture('language_switched', { locale: lang });
                }}
                className={`px-2 py-1 rounded-lg text-[9px] font-extrabold cursor-pointer transition-all border ${
                  currentLang === lang 
                    ? 'bg-sky-500/10 border-sky-500/30 text-sky-400 shadow-sm' 
                    : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Live Co-op Sync HUD */}
          <div className="flex items-center space-x-2 border border-slate-850 bg-slate-950/40 px-3 py-1.5 rounded-xl">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${connected ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${connected ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
            </span>
            
            <input
              type="text"
              value={userName}
              onChange={(e) => updateUserName(e.target.value)}
              className="w-16 bg-transparent border-0 font-bold text-[10px] text-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500/20 px-1 py-0.5 rounded uppercase tracking-wider text-center"
              title="Click to rename yourself is co-op workspace"
              placeholder="Guest"
            />

            {onlineUsers.length > 0 && (
              <div className="flex -space-x-1.5 overflow-hidden items-center ml-1">
                {onlineUsers.map(usr => {
                  const uId = usr.id || usr.userId || 'unknown';
                  const uName = usr.name || usr.userName || 'Guest';
                  const uColor = usr.color || usr.userColor || '#cccccc';
                  return (
                    <div
                      key={uId}
                      className="inline-block h-5 w-5 rounded-full ring-2 ring-slate-900 flex items-center justify-center font-extrabold text-[8px] uppercase select-none text-slate-950"
                      style={{ backgroundColor: uColor }}
                      title={`${uName} ${uId === userId ? '(You)' : ''}`}
                    >
                      {uName.slice(0, 2)}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <button
            id="btn_open_import_export"
            onClick={() => {
              setIsImportExportModalOpen(true);
              setJsonStringInput(JSON.stringify({
                name: activeWorkflow.name || "Custom Workflow",
                description: activeWorkflow.description || "Interactive AgentForge44 setup",
                nodes: nodes,
                connections: connections
              }, null, 2));
              setImportError(null);
            }}
            className="cursor-pointer text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950/80 hover:bg-slate-900 text-slate-300 hover:text-slate-100 flex items-center gap-1.5 transition-all active:scale-95"
          >
            <Download size={14} className="text-sky-400" />
            <span>{translations[currentLang].exportImport}</span>
          </button>

          <button
            id="run_pipeline_btn"
            onClick={handleRunPipeline}
            disabled={isRunning}
            className={`cursor-pointer font-bold text-sm tracking-wider uppercase px-5 py-2.5 rounded-xl shadow-lg flex items-center space-x-2 transition-all duration-300 ${
              isRunning 
                ? 'bg-sky-950 text-sky-400 border border-sky-800 animate-pulse cursor-not-allowed' 
                : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 hover:shadow-emerald-500/20 active:scale-95'
            }`}
          >
            {isRunning ? (
              <>
                <RefreshCw size={15} className="animate-spin" />
                <span>{translations[currentLang].runningPipeline}</span>
              </>
            ) : (
              <>
                <Play size={15} className="fill-current" />
                <span>{translations[currentLang].runPipeline}</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Studio Console Layout */}
      <div className="flex-1 flex flex-col xl:flex-row overflow-hidden relative" id="app_main">
        
        {/* Left Side: Builder Toolbox & Node Editor */}
        <aside className="w-full xl:w-80 border-b xl:border-b-0 xl:border-r border-slate-850 bg-slate-900/50 flex flex-col overflow-y-auto" id="left_toolbox">
          <div className="p-4 border-b border-slate-850">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-3">
              <Plus size={14} className="text-sky-400" /> {translations[currentLang].toolboxHeader}
            </h3>
            <p className="text-xs text-slate-500 mb-3.5 leading-relaxed">
              {translations[currentLang].toolboxDesc}
            </p>

            {/* Quick Action blocks searching with high-fidelity filtering */}
            <div className="mb-3.5 relative">
              <input 
                type="text"
                placeholder={currentLang === 'ru' ? "Поиск инструментов..." : currentLang === 'zh' ? "快速搜索节点..." : "Filter action blocks..."}
                value={toolboxSearch}
                onChange={(e) => setToolboxSearch(e.target.value)}
                className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-1.5 text-[11px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-500/40 focus:ring-1 focus:ring-sky-500/20"
              />
              {toolboxSearch && (
                <button 
                  onClick={() => setToolboxSearch("")} 
                  className="absolute right-2.5 top-1.5 text-slate-500 hover:text-slate-300 text-xs"
                >
                  &times;
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-2" id="toolbox_creators">
              {[
                { type: 'input', label: 'Inputs', desc: 'Variables parameters', color: 'hover:border-blue-500/40 hover:bg-blue-950/10' },
                { type: 'prompt', label: 'Prompt Template', desc: 'Formula parameters', color: 'hover:border-purple-500/40 hover:bg-purple-950/10' },
                { type: 'gemini', label: 'Gemini LLM', desc: 'Trigger twin core reasoning models', color: 'hover:border-teal-500/40 hover:bg-teal-950/10' },
                { type: 'reviewer', label: 'Critique Review', desc: 'Feedback loops system rules', color: 'hover:border-amber-500/40 hover:bg-amber-950/10' },
                { type: 'router', label: 'Router (If-Else)', desc: 'Condition route switch', color: 'hover:border-sky-500/40 hover:bg-sky-950/10' },
                { type: 'tool', label: 'HTTP API Custom Tool', desc: 'Execute outer REST fetch', color: 'hover:border-rose-500/40 hover:bg-rose-950/10' },
                { type: 'rag', label: 'RAG Knowledge Search', desc: 'Semantic Vector Db lookup', color: 'hover:border-teal-500/40 hover:bg-teal-950/10' },
                { type: 'output', label: 'Outputs', desc: 'Compiled visual payload', color: 'hover:border-indigo-500/40 hover:bg-indigo-950/10' }
              ].filter(tb => {
                if (!toolboxSearch) return true;
                const s = toolboxSearch.toLowerCase();
                return tb.label.toLowerCase().includes(s) || tb.type.toLowerCase().includes(s) || tb.desc.toLowerCase().includes(s);
              }).map(tb => (
                <button
                  id={`btn-add-${tb.type}`}
                  key={tb.type}
                  onClick={() => handleCreateNode(tb.type as NodeType)}
                  className={`cursor-pointer border border-slate-800 bg-slate-950 text-slate-305 rounded-xl px-3 py-2 text-xs font-semibold text-left transition-all hover:scale-102 flex flex-col gap-1 ${tb.color}`}
                >
                  <span className="text-xs text-slate-100 flex items-center gap-1.5 capitalize">
                    {tb.type === 'input' && <Database size={11} className="text-blue-400" />}
                    {tb.type === 'prompt' && <Terminal size={11} className="text-purple-400" />}
                    {tb.type === 'gemini' && <Sparkles size={11} className="text-teal-400" />}
                    {tb.type === 'reviewer' && <CheckSquare size={11} className="text-amber-400" />}
                    {tb.type === 'router' && <GitBranch size={11} className="text-sky-400" />}
                    {tb.type === 'tool' && <Globe size={11} className="text-rose-400" />}
                    {tb.type === 'rag' && <BookOpen size={11} className="text-teal-400" />}
                    {tb.type === 'output' && <FileCode size={11} className="text-indigo-400" />}
                    {tb.label}
                  </span>
                  <span className="text-[9px] text-slate-500">Add node</span>
                </button>
              ))}
            </div>
          </div>

          {/* Node Customization Configuration Drawer */}
          <div className="p-4 flex-1">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
              <Settings size={14} className="text-sky-400" /> {translations[currentLang].settingsHeader}
            </h3>

            {selectedNodeId ? (
              (() => {
                const node = nodes.find(n => n.id === selectedNodeId);
                if (!node) return <p className="text-xs text-slate-500 italic">Select a node card on the canvas to configure variables.</p>;
                const activeLock = locks[node.id];
                const isLockedByOther = activeLock && activeLock.userId !== userId;
                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }} 
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    {isLockedByOther && (
                      <div className="bg-amber-950/45 border border-amber-900/40 text-[10px] p-3 rounded-xl flex items-start gap-1.5 leading-normal text-amber-300">
                        <Lock size={12} className="text-amber-400 shrink-0 mt-0.5 animate-bounce" />
                        <div>
                          <strong>Locked by {activeLock.userName}</strong>
                          <p className="text-slate-500 mt-0.5">They are currently editing this node's parameters.</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                      <span className="text-xs font-extrabold text-slate-200 capitalize flex items-center gap-1.5">
                        {node.type === 'input' && <Database size={12} className="text-blue-400" />}
                        {node.type === 'prompt' && <Terminal size={12} className="text-purple-400" />}
                        {node.type === 'gemini' && <Sparkles size={12} className="text-teal-400" />}
                        {node.type === 'reviewer' && <CheckSquare size={12} className="text-amber-400" />}
                        {node.type === 'output' && <FileCode size={12} className="text-indigo-400" />}
                        {node.title}
                      </span>
                      <div className="flex items-center space-x-1">
                        <button 
                          onClick={() => handleDuplicateNode(node.id)}
                          className="text-slate-500 hover:text-sky-400 p-1 rounded-lg hover:bg-sky-950/15 cursor-pointer transition-colors"
                          title="Duplicate/Clone this node card"
                          id={`duplicate-node-${node.id}`}
                        >
                          <CopyPlus size={13} />
                        </button>
                        <button 
                          onClick={() => handleDeleteNode(node.id)}
                          className="text-slate-500 hover:text-rose-400 p-1 rounded-lg hover:bg-rose-950/15 cursor-pointer transition-colors"
                          title="Delete this dynamic node block"
                          id={`delete-node-${node.id}`}
                        >
                          <Trash size={13} />
                        </button>
                      </div>
                    </div>

                    <div className={`space-y-3.5 ${isLockedByOther ? 'pointer-events-none opacity-40' : ''}`}>
                      {/* Isolated Dry Run Sandbox Trigger */}
                      <div className="bg-slate-950/40 border border-slate-850 p-2.5 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400 capitalize flex items-center gap-1">
                            <Compass size={12} className="text-teal-400 animate-pulse" />
                            {currentLang === 'ru' ? "Песочница тестирования" : currentLang === 'zh' ? "沙盒试运行" : "Dry-Run Sandbox Testing"}
                          </span>
                          <span className="text-[9px] font-mono text-slate-500 uppercase">Sub-Trace</span>
                        </div>
                        
                        <button
                          onClick={() => handleDryRunNode(node.id)}
                          disabled={isDryRunningNode === node.id}
                          className={`w-full text-[11px] font-bold uppercase tracking-wider py-1.5 px-2.5 rounded-lg border transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 ${
                            isDryRunningNode === node.id
                              ? 'bg-amber-950/20 text-amber-400 border-amber-800/20 animate-pulse cursor-wait'
                              : 'bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/30 text-indigo-300 hover:text-indigo-200'
                          }`}
                          id={`btn-dryrun-trigger-${node.id}`}
                        >
                          {isDryRunningNode === node.id ? (
                            <>
                              <RefreshCw size={11} className="animate-spin" />
                              <span>{currentLang === 'ru' ? "Симулируем..." : currentLang === 'zh' ? "执行中..." : "Simulating..."}</span>
                            </>
                          ) : (
                            <>
                              <FlaskConical size={11} />
                              <span>{currentLang === 'ru' ? "Проверить изолированно" : currentLang === 'zh' ? "独立沙盒测试" : "Test Isolated (Dry-Run)"}</span>
                            </>
                          )}
                        </button>

                        {dryRunOutput[node.id] && (
                          <div className="bg-slate-950/95 border border-slate-900 rounded-lg p-2 max-h-32 overflow-y-auto font-mono text-[9px] text-emerald-450 leading-normal">
                            <div className="text-slate-500 font-extrabold pb-0.5 border-b border-slate-900 mb-1 flex justify-between uppercase">
                              <span>{currentLang === 'ru' ? "Лог песочницы:" : currentLang === 'zh' ? "沙盒控制台:" : "Console Output:"}</span>
                              <button onClick={() => setDryRunOutput(prev => ({ ...prev, [node.id]: '' }))} className="text-slate-650 hover:text-rose-450 cursor-pointer">✕</button>
                            </div>
                            {dryRunOutput[node.id]}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Node Header Title</label>
                        <input 
                          type="text" 
                          value={node.title} 
                          onChange={(e) => {
                            setNodes(prev => prev.map(n => n.id === node.id ? { ...n, title: e.target.value } : n));
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500/50"
                        />
                      </div>

                      {/* Input Variables List Renderer */}
                      {node.type === 'input' && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Input Fields Setup</label>
                            <button 
                              onClick={() => handleAddVariable(node.id)}
                              className="text-[10px] font-bold text-sky-400 hover:text-sky-300 flex items-center gap-0.5"
                              id="add-variable-btn"
                            >
                              <Plus size={10} /> Add
                            </button>
                          </div>
                          
                          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                            {node.fields.variables?.map((v: any, idx: number) => (
                              <div key={idx} className="bg-slate-950 p-2 rounded-lg border border-slate-850 space-y-1.5 relative">
                                <button 
                                  onClick={() => handleDeleteVariable(node.id, idx)}
                                  className="absolute top-1 right-1 text-slate-600 hover:text-rose-400 cursor-pointer"
                                >
                                  &times;
                                </button>
                                <input 
                                  placeholder="Variable handle (e.g. topic)" 
                                  type="text" 
                                  value={v.key}
                                  onChange={(e) => handleUpdateVariable(node.id, idx, 'key', e.target.value)}
                                  className="w-11/12 bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-[10px] text-sky-300 font-mono focus:outline-none"
                                />
                                <textarea 
                                  placeholder="Value" 
                                  value={v.value}
                                  onChange={(e) => handleUpdateVariable(node.id, idx, 'value', e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-800 rounded px-1.5 py-1 text-[11px] text-slate-300 placeholder-slate-600 focus:outline-none h-14 resize-none"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Prompt Template Setup */}
                      {node.type === 'prompt' && (
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                            Template String
                          </label>
                          <p className="text-[10px] text-slate-500 mb-1.5">Use variables with brackets like <code className="text-sky-400/80 font-mono">{"{topic}"}</code>.</p>
                          <textarea 
                            value={node.fields.template || ""} 
                            onChange={(e) => handleUpdateNodeField(node.id, 'template', e.target.value)}
                            className="w-full h-44 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-sky-500/50 leading-relaxed"
                          />
                        </div>
                      )}

                      {/* Gemini Model parameters config */}
                      {node.type === 'gemini' && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Model Selection</label>
                            <select 
                              value={node.fields.model || 'gemini-3.5-flash'} 
                              onChange={(e) => handleUpdateNodeField(node.id, 'model', e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none"
                            >
                              <option value="gemini-3.5-flash">gemini-3.5-flash</option>
                              <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite</option>
                              <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview (Paid Key)</option>
                            </select>
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="block text-[10px] font-bold text-slate-500 uppercase">Temperature</label>
                              <span className="text-xs font-mono text-teal-400">{node.fields.temperature || 0.7}</span>
                            </div>
                            <input 
                              type="range" 
                              min="0" 
                              max="1" 
                              step="0.1"
                              value={node.fields.temperature ?? 0.7} 
                              onChange={(e) => handleUpdateNodeField(node.id, 'temperature', parseFloat(e.target.value))}
                              className="w-full accent-teal-500 bg-slate-800"
                            />
                          </div>

                          <div className="pt-1.5 flex items-center justify-between bg-slate-950/50 p-2.5 rounded-lg border border-slate-850">
                            <div>
                              <span className="text-[11px] font-bold text-slate-200 block">Web Search Grounding</span>
                              <span className="text-[9px] text-slate-500 block leading-tight">Leverage live 2026 Google trends index.</span>
                            </div>
                            <input 
                              type="checkbox" 
                              checked={!!node.fields.useSearchGrounding} 
                              onChange={(e) => handleUpdateNodeField(node.id, 'useSearchGrounding', e.target.checked)}
                              className="w-4 h-4 accent-teal-500 rounded cursor-pointer"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">System instructions</label>
                            <textarea 
                              placeholder="Describe persona/constraints..."
                              value={node.fields.systemInstruction || ""} 
                              onChange={(e) => handleUpdateNodeField(node.id, 'systemInstruction', e.target.value)}
                              className="w-full h-24 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none h-20 placeholder-slate-650"
                            />
                          </div>
                        </div>
                      )}

                      {/* Critiquer Reviewer Parameters */}
                      {node.type === 'reviewer' && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Audit Criteria</label>
                            <textarea 
                              placeholder="Review rules. E.g. Check if the output has React components..."
                              value={node.fields.criteria || ""} 
                              onChange={(e) => handleUpdateNodeField(node.id, 'criteria', e.target.value)}
                              className="w-full h-24 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-sky-500/50 placeholder-slate-650 resize-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Max correction Loops</label>
                            <select 
                              value={node.fields.maxIterations || 1} 
                              onChange={(e) => handleUpdateNodeField(node.id, 'maxIterations', parseInt(e.target.value))}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none text-slate-100"
                            >
                              <option value="1">1 Correction Turn</option>
                              <option value="2">2 Correction Turns</option>
                              <option value="3">3 Correction Turns</option>
                            </select>
                          </div>
                        </div>
                      )}

                      {/* Router Node Settings Form */}
                      {node.type === 'router' && (
                        <RouterNodeSettings 
                          node={node}
                          nodes={nodes}
                          onUpdateField={handleUpdateNodeField}
                          currentLang={currentLang}
                        />
                      )}

                      {/* Tool Node Settings Form */}
                      {node.type === 'tool' && (
                        <ToolNodeSettings
                          node={node}
                          nodes={nodes}
                          onUpdateField={handleUpdateNodeField}
                          currentLang={currentLang}
                        />
                      )}

                      {/* RAG Node Settings Form */}
                      {node.type === 'rag' && (
                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              {currentLang === 'ru' ? 'Поисковый запрос RAG' : currentLang === 'zh' ? '语义检索关键词模板' : 'Search Query Template'}
                            </label>
                            <input
                              type="text"
                              value={node.fields.searchQuery || ''}
                              onChange={(e) => handleUpdateNodeField(node.id, 'searchQuery', e.target.value)}
                              placeholder="e.g. {{topic}} outline, safety guidelines"
                              className="w-full bg-slate-950 border border-slate-900 focus:border-teal-500/40 rounded-lg px-2.5 py-1.5 text-xs text-slate-205 focus:outline-none font-mono"
                            />
                            <p className="text-[9px] text-slate-505 leading-tight">
                              {currentLang === 'ru' ? 'Используйте {{variable}} для подстановки параметров.' : currentLang === 'zh' ? '支持使用双花括号渲染变量模板。' : 'Use double braces {{variable}} for parameter injections.'}
                            </p>
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              {currentLang === 'ru' ? 'Лимит документов' : currentLang === 'zh' ? '精确召回结果数量' : 'Retrieval Limit (1-5)'}
                            </label>
                            <select
                              value={node.fields.limit || 3}
                              onChange={(e) => handleUpdateNodeField(node.id, 'limit', parseInt(e.target.value))}
                              className="w-full bg-slate-950 border border-slate-900 rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none"
                            >
                              <option value="1">1 Document Chunk</option>
                              <option value="2">2 Document Chunks</option>
                              <option value="3">3 Document Chunks</option>
                              <option value="4">4 Document Chunks</option>
                              <option value="5">5 Document Chunks</option>
                            </select>
                          </div>

                          {/* Dynamic Instant Visualizer preview mapping */}
                          <div className="border-t border-slate-900 pt-3">
                            <RAGVisualizer 
                              searchQuery={node.fields.searchQuery || ''}
                              results={node.fields.ragResults || []}
                              currentLang={currentLang}
                            />
                          </div>
                        </div>
                      )}

                      {/* Connection Wire Setup helper */}
                      <div className="pt-2">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Target Connect Link</label>
                        <select 
                          id={`target-selector-${node.id}`}
                          defaultValue="" 
                          onChange={(e) => {
                            if (e.target.value) {
                              handleConnectNodes(node.id, e.target.value);
                              e.target.value = ""; // reset
                            }
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none"
                        >
                          <option value="" disabled>-- Link connection to target --</option>
                          {nodes.filter(n => n.id !== node.id).map(n => (
                            <option key={n.id} value={n.id}>↳ {n.title} (Type: {n.type})</option>
                          ))}
                        </select>
                      </div>

                    </div>
                  </motion.div>
                );
              })()
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-slate-800 rounded-2xl p-4 bg-slate-950/20">
                <Info size={20} className="text-slate-600 mb-2" />
                <p className="text-xs font-bold text-slate-400 mb-1">{translations[currentLang].undo === "Undo" ? "No Unit Selected" : currentLang === "ru" ? "Модуль не выбран" : "选定一个单元"}</p>
                <p className="text-[10px] text-slate-500 leading-relaxed max-w-xs">
                  {translations[currentLang].settingsEmpty}
                </p>
              </div>
            )}
          </div>

          {/* Active Canvas Metrics Card */}
          <div className="p-4 border-t border-slate-850 bg-slate-900/40">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-3">
              <TrendingUp size={14} className="text-teal-400" /> {translations[currentLang].metrics}
            </h3>
            {(() => {
              const metrics = calculateMetrics();
              return (
                <div className="grid grid-cols-2 gap-2 text-[10px]" id="metrics_viewport">
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850/60 leading-normal">
                    <span className="text-slate-500 block font-semibold">{translations[currentLang].metricsTotalNodes}</span>
                    <span className="text-sm font-bold text-slate-100 block mt-0.5">{metrics.nodesCount}</span>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850/60 leading-normal">
                    <span className="text-slate-500 block font-semibold">{translations[currentLang].metricsActiveEdges}</span>
                    <span className="text-sm font-bold text-slate-100 block mt-0.5">{metrics.connectionsCount}</span>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850/60 leading-normal col-span-2 flex items-center justify-between">
                    <div>
                      <span className="text-slate-500 block font-semibold">{translations[currentLang].latencyEst}</span>
                      <span className="text-[11px] font-bold text-emerald-400 mt-0.5 block">~{(metrics.estLatency / 1000).toFixed(2)}s</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500 block font-semibold">{translations[currentLang].complexityScore}</span>
                      <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded uppercase mt-0.5 inline-block ${
                        metrics.complexity === 'high' 
                          ? 'bg-rose-950/40 text-rose-400 border border-rose-900/30' 
                          : metrics.complexity === 'medium' 
                          ? 'bg-amber-950/40 text-amber-400 border border-amber-900/30' 
                          : 'bg-emerald-950/40 text-emerald-450 border border-emerald-900/30'
                      }`}>
                        {translations[currentLang][metrics.complexity]}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Saved Snapshots Version Checkpoint List */}
          <div className="p-4 border-t border-slate-850 bg-slate-900/60">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <History size={14} className="text-purple-400" /> {translations[currentLang].history}
              </h3>
              <button
                id="btn_capture_session_snapshot"
                onClick={() => handleSaveSnapshot()}
                className="text-[10px] font-bold text-sky-450 hover:text-sky-300 flex items-center gap-0.5 cursor-pointer bg-sky-950/20 px-2 py-1 border border-sky-850 rounded-lg active:scale-95 transition-all"
                title={translations[currentLang].historyDesc}
              >
                <Plus size={10} /> {translations[currentLang].undo === "Undo" ? "Save" : "Снять"}
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {savedSnapshots.length === 0 ? (
                <p className="text-[10px] text-slate-500 italic py-2 text-center">{translations[currentLang].emptyHistory}</p>
              ) : (
                savedSnapshots.map(snap => (
                  <div 
                    id={`snap-item-${snap.id}`}
                    key={snap.id}
                    onClick={() => handleRestoreSnapshot(snap.id)}
                    className="p-2 bg-slate-950 border border-slate-850 hover:border-sky-500/20 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-2 group hover:bg-slate-900/30"
                  >
                    <div className="truncate leading-tight">
                      <span className="text-[10px] font-bold text-slate-300 block truncate leading-tight">{snap.name}</span>
                      <span className="text-[9px] text-slate-500 font-mono block mt-0.5">⏱️ {snap.timestamp}</span>
                    </div>
                    <button
                      id={`delete-snap-${snap.id}`}
                      onClick={(e) => handleDeleteSnapshot(snap.id, e)}
                      className="text-slate-650 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded cursor-pointer shrink-0"
                      title="Delete checkpoint representation"
                    >
                      <Trash size={10} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Server-Side Persistence Folder Storage */}
          <div className="p-4 border-t border-slate-850 bg-slate-900/80">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
              <FolderPlus size={14} className="text-emerald-400" /> {translations[currentLang].serverPersistence}
            </h3>
            <p className="text-[10px] text-slate-500 mb-3 leading-normal">
              {translations[currentLang].serverPersistenceDesc}
            </p>

            <div className="space-y-2.5">
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder={translations[currentLang].projectNameHolder}
                  value={projectNameInput}
                  onChange={(e) => setProjectNameInput(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-805 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500/50"
                  id="project-name-txt"
                />
                <button
                  id="save-project-dir-btn"
                  onClick={() => {
                    if (projectNameInput.trim()) {
                      handleSaveProjectToServer(projectNameInput);
                    }
                  }}
                  disabled={savingProject}
                  className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold px-3 py-1.5 text-xs rounded-xl active:scale-95 transition-all cursor-pointer flex items-center justify-center min-w-[70px]"
                >
                  {savingProject ? "..." : translations[currentLang].saveProjectBtn}
                </button>
              </div>

              {/* Server Saved Projects Directory List */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  {translations[currentLang].savedListTitle}
                </span>

                {loadingProjects ? (
                  <p className="text-[10px] text-slate-500 italic py-1 text-center">Loading server assets...</p>
                ) : serverProjects.length === 0 ? (
                  <p className="text-[10px] text-slate-500 italic py-1 text-center">
                    {translations[currentLang].noSavedProjects}
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1" id="server_saved_projects_list">
                    {serverProjects.map(proj => {
                      const isCurrentlyActive = currentSavedProjectName === proj.name;
                      return (
                        <div
                          id={`server-proj-item-${proj.name}`}
                          key={proj.name}
                          className={`p-2 rounded-xl border text-[11px] flex items-center justify-between gap-2 group transition-all ${
                            isCurrentlyActive
                              ? 'bg-emerald-500/5 border-emerald-500/30 text-emerald-350 font-bold'
                              : 'bg-slate-950 border-slate-850 hover:border-slate-700 text-slate-300'
                          }`}
                        >
                          <div
                            onClick={() => {
                              handleLoadProjectFromServer(proj);
                              setProjectNameInput(proj.name);
                            }}
                            className="flex-1 truncate cursor-pointer leading-tight min-w-0"
                            title="Click to load project data into canvas"
                          >
                            <span className="block truncate">{proj.name}</span>
                            <span className="text-[8.5px] text-slate-500 font-mono block mt-0.5">
                              Nodes: {proj.nodes?.length || 0} | Conns: {proj.connections?.length || 0}
                            </span>
                          </div>

                          <button
                            id={`delete-server-proj-${proj.name}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Are you sure you want to delete project: ${proj.name}?`)) {
                                handleDeleteProjectFromServer(proj.name);
                              }
                            }}
                            className="text-slate-600 hover:text-rose-400 p-1 rounded cursor-pointer shrink-0 transition-colors"
                            title="Deletes JSON project file on server storage"
                          >
                            <Trash size={11} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* Center Canvas Grid & Dynamic Flow Vectors */}
        <main 
          onMouseMove={handleCanvasMouseMove}
          className="flex-1 min-h-[500px] xl:min-h-0 bg-slate-950 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] overflow-auto relative p-8 select-none" 
          ref={canvasRef} 
          id="canvas_stage"
        >
          
          {/* Legend indicator */}
          <div className="absolute top-4 left-4 bg-slate-900/80 border border-slate-850 px-3 py-1.5 rounded-xl backdrop-blur text-[10.5px] text-slate-400 z-10 font-semibold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping"></span>
            <span>Flow Canvas Grid: Hold & Drag headers to move nodes. Use links dropdowns to connect.</span>
          </div>

          {/* Scaled viewport container */}
          <div className="relative origin-top-left flex-1 min-w-[1350px] min-h-[850px] transition-transform duration-100 ease-out" style={{ transform: `scale(${canvasZoom})` }}>
            {/* SVG Vector Layer representing connection paths */}
            <svg className="absolute inset-0 pointer-events-none w-full h-full min-w-[1200px] min-h-[800px] z-0" id="canvas_vector_layer">
            <defs>
              <linearGradient id="glow-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="50%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#2dd4bf" />
              </linearGradient>
              <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#475569" />
              </marker>
              <marker id="arrow-glowing" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8" />
              </marker>
            </defs>

            {/* Static background lines */}
            {connections.map(conn => {
              const srcNode = nodes.find(n => n.id === conn.sourceId);
              const tgtNode = nodes.find(n => n.id === conn.targetId);
              if (!srcNode || !tgtNode) return null;

              // Compute coordinates
              const sourceX = srcNode.x + 190;
              const sourceY = srcNode.y + 42;
              const targetX = tgtNode.x;
              const targetY = tgtNode.y + 42;

              const dx = Math.abs(targetX - sourceX) * 0.45;
              const pathString = `M ${sourceX} ${sourceY} C ${sourceX + dx} ${sourceY}, ${targetX - dx} ${targetY}, ${targetX} ${targetY}`;

              return (
                <g key={conn.id}>
                  {/* Outer shadow line */}
                  <path 
                    d={pathString} 
                    fill="none" 
                    stroke="#1e293b" 
                    strokeWidth={5} 
                    className="transition-all duration-300"
                  />
                  {/* Core connection wire */}
                  <path 
                    d={pathString} 
                    fill="none" 
                    stroke="#334155" 
                    strokeWidth={2} 
                    markerEnd="url(#arrow)"
                    className="transition-all duration-300"
                  />
                </g>
              );
            })}

            {/* Glowing active execution lines during run */}
            {isRunning && connections.map(conn => {
              const srcNode = nodes.find(n => n.id === conn.sourceId);
              const tgtNode = nodes.find(n => n.id === conn.targetId);
              if (!srcNode || !tgtNode) return null;

              const sourceX = srcNode.x + 190;
              const sourceY = srcNode.y + 42;
              const targetX = tgtNode.x;
              const targetY = tgtNode.y + 42;

              const dx = Math.abs(targetX - sourceX) * 0.45;
              const pathString = `M ${sourceX} ${sourceY} C ${sourceX + dx} ${sourceY}, ${targetX - dx} ${targetY}, ${targetX} ${targetY}`;

              return (
                <path 
                  key={`glow-${conn.id}`}
                  d={pathString} 
                  fill="none" 
                  stroke="url(#glow-grad)" 
                  strokeWidth={2.5} 
                  markerEnd="url(#arrow-glowing)"
                  strokeDasharray="8, 6"
                  className="animate-[dash_1.5s_linear_infinite]"
                  style={{
                    animationPlayState: 'running'
                  }}
                />
              );
            })}
          </svg>

          {/* HTML Renderable Node Card Elements layer */}
          <div className="relative z-10 w-full h-full min-h-[600px] min-w-[1000px]" id="nodes_layer">
            <AnimatePresence>
              {nodes.map(node => {
                const isSelected = selectedNodeId === node.id;
                const nodeStatus = nodeExecutionStatuses[node.id] || 'idle';
                
                let borderStyle = 'border-slate-800 hover:border-slate-700';
                if (isSelected) {
                  borderStyle = 'border-sky-500 shadow-2xl shadow-sky-500/10 scale-102 ring-1 ring-sky-500/30';
                }
                if (nodeStatus === 'running') {
                  if (node.type === 'rag') {
                    borderStyle = 'border-teal-400 shadow-xl shadow-teal-500/30 scale-102 ring-2 ring-teal-400 animate-[pulse_1.5s_infinite]';
                  } else {
                    borderStyle = 'border-amber-400 shadow-xl shadow-amber-500/20 scale-102 ring-2 ring-amber-400 shadow-amber-500/10 animate-pulse';
                  }
                } else if (nodeStatus === 'completed') {
                  if (node.type === 'rag') {
                    borderStyle = 'border-teal-550 shadow-xl shadow-teal-500/10 ring-1 ring-teal-550/40';
                  } else {
                    borderStyle = 'border-emerald-500 shadow-xl shadow-emerald-500/10 ring-1 ring-emerald-500/40';
                  }
                } else if (nodeStatus === 'failed') {
                  borderStyle = 'border-rose-500 shadow-xl shadow-rose-500/20 ring-2 ring-rose-500/60';
                }
                
                return (
                  <motion.div
                    key={node.id}
                    className={`absolute w-48 rounded-2xl bg-slate-900 border text-left flex flex-col transition-all cursor-grab active:cursor-grabbing hover:shadow-xl ${borderStyle}`}
                    style={{ left: node.x, top: node.y }}
                    onMouseDown={(e) => handleNodeMouseDown(node.id, e)}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    id={`node-card-${node.id}`}
                  >
                    {/* Header bar of node */}
                    <div className="px-3 py-2 rounded-t-2xl bg-slate-950 border-b border-slate-850/60 flex items-center justify-between gap-1">
                      <div className="flex items-center space-x-1.5 min-w-0 flex-1">
                        <span className="shrink-0">
                          {node.type === 'input' && <Database size={11} className="text-blue-400" />}
                          {node.type === 'prompt' && <Terminal size={11} className="text-purple-400" />}
                          {node.type === 'gemini' && <Sparkles size={11} className="text-teal-400 animate-pulse" />}
                          {node.type === 'reviewer' && <CheckSquare size={11} className="text-amber-400" />}
                          {node.type === 'output' && <FileCode size={11} className="text-indigo-400" />}
                          {node.type === 'router' && <GitBranch size={11} className="text-sky-405 animate-pulse" />}
                          {node.type === 'tool' && <Globe size={11} className="text-rose-405" />}
                          {node.type === 'rag' && <BookOpen size={11} className="text-teal-405" />}
                        </span>
                        <span className="font-bold text-[11px] text-slate-100 tracking-wide truncate flex-1">
                          {node.title}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-1.5 shrink-0">
                        {nodeStatus !== 'idle' && (
                          <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded leading-none ${
                            nodeStatus === 'running' ? 'bg-amber-950/80 text-amber-400 border border-amber-800/20' :
                            nodeStatus === 'completed' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/20' :
                            'bg-rose-950/80 text-rose-400 border border-rose-800/20'
                          }`}>
                            {nodeStatus === 'running' ? '• run' : nodeStatus === 'completed' ? '✓ ok' : '✗ err'}
                          </span>
                        )}

                        <button 
                          onClick={() => handleDeleteNode(node.id)}
                          className="text-slate-600 hover:text-rose-400 p-0.5 rounded transition-transform"
                          id={`btn-del-${node.id}`}
                        >
                          <Trash size={11} />
                        </button>
                      </div>
                    </div>

                    {/* Node descriptive summaries and properties */}
                    <div className="p-3.5 flex-1 flex flex-col justify-between">
                      <p className="text-[10px] text-slate-400 font-medium leading-normal mb-2">
                        {node.description}
                      </p>

                      <div className="space-y-1.5 pt-1.5 border-t border-slate-850/40">
                        {node.type === 'input' && (
                          <span className="text-[9px] font-mono text-blue-400/90 font-bold bg-blue-950/20 px-1.5 py-0.5 rounded border border-blue-950/50">
                            {node.fields.variables?.length || 0} Key parameters mapped
                          </span>
                        )}
                        {node.type === 'prompt' && (
                          <div className="text-[9px] text-slate-500 font-mono truncate">
                            {node.fields.template ? `"${node.fields.template.slice(0, 20)}..."` : 'Template empty'}
                          </div>
                        )}
                        {node.type === 'gemini' && (
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-teal-400 font-mono block">
                              ⚙️ Model: {node.fields.model || 'gemini-3.5-flash'}
                            </span>
                            {node.fields.useSearchGrounding && (
                              <span className="inline-flex items-center gap-0.5 text-[8.5px] font-bold text-emerald-400">
                                Grounding: Enabled ✅
                              </span>
                            )}
                          </div>
                        )}
                        {node.type === 'reviewer' && (
                          <span className="text-[9px] font-mono text-amber-400 font-bold bg-amber-950/20 px-1.5 py-0.5 rounded border border-amber-950/50 block w-fit">
                            Audit check turn: {node.fields.maxIterations || 1}
                          </span>
                        )}
                        {node.type === 'output' && (
                          <span className="text-[9px] font-mono text-indigo-400 font-bold uppercase bg-indigo-950/20 px-2 py-0.5 rounded">
                            {node.fields.format || 'markdown'} View
                          </span>
                        )}
                        {node.type === 'router' && (
                          <span className="text-[9px] font-mono text-sky-400 font-bold uppercase bg-sky-950/20 px-2 py-0.5 rounded border border-sky-900/10 block w-fit">
                            🔀 {node.fields.conditions?.length || 0} Routes Checked
                          </span>
                        )}
                        {node.type === 'tool' && (
                          <span className="text-[9px] font-mono text-rose-400 font-bold uppercase bg-rose-955 px-2 py-0.5 rounded border border-rose-900/10 block w-full truncate">
                            🌐 {node.fields.method || 'GET'} : {node.fields.url ? node.fields.url.replace(/^https?:\/\//i, '').slice(0, 18) + '...' : 'None'}
                          </span>
                        )}
                        {node.type === 'rag' && (
                          <div className="space-y-1">
                            <span className="text-[9.5px] font-mono text-teal-400 font-bold uppercase bg-teal-950/20 px-2 py-0.5 rounded border border-teal-900/15 block w-fit">
                              📚 Limit: {node.fields.limit || 3} Files
                            </span>
                            {nodeStatus === 'completed' && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-teal-350 bg-teal-950/40 border border-teal-900/35 px-2 py-0.5 rounded mt-1 shadow-sm animate-bounce">
                                Grounded: {node.fields.ragResults?.length || 3} Docs
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Real-time collaborative user cursors */}
            {(Object.values(cursors) as RemoteCursor[]).map(cur => (
              <div
                key={cur.userId}
                className="pointer-events-none absolute z-50 transition-all duration-75 ease"
                style={{
                  left: cur.x,
                  top: cur.y,
                }}
              >
                {/* Visual mouse cursor arrow */}
                <svg
                  className="w-4 h-4 shadow-sm"
                  viewBox="0 0 24 24"
                  fill={cur.userColor}
                  stroke="white"
                  strokeWidth={1.5}
                >
                  <path d="M4.5 3V17.5L8.5 13.5L13.5 18.5L15.5 16.5L10.5 11.5L15.5 11.5L4.5 3Z" />
                </svg>
                {/* User Name Tag */}
                <div
                  className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white shadow-md select-none whitespace-nowrap mt-1 flex items-center gap-1 bg-opacity-95"
                  style={{ backgroundColor: cur.userColor }}
                >
                  <span>{cur.userName}</span>
                </div>
              </div>
            ))}
          </div>

          </div>

          {/* Canvas Premium Controls Float Board */}
          <div className="absolute bottom-6 left-6 bg-slate-900/95 border border-slate-800 px-4 py-2.5 rounded-2xl shadow-xl backdrop-blur-md flex items-center space-x-3.5 z-20" id="canvas_premium_controls">
            <div className="flex items-center space-x-1 border-r border-slate-800 pr-3">
              <button 
                onClick={() => setCanvasZoom(z => Math.max(0.5, z - 0.1))} 
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg active:scale-95 transition-all cursor-pointer hover:bg-slate-850"
                title="Zoom Out"
                id="btn_zoom_out"
              >
                <ZoomOut size={14} />
              </button>
              <span className="text-xs font-mono font-bold text-slate-300 w-12 text-center select-none">
                {Math.round(canvasZoom * 100)}%
              </span>
              <button 
                onClick={() => setCanvasZoom(z => Math.min(1.5, z + 0.1))} 
                className="text-slate-400 hover:text-slate-100 p-1.5 rounded-lg active:scale-95 transition-all cursor-pointer hover:bg-slate-850"
                title="Zoom In"
                id="btn_zoom_in"
              >
                <ZoomIn size={14} />
              </button>
            </div>
            
            <button 
              id="btn_zoom_reset"
              onClick={() => setCanvasZoom(1.0)} 
              className="text-slate-405 hover:text-slate-200 text-[11px] font-bold px-2 py-1 rounded-lg hover:bg-slate-850 cursor-pointer transition-all"
            >
              Reset Scale
            </button>

            <span className="text-slate-755">|</span>

            <button 
              id="btn_auto_align_grid"
              onClick={handleAutoAlignNodes} 
              className="text-sky-450 hover:text-sky-305 text-[11px] font-bold px-3 py-1.5 rounded-xl hover:bg-sky-500/10 border border-sky-500/20 shadow-sm flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
              title="Automatically arrange nodes sequentially on the grid"
            >
              <LayoutGrid size={13} className="text-sky-400" />
              <span>{translations[currentLang].autoAlign}</span>
            </button>

            <span className="text-slate-800">|</span>

            {/* Lock Canvas Nodes Option */}
            <button
              id="btn_toggle_lock"
              onClick={() => setCanvasLocked(!canvasLocked)}
              className={`p-1.5 rounded-lg active:scale-95 transition-all cursor-pointer border flex items-center gap-1 text-[11px] font-bold shrink-0 ${
                canvasLocked 
                  ? 'bg-rose-950/40 text-rose-450 border-rose-900/30' 
                  : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
              }`}
              title={canvasLocked ? "Unlock positions" : "Lock node positions"}
            >
              <Sliders size={13} />
              <span>{currentLang === 'ru' ? (canvasLocked ? "Закреплено" : "Регулировка") : currentLang === 'zh' ? (canvasLocked ? "已锁定" : "自如拖拽") : (canvasLocked ? "Locked" : "Dragging")}</span>
            </button>

            {/* Grid Snapping Toggle */}
            <button
              id="btn_toggle_snap"
              onClick={() => setSnapToGrid(!snapToGrid)}
              className={`p-1.5 rounded-lg active:scale-95 transition-all cursor-pointer border flex items-center gap-1 text-[11px] font-bold shrink-0 ${
                snapToGrid 
                  ? 'bg-emerald-950/40 text-emerald-450 border-emerald-900/30' 
                  : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
              }`}
              title="Toggle Aligning snap steps to grid nodes"
            >
              <LayoutGrid size={13} />
              <span>{currentLang === 'ru' ? (snapToGrid ? "Сетка: Вкл" : "Без сетки") : currentLang === 'zh' ? (snapToGrid ? "对齐网格" : "自由式") : (snapToGrid ? "Snapping" : "Freeflow")}</span>
            </button>
          </div>
        </main>

        {/* Right Tabbed Panel: Logs / Code / Statistics */}
        <section className="w-full xl:w-[480px] border-t xl:border-t-0 xl:border-l border-slate-850 bg-slate-900/40 flex flex-col overflow-hidden" id="right_sidebar">
          
          {/* Section tab headers */}
          <div className="flex border-b border-slate-850 bg-slate-900/95 overflow-x-auto" id="tab_headers">
            {[
              { id: 'logs', label: `⚡ Run`, icon: RefreshCw },
              { id: 'market', label: `🛒 Store`, icon: ShoppingBag },
              { id: 'deploy', label: `🚀 Cloud`, icon: Globe },
              { id: 'metrics', label: `📊 Stats`, icon: TrendingUp },
              { id: 'versions', label: `⏳ Backups`, icon: History },
              { id: 'evals', label: `🎯 Benchmark`, icon: ChevronRight },
              { id: 'rag', label: `📚 Library`, icon: BookOpen },
              { id: 'code', label: `💻 Code`, icon: Code }
            ].map(tab => (
              <button
                id={`tab-btn-${tab.id}`}
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 font-bold text-[10px] uppercase tracking-wider py-3 px-2 flex items-center justify-center gap-1 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'border-sky-500 text-sky-450 bg-slate-950/25 font-black' 
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                <tab.icon size={11} className={activeTab === tab.id ? 'animate-pulse' : ''} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-5" id="tab_contents">
            <AnimatePresence mode="wait">
              
              {/* Tab 1: Pipeline step-by-step Execution Log timeline */}
              {activeTab === 'logs' && (
                <motion.div 
                  key="logs-tab"
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
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
                      <p className="text-xs font-bold text-slate-400 mb-1">{translations[currentLang].undo === "Undo" ? "Pipeline Awaiting Execution" : currentLang === "ru" ? "Ожидание запуска потока" : "等候流执行中"}</p>
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
                              {(log as any).ragQuery !== undefined && (
                                <div className="space-y-2 bg-teal-950/20 border border-teal-900/30 p-3.5 rounded-xl mt-2 space-y-2 font-mono">
                                  <div className="flex items-center justify-between text-[10px] pb-1.5 border-b border-teal-950/70">
                                    <span className="text-teal-400 font-extrabold uppercase flex items-center gap-1">
                                      <BookOpen size={12} className="animate-pulse" />
                                      {currentLang === 'ru' ? 'Инспектор поиска RAG' : currentLang === 'zh' ? 'RAG 深度矢量搜索检索器' : 'RAG Vector Search Inspector'}
                                    </span>
                                    <span className="text-slate-500 text-[9px]">{(log as any).ragLatency} ms</span>
                                  </div>
                                  <div className="text-[10px] space-y-1">
                                    <span className="text-slate-505 block uppercase font-bold text-[8.5px]">Vector DB Query Query</span>
                                    <div className="bg-slate-950 px-2 py-1.5 rounded border border-slate-900 text-teal-300 font-bold truncate">
                                      {(log as any).ragQuery}
                                    </div>
                                  </div>
                                  <div className="text-[10px] space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className="text-slate-500 block uppercase font-bold text-[8.5px]">Top Relevant Chunks ({(log as any).ragChunksCount} found)</span>
                                    </div>
                                    <div className="space-y-1.5">
                                      {((log as any).ragTopChunks || []).map((chunk: any, ci: number) => (
                                        <div key={ci} className="bg-slate-900/50 p-2 rounded border border-slate-850 space-y-1">
                                          <div className="flex items-center justify-between text-[8px] text-slate-500 border-b border-slate-850/45 pb-0.5 mb-1.5 font-bold">
                                            <span className="text-teal-400/80 font-black">Rank #{ci + 1} Match</span>
                                            <span>Source: {chunk.source || 'Wiki'}</span>
                                          </div>
                                          <p className="text-[10px] text-slate-305 leading-relaxed max-h-16 overflow-y-auto whitespace-pre-wrap">{chunk.text}</p>
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
                                        className="text-[10px] text-sky-405 flex items-center gap-1 hover:underline truncate"
                                      >
                                        <ExternalLink size={10} /> {g.title}
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Display Main Pipeline Results as summary card */}
                      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 mt-4">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-850">
                          <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                            <FileCode size={14} className="text-sky-400" /> Pipeline Consolidated Output
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
                        <pre className="text-xs font-mono text-slate-300 leading-relaxed overflow-x-auto whitespace-pre-wrap max-h-80 bg-slate-900/20 p-2 rounded-lg">
                          {finalResult}
                        </pre>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Tab 1.5: Interactive Automated Evaluation Suite */}
              {activeTab === 'evals' && (
                <motion.div 
                  key="evals-tab"
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="bg-slate-900/40 p-4 border border-slate-850 rounded-2xl space-y-1.5">
                    <h4 className="text-xs font-black text-sky-400 uppercase tracking-widest flex items-center gap-1.5">
                      <ChevronRight size={14} className="text-sky-400" /> Performance Evaluator
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-normal">
                      Run automated <strong>LLM-as-a-Judge</strong> benchmarks to calculate compilation correctness, semantic accuracy, and latency across multiple custom scenario test lines.
                    </p>
                  </div>

                  {/* Benchmark Suite Control */}
                  <button
                    id="btn_run_evals"
                    onClick={handleRunEvaluationSuite}
                    disabled={isEvaluating}
                    className="w-full bg-gradient-to-r from-sky-505 to-indigo-605 text-slate-950 font-black py-3 px-4 rounded-xl text-xs hover:from-sky-400 hover:to-indigo-400 cursor-pointer shadow-lg shadow-sky-500/10 flex items-center justify-center gap-2 transition-all transition-duration-300 disabled:opacity-55 disabled:cursor-not-allowed"
                  >
                    {isEvaluating ? (
                      <>
                        <RefreshCcw size={14} className="animate-spin" />
                        <span>Evaluating Pipeline Cases...</span>
                      </>
                    ) : (
                      <>
                        <Play size={14} fill="currentColor" />
                        <span>Run LLM-as-a-Judge Evaluation Suite</span>
                      </>
                    )}
                  </button>

                  {/* Evaluation Report Results Block */}
                  {evalReport && (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-3"
                      id="eval_report_block"
                    >
                      <div className="grid grid-cols-2 gap-2 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                        <div className="text-center border-r border-slate-850">
                          <span className="text-[9.5px] font-extrabold text-slate-500 uppercase tracking-wider block">Average Grade</span>
                          <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 font-mono">
                            {evalReport.avgScore}/10
                          </span>
                        </div>
                        <div className="text-center">
                          <span className="text-[9.5px] font-extrabold text-slate-500 uppercase tracking-wider block">Avg Latency</span>
                          <span className="text-3xl font-black text-sky-400 font-mono">
                            {evalReport.avgLatencyMs} ms
                          </span>
                        </div>
                      </div>

                      {/* Result items timeline */}
                      <div className="space-y-2.5">
                        {evalReport.items.map((it: any, index: number) => (
                          <div key={it.id} className="bg-slate-950/60 border border-slate-850 rounded-xl p-3.5 space-y-2">
                            <div className="flex items-center justify-between border-b border-slate-850/60 pb-1.5">
                              <span className="text-xs font-bold text-slate-200">
                                Case {index + 1}: {it.name}
                              </span>
                              <span className={`text-xs font-mono font-black px-2 py-0.5 rounded ${
                                it.score >= 8 
                                  ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30' 
                                  : it.score >= 5 
                                  ? 'bg-amber-955/40 text-amber-400 border border-amber-900/20' 
                                  : 'bg-rose-950/40 text-rose-450 border border-rose-900/30'
                              }`}>
                                Grade: {it.score}/10
                              </span>
                            </div>

                            <div className="text-[10.5px] space-y-1">
                              <div>
                                <span className="text-slate-500 font-extrabold text-[9px] uppercase">Input Scenario</span>
                                <p className="text-slate-300 bg-slate-900/50 p-1.5 rounded">{it.query}</p>
                              </div>
                              <div className="pt-1">
                                <span className="text-slate-500 font-extrabold text-[9px] uppercase">Expected standard label</span>
                                <p className="text-slate-400 font-medium">{it.expected}</p>
                              </div>
                              <div className="pt-1">
                                <span className="text-slate-500 font-extrabold text-[9px] uppercase">Actual trace output</span>
                                <pre className="text-xs font-mono text-slate-200 bg-slate-900/70 p-2 rounded max-h-24 overflow-y-auto whitespace-pre-wrap">{it.actual}</pre>
                              </div>
                              <div className="pt-2 border-t border-slate-900/60 bg-sky-950/10 p-2 rounded-lg mt-1.5">
                                <span className="text-sky-400 font-black text-[9.5px] uppercase tracking-wider block">Judge Rationale verdict:</span>
                                <p className="text-slate-300 leading-relaxed italic mt-0.5 text-[10.5px]">"{it.rationale}"</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Configurable test lines list */}
                  <div className="space-y-2 pt-2">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">TestSuite QA Assertions</span>
                    
                    <div className="space-y-2">
                      {evalTestCases.map((tc, idx) => (
                        <div key={tc.id} className="bg-slate-950/40 border border-slate-850 p-3 rounded-xl space-y-1.5">
                          <div className="flex items-center justify-between">
                            <input 
                              type="text" 
                              value={tc.name}
                              onChange={(e) => {
                                const val = e.target.value;
                                setEvalTestCases(prev => prev.map(c => c.id === tc.id ? { ...c, name: val } : c));
                              }}
                              className="bg-transparent border-none text-xs font-extrabold text-slate-200 p-0 focus:ring-0 w-3/4 outline-none"
                            />
                            <button
                              onClick={() => setEvalTestCases(prev => prev.filter(c => c.id !== tc.id))}
                              className="text-slate-600 hover:text-rose-450 p-1 rounded hover:bg-slate-900 cursor-pointer"
                              title="Delete Test Case"
                            >
                              <Trash size={12} />
                            </button>
                          </div>
                          
                          <div className="space-y-1 text-xs">
                            <input
                              type="text"
                              value={tc.query}
                              placeholder="Test Query"
                              onChange={(e) => {
                                const val = e.target.value;
                                setEvalTestCases(prev => prev.map(c => c.id === tc.id ? { ...c, query: val } : c));
                              }}
                              className="w-full bg-slate-950 border border-slate-850/60 rounded-lg p-1.5 text-[11px] text-slate-300 outline-none focus:border-sky-500/30"
                            />
                            <input
                              type="text"
                              value={tc.expected}
                              placeholder="Expected Evaluation Label Keywords"
                              onChange={(e) => {
                                const val = e.target.value;
                                setEvalTestCases(prev => prev.map(c => c.id === tc.id ? { ...c, expected: val } : c));
                              }}
                              className="w-full bg-slate-950 border border-slate-850/60 rounded-lg p-1.5 text-[11px] text-slate-400 outline-none focus:border-sky-500/30"
                            />
                          </div>
                        </div>
                      ))}

                      <button
                        onClick={() => {
                          const nId = `test-${Date.now()}`;
                          setEvalTestCases(prev => [
                            ...prev,
                            { id: nId, name: `Custom Check #${prev.length + 1}`, query: 'User query scenario prompt', expected: 'Outcome golden keywords' }
                          ]);
                        }}
                        className="w-full py-2 bg-slate-950 border border-dashed border-slate-800 hover:border-slate-700 text-[10.5px] font-bold text-slate-400 hover:text-slate-200 rounded-xl cursor-pointer flex items-center justify-center gap-1 transition-all"
                      >
                        <Plus size={11} /> Add New Suite Test Line
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Tab 1.6: Semantic Knowledge Retrieval Store (RAG) */}
              {activeTab === 'rag' && (
                <motion.div 
                  key="rag-tab"
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="bg-slate-900/40 p-4 border border-slate-850 rounded-2xl space-y-1.5">
                    <h4 className="text-xs font-black text-teal-400 uppercase tracking-widest flex items-center gap-1.5">
                      <BookOpen size={14} className="text-teal-400" /> RAG Knowledge Indexer
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-normal font-medium">
                      Chunk, overlapping slice, and index reference context and manuals to provide accurate grounding injections.
                    </p>
                  </div>

                  {/* Manual Paste Section */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9.5px] font-black text-slate-500 uppercase block mb-1">Context source name</label>
                        <input 
                          type="text" 
                          value={ragSource}
                          onChange={(e) => setRagSource(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 p-2 rounded-lg text-xs text-slate-200 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[9.5px] font-black text-slate-500 uppercase block mb-1">Index block type</label>
                        <select className="w-full bg-slate-900 border border-slate-800 p-2 rounded-lg text-xs text-slate-400 font-semibold focus:outline-none">
                          <option>Semantics Text Chunk</option>
                          <option>API Endpoints Spec</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[9.5px] font-black text-slate-500 uppercase block mb-1">Reference source text payload</label>
                      <textarea
                        rows={4}
                        value={ragText}
                        onChange={(e) => setRagText(e.target.value)}
                        placeholder="Paste raw documentation text, API guides, or knowledge base articles..."
                        className="w-full bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-teal-500/40 placeholder:text-slate-600 leading-relaxed"
                      />
                    </div>

                    <button
                      onClick={handleIndexDocument}
                      disabled={isRAGIndexing || !ragText.trim()}
                      className="w-full bg-teal-550 hover:bg-teal-400 text-slate-950 font-black py-2 px-3 rounded-lg text-xs cursor-pointer flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isRAGIndexing ? (
                        <>
                          <RefreshCcw size={13} className="animate-spin" />
                          <span>Chunking text streams...</span>
                        </>
                      ) : (
                        <>
                          <Plus size={13} />
                          <span>Index Document into retrieval cache</span>
                        </>
                      )}
                    </button>

                    {ragIndexStatus && (
                      <p className="text-[10px] font-mono font-bold text-center text-teal-400 leading-normal bg-teal-950/20 py-1.5 px-3 rounded border border-teal-900/30">
                        {ragIndexStatus}
                      </p>
                    )}
                  </div>

                  {/* Interactive Query Sandbox */}
                  <div className="space-y-2.5 pt-2 border-t border-slate-850">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">Semantic Search Retrieval debug</span>
                    
                    <div className="space-y-2">
                      <input 
                        type="text"
                        placeholder="Type keywords to query indexed chunks (e.g., rust, safety)..."
                        value={ragSearchQuery}
                        onChange={(e) => handleRAGSearch(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs text-slate-200 outline-none focus:border-teal-500/35"
                      />

                      {ragSearchResults.length > 0 ? (
                        <div className="space-y-2 max-h-56 overflow-y-auto">
                          {ragSearchResults.map((chunk, ci) => (
                            <div key={chunk.id} className="bg-slate-950/70 border border-teal-900/20 p-3 rounded-xl space-y-1.5">
                              <div className="flex items-center justify-between text-[9px] border-b border-slate-850/60 pb-1">
                                <span className="font-extrabold text-teal-400">Match Rank #{ci+1}</span>
                                <span className="text-slate-500 font-mono italic">{chunk.source}</span>
                              </div>
                              <p className="text-[11px] font-mono text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-900/30 p-2 rounded">
                                {chunk.text}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        ragSearchQuery.trim() && (
                          <div className="text-center py-4 text-slate-500 text-[11px] italic">
                            No matching blocks located. Indexes are isolated to this process pipeline state.
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Tab 2: Code Codebase Generator */}
              {activeTab === 'code' && (
                <motion.div 
                  key="code-tab"
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="flex flex-col gap-2">
                    <p className="text-xs text-slate-400 leading-normal">
                      Export your active visual workspace logic into a production-ready, compiled executable script or client sandbox snippet.
                    </p>

                    {/* Mode Selector Toggle: Simple Sandbox vs Compiled Workflow */}
                    <div className="flex border border-slate-850 bg-slate-950/60 rounded-xl p-1 mt-1" id="code_mode_selector">
                      <button
                        onClick={() => setCodeDisplayType('compiled')}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          codeDisplayType === 'compiled'
                            ? 'bg-slate-900 border border-slate-800 text-sky-450 shadow'
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                        id="code_pipeline_toggle"
                      >
                        <Network size={12} className={codeDisplayType === 'compiled' ? "text-sky-450" : ""} />
                        <span>{currentLang === 'ru' ? "Схема сборки (Полный поток)" : "Full Workflow (Compiled)"}</span>
                      </button>
                      <button
                        onClick={() => setCodeDisplayType('client')}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          codeDisplayType === 'client'
                            ? 'bg-slate-900 border border-slate-800 text-emerald-400 shadow'
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                        id="code_sandbox_toggle"
                      >
                        <Zap size={12} className={codeDisplayType === 'client' ? "text-emerald-400" : ""} />
                        <span>{currentLang === 'ru' ? "Простой шаблон (Песочница)" : "Simple Block (Sandbox)"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Languages Selector */}
                  <div className="flex border border-slate-800 rounded-xl overflow-hidden p-0.5" id="code_lang_selector">
                    {[
                      { id: 'typescript', label: 'TypeScript' },
                      { id: 'python', label: 'Python (v2)' },
                      { id: 'curl', label: 'cURL / Bash' }
                    ].map(lang => (
                      <button
                        id={`btn-lang-${lang.id}`}
                        key={lang.id}
                        onClick={() => {
                          setCodeTab(lang.id as any);
                        }}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                          codeTab === lang.id 
                            ? 'bg-sky-500/15 text-sky-400' 
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>

                  {/* Code Card Block */}
                  <div className="relative">
                    {loadingServerGeneratedCode && codeDisplayType === 'compiled' ? (
                      <div className="flex flex-col items-center justify-center py-20 bg-slate-950 border border-slate-850 rounded-xl text-slate-500 font-mono text-xs gap-3">
                        <RefreshCw size={24} className="animate-spin text-emerald-400" />
                        <span>Compiling active workflow topology into direct code...</span>
                      </div>
                    ) : (
                      <>
                        <pre className="text-[10.5px] font-mono text-slate-300 bg-slate-950 p-4 rounded-xl max-h-[460px] overflow-y-auto whitespace-pre border border-slate-850 leading-relaxed focus:outline-none select-text">
                          {codeDisplayType === 'compiled' 
                            ? (codeTab === 'curl' 
                                ? `# cURL Trigger to invoke the current execution pipeline remotely via the server API\ncurl -X POST http://localhost:3000/api/pipeline/run \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "name": "${activeWorkflow.name || "Custom Flow"}",\n    "nodes": ${JSON.stringify(nodes.map(n => ({ id: n.id, type: n.type, fields: n.fields })), null, 4).replace(/\n/g, '\n    ')},\n    "connections": ${JSON.stringify(connections, null, 4).replace(/\n/g, '\n    ')}\n  }'`
                                : serverGeneratedCode || `// Compiled code for ${codeTab} is not loaded. Try changing modes or click 'Save' to trigger compiler.`)
                            : (codeTab === 'curl' 
                                ? `# Simple webhook trigger for executing the workflow\ncurl -X POST http://localhost:3000/api/pipeline/run`
                                : generateCopieableCode())
                          }
                        </pre>

                        <button
                          id="copy-code-btn"
                          onClick={handleCopyCode}
                          className="absolute top-3 right-3 shrink bg-slate-900 border border-slate-750 text-slate-300 hover:text-slate-100 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all shadow hover:border-slate-600 flex items-center gap-1"
                        >
                          {copiedText === "Copied to clipboard!" ? (
                            <>
                              <Check size={12} className="text-emerald-400" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} />
                              <span>Copy Exporter Script</span>
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </div>

                  <div className="bg-slate-950/40 p-3.5 border border-slate-850 rounded-xl space-y-1 text-xs">
                    <span className="font-bold text-slate-300 block">Integration Instructions:</span>
                    <ol className="list-decimal list-inside text-slate-500 space-y-1 leading-normal pl-1 text-[11px]">
                      {codeTab === 'typescript' && (
                        <>
                          <li>Install SDK & Server tools: <code className="text-teal-400 font-mono">npm install @google/genai express dotenv</code>.</li>
                          <li>Run code with support for Node's stripped types directly: <code className="text-teal-400 font-mono">npx tsx script.ts</code>.</li>
                        </>
                      )}
                      {codeTab === 'python' && (
                        <>
                          <li>Install SDK dependencies: <code className="text-teal-400 font-mono">pip install google-genai requests pydantic</code>.</li>
                          <li>Run python runner script directly: <code className="text-teal-400 font-mono">python script.py</code>.</li>
                        </>
                      )}
                      {codeTab === 'curl' && (
                        <>
                          <li>Ensure the server is running on <code className="text-slate-400 font-mono">http://localhost:3000</code>.</li>
                          <li>Execute cURL in your terminal to see raw step execution pathways logs.</li>
                        </>
                      )}
                      <li>Ensure your environment has initialized: <code className="text-emerald-450 font-mono">export GEMINI_API_KEY="AI-KEY"</code>.</li>
                    </ol>
                  </div>
                </motion.div>
              )}

              {/* Tab 3: Git Virality Score Predictor Dashboard */}
              {activeTab === 'virality' && (
                <motion.div 
                  key="virality-tab"
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Visual developer playgrounds and agent workflow tools gather the absolute largest fork & star indices on GitHub. Tweak your project factors below to calculate potential virality.
                  </p>

                  <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-850 space-y-3.5">
                    <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                      <span className="text-xs font-extrabold text-slate-300">GitHub Fork Metric Tweak</span>
                      <span className="text-xs text-slate-500 flex items-center gap-0.5"><GitFork size={12} /> Sim Config</span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-slate-400 font-semibold">Documentation & Readme Clarity</span>
                          <span className="font-mono text-sky-400">{simDocQual}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="30" 
                          max="100" 
                          value={simDocQual} 
                          onChange={(e) => setSimDocQual(parseInt(e.target.value))}
                          className="w-full accent-sky-500 bg-slate-850"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-slate-400 font-semibold">UI Aesthetic Polishing (Interactive Grids)</span>
                          <span className="font-mono text-sky-400">{simUIAesthetic}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="30" 
                          max="100" 
                          value={simUIAesthetic} 
                          onChange={(e) => setSimUIAesthetic(parseInt(e.target.value))}
                          className="w-full accent-sky-500 bg-slate-850"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-slate-400 font-semibold">Agent Workflow Recursion Depth</span>
                          <span className="font-mono text-sky-400">{simAgentPower}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="30" 
                          max="100" 
                          value={simAgentPower} 
                          onChange={(e) => setSimAgentPower(parseInt(e.target.value))}
                          className="w-full accent-sky-500 bg-slate-850"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-slate-400 font-semibold">Marketing Launch Push (Reddit/Twitter)</span>
                          <span className="font-mono text-sky-400">{simMarketingPush}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="30" 
                          max="100" 
                          value={simMarketingPush} 
                          onChange={(e) => setSimMarketingPush(parseInt(e.target.value))}
                          className="w-full accent-sky-500 bg-slate-850"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Calculated Results Block */}
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 text-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Projected Virality Coefficient</span>
                    
                    <div className="flex justify-center items-baseline space-x-1.5 py-1">
                      <span className="text-4xl font-black font-mono tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-teal-300 to-indigo-400 animate-pulse">
                        {calculateViralityScore()}
                      </span>
                      <span className="text-sm font-extrabold text-slate-500">/100 Stars Intensity</span>
                    </div>

                    <span className={`text-xs font-bold leading-normal block ${getViralityLabel(calculateViralityScore()).color}`}>
                      {getViralityLabel(calculateViralityScore()).text}
                    </span>

                    <p className="text-[11px] text-slate-500 px-2 leading-relaxed leading-normal pt-1.5 border-t border-slate-850/60 text-left">
                      💡 <strong>Virality Tip:</strong> Flow-builders and node canvases like <strong>AgentForge44</strong> have high fork-to-star ratios because developers Fork them to write customized workflow components for SaaS solutions!
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Tab: Observability Telemetry Metrics dashboard */}
              {activeTab === 'metrics' && (
                <motion.div 
                  key="metrics-tab"
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <MetricsDashboard currentLang={currentLang as any} activeGraphId="canvas-workspace" />
                </motion.div>
              )}

              {/* Tab: Canvas checkpoint git-versions rollback history */}
              {activeTab === 'versions' && (
                <motion.div 
                  key="versions-tab"
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <VersionHistory 
                    graphId="canvas-workspace" 
                    activeSnapshot={{ name: projectNameInput, nodes, connections }} 
                    onRollbackSuccess={(snapshot) => {
                      if (snapshot) {
                        setNodes(snapshot.nodes || []);
                        setConnections(snapshot.connections || []);
                        if (snapshot.name) setProjectNameInput(snapshot.name);
                      }
                    }} 
                    currentLang={currentLang as any} 
                  />
                </motion.div>
              )}

              {/* Tab: Marketplace for ready-made agent and tool templates */}
              {activeTab === 'market' && (
                <motion.div 
                  key="market-tab"
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <Marketplace 
                    currentLang={currentLang as any} 
                    activeGraphSnapshot={{ name: projectNameInput || "Default Project", nodes, connections }} 
                    onInstallTemplate={handleInstallTemplateFromMarketplace} 
                  />
                </motion.div>
              )}

              {/* Tab: One-click cloud deployment console */}
              {activeTab === 'deploy' && (
                <motion.div 
                  key="deploy-tab"
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <CloudDeployer 
                    graphId="canvas-workspace" 
                    graphName={projectNameInput || "Untitled Flow"} 
                    currentLang={currentLang as any} 
                    activeSnapshot={{ name: projectNameInput, nodes, connections }} 
                  />
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </section>

      </div>

      {/* Footer statistics branding lines */}
      <footer className="border-t border-slate-850 bg-slate-950 px-6 py-2.5 flex items-center justify-between text-[10.5px] text-slate-500" id="app_footer">
        <div className="flex items-center space-x-3">
          <span className="flex items-center gap-1 font-semibold text-slate-400">
            <GitPullRequest size={11} className="text-sky-450" /> Fully responsive canvas workbench
          </span>
          <span className="text-slate-700">|</span>
          <span className="text-slate-500">Backend: Node Express Server</span>
        </div>
        <div className="flex items-center space-x-1 font-mono text-[10px]">
          <span>© AgentForge44 AI</span>
        </div>
      </footer>

      {/* Import & Export Workflow Modal Overlay */}
      <AnimatePresence>
        {isImportExportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Modal Backdrop overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setIsImportExportModalOpen(false)}
            />

            {/* Modal Content layout */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl z-10 flex flex-col max-h-[90vh]"
            >
              {/* Header block */}
              <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="p-1.5 bg-sky-500/10 rounded-xl border border-sky-500/20">
                    <FileJson className="text-sky-400" size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-100 uppercase tracking-widest">Workflow Configuration</h3>
                    <p className="text-[10.5px] text-slate-500 font-bold">Import or export your visual agent flow chart pipelines</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsImportExportModalOpen(false)}
                  className="text-slate-500 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-850 cursor-pointer transition-colors"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Error Notification banners */}
              {importError && (
                <div className="mx-6 mt-4 p-3.5 bg-rose-950/30 border border-rose-900/40 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span className="font-semibold leading-relaxed">{importError}</span>
                </div>
              )}

              {/* Main Contents Form layout */}
              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Export Options card */}
                  <div className="border border-slate-805 rounded-2xl p-4 bg-slate-950/50 space-y-3.5 flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-black text-sky-400 uppercase tracking-wider block mb-1">⚡ Share & Save Export</span>
                      <p className="text-[11px] text-slate-400 leading-normal font-medium mb-3">
                        Download your active pipeline configuration as a standardized JSON configuration file, or copy the data snippet directly.
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => {
                          const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(jsonStringInput);
                          const downloadAnchor = document.createElement('a');
                          downloadAnchor.setAttribute("href", dataStr);
                          downloadAnchor.setAttribute("download", `${activeWorkflow.name.replace(/\s+/g, '-').toLowerCase()}-export.json`);
                          document.body.appendChild(downloadAnchor);
                          downloadAnchor.click();
                          downloadAnchor.remove();
                          
                          setCopiedText("Downloaded File!");
                          setTimeout(() => setCopiedText(null), 1500);
                        }}
                        className="w-full bg-sky-505 hover:bg-sky-400 text-slate-950 font-black text-xs py-2.5 rounded-xl transition-all duration-300 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Download size={13} />
                        <span>Download JSON File</span>
                      </button>

                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(jsonStringInput);
                          setCopiedText("Copied Clipboard!");
                          setTimeout(() => setCopiedText(null), 1500);
                        }}
                        className="w-full bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 font-bold text-xs py-2.5 rounded-xl transition-all duration-300 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Copy size={13} className="text-slate-400" />
                        <span>{copiedText === "Copied Clipboard!" ? "Copied String!" : "Copy To Clipboard"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Drag-and-drop Local Select Import Box */}
                  <div className="border border-slate-805 rounded-2xl p-4 bg-slate-950/50 space-y-3.5 flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-black text-teal-400 uppercase tracking-wider block mb-1">📂 Load Pipeline File</span>
                      <p className="text-[11px] text-slate-400 leading-normal font-medium">
                        Drag & Drop or browse to select your previously exported pipeline `.json` file.
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      {/* Standard file selector upload trigger */}
                      <label className="w-full bg-slate-905 border border-slate-800 hover:border-teal-900/60 p-5 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer group transition-all duration-300">
                        <Upload size={22} className="text-teal-400 group-hover:scale-110 transition-transform" />
                        <span className="text-[10.5px] font-bold text-slate-400 group-hover:text-teal-300">Select Exported .JSON File</span>
                        <input 
                          type="file" 
                          accept=".json"
                          className="hidden" 
                          onChange={(e) => {
                            const uploadedFile = e.target.files?.[0];
                            if (!uploadedFile) return;
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const resultString = event.target?.result as string;
                              if (resultString) {
                                setJsonStringInput(resultString);
                                handleImportWorkflowJSON(resultString);
                              }
                            };
                            reader.readAsText(uploadedFile);
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Configuration editor / manual JSON pasting view */}
                <div className="space-y-2 pt-2 border-t border-slate-850">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10.5px] font-black text-slate-400 uppercase tracking-wider">Configure Schema Raw Payload</label>
                    <span className="text-[10px] text-slate-500 font-mono">Format validated JSON map</span>
                  </div>
                  <textarea
                    rows={8}
                    value={jsonStringInput}
                    onChange={(e) => setJsonStringInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-2xl p-4 text-xs font-mono text-slate-300 leading-relaxed focus:outline-none focus:border-sky-500/40 focus:ring-1 focus:ring-sky-500/20 max-h-56 overflow-y-auto select-text"
                    placeholder={`{ "nodes": [...], "connections": [...] }`}
                  />
                </div>
              </div>

              {/* Footer controls */}
              <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-mono">Validate imports using standard coordinate matrices</span>
                
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setIsImportExportModalOpen(false)}
                    className="cursor-pointer text-xs font-semibold px-4 py-2.5 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    Close Sheet
                  </button>
                  <button
                    onClick={() => handleImportWorkflowJSON(jsonStringInput)}
                    className="cursor-pointer text-xs font-bold px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl transition-all duration-300 active:scale-95"
                  >
                    Import Live Canvas
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
