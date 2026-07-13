import React from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  LayoutGrid, 
  Sliders, 
  ChevronLeft, 
  ChevronRight, 
  Presentation,
  CheckSquare,
  Command,
  X,
  Undo2,
  Redo2,
  Map as MapIcon,
  Palette,
  CheckCircle,
  AlertTriangle,
  Boxes,
  RefreshCw,
  Unlink,
  ShieldAlert
} from 'lucide-react';
import { Toolbox } from './components/Toolbox';
import { AgentFlowCanvas } from './components/AgentFlowCanvas';
import { ConfigurationPanel } from './components/ConfigurationPanel';
import { CommandPalette } from './components/CommandPalette';
import { FlowNode, FlowConnection } from '../../types';

interface ProjectEditorProps {
  currentLang: 'en' | 'ru' | 'zh';
  translations: any;
  nodes: FlowNode[];
  setNodes: React.Dispatch<React.SetStateAction<FlowNode[]>>;
  connections: FlowConnection[];
  setConnections: React.Dispatch<React.SetStateAction<FlowConnection[]>>;
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  highlightedNodeId: string | null;
  nodeExecutionStatuses: Record<string, 'idle' | 'running' | 'completed' | 'failed'>;
  isRunning: boolean;
  
  // Showcase and Sidebars state
  showcaseMode: boolean;
  setShowcaseMode: (v: boolean) => void;
  leftSidebarCollapsed: boolean;
  setLeftSidebarCollapsed: (v: boolean) => void;
  rightSidebarCollapsed: boolean;
  setRightSidebarCollapsed: (v: boolean) => void;

  // Zoom, snap, and lock
  canvasZoom: number;
  setCanvasZoom: React.Dispatch<React.SetStateAction<number>>;
  snapToGrid: boolean;
  setSnapToGrid: (v: boolean) => void;
  canvasLocked: boolean;
  setCanvasLocked: (v: boolean) => void;

  // Toolbox snapshot & server project props
  onCreateNode: (type: any) => void;
  savedSnapshots: any[];
  onRestoreSnapshot: (snapshot: any) => void;
  onDeleteSnapshot: (id: string) => void;
  onSaveSnapshot: () => void;
  projectNameInput: string;
  onProjectNameInputChange: (val: string) => void;
  onSaveProjectToServer: (name: string) => void;
  savingProject: boolean;
  serverProjects: any[];
  loadingProjects: boolean;
  currentSavedProjectName: string | null;
  onLoadProjectFromServer: (proj: any) => void;

  // Node operations
  handleDeleteNode: (id: string) => void;
  handleConnectNodes: (sourceId: string, targetId: string) => void;
  handleUpdateNodeField: (nodeId: string, fieldKey: string, value: any) => void;
  handleDuplicateNode: (nodeId: string) => void;
  handleDryRunNode: (nodeId: string) => void;
  isDryRunningNode: string | null;
  dryRunOutput: Record<string, string>;
  setDryRunOutput: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  handleAutoAlignNodes: () => void;

  // Collaboration 
  userId: string;
  locks: any;

  // History & Undo/Redo props
  handleUndo?: () => void;
  handleRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  recordAction?: (customNodes?: FlowNode[], customConnections?: FlowConnection[]) => void;

  // Validation props
  validationReport: { errors: string[]; warnings: string[] } | null;
  setValidationReport: (report: { errors: string[]; warnings: string[] } | null) => void;
  handleValidateFlow: () => void;
}

