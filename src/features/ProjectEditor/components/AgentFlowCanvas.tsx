import React, { useCallback, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  MiniMap,
  Background,
  Connection,
  Handle,
  Position,
  BackgroundVariant,
  NodeProps,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion } from 'motion/react';
import { 
  Database, Terminal, Sparkles, CheckSquare, FileCode, GitBranch, Globe, 
  BookOpen, Layers, Trash, Clock, Cpu
} from 'lucide-react';
import { FlowNode, FlowConnection } from '../../../types';
import { useUIStore } from '../../../store/useUIStore';

// Helper functions to check if a line segment intersects a bounding box
function intersectSegments(
  px1: number, py1: number, px2: number, py2: number,
  qx1: number, qy1: number, qx2: number, qy2: number
): boolean {
  const det = (px2 - px1) * (qy2 - qy1) - (py2 - py1) * (qx2 - qx1);
  if (det === 0) return false; // Parallel

  const lambda = ((qy2 - qy1) * (qx2 - px1) + (qx1 - qx2) * (qy2 - py1)) / det;
  const gamma = ((py1 - py2) * (qx2 - px1) + (px2 - px1) * (qy2 - py1)) / det;

  return (0 <= lambda && lambda <= 1) && (0 <= gamma && gamma <= 1);
}

function checkLineBoxIntersection(
  x1: number, y1: number,
  x2: number, y2: number,
  rx: number, ry: number, rw: number, rh: number
): boolean {
  // Check if either endpoint is inside the box
  if (x1 >= rx && x1 <= rx + rw && y1 >= ry && y1 <= ry + rh) return true;
  if (x2 >= rx && x2 <= rx + rw && y2 >= ry && y2 <= ry + rh) return true;

  // Check line segment intersection with the 4 boundaries of the box
  const left = intersectSegments(x1, y1, x2, y2, rx, ry, rx, ry + rh);
  const right = intersectSegments(x1, y1, x2, y2, rx + rw, ry, rx + rw, ry + rh);
  const top = intersectSegments(x1, y1, x2, y2, rx, ry, rx + rw, ry);
  const bottom = intersectSegments(x1, y1, x2, y2, rx, ry + rh, rx + rw, ry + rh);

  return left || right || top || bottom;
}

