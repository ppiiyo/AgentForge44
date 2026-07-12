import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import posthog from 'posthog-js';
import * as Sentry from '@sentry/react';

import { 
  PREBUILT_TEMPLATES, FlowNode, FlowConnection, 
  Workflow as WorkflowType, StepLog, NodeType 
} from '../types';
import { useCollaboration } from './useCollaboration';
import { useHotkeys } from './useHotkeys';
import { usePipelineExecution } from './usePipelineExecution';
import { useEditorStore } from '../store/useEditorStore';
import { useUIStore } from '../store/useUIStore';
import { usePipelineStore } from '../store/usePipelineStore';

// Import translations just for default snapshot names
const translationsLocal = {
  en: { title: "KostromAi44 Console", saveSuccess: "Snapshot successfully captured!", restoreSuccess: "Workflow restored to capture point." },
  ru: { title: "Арена KostromAi44", saveSuccess: "Снимок конфигурации холста успешно сохранен!", restoreSuccess: "Конфигурация холста восстановлена из резервной точки." },
  zh: { title: "KostromAi44 控制台", saveSuccess: "画布快照配置已成功保存！", restoreSuccess: "已成功将编辑器回滚到该捕获点。" }
};

export function useAgentApp() {
  const { i18n: i18nInstance } = useTranslation();

  // Multi-language localization state
  const [currentLang, setCurrentLang] = useState<'en' | 'ru' | 'zh'>(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem("kostromai44_lang");
      if (saved === 'ru' || saved === 'zh' || saved === 'en') return saved;
    }
    return 'en';
  });

  // Flow Templates and Active selections state
  const [activeWorkflow, setActiveWorkflow] = useState<WorkflowType | null>(() => {
    return PREBUILT_TEMPLATES[0] || null;
  });

  // Coordinator core arrays (re-routed to Zustand stores)
  const nodes = useEditorStore((state) => state.nodes);
  const setNodes = useEditorStore((state) => state.setNodes);
  const connections = useEditorStore((state) => state.connections);
  const setConnections = useEditorStore((state) => state.setConnections);

  // Centralized Validation Engine
  const [validationReport, setValidationReport] = useState<{ errors: string[]; warnings: string[] } | null>(null);

  const handleValidateFlow = () => {
    const errList: string[] = [];
    const warnList: string[] = [];

    // 1. Check for Orphan Nodes
    const connectedNodeIds = new Set<string>();
    connections.forEach(c => {
      connectedNodeIds.add(c.sourceId);
      connectedNodeIds.add(c.targetId);
    });

    nodes.forEach(node => {
      if (nodes.length > 1 && !connectedNodeIds.has(node.id)) {
        errList.push(`Orphan Node detected: "${node.title || node.id}" has no incoming or outgoing connections in this flow.`);
      }

      const f = node.fields as any;
      if (node.type === 'gemini') {
        if (!f?.systemInstruction?.trim()) {
          warnList.push(`Gemini Agent Node "${node.title}" has empty System Instructions.`);
        }
      }
      if (node.type === 'prompt' && !f?.template?.trim()) {
        warnList.push(`Prompt Template Node "${node.title}" has empty Prompt Template text.`);
      }
      if (node.type === 'reviewer' && !f?.criteria?.trim()) {
        warnList.push(`Reviewer Agent Node "${node.title}" has no Review Criteria defined.`);
      }
      if (node.type === 'webhook' && !f?.url?.trim()) {
        errList.push(`Webhook Node "${node.title}" is missing the Outbound Endpoint URL.`);
      }

      const fieldsText = [
        f?.template || '',
        f?.systemInstruction || '',
        f?.body || '',
        f?.headers || '',
        f?.url || ''
      ].join(' ');

      const matches = [...fieldsText.matchAll(/\{\{([a-zA-Z0-9_.-]+)\}\}/g), ...fieldsText.matchAll(/\{([a-zA-Z0-9_.-]+)\}/g)];
      const referenced = [...new Set(matches.map(m => m[1]))];
      const excluded = ['nodeId', 'lastOutput', 'nodeTitle'];

      referenced.forEach(v => {
        if (excluded.includes(v)) return;
        const isDefined = nodes.some(n => {
          if (n.type === 'input' && (n.fields as any)?.variables?.some((inputVar: any) => inputVar.name === v)) return true;
          if (n.id === v) return true;
          if (n.title?.toLowerCase() === v.toLowerCase()) return true;
          return false;
        });

        if (!isDefined && nodes.length > 1) {
          warnList.push(`Node "${node.title}" references variable "${v}" which is not defined by any input node on the active canvas.`);
        }
      });
    });

    // 2. Check for Dangling Edges
    const nodeIds = new Set(nodes.map(n => n.id));
    connections.forEach((c, idx) => {
      const sourceExists = nodeIds.has(c.sourceId);
      const targetExists = nodeIds.has(c.targetId);
      if (!sourceExists || !targetExists) {
        let msg = `Dangling Edge detected (Connection #${idx + 1}): `;
        if (!sourceExists && !targetExists) {
          msg += `Both source node ("${c.sourceId}") and target node ("${c.targetId}") do not exist.`;
        } else if (!sourceExists) {
          msg += `Source node ("${c.sourceId}") does not exist.`;
        } else {
          msg += `Target node ("${c.targetId}") does not exist.`;
        }
        errList.push(msg);
      }
    });

    const report = { errors: errList, warnings: warnList };
    setValidationReport(report);
    return report;
  };

  // Focus & Drag interactions
  const selectedNodeId = useUIStore((state) => state.selectedNodeId);
  const setSelectedNodeId = useUIStore((state) => state.setSelectedNodeId);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [canvasZoom, setCanvasZoom] = useState<number>(1);
  const [connectingSourceId, setConnectingSourceId] = useState<string | null>(null);
  const [connectingCursorPos, setConnectingCursorPos] = useState<{ x: number, y: number } | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [showcaseMode, setShowcaseMode] = useState<boolean>(false);

  // Workflow import/export modal state
  const [isImportExportModalOpen, setIsImportExportModalOpen] = useState<boolean>(false);
  const [jsonStringInput, setJsonStringInput] = useState<string>(() => {
    const defaultVal = {
      name: "KostromAi44 Export Workflow",
      description: "Visual agent node hierarchy topology configuration",
      nodes: PREBUILT_TEMPLATES[0]?.nodes || [],
      connections: PREBUILT_TEMPLATES[0]?.connections || []
    };
    return JSON.stringify(defaultVal, null, 2);
  });
  const [importError, setImportError] = useState<string | null>(null);

  // Undo / Redo timeline history stacks
  const [past, setPast] = useState<Array<{ nodes: FlowNode[], connections: FlowConnection[] }>>([]);
  const [future, setFuture] = useState<Array<{ nodes: FlowNode[], connections: FlowConnection[] }>>([]);

  // Local backups / snap snapshots (re-routed to Zustand store)
  const savedSnapshots = usePipelineStore((state) => state.savedSnapshots);
  const setSavedSnapshots = usePipelineStore((state) => state.setSavedSnapshots);

  // Load saved snapshots on mount, and save on change
  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem("kostromai44_snapshots");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setSavedSnapshots(parsed);
        } catch (_) {}
      }
    }
  }, []);

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem("kostromai44_snapshots", JSON.stringify(savedSnapshots));
    }
  }, [savedSnapshots]);

  // Execution Trace Progress Signals
  const [nodeExecutionStatuses, setNodeExecutionStatuses] = useState<Record<string, 'idle' | 'running' | 'completed' | 'failed'>>({});
  const [isDryRunningNode, setIsDryRunningNode] = useState<string | null>(null);
  const [dryRunOutput, setDryRunOutput] = useState<Record<string, string>>({});
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);

  // Server-side Resilient Projects engine
  const [serverProjects, setServerProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState<boolean>(false);
  const [savingProject, setSavingProject] = useState<boolean>(false);
  const projectNameInput = usePipelineStore((state) => state.projectNameInput);
  const setProjectNameInput = usePipelineStore((state) => state.setProjectNameInput);
  const currentSavedProjectName = usePipelineStore((state) => state.currentSavedProjectName);
  const setCurrentSavedProjectName = usePipelineStore((state) => state.setCurrentSavedProjectName);

  // Debounced auto-save effect
  const isFirstMount = useRef(true);
  const [autoSavingStatus, setAutoSavingStatus] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    setAutoSavingStatus('saving');
    const handler = setTimeout(async () => {
      try {
        const name = projectNameInput || 'untitled';
        const res = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, nodes, connections })
        });
        if (res.ok) {
          const data = await res.json();
          setCurrentSavedProjectName(data.name);
          setAutoSavingStatus('saved');
          setTimeout(() => {
            setAutoSavingStatus(prev => prev === 'saved' ? 'idle' : prev);
          }, 2500);
        } else {
          setAutoSavingStatus('failed');
        }
      } catch (err) {
        console.error("Auto-saving failed:", err);
        setAutoSavingStatus('failed');
      }
    }, 2000);

    return () => clearTimeout(handler);
  }, [nodes, connections]);

  // Sub-tabs configurations
  const [codeDisplayType, setCodeDisplayType] = useState<'compiled' | 'client'>('compiled');
  const [currentView, setCurrentView] = useState<'editor' | 'dashboard' | 'settings'>('editor');
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState<boolean>(false);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState<boolean>(false);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);
  const [canvasLocked, setCanvasLocked] = useState<boolean>(false);

  // Results & Logs
  const [runLogs, setRunLogs] = useState<StepLog[]>([]);
  const [finalResult, setFinalResult] = useState<string>("");
  const [totalDuration, setTotalDuration] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'logs' | 'code' | 'virality' | 'evals' | 'rag' | 'metrics' | 'versions' | 'market' | 'deploy' | 'copilot' | 'sync' | 'debug' | 'doc'>('logs');
  const [codeTab, setCodeTab] = useState<'typescript' | 'python' | 'curl'>('typescript');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Automated Performance Evaluation Suite
  const [evalTestCases, setEvalTestCases] = useState<any[]>([
    { id: 't1', name: 'Rust Compiler Syntax', query: 'Write an optimized binary search in Rust.', expected: 'Should output safe loop logic containing low/high indexes and standard fn signature.' },
    { id: 't2', name: 'Memory Safety Proof', query: 'Explain buffer overflows mitigation in Rust.', expected: 'Must mention ownership, borrow-checker checks, and array offset boundary guardrails.' },
    { id: 't3', name: 'Product Landing Page Heading', query: 'Write a catchy headline for visual node builder.', expected: 'Creative energetic slogans like "Forge Node Connections" or similar.' }
  ]);
  const [evalReport, setEvalReport] = useState<any | null>(null);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);

  // Semantic Document Retrieval Store (RAG)
  const [ragText, setRagText] = useState<string>("");
  const [ragSource, setRagSource] = useState<string>("Product Wiki Resource");
  const [isRAGIndexing, setIsRAGIndexing] = useState<boolean>(false);
  const [ragIndexStatus, setRagIndexStatus] = useState<string>("");
  const [ragSearchQuery, setRagSearchQuery] = useState<string>("");
  const [ragSearchResults, setRagSearchResults] = useState<any[]>([]);

  // Compiler output state
  const [serverGeneratedCode, setServerGeneratedCode] = useState<string>("");
  const [loadingServerGeneratedCode, setLoadingServerGeneratedCode] = useState<boolean>(false);

  // Virality Simulator State
  const [simDocQual, setSimDocQual] = useState<number>(85);
  const [simUIAesthetic, setSimUIAesthetic] = useState<number>(95);
  const [simAgentPower, setSimAgentPower] = useState<number>(90);
  const [simMarketingPush, setSimMarketingPush] = useState<number>(75);

  const canvasRef = useRef<HTMLDivElement>(null);
  const lastEmitTime = useRef(0);
  const dragStartPos = useRef<{ x: number, y: number }>({ x: 0, y: 0 });
  const nodeStartPos = useRef<{ x: number, y: number }>({ x: 0, y: 0 });

  // Collaboration initialization
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
    updateUserColor,
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

  // Real-time lock listener
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

  // Keyboard shortcut actions
  useHotkeys([
    {
      key: 'Enter',
      ctrl: true,
      handler: () => {
        handleRunPipeline();
      }
    },
    {
      key: 'Escape',
      handler: () => {
        setSelectedNodeId(null);
        useUIStore.getState().setSelectedNodeIds([]);
      }
    },
    {
      key: 's',
      ctrl: true,
      handler: () => {
        handleSaveSnapshot();
      }
    },
    {
      key: 'z',
      ctrl: true,
      handler: () => {
        handleUndo();
      }
    },
    {
      key: 'y',
      ctrl: true,
      handler: () => {
        handleRedo();
      }
    },
    {
      key: 'd',
      ctrl: true,
      handler: () => {
        const selectedIds = useUIStore.getState().selectedNodeIds;
        if (selectedIds && selectedIds.length > 0) {
          handleDuplicateNodes(selectedIds);
        } else if (selectedNodeId) {
          handleDuplicateNode(selectedNodeId);
        }
      }
    },
    {
      key: 'Delete',
      handler: () => {
        const selectedIds = useUIStore.getState().selectedNodeIds;
        if (selectedIds && selectedIds.length > 0) {
          handleDeleteNodes(selectedIds);
        } else if (selectedNodeId) {
          handleDeleteNode(selectedNodeId);
        }
      }
    },
    {
      key: 'Backspace',
      handler: () => {
        const selectedIds = useUIStore.getState().selectedNodeIds;
        if (selectedIds && selectedIds.length > 0) {
          handleDeleteNodes(selectedIds);
        } else if (selectedNodeId) {
          handleDeleteNode(selectedNodeId);
        }
      }
    }
  ], [selectedNodeId, nodes, connections, projectNameInput]);

  // Helper to record actions before mutating properties (Undo/Redo)
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
    const dict = translationsLocal[currentLang] || translationsLocal.en;
    const name = customName || `${dict.title} Snapshot #${savedSnapshots.length + 1} (${nodes.length} nodes)`;
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
    localStorage.setItem("kostromai44_snapshots", JSON.stringify(updated));

    setCopiedText(dict.saveSuccess);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const handleRestoreSnapshot = (snapId: string) => {
    const found = savedSnapshots.find(s => s.id === snapId);
    if (!found) return;

    recordAction();
    setNodes(found.nodes);
    setConnections(found.connections);

    const dict = translationsLocal[currentLang] || translationsLocal.en;
    setCopiedText(dict.restoreSuccess);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const handleDeleteSnapshot = (snapId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = savedSnapshots.filter(s => s.id !== snapId);
    setSavedSnapshots(filtered);
    localStorage.setItem("kostromai44_snapshots", JSON.stringify(filtered));
  };

  const {
    handleDryRunNode,
    handleRunPipeline,
    handleAutoSelfHealAndRun,
    animateNodeProgress
  } = usePipelineExecution({
    nodes,
    connections,
    setNodes,
    isRunning,
    setIsRunning,
    runLogs,
    setRunLogs,
    nodeExecutionStatuses,
    setNodeExecutionStatuses,
    finalResult,
    setFinalResult,
    errorText,
    setErrorText,
    totalDuration,
    setTotalDuration,
    setActiveTab,
    isDryRunningNode,
    setIsDryRunningNode,
    dryRunOutput,
    setDryRunOutput,
    handleValidateFlow,
    currentLang,
  });

  // Run automated benchmark suite
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

  // RAG document indexing
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

  // Semantic retrieval search
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

  // Server projects syncing
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
      description: `Loaded from server-side projects directory storage.`,
      logo: "📂",
      stars: "Local Saved",
      category: "User Workspaces",
      complexity: "custom",
      nodes: proj.nodes,
      connections: proj.connections
    });
  };

  // Node editing actions
  const handleUpdateNodeField = (nodeId: string, fieldKey: string, value: any) => {
    recordAction();
    setNodes((prev: FlowNode[]) => prev.map(n => {
      if (n.id === nodeId) {
        return {
          ...n,
          fields: {
            ...n.fields,
            [fieldKey]: value
          }
        } as FlowNode;
      }
      return n;
    }) as FlowNode[]);
    broadcastNodeSettingsUpdated(nodeId, { [fieldKey]: value });
  };

  const handleUpdateVariable = (nodeId: string, index: number, fieldKey: string, value: any) => {
    recordAction();
    let updatedVars: any[] = [];
    setNodes((prev: FlowNode[]) => prev.map(n => {
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
        } as FlowNode;
      }
      return n;
    }) as FlowNode[]);
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

  const handleAutoAlignNodes = () => {
    recordAction();
    const typeOrder: Record<NodeType, number> = {
      'input': 0, 'prompt': 1, 'gemini': 2, 'tool': 3, 'webhook': 3, 'router': 4,
      'rag': 5, 'vector-search': 5, 'multimodal': 6, 'reviewer': 7,
      'output': 8, 'human_confirmation': 9, 'prompt_optimizer': 10, 'debate': 2
    };

    const counts: Record<NodeType, number> = {
      'input': 0, 'prompt': 0, 'gemini': 0, 'tool': 0, 'webhook': 0, 'router': 0,
      'rag': 0, 'vector-search': 0, 'multimodal': 0, 'reviewer': 0,
      'output': 0, 'human_confirmation': 0, 'prompt_optimizer': 0, 'debate': 0
    };

    setNodes(prev => {
      return prev.map(node => {
        const order = typeOrder[node.type] ?? 2;
        const count = counts[node.type] || 0;
        counts[node.type] = count + 1;

        const targetX = 50 + order * 230;
        const targetY = 120 + count * 165;

        return { ...node, x: targetX, y: targetY };
      });
    });
  };

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
      fields: JSON.parse(JSON.stringify(nodeToClone.fields))
    };

    setNodes(prev => [...prev, clonedNode]);
    setSelectedNodeId(cloneId);
  };

  const handleDuplicateNodes = (ids: string[]) => {
    recordAction();
    const nodesToClone = nodes.filter(n => ids.includes(n.id));
    if (nodesToClone.length === 0) return;

    const idMapping: Record<string, string> = {};
    const clonedNodes = nodesToClone.map(nodeToClone => {
      const cloneId = `node-${nodeToClone.type}-${Date.now().toString().slice(-4)}-${Math.random().toString(36).slice(-3)}`;
      idMapping[nodeToClone.id] = cloneId;
      return {
        ...nodeToClone,
        id: cloneId,
        title: `${nodeToClone.title} (Copy)`,
        x: Math.min(4000, nodeToClone.x + 40),
        y: Math.min(4000, nodeToClone.y + 45),
        fields: JSON.parse(JSON.stringify(nodeToClone.fields))
      } as FlowNode;
    });

    const clonedConnections: FlowConnection[] = [];
    connections.forEach(conn => {
      if (ids.includes(conn.sourceId) && ids.includes(conn.targetId)) {
        clonedConnections.push({
          id: `conn-${idMapping[conn.sourceId]}-${idMapping[conn.targetId]}-${Date.now()}`,
          sourceId: idMapping[conn.sourceId],
          targetId: idMapping[conn.targetId]
        });
      }
    });

    setNodes(prev => [...prev, ...clonedNodes]);
    if (clonedConnections.length > 0) {
      setConnections(prev => [...prev, ...clonedConnections]);
    }

    const newClonedIds = clonedNodes.map(n => n.id);
    useUIStore.getState().setSelectedNodeIds(newClonedIds);
    if (newClonedIds.length === 1) {
      useUIStore.getState().setSelectedNodeId(newClonedIds[0]);
    }
  };

  const handleDeleteNodes = (ids: string[]) => {
    recordAction();
    setNodes(prev => prev.filter(n => !ids.includes(n.id)));
    setConnections(prev => prev.filter(c => !ids.includes(c.sourceId) && !ids.includes(c.targetId)));

    const currentSelectedId = useUIStore.getState().selectedNodeId;
    if (currentSelectedId && ids.includes(currentSelectedId)) {
      useUIStore.getState().setSelectedNodeId(null);
    }
    useUIStore.getState().setSelectedNodeIds([]);
  };

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
        logo: "📂",
        stars: "Upload ⭐",
        category: "User Layout",
        complexity: "custom",
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

  const handleCreateNode = (type: NodeType, customFields?: any, customTitle?: string) => {
    recordAction();
    const id = `node-${type}-${Date.now().toString().slice(-4)}`;
    let title = customTitle || "Custom Node";
    let description = "Node definition";
    let initialFields: any = {};

    switch (type) {
      case 'input':
        title = customTitle || "Input variables";
        description = "Initial template variable map definition.";
        initialFields = { variables: [{ key: 'topic', value: 'Open Source', label: 'Topic Key' }] };
        break;
      case 'prompt':
        title = customTitle || "Prompt Template";
        description = "Custom blueprint rendering with variables.";
        initialFields = { template: "Write a short brief about {topic}." };
        break;
      case 'gemini':
        title = customTitle || "Gemini LLM Unit";
        description = "Generators powered by Google Gemini.";
        initialFields = { model: 'gemini-3.5-flash', temperature: 0.7, systemInstruction: 'You are custom logic generator.', useSearchGrounding: false };
        break;
      case 'reviewer':
        title = customTitle || "Critique & Review";
        description = "Automated loop review self-corrections.";
        initialFields = { criteria: "Check if outline is concise.", maxIterations: 1 };
        break;
      case 'output':
        title = customTitle || "Final Output Display";
        description = "Aggregated result viewer.";
        initialFields = { format: 'markdown', value: '' };
        break;
      case 'router':
        title = customTitle || "Execution Router";
        description = "Evaluate and branch traffic flows.";
        initialFields = { conditions: [], defaultTargetNodeId: '' };
        break;
      case 'tool':
        title = customTitle || "External Tool API";
        description = "HTTP request connection controller.";
        initialFields = { url: 'https://api.github.com/zen', method: 'GET', headers: '{}', body: '' };
        break;
      case 'webhook':
        title = customTitle || "Outbound Webhook";
        description = "Triggers external systems via HTTP POST payloads on pipeline step execution or completion.";
        initialFields = { url: 'https://httpbin.org/post', method: 'POST', headers: '{"Content-Type": "application/json"}', body: '{"result": "{{lastOutput}}", "event": "pipeline_completion"}', token: 'bearer-token-123' };
        break;
      case 'rag':
      case 'vector-search':
        title = customTitle || "RAG Search Retriever";
        description = "Query your vector-indexed library database.";
        initialFields = { searchQuery: '{{topic}}', limit: 3, ragResults: [] };
        break;
      case 'multimodal':
        title = customTitle || "Multimodal Document Hub";
        description = "Ingest, parse and analyze PDF, spreadsheets, audio or image sheets.";
        initialFields = { mediaType: 'image', mediaData: '', analysisPrompt: 'Transcribe, extract or analyze the table variables of this attachment.', useGeminiLive: false, outputVariables: 'extractedText=text' };
        break;
      case 'human_confirmation':
        title = customTitle || "Human Confirmation";
        description = "Halts graph execution to ask for human approval before proceeding.";
        initialFields = { message: "Confirm system cost before finalizing pipeline execution?", approvedValue: "", rejectedMessage: "Execution rejected by administrator" };
        break;
      case 'prompt_optimizer':
        title = customTitle || "Prompt Optimizer";
        description = "LLM-assisted Prompt engineering optimization using Few-Shot and Chain of Thought.";
        initialFields = { originalPrompt: "Write an email draft.", targetPersona: "Product Marketing Manager", optimizedPrompt: "" };
        break;
    }

    const newNode: FlowNode = {
      id,
      type,
      title,
      x: 100 + Math.random() * 80,
      y: 100 + Math.random() * 80,
      description,
      fields: { ...initialFields, ...customFields }
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

  const generateCopieableCode = () => {
    const inputNode = nodes.find(n => n.type === 'input') as any;
    const promptNode = nodes.find(n => n.type === 'prompt') as any;
    const geminiNode = nodes.find(n => n.type === 'gemini') as any;

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
 * Compiled from KostromAi44 Visual Flow Canvas
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
Refined code from KostromAi44 Visual agent flows
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

  const handleNodeMouseDown = (nodeId: string, e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.tagName === 'BUTTON' || target.closest('button')) {
      return;
    }
    
    setSelectedNodeId(nodeId);
    if (canvasLocked) return;

    recordAction();
    setDraggedNodeId(nodeId);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      nodeStartPos.current = { x: node.x, y: node.y };
    }
  };

  const handleInstallTemplateFromMarketplace = (tpl: any) => {
    recordAction(tpl.nodes, tpl.connections);
    
    let finalName = tpl.name || "Custom Template";
    const hasConflict = serverProjects.some(p => p.name.toLowerCase() === finalName.toLowerCase());
    if (projectNameInput.toLowerCase() === finalName.toLowerCase() || hasConflict) {
      finalName = `${finalName} (copy)`;
    }
    
    setNodes(tpl.nodes || []);
    setConnections(tpl.connections || []);
    setProjectNameInput(finalName);
    setCurrentSavedProjectName(null);
    
    setCopiedText(`Installed marketplace template: "${finalName}" 🛒`);
    setTimeout(() => setCopiedText(null), 4000);
  };

  const handleApplyCopilotGraph = (newNodes: FlowNode[], newConnections: FlowConnection[]) => {
    recordAction(newNodes, newConnections);
    setNodes(newNodes);
    setConnections(newConnections);
    
    setCopiedText(currentLang === 'ru' ? 'Схема обновлена ИИ-копилотом! 🤖' : currentLang === 'zh' ? '已应用 AI 推荐的流程图布局！🤖' : 'AI Copilot Layout applied! 🤖');
    setTimeout(() => setCopiedText(null), 4000);
  };

  const handleLoadWorkflow = (wf: WorkflowType) => {
    setActiveWorkflow(wf);
    setNodes(wf.nodes);
    setConnections(wf.connections);
    setRunLogs([]);
    setFinalResult("");
    setSelectedNodeId(null);
    setErrorText(null);
  };

  // Compile active workflow
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

  // Listen to viewport changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setLeftSidebarCollapsed(true);
        setRightSidebarCollapsed(true);
      } else {
        setLeftSidebarCollapsed(false);
        setRightSidebarCollapsed(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Proactive reactive compiler
  useEffect(() => {
    if (activeTab === 'code' && codeDisplayType === 'compiled') {
      const targetLang = codeTab === 'python' ? 'python' : 'typescript';
      compileActiveWorkflow(targetLang);
    }
  }, [activeTab, codeTab, codeDisplayType, nodes, connections]);

  // Drag and drop global coordinate mouse listeners
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (draggedNodeId) {
        const dx = (e.clientX - dragStartPos.current.x) / canvasZoom;
        const dy = (e.clientY - dragStartPos.current.y) / canvasZoom;
        
        let finalX = 0;
        let finalY = 0;
        
        setNodes(prev => prev.map(n => {
          if (n.id === draggedNodeId) {
            let newX = nodeStartPos.current.x + dx;
            let newY = nodeStartPos.current.y + dy;

            if (snapToGrid) {
              newX = Math.round(newX / 15) * 15;
              newY = Math.round(newY / 15) * 15;
            }

            newX = Math.max(10, Math.min(4000, newX));
            newY = Math.max(10, Math.min(4000, newY));
            
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
      } else if (connectingSourceId) {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / canvasZoom + canvasRef.current.scrollLeft;
        const y = (e.clientY - rect.top) / canvasZoom + canvasRef.current.scrollTop;
        setConnectingCursorPos({ x, y });
      }
    };

    const handleGlobalMouseUp = () => {
      if (draggedNodeId) {
        setNodes(prev => {
          const matching = prev.find(n => n.id === draggedNodeId);
          if (matching) {
            broadcastNodeMoved(draggedNodeId, matching.x, matching.y);
          }
          return prev;
        });
        setDraggedNodeId(null);
      }
      if (connectingSourceId) {
        if (hoveredNodeId && hoveredNodeId !== connectingSourceId) {
          handleConnectNodes(connectingSourceId, hoveredNodeId);
        }
        setConnectingSourceId(null);
        setConnectingCursorPos(null);
        setHoveredNodeId(null);
      }
    };

    if (draggedNodeId || connectingSourceId) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [draggedNodeId, connectingSourceId, hoveredNodeId, canvasZoom, snapToGrid]);

  return {
    currentLang, setCurrentLang,
    activeWorkflow, setActiveWorkflow,
    nodes, setNodes,
    connections, setConnections,
    selectedNodeId, setSelectedNodeId,
    draggedNodeId, setDraggedNodeId,
    isRunning, setIsRunning,
    canvasZoom, setCanvasZoom,
    connectingSourceId, setConnectingSourceId,
    connectingCursorPos, setConnectingCursorPos,
    hoveredNodeId, setHoveredNodeId,
    showcaseMode, setShowcaseMode,
    isImportExportModalOpen, setIsImportExportModalOpen,
    jsonStringInput, setJsonStringInput,
    importError, setImportError,
    past, setPast,
    future, setFuture,
    savedSnapshots, setSavedSnapshots,
    validationReport, setValidationReport,
    handleValidateFlow,
    nodeExecutionStatuses, setNodeExecutionStatuses,
    isDryRunningNode, setIsDryRunningNode,
    dryRunOutput, setDryRunOutput,
    highlightedNodeId, setHighlightedNodeId,
    serverProjects, setServerProjects,
    loadingProjects, setLoadingProjects,
    savingProject, setSavingProject,
    autoSavingStatus, setAutoSavingStatus,
    projectNameInput, setProjectNameInput,
    currentSavedProjectName, setCurrentSavedProjectName,
    codeDisplayType, setCodeDisplayType,
    currentView, setCurrentView,
    leftSidebarCollapsed, setLeftSidebarCollapsed,
    rightSidebarCollapsed, setRightSidebarCollapsed,
    snapToGrid, setSnapToGrid,
    canvasLocked, setCanvasLocked,
    runLogs, setRunLogs,
    finalResult, setFinalResult,
    totalDuration, setTotalDuration,
    activeTab, setActiveTab,
    codeTab, setCodeTab,
    copiedText, setCopiedText,
    errorText, setErrorText,
    evalTestCases, setEvalTestCases,
    evalReport, setEvalReport,
    isEvaluating, setIsEvaluating,
    ragText, setRagText,
    ragSource, setRagSource,
    isRAGIndexing, setIsRAGIndexing,
    ragIndexStatus, setRagIndexStatus,
    ragSearchQuery, setRagSearchQuery,
    ragSearchResults, setRagSearchResults,
    serverGeneratedCode, setServerGeneratedCode,
    loadingServerGeneratedCode, setLoadingServerGeneratedCode,
    simDocQual, setSimDocQual,
    simUIAesthetic, setSimUIAesthetic,
    simAgentPower, setSimAgentPower,
    simMarketingPush, setSimMarketingPush,
    canvasRef,
    lastEmitTime,
    dragStartPos,
    nodeStartPos,
    userId, userName, userColor, connected, onlineUsers, cursors, locks, notifications, updateUserName, updateUserColor, broadcastCursorMoved, broadcastNodeLock,
    recordAction,
    handleUndo, handleRedo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    handleSaveSnapshot, handleRestoreSnapshot, handleDeleteSnapshot,
    handleDryRunNode, handleRunPipeline, handleAutoSelfHealAndRun,
    handleRunEvaluationSuite, handleIndexDocument, handleRAGSearch,
    fetchServerProjects, handleSaveProjectToServer, handleDeleteProjectFromServer, handleLoadProjectFromServer,
    handleUpdateNodeField, handleUpdateVariable, handleAddVariable, handleDeleteVariable,
    handleAutoAlignNodes, handleDuplicateNode, handleImportWorkflowJSON,
    handleCreateNode, handleDeleteNode, handleConnectNodes,
    generateCopieableCode, handleCopyCode,
    calculateViralityScore, getViralityLabel,
    handleCanvasMouseMove, handleNodeMouseDown,
    handleInstallTemplateFromMarketplace, handleApplyCopilotGraph,
    handleLoadWorkflow,
    i18nInstance
  };
}