export const ProjectEditor: React.FC<ProjectEditorProps> = ({
  currentLang,
  translations,
  nodes,
  setNodes,
  connections,
  setConnections,
  selectedNodeId,
  setSelectedNodeId,
  highlightedNodeId,
  nodeExecutionStatuses,
  isRunning,
  showcaseMode,
  setShowcaseMode,
  leftSidebarCollapsed,
  setLeftSidebarCollapsed,
  rightSidebarCollapsed,
  setRightSidebarCollapsed,
  canvasZoom,
  setCanvasZoom,
  snapToGrid,
  setSnapToGrid,
  canvasLocked,
  setCanvasLocked,
  onCreateNode,
  savedSnapshots,
  onRestoreSnapshot,
  onDeleteSnapshot,
  onSaveSnapshot,
  projectNameInput,
  onProjectNameInputChange,
  onSaveProjectToServer,
  savingProject,
  serverProjects,
  loadingProjects,
  currentSavedProjectName,
  onLoadProjectFromServer,
  handleDeleteNode,
  handleConnectNodes,
  handleUpdateNodeField,
  handleDuplicateNode,
  handleDryRunNode,
  isDryRunningNode,
  dryRunOutput,
  setDryRunOutput,
  handleAutoAlignNodes,
  userId,
  locks,
  handleUndo,
  handleRedo,
  canUndo,
  canRedo,
  recordAction,
  validationReport,
  setValidationReport,
  handleValidateFlow
}) => {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = React.useState(false);
  const [diagnosticTab, setDiagnosticTab] = React.useState<'all' | 'errors' | 'warnings'>('all');

  const [currentTheme, setCurrentTheme] = React.useState<'cosmic' | 'monotropic' | 'indigo'>(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem("kostromai44_theme");
      if (saved === 'cosmic' || saved === 'monotropic' || saved === 'indigo') return saved;
    }
    return 'cosmic';
  });

  const handleSetTheme = (theme: 'cosmic' | 'monotropic' | 'indigo') => {
    setCurrentTheme(theme);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem("kostromai44_theme", theme);
    }
  };

  const [showMiniMap, setShowMiniMap] = React.useState<boolean>(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem("kostromai44_show_minimap");
      return saved !== 'false';
    }
    return true;
  });

  const handleToggleMiniMap = () => {
    setShowMiniMap(prev => {
      const next = !prev;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem("kostromai44_show_minimap", String(next));
      }
      return next;
    });
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleTieredLayout = () => {
    const inputs = nodes.filter(n => n.type === 'input');
    const outputs = nodes.filter(n => n.type === 'output');
    const others = nodes.filter(n => n.type !== 'input' && n.type !== 'output');

    setNodes(prev => {
      return prev.map(node => {
        if (node.type === 'input') {
          const idx = inputs.findIndex(n => n.id === node.id);
          return { ...node, x: 50, y: 120 + idx * 180 };
        } else if (node.type === 'output') {
          const idx = outputs.findIndex(n => n.id === node.id);
          return { ...node, x: 880, y: 120 + idx * 180 };
        } else {
          const idx = others.findIndex(n => n.id === node.id);
          const col = idx % 2;
          const row = Math.floor(idx / 2);
          return { ...node, x: 320 + col * 270, y: 100 + row * 180 };
        }
      });
    });
  };

  return (
    <div className="flex-1 flex flex-row overflow-hidden relative" id="project_editor_wrapper">
      {/* Left Side: Builder Toolbox & Node Editor */}
      {!showcaseMode && !leftSidebarCollapsed && (
        <Toolbox
          currentLang={currentLang}
          onCreateNode={onCreateNode}
          savedSnapshots={savedSnapshots}
          onRestoreSnapshot={onRestoreSnapshot}
          onDeleteSnapshot={onDeleteSnapshot}
          onSaveSnapshot={onSaveSnapshot}
          projectNameInput={projectNameInput}
          onProjectNameInputChange={onProjectNameInputChange}
          onSaveProjectToServer={onSaveProjectToServer}
          savingProject={savingProject}
          serverProjects={serverProjects}
          loadingProjects={loadingProjects}
          currentSavedProjectName={currentSavedProjectName}
          onLoadProjectFromServer={(proj) => {
            onLoadProjectFromServer(proj);
            onProjectNameInputChange(proj.name);
          }}
          onClose={() => setLeftSidebarCollapsed(true)}
        />
      )}

      {/* Center Canvas Grid & Dynamic Flow Vectors */}
      <main 
        className={`flex-1 relative select-none flex flex-col overflow-hidden min-w-0 min-h-0 transition-colors duration-500 ${
          currentTheme === 'monotropic' 
            ? 'bg-black bg-[radial-gradient(#262626_1.2px,transparent_1.2px)] [background-size:24px_24px]' 
            : currentTheme === 'indigo' 
              ? 'bg-zinc-950 bg-[radial-gradient(#312e81_1.2px,transparent_1.2px)] [background-size:28px_28px]' 
              : 'bg-black bg-[radial-gradient(#1c1917_1.2px,transparent_1.2px)] [background-size:24px_24px]'
        }`}
        id="canvas_stage"
      >
        {/* Legend indicator */}
        <div className="absolute top-4 left-4 bg-black/90 border border-neutral-900 px-3 py-1.5 rounded-lg backdrop-blur text-[10px] text-zinc-400 z-10 font-medium flex items-center gap-2 shadow-volumetric-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-600"></span>
          <span>Flow Canvas Grid: Drag nodes to position. Left hand is input, Right hand is output.</span>
        </div>

        <AgentFlowCanvas
          currentLang={currentLang as any}
          nodes={nodes}
          connections={connections}
          selectedNodeId={selectedNodeId}
          highlightedNodeId={highlightedNodeId}
          nodeExecutionStatuses={nodeExecutionStatuses as any}
          isRunning={isRunning}
          onSelectNode={setSelectedNodeId}
          onDeleteNode={handleDeleteNode}
          onConnectNodes={handleConnectNodes}
          onChangeNodePosition={(nodeId, x, y, updates?: Array<{ id: string; x: number; y: number }>) => {
            if (recordAction) recordAction();
            if (updates && updates.length > 0) {
              const updatesMap = new Map(updates.map(u => [u.id, u]));
              setNodes(prev => prev.map(n => {
                const u = updatesMap.get(n.id);
                return u ? { ...n, x: u.x, y: u.y } : n;
              }));
            } else {
              setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, x, y } : n));
            }
          }}
          canvasZoom={canvasZoom}
          snapToGrid={snapToGrid}
          canvasLocked={canvasLocked}
          showMiniMap={showMiniMap}
        />

        {/* Canvas Premium Controls Float Board */}
        <div className="absolute bottom-6 left-6 bg-black/90 border border-neutral-900 px-4 py-2 rounded-xl shadow-volumetric-md backdrop-blur-md flex items-center space-x-3 z-20" id="canvas_premium_controls">
          <div className="flex items-center space-x-1 border-r border-neutral-900 pr-3">
            <button 
              onClick={() => setCanvasZoom(z => Math.max(0.5, z - 0.1))} 
              className="text-zinc-400 hover:text-white p-1 rounded-lg active:scale-95 transition-all cursor-pointer hover:bg-zinc-900"
              title="Zoom Out"
              id="btn_zoom_out"
            >
              <ZoomOut size={13} />
            </button>
            <span className="text-[11px] font-mono font-bold text-zinc-300 w-10 text-center select-none">
              {Math.round(canvasZoom * 100)}%
            </span>
            <button 
              onClick={() => setCanvasZoom(z => Math.min(1.5, z + 0.1))} 
              className="text-zinc-400 hover:text-white p-1 rounded-lg active:scale-95 transition-all cursor-pointer hover:bg-zinc-900"
              title="Zoom In"
              id="btn_zoom_in"
            >
              <ZoomIn size={13} />
            </button>
          </div>
          
          <button 
            id="btn_zoom_reset"
            onClick={() => setCanvasZoom(1.0)} 
            className="text-zinc-500 hover:text-white text-[10px] font-bold px-2 py-1 rounded hover:bg-zinc-900 cursor-pointer transition-all"
          >
            Reset Scale
          </button>

          <span className="text-zinc-800">|</span>

          <button 
            id="btn_auto_align_grid"
            onClick={handleAutoAlignNodes} 
            className="text-zinc-300 hover:text-white text-[10px] font-bold px-2.5 py-1 rounded bg-zinc-950 hover:bg-zinc-900 border border-neutral-900 flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
            title="Automatically arrange nodes sequentially by type"
          >
            <LayoutGrid size={11} className="text-zinc-500" />
            <span>Type Grid</span>
          </button>

          <button 
            id="btn_tiered_layout"
            onClick={handleTieredLayout} 
            className="text-zinc-300 hover:text-white text-[10px] font-bold px-2.5 py-1 rounded bg-zinc-950 hover:bg-zinc-900 border border-neutral-900 flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
            title="Organize nodes strictly into Input -> Processing -> Output tiers"
          >
            <LayoutGrid size={11} className="text-zinc-500" />
            <span>Tiered Layout</span>
          </button>

          <button 
            id="btn_validate_workflow"
            onClick={handleValidateFlow} 
            className="text-zinc-300 hover:text-white text-[10px] font-bold px-2.5 py-1 rounded bg-zinc-950 hover:bg-zinc-900 border border-neutral-900 flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
            title="Check flow graph for circular references, unlinked triggers, or invalid variables"
          >
            <CheckSquare size={11} className="text-zinc-500" />
            <span>Validate Workflow</span>
          </button>

          <span className="text-zinc-800">|</span>

          {/* Undo/Redo history control block */}
          <div className="flex items-center space-x-1">
            <button
              id="btn_undo"
              disabled={!canUndo}
              onClick={handleUndo}
              className={`p-1.5 rounded active:scale-95 transition-all cursor-pointer border flex items-center gap-1 text-[10px] font-bold ${
                canUndo 
                  ? 'bg-zinc-950 border-neutral-900 text-zinc-300 hover:text-white hover:bg-zinc-900' 
                  : 'border-zinc-950 text-zinc-700 cursor-not-allowed opacity-30 bg-transparent'
              }`}
              title="Undo change (Ctrl+Z)"
            >
              <Undo2 size={11} />
              <span>Undo</span>
            </button>
            
            <button
              id="btn_redo"
              disabled={!canRedo}
              onClick={handleRedo}
              className={`p-1.5 rounded active:scale-95 transition-all cursor-pointer border flex items-center gap-1 text-[10px] font-bold ${
                canRedo 
                  ? 'bg-zinc-950 border-neutral-900 text-zinc-300 hover:text-white hover:bg-zinc-900' 
                  : 'border-zinc-950 text-zinc-700 cursor-not-allowed opacity-30 bg-transparent'
              }`}
              title="Redo change (Ctrl+Y)"
            >
              <Redo2 size={11} />
              <span>Redo</span>
            </button>
          </div>

          <span className="text-slate-800">|</span>

          {/* Mini-map show/hide button */}
          <button
            id="btn_toggle_minimap"
            onClick={handleToggleMiniMap}
            className={`p-1.5 rounded-lg active:scale-95 transition-all cursor-pointer border flex items-center gap-1 text-[11px] font-bold shrink-0 ${
              showMiniMap 
                ? 'bg-sky-950/40 text-sky-400 border-sky-900/30' 
                : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
            title="Toggle canvas navigation mini-map"
          >
            <MapIcon size={13} />
            <span>Mini-map</span>
          </button>

          <span className="text-slate-800">|</span>

          <button 
            id="btn_open_shortcuts_palette"
            onClick={() => setIsCommandPaletteOpen(true)} 
            className="text-teal-450 hover:text-teal-305 text-[11px] font-bold px-3 py-1.5 rounded-xl hover:bg-teal-500/10 border border-teal-500/20 shadow-sm flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
            title="Show shortcut legend or trigger command palette (Ctrl+K)"
          >
            <Command size={13} className="text-teal-400" />
            <span>Shortcuts (Ctrl+K)</span>
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

          <span className="text-slate-800">|</span>

          {/* Left Sidebar Toggle */}
          <button
            id="btn_toggle_left_sidebar"
            onClick={() => setLeftSidebarCollapsed(!leftSidebarCollapsed)}
            className={`p-1.5 rounded-xl active:scale-95 transition-all cursor-pointer border flex items-center gap-1 text-[11px] font-bold shrink-0 ${
              !leftSidebarCollapsed 
                ? 'bg-sky-950/45 text-sky-400 border-sky-900/40' 
                : 'bg-slate-950/50 border-slate-850 text-slate-400 hover:text-slate-200'
            }`}
            title={leftSidebarCollapsed ? "Show Toolbox Sidebar" : "Hide Toolbox Sidebar"}
          >
            {leftSidebarCollapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
            <span>{currentLang === 'ru' ? "Инструменты" : currentLang === 'zh' ? "工具箱" : "Toolbox"}</span>
          </button>

          {/* Right Sidebar Toggle */}
          <button
            id="btn_toggle_right_sidebar"
            onClick={() => setRightSidebarCollapsed(!rightSidebarCollapsed)}
            className={`p-1.5 rounded-xl active:scale-95 transition-all cursor-pointer border flex items-center gap-1 text-[11px] font-bold shrink-0 ${
              !rightSidebarCollapsed 
                ? 'bg-sky-950/45 text-sky-400 border-sky-900/40' 
                : 'bg-slate-950/50 border-slate-850 text-slate-400 hover:text-slate-200'
            }`}
            title={rightSidebarCollapsed ? "Show Panel Sidebar" : "Hide Panel Sidebar"}
          >
            {rightSidebarCollapsed ? <ChevronLeft size={13} /> : <ChevronRight size={13} />}
            <span>{currentLang === 'ru' ? "Панель" : currentLang === 'zh' ? "面板" : "Tabs"}</span>
          </button>

          <span className="text-slate-800">|</span>

          {/* Showcase Mode Toggle */}
          <button
            id="btn_toggle_showcase"
            onClick={() => setShowcaseMode(!showcaseMode)}
            className={`p-1.5 rounded-xl active:scale-95 transition-all cursor-pointer border flex items-center gap-1 text-[11px] font-extrabold shrink-0 ${
              showcaseMode 
                ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-lg shadow-sky-500/20' 
                : 'bg-slate-950/50 border-slate-800 text-slate-300 hover:text-sky-400 hover:bg-slate-850'
            }`}
            title="Toggle Showcase Presentation Mode to free canvas space"
          >
            <Presentation size={13} />
            <span>{currentLang === 'ru' ? (showcaseMode ? "Шоукейс: Вкл" : "Показ") : currentLang === 'zh' ? (showcaseMode ? "演示模式: 开启" : "演示模式") : (showcaseMode ? "Showcase: ON" : "Showcase Mode")}</span>
          </button>
        </div>
      </main>

      {/* Dynamic Command Palette overlay (Cmd/Ctrl + K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        nodes={nodes}
        onSelectNode={setSelectedNodeId}
        onAutoAlign={handleAutoAlignNodes}
        onTieredLayout={handleTieredLayout}
        onValidateFlow={handleValidateFlow}
        onSaveProject={() => onSaveProjectToServer(projectNameInput || 'untitled')}
        onRunPipeline={() => {
          // Trigger run pipeline
          const runBtn = document.getElementById('btn_run_pipeline_header');
          if (runBtn) runBtn.click();
        }}
        onSaveSnapshot={onSaveSnapshot}
        onCreateNode={onCreateNode}
        onSetTheme={handleSetTheme}
        currentLang={currentLang}
      />

      {/* Beautiful Centered Overlay Modal reporting workflow validation status */}
      {validationReport && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto" id="validation_report_overlay">
          <div 
            className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/40">
              <div className="flex items-center space-x-3 text-left">
                <div className={`p-2 rounded-xl ${validationReport.errors.length > 0 ? 'bg-rose-500/10 text-rose-400' : validationReport.warnings.length > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                  {validationReport.errors.length > 0 ? <ShieldAlert size={20} className="animate-pulse" /> : <CheckCircle size={20} />}
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-zinc-100">Workflow Diagnostic Report</h3>
                  <p className="text-[10px] text-zinc-500 font-medium">Static logical and architectural analysis of active agent graph</p>
                </div>
              </div>
              <button 
                onClick={() => setValidationReport(null)}
                className="text-zinc-500 hover:text-zinc-200 cursor-pointer p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
                id="btn_close_diagnostic_modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Controls / Tabs */}
            <div className="px-6 py-3 bg-zinc-950 border-b border-zinc-900/80 flex items-center justify-between text-xs">
              <div className="flex space-x-1">
                {[
                  { id: 'all', label: 'All Issues', count: validationReport.errors.length + validationReport.warnings.length },
                  { id: 'errors', label: 'Critical Errors', count: validationReport.errors.length, color: 'text-rose-400' },
                  { id: 'warnings', label: 'Warnings & Tips', count: validationReport.warnings.length, color: 'text-amber-400' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setDiagnosticTab(tab.id as any)}
                    className={`px-3 py-1 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                      diagnosticTab === tab.id
                        ? 'bg-zinc-850 text-white'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <span className={tab.color}>{tab.label}</span>
                    <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black ${
                      diagnosticTab === tab.id ? 'bg-zinc-700 text-zinc-100' : 'bg-zinc-900 text-zinc-500'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              <div className="text-[10px] font-mono text-zinc-500">
                Nodes: {nodes.length} | Connections: {connections.length}
              </div>
            </div>

            {/* Modal Content List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-left bg-zinc-950 text-xs">
              {validationReport.errors.length === 0 && validationReport.warnings.length === 0 ? (
                <div className="text-center py-12 flex flex-col items-center justify-center space-y-3">
                  <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                    <CheckCircle size={32} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-emerald-400">Pristine Architecture Validation Success</p>
                    <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                      All connection paths, agent variables, and data pipelines are fully resolved. No missing dependencies, circular references, or unlinked triggers detected.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Circular References Group */}
                  {(diagnosticTab === 'all' || diagnosticTab === 'errors') && validationReport.errors.some(e => e.includes('Circular Reference')) && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-rose-400">
                        <RefreshCw size={12} className="animate-spin text-rose-500" style={{ animationDuration: '3s' }} />
                        <span>Circular Reference Violations ({validationReport.errors.filter(e => e.includes('Circular Reference')).length})</span>
                      </div>
                      <div className="space-y-2">
                        {validationReport.errors.filter(e => e.includes('Circular Reference')).map((err, i) => (
                          <div key={i} className="bg-rose-950/10 border border-rose-900/40 p-3.5 rounded-xl text-zinc-300 leading-relaxed font-semibold flex items-start gap-3">
                            <span className="p-1 rounded-md bg-rose-500/10 text-rose-400 mt-0.5"><RefreshCw size={12} /></span>
                            <div className="flex-1">
                              <p className="font-bold text-rose-400 text-[11px] mb-1">Graph Cycle Detected</p>
                              <p className="text-zinc-300 text-[11px] font-mono leading-relaxed">{err}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Missing Dependencies Group */}
                  {(diagnosticTab === 'all' || diagnosticTab === 'errors') && validationReport.errors.some(e => !e.includes('Circular Reference')) && (
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-rose-400">
                        <Boxes size={12} className="text-rose-500" />
                        <span>Missing Dependencies & Connections ({validationReport.errors.filter(e => !e.includes('Circular Reference')).length})</span>
                      </div>
                      <div className="space-y-2">
                        {validationReport.errors.filter(e => !e.includes('Circular Reference')).map((err, i) => (
                          <div key={i} className="bg-rose-950/10 border border-rose-900/40 p-3.5 rounded-xl text-zinc-300 leading-relaxed font-semibold flex items-start gap-3">
                            <span className="p-1 rounded-md bg-rose-500/10 text-rose-400 mt-0.5"><Boxes size={12} /></span>
                            <div className="flex-1">
                              <p className="font-bold text-rose-400 text-[11px] mb-1">Invalid Dynamic Reference</p>
                              <p className="text-zinc-300 text-[11px] leading-relaxed">{err}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Unlinked Triggers Group */}
                  {(diagnosticTab === 'all' || diagnosticTab === 'warnings') && validationReport.warnings.some(w => w.includes('Unlinked')) && (
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-amber-400">
                        <Unlink size={12} className="text-amber-500" />
                        <span>Unlinked Input Triggers ({validationReport.warnings.filter(w => w.includes('Unlinked')).length})</span>
                      </div>
                      <div className="space-y-2">
                        {validationReport.warnings.filter(w => w.includes('Unlinked')).map((warn, i) => (
                          <div key={i} className="bg-amber-950/10 border border-amber-900/30 p-3.5 rounded-xl text-zinc-300 leading-relaxed font-semibold flex items-start gap-3">
                            <span className="p-1 rounded-md bg-amber-500/10 text-amber-400 mt-0.5"><Unlink size={12} /></span>
                            <div className="flex-1">
                              <p className="font-bold text-amber-400 text-[11px] mb-1">Unlinked Flow Block</p>
                              <p className="text-zinc-300 text-[11px] leading-relaxed">{warn}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Configuration Warnings Group */}
                  {(diagnosticTab === 'all' || diagnosticTab === 'warnings') && validationReport.warnings.some(w => !w.includes('Unlinked')) && (
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-amber-400">
                        <AlertTriangle size={12} className="text-amber-500" />
                        <span>Configuration Warnings & Optimization Tips ({validationReport.warnings.filter(w => !w.includes('Unlinked')).length})</span>
                      </div>
                      <div className="space-y-2">
                        {validationReport.warnings.filter(w => !w.includes('Unlinked')).map((warn, i) => (
                          <div key={i} className="bg-amber-950/10 border border-amber-900/30 p-3.5 rounded-xl text-zinc-300 leading-relaxed font-semibold flex items-start gap-3">
                            <span className="p-1 rounded-md bg-amber-500/10 text-amber-400 mt-0.5"><AlertTriangle size={12} /></span>
                            <div className="flex-1">
                              <p className="font-bold text-amber-400 text-[11px] mb-1">Configuration Tip</p>
                              <p className="text-zinc-300 text-[11px] leading-relaxed">{warn}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/40 flex items-center justify-between">
              <button
                onClick={() => {
                  handleTieredLayout();
                  setTimeout(() => handleValidateFlow(), 500);
                }}
                className="text-xs font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1.5 hover:underline cursor-pointer transition-all"
                id="btn_fix_tiered_layout"
              >
                <LayoutGrid size={14} />
                <span>Fix with Tiered Layout</span>
              </button>
              <button
                onClick={() => setValidationReport(null)}
                className="text-xs font-bold px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg cursor-pointer transition-all border border-zinc-700/80 hover:border-zinc-600 animate-in fade-in duration-300"
                id="btn_acknowledge_diagnostic"
              >
                Acknowledge & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Node Specific Properties & Configuration HUD */}
      {!showcaseMode && !rightSidebarCollapsed && selectedNodeId && (
        <ConfigurationPanel
          currentLang={currentLang as any}
          nodes={nodes}
          selectedNodeId={selectedNodeId}
          locks={locks as any}
          userId={userId || "local-user"}
          onUpdateNodeField={handleUpdateNodeField}
          onConnectNodes={handleConnectNodes}
          onDuplicateNode={handleDuplicateNode}
          onDeleteNode={handleDeleteNode}
          onDryRunNode={handleDryRunNode}
          isDryRunningNode={isDryRunningNode}
          dryRunOutput={dryRunOutput}
          setNodes={setNodes}
          setDryRunOutput={setDryRunOutput}
          onClose={() => setSelectedNodeId(null)}
        />
      )}
    </div>
  );
};