interface AgentFlowCanvasProps {
  currentLang: 'en' | 'ru' | 'zh';
  nodes: FlowNode[];
  connections: FlowConnection[];
  selectedNodeId: string | null;
  highlightedNodeId: string | null;
  nodeExecutionStatuses: Record<string, 'idle' | 'running' | 'completed' | 'failed'>;
  isRunning: boolean;
  onSelectNode: (nodeId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onConnectNodes: (sourceId: string, targetId: string) => void;
  onChangeNodePosition: (nodeId: string, x: number, y: number, updates?: Array<{ id: string; x: number; y: number }>) => void;
  canvasZoom: number;
  snapToGrid: boolean;
  canvasLocked: boolean;
  showMiniMap?: boolean;
}

// Custom Node wrapper for ReactFlow that renders our exact exquisite KostromAi44 cards!
const CustomWorkflowNode: React.FC<NodeProps> = ({ data }) => {
  const { 
    node, 
    isSelected, 
    isHighlighted, 
    nodeStatus, 
    onDeleteNode,
    currentLang,
    validationIssue
  } = data;

  let borderStyle = 'border-slate-800 hover:border-slate-700 bg-slate-900';
  if (isHighlighted) {
    borderStyle = 'border-amber-500 shadow-2xl shadow-amber-500/40 bg-slate-900 ring-2 ring-amber-500 animate-[pulse_2s_infinite]';
  } else if (isSelected) {
    borderStyle = 'border-sky-500 shadow-2xl shadow-sky-500/10 bg-slate-900 ring-1 ring-sky-500/30';
  } else if (nodeStatus === 'idle' && validationIssue) {
    if (validationIssue === 'orphaned') {
      borderStyle = 'border-amber-500/80 bg-slate-900 border-dashed ring-2 ring-amber-500/10 shadow-lg shadow-amber-500/5';
    } else {
      borderStyle = 'border-rose-500/80 bg-slate-900 border-dashed ring-2 ring-rose-500/10 shadow-lg shadow-rose-500/5';
    }
  }

  if (nodeStatus === 'running') {
    if (node.type === 'rag') {
      borderStyle = 'border-teal-400 shadow-xl shadow-teal-500/30 bg-slate-900 ring-2 ring-teal-400 animate-[pulse_1.5s_infinite]';
    } else {
      borderStyle = 'border-amber-400 shadow-xl shadow-amber-500/20 bg-slate-900 ring-2 ring-amber-400 shadow-amber-500/10 animate-pulse';
    }
  } else if (nodeStatus === 'completed') {
    if (node.type === 'rag') {
      borderStyle = 'border-teal-550 shadow-xl shadow-teal-500/10 bg-slate-900 ring-1 ring-teal-550/40';
    } else {
      borderStyle = 'border-emerald-500 shadow-xl shadow-emerald-500/10 bg-slate-900 ring-1 ring-emerald-500/40';
    }
  } else if (nodeStatus === 'failed') {
    borderStyle = 'border-rose-500 shadow-xl shadow-rose-500/20 bg-slate-900 ring-2 ring-rose-500/60';
  }

  return (
    <motion.div
      whileHover={{ 
        scale: 1.025, 
        y: -3, 
        boxShadow: isSelected ? "0 15px 30px -10px rgba(14, 165, 233, 0.2)" : "0 12px 24px -10px rgba(0, 0, 0, 0.4)" 
      }}
      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
      className={`w-48 rounded-2xl border text-left flex flex-col transition-all text-slate-100 cursor-pointer ${borderStyle}`}
      style={{ minHeight: '140px' }}
    >
      {/* Input connector handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        style={{
          top: '21px',
          left: '-6px',
          width: '12px',
          height: '12px',
          backgroundColor: '#1e293b',
          border: '2px solid #0f172a',
          zIndex: 40,
        }}
      />

      {/* Output connector handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{
          top: '21px',
          right: '-6px',
          width: '12px',
          height: '12px',
          backgroundColor: '#1e293b',
          border: '2px solid #0f172a',
          zIndex: 40,
        }}
      />

      {/* Header */}
      <div className="px-3 py-2 rounded-t-2xl bg-slate-950 border-b border-slate-850/60 flex items-center justify-between gap-1">
        <div className="flex items-center space-x-1.5 min-w-0 flex-1">
          <span className="shrink-0">
            {node.type === 'input' && <Database size={11} className="text-blue-400" />}
            {node.type === 'prompt' && <Terminal size={11} className="text-purple-400" />}
            {node.type === 'gemini' && <Sparkles size={11} className="text-teal-400 animate-pulse" />}
            {node.type === 'reviewer' && <CheckSquare size={11} className="text-amber-400" />}
            {node.type === 'output' && <FileCode size={11} className="text-indigo-400" />}
            {node.type === 'router' && <GitBranch size={11} className="text-sky-450 animate-pulse" />}
            {node.type === 'tool' && <Globe size={11} className="text-rose-455" />}
            {node.type === 'webhook' && <Globe size={11} className="text-pink-400 animate-pulse" />}
            {node.type === 'rag' && <BookOpen size={11} className="text-teal-455" />}
            {node.type === 'multimodal' && <Layers size={11} className="text-amber-400" />}
            {node.type === 'human_confirmation' && <Clock size={11} className="text-rose-400 animate-pulse" />}
            {node.type === 'prompt_optimizer' && <Cpu size={11} className="text-emerald-400 animate-bounce" />}
          </span>
          <span className="font-bold text-xs text-slate-100 tracking-wide truncate flex-1">
            {node.title}
          </span>
        </div>
        
        <div className="flex items-center space-x-1.5 shrink-0">
          {nodeStatus !== 'idle' && (
            <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded leading-none ${
              nodeStatus === 'running' ? 'bg-amber-950/80 text-amber-400 border border-amber-800/20' :
              nodeStatus === 'completed' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/20' :
              'bg-rose-950/80 text-rose-400 border border-rose-800/20'
            }`}>
              {nodeStatus === 'running' ? '• run' : nodeStatus === 'completed' ? '✓ ok' : '✗ err'}
            </span>
          )}

          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteNode(node.id);
            }}
            className="text-slate-600 hover:text-rose-400 p-0.5 rounded transition-transform cursor-pointer"
          >
            <Trash size={11} />
          </button>
        </div>
      </div>

      {/* Description & dynamic stats/info */}
      <div className="p-3 flex-1 flex flex-col justify-between bg-slate-900/60 rounded-b-2xl">
        <div>
          {node.fields?.tag && node.fields.tag !== 'none' && (
            <div className="mb-2">
              <span className={`inline-block text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded ${
                node.fields.tag === 'drafting' ? 'bg-blue-950/80 text-blue-400 border border-blue-900/40' :
                node.fields.tag === 'refining' ? 'bg-amber-950/80 text-amber-500 border border-amber-900/40' :
                node.fields.tag === 'finalizer' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-900/40' :
                'bg-slate-850 text-slate-400 border border-slate-800'
              }`}>
                {node.fields.tag === 'drafting' ? '✍️ ' : node.fields.tag === 'refining' ? '⚡ ' : '✅ '}
                {node.fields.tag}
              </span>
            </div>
          )}
          <p className="text-[11px] text-slate-400 font-medium leading-relaxed mb-2 line-clamp-3">
            {node.description}
          </p>
        </div>

        <div className="space-y-1 pt-2 border-t border-slate-800/60">
          {node.type === 'input' && (
            <span className="text-[10px] font-mono text-blue-400 font-bold bg-blue-950/30 px-1.5 py-0.5 rounded border border-blue-950/50 block w-max">
              {node.fields.variables?.length || 0} Key parameters
            </span>
          )}
          {node.type === 'prompt' && (
            <div className="text-[10px] text-slate-500 font-mono truncate">
              {node.fields.template ? `"${node.fields.template.slice(0, 18)}..."` : 'Template empty'}
            </div>
          )}
          {node.type === 'gemini' && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-teal-400 font-mono block truncate">
                🎛️ {node.fields.model || 'gemini-3.5-flash'}
              </span>
              {node.fields.useSearchGrounding && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-400">
                  Grounding: ON
                </span>
              )}
            </div>
          )}
          {node.type === 'reviewer' && (
            <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-950/30 px-1.5 py-0.5 rounded border border-amber-950/50 block w-fit">
              Audit loops: {node.fields.maxIterations || 1}
            </span>
          )}
          {node.type === 'output' && (
            <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase bg-indigo-950/30 px-2 py-0.5 rounded border border-indigo-950/50 block w-fit">
              {node.fields.format || 'markdown'} format
            </span>
          )}
          {node.type === 'router' && (
            <span className="text-[10px] font-mono text-sky-400 font-bold uppercase bg-sky-950/30 px-2 py-0.5 rounded border border-sky-900/20 block w-fit">
              🔀 {node.fields.conditions?.length || 0} Routes
            </span>
          )}
          {node.type === 'tool' && (
            <span className="text-[9px] font-mono text-rose-440 font-bold bg-rose-950/20 px-1.5 py-0.5 rounded border border-rose-900/10 block w-full truncate">
              🌐 {node.fields.method || 'GET'} : {node.fields.url ? node.fields.url.replace(/^https?:\/\//i, '').slice(0, 15) : 'None'}
            </span>
          )}
          {node.type === 'webhook' && (
            <div className="space-y-1">
              <span className="text-[9px] font-mono text-pink-400 font-bold bg-pink-950/20 px-1.5 py-0.5 rounded border border-pink-900/10 block w-full truncate">
                🔌 POST : {node.fields.url ? node.fields.url.replace(/^https?:\/\//i, '').slice(0, 15) : 'None'}
              </span>
              {node.fields.token && (
                <span className="text-[8px] font-mono text-slate-500 block truncate">
                  🔑 Token: {node.fields.token.slice(0, 8)}...
                </span>
              )}
            </div>
          )}
          {node.type === 'rag' && (
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-teal-400 font-bold uppercase bg-teal-950/20 px-2 py-0.5 rounded border border-teal-900/15 block w-fit">
                📚 Limit: {node.fields.limit || 3} Files
              </span>
              {nodeStatus === 'completed' && (
                <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-teal-350 bg-teal-950/40 border border-teal-900/30 px-1.5 py-0.2 rounded mt-0.5">
                  Grounded: {node.fields.ragResults?.length || 3} Docs
                </span>
              )}
            </div>
          )}
          {node.type === 'multimodal' && (
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono text-amber-400 font-bold uppercase bg-amber-950/20 px-2 py-0.5 rounded border border-amber-900/15 block w-fit">
                📼 {node.fields.mediaType || 'image'}
              </span>
            </div>
          )}
          {node.type === 'human_confirmation' && (
            <div className="space-y-1">
              <span className="text-[9.5px] font-mono text-rose-450 font-bold uppercase bg-rose-955 px-2 py-0.5 rounded border border-rose-900/15 block w-fit">
                ⏱️ HALT: Wait Approval
              </span>
              {node.fields.message && (
                <p className="text-[9px] text-slate-500 font-medium truncate italic">"{node.fields.message}"</p>
              )}
            </div>
          )}
          {node.type === 'prompt_optimizer' && (
            <div className="space-y-1">
              <span className="text-[9.5px] font-mono text-emerald-400 font-bold uppercase bg-emerald-955 px-2 py-0.5 rounded border border-emerald-900/15 block w-fit">
                🧪 COT Optimizer
              </span>
              <span className="text-[9px] text-slate-500 font-mono block truncate">Persona: {node.fields.targetPersona || "General"}</span>
            </div>
          )}
        </div>
      </div>

      {validationIssue && (
        <div className={`text-[9.5px] font-bold px-2.5 py-1.5 border-t rounded-b-2xl flex items-center gap-1.5 shrink-0 ${
          validationIssue === 'orphaned' 
            ? 'bg-amber-950/70 text-amber-300 border-amber-900/30' 
            : 'bg-rose-950/70 text-rose-300 border-rose-900/30'
        }`}>
          <span className="shrink-0">{validationIssue === 'orphaned' ? '⚠️' : '❌'}</span>
          <span className="truncate flex-1 font-medium">{data.validationMessage}</span>
        </div>
      )}
    </motion.div>
  );
};

const nodeTypes = {
  agent: CustomWorkflowNode,
};

export const AgentFlowCanvas: React.FC<AgentFlowCanvasProps> = ({
  currentLang,
  nodes,
  connections,
  selectedNodeId,
  highlightedNodeId,
  nodeExecutionStatuses,
  isRunning,
  onSelectNode,
  onDeleteNode,
  onConnectNodes,
  onChangeNodePosition,
  snapToGrid,
  canvasLocked,
  showMiniMap = true,
}) => {
  const selectedNodeIds = useUIStore((state) => state.selectedNodeIds);
  const setSelectedNodeIds = useUIStore((state) => state.setSelectedNodeIds);
  const setSelectedNodeId = useUIStore((state) => state.setSelectedNodeId);

  // Spacebar panning state
  const [spacePressed, setSpacePressed] = React.useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        setSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacePressed(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Convert our custom node types to ReactFlow compatible nodes
  const reactFlowNodes = useMemo<Node[]>(() => {
    const connectedIds = new Set<string>();
    connections.forEach(c => {
      connectedIds.add(c.sourceId);
      connectedIds.add(c.targetId);
    });

    return nodes.map((n) => {
      const isOrphaned = nodes.length > 1 && !connectedIds.has(n.id);
      let missingRequired = false;
      let errorMsg = '';

       const f = n.fields as any;
      if (n.type === 'gemini' && !f?.systemInstruction?.trim()) {
        missingRequired = true;
        errorMsg = currentLang === 'ru' ? 'Пустые инструкции системы' : currentLang === 'zh' ? '系统指令为空' : 'System instructions empty';
      } else if (n.type === 'prompt') {
        if (!f?.template?.trim()) {
          missingRequired = true;
          errorMsg = currentLang === 'ru' ? 'Шаблон промпта пуст' : currentLang === 'zh' ? '提示词模板为空' : 'Prompt template empty';
        } else {
          const templateText = f.template;
          const regex = /\{+([a-zA-Z0-9_.-]+)\}+/g;
          const detectedVars = new Set<string>();
          let match;
          while ((match = regex.exec(templateText)) !== null) {
            if (match[1]) {
              detectedVars.add(match[1]);
            }
          }
          const variablesList = Array.from(detectedVars);
          const varValues = f.variable_values || {};
          const unmapped = variablesList.filter(v => !varValues[v]?.trim());
          if (unmapped.length > 0) {
            missingRequired = true;
            errorMsg = currentLang === 'ru' 
              ? `Незаполненные переменные: ${unmapped.join(', ')}` 
              : currentLang === 'zh' 
                ? `未映射的模板变量: ${unmapped.join(', ')}` 
                : `Unmapped variables: ${unmapped.join(', ')}`;
          }
        }
      } else if (n.type === 'reviewer' && !f?.criteria?.trim()) {
        missingRequired = true;
        errorMsg = currentLang === 'ru' ? 'Критерии оценки пусты' : currentLang === 'zh' ? '评审标准为空' : 'Review criteria empty';
      } else if (n.type === 'webhook' && !f?.url?.trim()) {
        missingRequired = true;
        errorMsg = currentLang === 'ru' ? 'Отсутствует URL вебхука' : currentLang === 'zh' ? '未指定 Webhook URL' : 'Webhook URL missing';
      } else if (n.type === 'tool' && !n.fields?.url?.trim()) {
        missingRequired = true;
        errorMsg = currentLang === 'ru' ? 'Отсутствует URL API' : currentLang === 'zh' ? '未指定 API URL' : 'API Endpoint URL missing';
      }

      return {
        id: n.id,
        type: 'agent',
        position: { x: n.x, y: n.y },
        draggable: !canvasLocked,
        selectable: true,
        data: {
          node: n,
          isSelected: selectedNodeIds.includes(n.id) || selectedNodeId === n.id,
          isHighlighted: highlightedNodeId === n.id,
          nodeStatus: nodeExecutionStatuses[n.id] || 'idle',
          onDeleteNode,
          currentLang,
          validationIssue: isOrphaned ? 'orphaned' : missingRequired ? 'missing_fields' : null,
          validationMessage: isOrphaned 
            ? (currentLang === 'ru' ? 'Изолированный узел' : currentLang === 'zh' ? '孤立节点：未连接' : 'Orphaned Node: disconnected')
            : errorMsg,
        },
      };
    });
  }, [nodes, connections, selectedNodeId, selectedNodeIds, highlightedNodeId, nodeExecutionStatuses, onDeleteNode, currentLang, canvasLocked]);

  // Convert our connections to ReactFlow edges
  const reactFlowEdges = useMemo<Edge[]>(() => {
    return connections.map((c) => {
      const sourceNode = nodes.find(n => n.id === c.sourceId);
      const targetNode = nodes.find(n => n.id === c.targetId);

      let edgeType: 'bezier' | 'smoothstep' | 'straight' = 'bezier';

      if (sourceNode && targetNode) {
        // Approximate visual boundaries of our cards: width ~240px, height ~160px
        const cardWidth = 240;
        const cardHeight = 165;

        // Check if a line from source center to target center intersects with any other node's box
        const hasOverlap = nodes.some(n => {
          if (n.id === c.sourceId || n.id === c.targetId) return false;
          return checkLineBoxIntersection(
            sourceNode.x + cardWidth / 2, sourceNode.y + cardHeight / 2,
            targetNode.x + cardWidth / 2, targetNode.y + cardHeight / 2,
            n.x, n.y, cardWidth, cardHeight
          );
        });

        if (hasOverlap) {
          edgeType = 'smoothstep';
        }
      }

      return {
        id: c.id,
        source: c.sourceId,
        target: c.targetId,
        type: edgeType,
        sourceHandle: 'output',
        targetHandle: 'input',
        animated: isRunning,
        pathOptions: edgeType === 'smoothstep' ? { borderRadius: 16, offset: 35 } : undefined,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 14,
          height: 14,
          color: isRunning ? '#10b981' : '#475569',
        },
        style: { 
          stroke: isRunning ? '#10b981' : '#475569', 
          strokeWidth: 2,
        },
      };
    });
  }, [connections, nodes, isRunning]);

  // Handle connection events
  const onConnectCallback = useCallback((params: Connection) => {
    if (params.source && params.target) {
      onConnectNodes(params.source, params.target);
    }
  }, [onConnectNodes]);

  // Handle position changes when nodes are dragged (supporting multi-node dragging!)
  const onNodeDragStop = useCallback((event: React.MouseEvent, node: Node, draggedNodes: Node[]) => {
    if (draggedNodes && draggedNodes.length > 1) {
      const updates = draggedNodes.map(n => ({
        id: n.id,
        x: Math.round(n.position.x),
        y: Math.round(n.position.y)
      }));
      // Call with 4th parameter for single state batch updates
      (onChangeNodePosition as any)(node.id, Math.round(node.position.x), Math.round(node.position.y), updates);
    } else {
      onChangeNodePosition(node.id, Math.round(node.position.x), Math.round(node.position.y));
    }
  }, [onChangeNodePosition]);

  // Handle selection event
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    onSelectNode(node.id);
  }, [onSelectNode]);

  // ReactFlow selection sync listener
  const onSelectionChange = useCallback((params: { nodes: Node[] }) => {
    const selectedIds = params.nodes.map(n => n.id);
    setSelectedNodeIds(selectedIds);
    if (selectedIds.length === 1) {
      setSelectedNodeId(selectedIds[0]);
    } else if (selectedIds.length === 0) {
      setSelectedNodeId(null);
    }
  }, [setSelectedNodeIds, setSelectedNodeId]);

  return (
    <div className="w-full h-full min-h-0 flex-1 relative animate-[fadeIn_0.5s_ease-out]">
      <ReactFlow
        nodes={reactFlowNodes}
        edges={reactFlowEdges}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={onNodeClick}
        onSelectionChange={onSelectionChange}
        onConnect={onConnectCallback}
        nodeTypes={nodeTypes}
        snapToGrid={snapToGrid}
        snapGrid={[20, 20]}
        fitView
        panOnDrag={spacePressed}
        selectionOnDrag={!spacePressed}
        selectionKeyCode="Shift"
        nodesDraggable={!canvasLocked}
        nodesConnectable={!canvasLocked}
        className="bg-slate-950"
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#334155" />
        <Controls className="!bg-slate-850 !border-slate-800 !text-slate-100 [&>button]:!border-slate-800 [&>button]:!bg-slate-900" />
        {showMiniMap && (
          <MiniMap
            position="bottom-right"
            nodeColor={(node) => {
              const status = node.data?.nodeStatus;
              if (status === 'running') return '#fbbf24';
              if (status === 'completed') return '#10b981';
              if (status === 'failed') return '#ef4444';
              return '#334155';
            }}
            style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', right: '16px', bottom: '16px' }}
            maskColor="rgba(0, 0, 0, 0.4)"
          />
        )}
      </ReactFlow>
    </div>
  );
};
