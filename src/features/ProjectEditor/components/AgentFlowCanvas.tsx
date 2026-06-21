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
  BookOpen, Layers, Trash 
} from 'lucide-react';
import { FlowNode, FlowConnection } from '../../../types';

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
  onChangeNodePosition: (nodeId: string, x: number, y: number) => void;
  canvasZoom: number;
  snapToGrid: boolean;
  canvasLocked: boolean;
}

// Custom Node wrapper for ReactFlow that renders our exact exquisite AgentForge44 cards!
const CustomWorkflowNode: React.FC<NodeProps> = ({ data }) => {
  const { 
    node, 
    isSelected, 
    isHighlighted, 
    nodeStatus, 
    onDeleteNode,
    currentLang
  } = data;

  let borderStyle = 'border-slate-800 hover:border-slate-700 bg-slate-900';
  if (isHighlighted) {
    borderStyle = 'border-amber-500 shadow-2xl shadow-amber-500/40 bg-slate-900 ring-2 ring-amber-500 animate-[pulse_2s_infinite]';
  } else if (isSelected) {
    borderStyle = 'border-sky-500 shadow-2xl shadow-sky-500/10 bg-slate-900 ring-1 ring-sky-500/30';
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
            {node.type === 'rag' && <BookOpen size={11} className="text-teal-455" />}
            {node.type === 'multimodal' && <Layers size={11} className="text-amber-400" />}
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
        <p className="text-[11px] text-slate-400 font-medium leading-relaxed mb-2 line-clamp-3">
          {node.description}
        </p>

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
            <span className="text-[9px] font-mono text-rose-400 font-bold bg-rose-950/20 px-1.5 py-0.5 rounded border border-rose-900/10 block w-full truncate">
              🌐 {node.fields.method || 'GET'} : {node.fields.url ? node.fields.url.replace(/^https?:\/\//i, '').slice(0, 15) : 'None'}
            </span>
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
        </div>
      </div>
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
}) => {
  // Convert our custom node types to ReactFlow compatible nodes
  const reactFlowNodes = useMemo<Node[]>(() => {
    return nodes.map((n) => ({
      id: n.id,
      type: 'agent',
      position: { x: n.x, y: n.y },
      draggable: !canvasLocked,
      selectable: true,
      data: {
        node: n,
        isSelected: selectedNodeId === n.id,
        isHighlighted: highlightedNodeId === n.id,
        nodeStatus: nodeExecutionStatuses[n.id] || 'idle',
        onDeleteNode,
        currentLang,
      },
    }));
  }, [nodes, selectedNodeId, highlightedNodeId, nodeExecutionStatuses, onDeleteNode, currentLang, canvasLocked]);

  // Convert our connections to ReactFlow edges
  const reactFlowEdges = useMemo<Edge[]>(() => {
    return connections.map((c) => ({
      id: c.id,
      source: c.sourceId,
      target: c.targetId,
      sourceHandle: 'output',
      targetHandle: 'input',
      animated: isRunning,
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
    }));
  }, [connections, isRunning]);

  // Handle connection events
  const onConnectCallback = useCallback((params: Connection) => {
    if (params.source && params.target) {
      onConnectNodes(params.source, params.target);
    }
  }, [onConnectNodes]);

  // Handle position changes when nodes are dragged
  const onNodeDragStop = useCallback((event: React.MouseEvent, node: Node) => {
    onChangeNodePosition(node.id, Math.round(node.position.x), Math.round(node.position.y));
  }, [onChangeNodePosition]);

  // Handle selection event
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    onSelectNode(node.id);
  }, [onSelectNode]);

  return (
    <div className="w-full h-full min-h-0 flex-1 relative animate-[fadeIn_0.5s_ease-out]">
      <ReactFlow
        nodes={reactFlowNodes}
        edges={reactFlowEdges}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={onNodeClick}
        onConnect={onConnectCallback}
        nodeTypes={nodeTypes}
        snapToGrid={snapToGrid}
        snapGrid={[20, 20]}
        fitView
        nodesDraggable={!canvasLocked}
        nodesConnectable={!canvasLocked}
        className="bg-slate-950"
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#334155" />
        <Controls className="!bg-slate-850 !border-slate-800 !text-slate-100 [&>button]:!border-slate-800 [&>button]:!bg-slate-900" />
        <MiniMap
          nodeColor={(node) => {
            const status = node.data?.nodeStatus;
            if (status === 'running') return '#fbbf24';
            if (status === 'completed') return '#10b981';
            if (status === 'failed') return '#ef4444';
            return '#334155';
          }}
          style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
          maskColor="rgba(0, 0, 0, 0.4)"
        />
      </ReactFlow>
    </div>
  );
};
