import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Database, Terminal, Sparkles, CheckSquare, FileCode, GitBranch, Globe, 
  BookOpen, Layers, Trash, Eye, Info
} from 'lucide-react';
import { FlowNode, FlowConnection, NodeType } from '../types';

interface FlowCanvasProps {
  currentLang: 'en' | 'ru' | 'zh';
  nodes: FlowNode[];
  connections: FlowConnection[];
  selectedNodeId: string | null;
  highlightedNodeId: string | null;
  nodeExecutionStatuses: Record<string, 'idle' | 'running' | 'completed' | 'failed'>;
  canvasZoom: number;
  locks: Record<string, { userName: string; userId: string }>;
  userId: string;
  onlineUsers: Array<{ id: string; name: string; color: string }>;
  cursors: Record<string, { x: number; y: number; name: string; color: string }>;
  onNodeMouseDown: (nodeId: string, event: React.MouseEvent) => void;
  onDeleteNode: (nodeId: string) => void;
  onSelectNode: (nodeId: string) => void;
  onCanvasMouseMove: (event: React.MouseEvent) => void;
  isRunning: boolean;
}

export const FlowCanvas: React.FC<FlowCanvasProps> = ({
  currentLang,
  nodes,
  connections,
  selectedNodeId,
  highlightedNodeId,
  nodeExecutionStatuses,
  canvasZoom,
  locks,
  userId,
  onlineUsers,
  cursors,
  onNodeMouseDown,
  onDeleteNode,
  onSelectNode,
  onCanvasMouseMove,
  isRunning
}) => {
  return (
    <main 
      onMouseMove={onCanvasMouseMove}
      className="flex-1 min-h-[500px] xl:min-h-0 bg-slate-950 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] overflow-auto relative p-8 select-none" 
      id="canvas_stage"
    >
      
      {/* Legend Indicator */}
      <div className="absolute top-4 left-4 bg-slate-900/80 border border-slate-850 px-3 py-1.5 rounded-xl backdrop-blur text-[10.5px] text-slate-400 z-10 font-semibold flex items-center gap-2 shadow-2xl">
        <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping"></span>
        <span>
          {currentLang === 'ru' 
            ? "Холст Flow Grid: Тяните за заголовок для перемещения блоков. Используйте список для связей." 
            : "Flow Canvas Grid: Hold & Drag headers to move nodes. Use links dropdowns to connect."
          }
        </span>
      </div>

      {/* Online Collaboration Visitors bar */}
      <div className="absolute top-4 right-4 bg-slate-900/80 border border-slate-850 px-3.5 py-1.5 rounded-xl backdrop-blur z-20 flex items-center gap-2 text-xs font-bold leading-none">
        <span className="text-slate-500">Live Presence:</span>
        <div className="flex -space-x-1.5 items-center">
          {onlineUsers.map(user => (
            <div 
              key={user.id} 
              className="h-5.5 w-5.5 rounded-full border border-slate-950 flex items-center justify-center font-extrabold text-[9px] uppercase cursor-pointer"
              style={{ backgroundColor: user.color, color: '#000' }}
              title={user.name}
            >
              {user.name.slice(0, 2)}
            </div>
          ))}
        </div>
      </div>

      {/* Scaled viewport container */}
      <div 
        className="relative origin-top-left flex-1 min-w-[1350px] min-h-[850px] transition-transform duration-100 ease-out" 
        style={{ transform: `scale(${canvasZoom})` }}
      >
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
              const isHighlighted = highlightedNodeId === node.id;
              const nodeStatus = nodeExecutionStatuses[node.id] || 'idle';
              
              let borderStyle = 'border-slate-800 hover:border-slate-700';
              if (isHighlighted) {
                borderStyle = 'border-amber-500 shadow-2xl shadow-amber-500/40 scale-102 ring-2 ring-amber-500 animate-[pulse_2s_infinite]';
              } else if (isSelected) {
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
                  onMouseDown={(e) => onNodeMouseDown(node.id, e)}
                  onClick={() => onSelectNode(node.id)}
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
                        {node.type === 'router' && <GitBranch size={11} className="text-sky-400" />}
                        {node.type === 'tool' && <Globe size={11} className="text-rose-455" />}
                        {node.type === 'rag' && <BookOpen size={11} className="text-teal-455" />}
                        {node.type === 'multimodal' && <Layers size={11} className="text-amber-400" />}
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
                        onClick={(e) => { e.stopPropagation(); onDeleteNode(node.id); }}
                        className="text-slate-600 hover:text-rose-400 p-0.5 rounded transition-transform cursor-pointer"
                        id={`btn-del-${node.id}`}
                      >
                        <Trash size={11} />
                      </button>
                    </div>
                  </div>

                  {/* Node descriptive summaries and properties */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between">
                    <p className="text-[10px] text-slate-400 font-medium leading-normal mb-2 leading-relaxed">
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
                      {node.type === 'multimodal' && (
                        <div className="space-y-1">
                          <span className="text-[9.5px] font-mono text-amber-400 font-bold uppercase bg-amber-950/20 px-2 py-0.5 rounded border border-amber-900/15 block w-fit">
                            📼 Modality: {node.fields.mediaType || 'image'}
                          </span>
                          {node.fields.mediaData ? (
                            <span className="text-[8.5px] text-emerald-400 font-semibold block mt-1">
                              📄 Attachment Loaded ✓
                            </span>
                          ) : (
                            <span className="text-[8.5px] text-slate-500 font-semibold block mt-1">
                              ⚠️ No Attachment Ingested
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

          {/* Real-time Collaboration Cursor Layers Representation */}
          {(Object.entries(cursors) as [string, { x: number; y: number; name: string; color: string }][]).map(([cid, pos]) => {
            if (pos.name === 'Default User') return null;
            return (
              <div 
                key={cid} 
                className="absolute pointer-events-none z-50 flex flex-col transition-all duration-75 ease-out"
                style={{ left: pos.x, top: pos.y + 16 }}
              >
                <div className="flex items-center space-x-1">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M0 0 L12 4.5 L7.5 6 L6 10.5 Z" fill={pos.color} />
                  </svg>
                  <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded text-black font-semibold uppercase leading-none" style={{ backgroundColor: pos.color }}>
                    {pos.name}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
};
