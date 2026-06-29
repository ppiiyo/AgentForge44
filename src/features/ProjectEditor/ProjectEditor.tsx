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
  X
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
  handleDuplicateNode: (node: FlowNode) => void;
  handleDryRunNode: (nodeId: string) => void;
  isDryRunningNode: string | null;
  dryRunOutput: Record<string, string>;
  setDryRunOutput: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  handleAutoAlignNodes: () => void;

  // Collaboration 
  userId: string;
  locks: any;
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
  locks
}) => {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = React.useState(false);
  const [validationReport, setValidationReport] = React.useState<{ errors: string[]; warnings: string[] } | null>(null);

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

  const handleValidateFlow = () => {
    const errList: string[] = [];
    const warnList: string[] = [];

    const connectedIds = new Set<string>();
    connections.forEach(c => {
      connectedIds.add(c.sourceId);
      connectedIds.add(c.targetId);
    });

    nodes.forEach(node => {
      if (nodes.length > 1 && !connectedIds.has(node.id)) {
        warnList.push(`Node "${node.title || node.id}" is completely disconnected from the rest of the flow network.`);
      }

      if (node.type === 'gemini') {
        if (!node.fields?.systemInstruction?.trim()) {
          warnList.push(`Gemini Agent Node "${node.title}" has empty System Instructions.`);
        }
      }
      if (node.type === 'prompt' && !node.fields?.template?.trim()) {
        warnList.push(`Prompt Template Node "${node.title}" has empty Prompt Template text.`);
      }
      if (node.type === 'reviewer' && !node.fields?.criteria?.trim()) {
        warnList.push(`Reviewer Agent Node "${node.title}" has no Review Criteria defined.`);
      }
      if (node.type === 'webhook' && !node.fields?.url?.trim()) {
        errList.push(`Webhook Node "${node.title}" is missing the Outbound Endpoint URL.`);
      }

      const fieldsText = [
        node.fields?.template || '',
        node.fields?.systemInstruction || '',
        node.fields?.body || '',
        node.fields?.headers || '',
        node.fields?.url || ''
      ].join(' ');

      const matches = [...fieldsText.matchAll(/\{\{([a-zA-Z0-9_.-]+)\}\}/g), ...fieldsText.matchAll(/\{([a-zA-Z0-9_.-]+)\}/g)];
      const referenced = [...new Set(matches.map(m => m[1]))];
      const excluded = ['nodeId', 'lastOutput', 'nodeTitle'];

      referenced.forEach(v => {
        if (excluded.includes(v)) return;
        const isDefined = nodes.some(n => {
          if (n.type === 'input' && n.fields?.variables?.some((inputVar: any) => inputVar.name === v)) return true;
          if (n.id === v) return true;
          if (n.title?.toLowerCase() === v.toLowerCase()) return true;
          return false;
        });

        if (!isDefined && nodes.length > 1) {
          warnList.push(`Node "${node.title}" references variable "${v}" which is not defined by any input node on the active canvas.`);
        }
      });
    });

    setValidationReport({ errors: errList, warnings: warnList });
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
        className="flex-1 bg-slate-950 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] relative select-none flex flex-col overflow-hidden min-w-0 min-h-0" 
        id="canvas_stage"
      >
        {/* Legend indicator */}
        <div className="absolute top-4 left-4 bg-slate-900/80 border border-slate-850 px-3 py-1.5 rounded-xl backdrop-blur text-[10.5px] text-slate-400 z-10 font-semibold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping"></span>
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
        />

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
            title="Automatically arrange nodes sequentially by type"
          >
            <LayoutGrid size={13} className="text-sky-400" />
            <span>Type Grid</span>
          </button>

          <button 
            id="btn_tiered_layout"
            onClick={handleTieredLayout} 
            className="text-indigo-450 hover:text-indigo-305 text-[11px] font-bold px-3 py-1.5 rounded-xl hover:bg-indigo-500/10 border border-indigo-500/20 shadow-sm flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
            title="Organize nodes strictly into Input -> Processing -> Output tiers"
          >
            <LayoutGrid size={13} className="text-indigo-400" />
            <span>Tiered Layout</span>
          </button>

          <button 
            id="btn_validate_flow"
            onClick={handleValidateFlow} 
            className="text-amber-450 hover:text-amber-305 text-[11px] font-bold px-3 py-1.5 rounded-xl hover:bg-amber-500/10 border border-amber-500/20 shadow-sm flex items-center gap-1.5 cursor-pointer transition-all shrink-0 animate-pulse"
            title="Check flow graph for disconnected agents or invalid dynamic variables"
          >
            <CheckSquare size={13} className="text-amber-400" />
            <span>Validate Flow</span>
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
        currentLang={currentLang}
      />

      {/* Beautiful glassmorphism float-panel reporting validation status */}
      {validationReport && (
        <div className="absolute top-16 right-6 w-96 bg-slate-900/95 border border-slate-800 rounded-3xl shadow-2xl p-5 z-40 backdrop-blur-md max-h-[70vh] flex flex-col animate-[scaleUp_0.15s_ease-out]" id="validation_report_hud">
          <div className="flex items-center justify-between border-b border-slate-850 pb-3 mb-3">
            <div className="flex items-center space-x-2">
              <span className={`h-2.5 w-2.5 rounded-full ${validationReport.errors.length > 0 ? 'bg-rose-500 animate-ping' : validationReport.warnings.length > 0 ? 'bg-amber-400' : 'bg-emerald-500'}`}></span>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-100">Flow Validation Report</h4>
            </div>
            <button 
              onClick={() => setValidationReport(null)}
              className="text-slate-500 hover:text-slate-200 cursor-pointer p-1 rounded-lg hover:bg-slate-800"
            >
              <X size={14} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-left">
            {validationReport.errors.length === 0 && validationReport.warnings.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-xs font-bold text-emerald-400 mb-1">✅ 0 Errors & Warnings Found</p>
                <p className="text-[10.5px] text-slate-500">Your graph architecture has pristine logical alignment!</p>
              </div>
            ) : (
              <>
                {validationReport.errors.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-rose-400">Critical Errors ({validationReport.errors.length})</p>
                    {validationReport.errors.map((e, idx) => (
                      <div key={idx} className="bg-rose-950/25 border border-rose-900/30 p-2.5 rounded-xl text-[10.5px] text-rose-300 leading-relaxed font-semibold flex items-start gap-2">
                        <span className="text-rose-500 shrink-0 font-bold">•</span>
                        <span>{e}</span>
                      </div>
                    ))}
                  </div>
                )}

                {validationReport.warnings.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">Warnings & Tips ({validationReport.warnings.length})</p>
                    {validationReport.warnings.map((w, idx) => (
                      <div key={idx} className="bg-amber-955/40 border border-amber-900/30 p-2.5 rounded-xl text-[10.5px] text-amber-300 leading-relaxed font-semibold flex items-start gap-2">
                        <span className="text-amber-500 shrink-0 font-bold">•</span>
                        <span>{w}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="border-t border-slate-850 pt-3 mt-3 flex items-center justify-between">
            <button
              onClick={() => {
                handleTieredLayout();
                setTimeout(() => handleValidateFlow(), 500);
              }}
              className="text-[10px] font-extrabold text-sky-400 hover:text-sky-300 flex items-center gap-1 hover:underline cursor-pointer"
            >
              <LayoutGrid size={12} />
              <span>Fix with Tiered Layout</span>
            </button>
            <button
              onClick={() => setValidationReport(null)}
              className="text-[10.5px] font-bold px-3 py-1 bg-slate-800 text-slate-200 hover:bg-slate-750 rounded-lg cursor-pointer transition-all"
            >
              Acknowledge
            </button>
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
