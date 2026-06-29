import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Settings, Info, Trash, CopyPlus, Lock, Compass, FlaskConical, RefreshCw, Upload, X, Sparkles
} from 'lucide-react';
import { FlowNode, NodeType } from '../../../types';

interface Model {
  id: string;
  name: string;
  speed?: string;
  cost?: string;
}

interface Provider {
  id: string;
  name: string;
  models: Model[];
}

const DEFAULT_PROVIDERS: Provider[] = [
  {
    id: "google",
    name: "Google Gemini",
    models: [
      { id: "gemini-3.5-flash", name: "Gemini 3.5 Flash (Default, recommended)", speed: "Fast", cost: "Low" },
      { id: "gemini-3.5-pro", name: "Gemini 3.5 Pro (Complex Reasoning)", speed: "Balanced", cost: "Medium" },
      { id: "gemini-3.1-flash-lite", name: "Gemini 3.1 Flash Lite (High scalability layer)", speed: "Ultra-fast", cost: "Very Low" }
    ]
  },
  {
    id: "openai",
    name: "OpenAI GPT",
    models: [
      { id: "gpt-4o-mini", name: "GPT-4o Mini", speed: "Fast", cost: "Low" },
      { id: "gpt-4o", name: "GPT-4o (Reasoning)", speed: "Balanced", cost: "Medium" },
      { id: "o1-mini", name: "o1 Mini (Developer)", speed: "Specialized", cost: "Medium" }
    ]
  },
  {
    id: "anthropic",
    name: "Anthropic Claude",
    models: [
      { id: "claude-3-5-sonnet-latest", name: "Claude 3.5 Sonnet", speed: "Balanced", cost: "Medium-High" },
      { id: "claude-3-5-haiku-latest", name: "Claude 3.5 Haiku", speed: "Fast", cost: "Low" }
    ]
  },
  {
    id: "ollama",
    name: "Ollama (Offline Local)",
    models: [
      { id: "llama3", name: "Llama 3 (8B Local)", speed: "Hardware dependent", cost: "Free/Local" },
      { id: "mistral", name: "Mistral (7B Local)", speed: "Hardware dependent", cost: "Free/Local" }
    ]
  }
];

interface ConfigurationPanelProps {
  currentLang: 'en' | 'ru' | 'zh';
  nodes: FlowNode[];
  selectedNodeId: string | null;
  locks: Record<string, { userName: string; userId: string }>;
  userId: string;
  onUpdateNodeField: (nodeId: string, field: string, value: any) => void;
  onConnectNodes: (sourceId: string, targetId: string) => void;
  onDuplicateNode: (nodeId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onDryRunNode: (nodeId: string) => void;
  isDryRunningNode: string | null;
  dryRunOutput: Record<string, string>;
  setNodes: React.Dispatch<React.SetStateAction<FlowNode[]>>;
  setDryRunOutput: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onClose?: () => void;
}

export const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({
  currentLang,
  nodes,
  selectedNodeId,
  locks,
  userId,
  onUpdateNodeField,
  onConnectNodes,
  onDuplicateNode,
  onDeleteNode,
  onDryRunNode,
  isDryRunningNode,
  dryRunOutput,
  setNodes,
  setDryRunOutput,
  onClose
}) => {
  const node = nodes.find(n => n.id === selectedNodeId);
  const activeLock = node ? locks[node.id] : null;
  const isLockedByOther = activeLock && activeLock.userId !== userId;

  const [providers, setProviders] = useState<Provider[]>([]);

  useEffect(() => {
    fetch('/api/llm-providers')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setProviders(data);
        }
      })
      .catch(err => {
        console.warn("Could not retrieve provider registry, using defaults:", err);
      });
  }, []);

  const handleAddVariable = (nodeId: string) => {
    setNodes(prev => prev.map(n => {
      if (n.id === nodeId) {
        const currentVars = n.fields.variables || [];
        return {
          ...n,
          fields: {
            ...n.fields,
            variables: [...currentVars, { key: `var_${Date.now().toString(36)}`, value: '' }]
          }
        };
      }
      return n;
    }));
  };

  const handleRemoveVariable = (nodeId: string, key: string) => {
    setNodes(prev => prev.map(n => {
      if (n.id === nodeId) {
        const currentVars = n.fields.variables || [];
        return {
          ...n,
          fields: {
            ...n.fields,
            variables: currentVars.filter((v: any) => v.key !== key)
          }
        };
      }
      return n;
    }));
  };

  const handleUpdateVariable = (nodeId: string, key: string, field: 'key' | 'value', value: string) => {
    setNodes(prev => prev.map(n => {
      if (n.id === nodeId) {
        const currentVars = n.fields.variables || [];
        return {
          ...n,
          fields: {
            ...n.fields,
            variables: currentVars.map((v: any) => v.key === key ? { ...v, [field]: value } : v)
          }
        };
      }
      return n;
    }));
  };

  return (
    <aside className="absolute md:relative right-0 top-0 h-full w-full max-w-[320px] md:max-w-none md:w-64 lg:w-72 border-l border-slate-850 bg-slate-900/95 md:bg-slate-900/50 flex flex-col overflow-y-auto shrink-0 p-4 z-35 shadow-2xl md:shadow-none animate-[fadeIn_0.3s_ease-out]" id="right_config_panel">
      <div className="flex items-center justify-between gap-2 mb-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <Settings size={14} className="text-sky-450 animate-spin" /> 
          {currentLang === 'ru' ? "СВОЙСТВА И НАСТРОЙКИ" : currentLang === 'zh' ? "节点属性配置" : "PROPERTIES & CONFIGURATION"}
        </h3>
        {onClose && (
          <button 
            type="button"
            onClick={onClose}
            className="md:hidden text-slate-500 hover:text-slate-200 p-1.5 hover:bg-slate-850 rounded-xl transition-all cursor-pointer active:scale-95"
            title="Close Settings"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {selectedNodeId && node ? (
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
            <span className="text-xs font-extrabold text-slate-200 capitalize flex items-center gap-1.5 truncate pr-2">
              {node.title}
            </span>
            <div className="flex items-center space-x-1 shrink-0">
              <button 
                onClick={() => onDuplicateNode(node.id)}
                className="text-slate-500 hover:text-sky-400 p-1 rounded-lg hover:bg-sky-950/15 cursor-pointer transition-colors"
                title="Duplicate/Clone this node card"
                id={`duplicate-node-${node.id}`}
              >
                <CopyPlus size={13} />
              </button>
              <button 
                onClick={() => onDeleteNode(node.id)}
                className="text-slate-500 hover:text-rose-450 p-1 rounded-lg hover:bg-rose-955 cursor-pointer transition-colors"
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
                <span className="text-[9px] font-mono text-slate-505 uppercase block">Sub-Trace</span>
              </div>
              
              <button
                onClick={() => onDryRunNode(node.id)}
                disabled={isDryRunningNode === node.id}
                className={`w-full text-[11px] font-bold uppercase tracking-wider py-1.5 px-2.5 rounded-lg border transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 ${
                  isDryRunningNode === node.id
                    ? 'bg-amber-950/20 text-amber-400 border-amber-805 animate-pulse cursor-wait'
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
                  <div className="text-slate-500 font-extrabold pb-0.5 border-b border-slate-900 mb-1 flex justify-between uppercase leading-none rounded">
                    <span>{currentLang === 'ru' ? "Лог:" : currentLang === 'zh' ? "沙盒控制台:" : "Output:"}</span>
                    <button onClick={() => setDryRunOutput(prev => ({ ...prev, [node.id]: '' }))} className="text-slate-650 hover:text-rose-455 cursor-pointer leading-none">✕</button>
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

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Workflow Stage Label Tag</label>
              <select
                value={node.fields.tag || 'none'}
                onChange={(e) => onUpdateNodeField(node.id, 'tag', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500/50 focus:border-sky-500/50 cursor-pointer font-semibold"
              >
                <option value="none">None (Standard Card)</option>
                <option value="drafting">✍️ Drafting (Blue)</option>
                <option value="refining">⚡ Refining (Yellow)</option>
                <option value="finalizer">✅ Finalizer (Green)</option>
              </select>
            </div>

            {/* Render node-specific forms */}
            {node.type === 'input' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Input Fields Setup</label>
                  <button 
                    onClick={() => handleAddVariable(node.id)}
                    className="text-[10px] font-bold text-sky-400 hover:text-sky-305 flex items-center gap-0.5 cursor-pointer"
                    id="add-variable-btn"
                  >
                    + Add Field
                  </button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {(node.fields.variables || []).length === 0 ? (
                    <p className="text-[10px] text-slate-605 italic text-center">No variables mapped yet.</p>
                  ) : (
                    node.fields.variables.map((variable: any) => (
                      <div key={variable.key} className="flex gap-1.5 items-center">
                        <input
                          type="text"
                          value={variable.key}
                          onChange={(e) => handleUpdateVariable(node.id, variable.key, 'key', e.target.value)}
                          placeholder="Key Name"
                          className="w-1/2 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[10.5px] text-slate-150 font-mono"
                        />
                        <input
                          type="text"
                          value={variable.value}
                          onChange={(e) => handleUpdateVariable(node.id, variable.key, 'value', e.target.value)}
                          placeholder="Initial Val"
                          className="w-1/2 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[10.5px] text-slate-205"
                        />
                        <button
                          onClick={() => handleRemoveVariable(node.id, variable.key)}
                          className="text-[10px] text-rose-500 hover:text-rose-400 p-0.5 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Prompt template field configuration */}
            {node.type === 'prompt' && (
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Formula / Template Context</label>
                <textarea
                  rows={6}
                  value={node.fields.template || ''}
                  onChange={(e) => onUpdateNodeField(node.id, 'template', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-100 font-mono focus:outline-none"
                  placeholder="e.g. Generate a report for {topic} targeting {audience}..."
                />
                <p className="text-[9px] text-slate-500 leading-tight">
                  Wrap custom pipeline variables inside curly brackets <code className="text-teal-400 font-mono">{`{variable_key}`}</code> to inject inputs dynamically.
                </p>
              </div>
            )}

            {/* Gemini node settings */}
            {/* Gemini node settings with resilient failover & search grounding */}
            {node.type === 'gemini' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase font-bold text-sky-400">Primary Reasoning Core Model</label>
                  <select
                    value={node.fields.model || 'gemini-3.5-flash'}
                    onChange={(e) => onUpdateNodeField(node.id, 'model', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-300"
                  >
                    {(providers.length > 0 ? providers : DEFAULT_PROVIDERS).map(prov => (
                      <optgroup key={prov.id} label={prov.name} className="text-slate-500 bg-slate-950 font-bold">
                        {prov.models.map(m => (
                          <option key={m.id} value={m.id} className="text-slate-200">
                             {m.name} ({m.speed || "Fast"})
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between p-2 bg-slate-955/60 border border-slate-800 rounded-xl">
                  <div>
                    <span className="text-[10px] font-bold text-slate-350 block">Google Search Grounding</span>
                    <span className="text-[9px] text-slate-500 block">Real-time web verification query grounding.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={!!node.fields.useSearchGrounding}
                    onChange={(e) => onUpdateNodeField(node.id, 'useSearchGrounding', e.target.checked)}
                    className="accent-teal-550 rounded cursor-pointer h-4.5 w-4.5"
                  />
                </div>

                {/* Resilience & Fallback Controls */}
                <div className="p-3 bg-slate-950/80 border border-slate-850 rounded-xl space-y-2.5">
                  <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-1">
                    🛡️ Resilience & Failover Routing
                  </span>
                  
                  <div className="space-y-1">
                    <span className="text-[9px] text-slate-500 block">Fallback Secondary Model</span>
                    <select
                      value={node.fields.fallbackModel || 'gemini-2.5-pro'}
                      onChange={(e) => onUpdateNodeField(node.id, 'fallbackModel', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-[11px] text-slate-205"
                    >
                      <option value="gemini-2.5-pro">Gemini 2.5 Pro (Fallback / Precision)</option>
                      <option value="claude-3.5-sonnet">Claude 3.5 Sonnet (Fallback)</option>
                      <option value="gpt-4o-mini">GPT-4o-mini (Fallback / Fast)</option>
                      <option value="llama-3.1">Meta Llama 3.1 70B (Failover)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[9px] text-slate-500 block">Max Failover Retries</span>
                      <input
                        type="number"
                        min={0}
                        max={5}
                        value={node.fields.failoverRetries || 2}
                        onChange={(e) => onUpdateNodeField(node.id, 'failoverRetries', parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-xs text-slate-100 font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 block">Timeout limit (ms)</span>
                      <input
                        type="number"
                        step={1000}
                        min={100}
                        value={node.fields.failoverTimeout || 10000}
                        onChange={(e) => onUpdateNodeField(node.id, 'failoverTimeout', parseInt(e.target.value) || 10000)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-xs text-slate-100 font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Critique audit checks */}
            {node.type === 'reviewer' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Critique Audit Instructions</label>
                  <textarea
                    rows={4}
                    value={node.fields.criteria || ''}
                    onChange={(e) => onUpdateNodeField(node.id, 'criteria', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-100"
                    placeholder="Verify if the output text is professional, logical, and structurally clean..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Maximum Feedback Retries</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={node.fields.maxIterations || 1}
                    onChange={(e) => onUpdateNodeField(node.id, 'maxIterations', parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-100 font-mono"
                  />
                </div>
              </div>
            )}

            {/* REST API Call parameters config */}
            {node.type === 'tool' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">HTTP Route URL</label>
                  <input
                    type="text"
                    value={node.fields.url || ''}
                    onChange={(e) => onUpdateNodeField(node.id, 'url', e.target.value)}
                    placeholder="https://api.example.com/v1/data"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-100 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Request Method</label>
                  <select
                    value={node.fields.method || 'GET'}
                    onChange={(e) => onUpdateNodeField(node.id, 'method', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-300 pointer-events-auto"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                  </select>
                </div>
              </div>
            )}

            {/* Webhook parameters config */}
            {node.type === 'webhook' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-pink-400 uppercase">Outbound POST URL</label>
                  <input
                    type="text"
                    value={node.fields.url || ''}
                    onChange={(e) => onUpdateNodeField(node.id, 'url', e.target.value)}
                    placeholder="https://api.example.com/webhooks/trigger"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-100 font-mono"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-550 uppercase font-semibold">Authorization Token</label>
                  <input
                    type="text"
                    value={node.fields.token || ''}
                    onChange={(e) => onUpdateNodeField(node.id, 'token', e.target.value)}
                    placeholder="Bearer secret-token-key"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-100 font-mono"
                  />
                  <p className="text-[9px] text-slate-500">
                    Passed automatically in the <code className="text-teal-400 font-mono">Authorization</code> header.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-550 uppercase font-semibold">Custom Headers (JSON)</label>
                  <textarea
                    rows={3}
                    value={node.fields.headers || ''}
                    onChange={(e) => onUpdateNodeField(node.id, 'headers', e.target.value)}
                    placeholder='{"Content-Type": "application/json"}'
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-100 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-550 uppercase font-semibold">POST Body Template (JSON)</label>
                  <textarea
                    rows={4}
                    value={node.fields.body || ''}
                    onChange={(e) => onUpdateNodeField(node.id, 'body', e.target.value)}
                    placeholder='{"event": "pipeline_step", "nodeId": "{{nodeId}}", "output": "{{lastOutput}}"}'
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-100 font-mono"
                  />
                  <p className="text-[9px] text-slate-500 leading-normal">
                    Supports dynamic placeholders such as <code className="text-teal-400 font-mono">{"{{lastOutput}}"}</code> or <code className="text-teal-400 font-mono">{"{{nodeId}}"}</code>.
                  </p>
                </div>
              </div>
            )}

            {/* RAG Knowledge embeddings limit config */}
            {(node.type === 'rag' || node.type === 'vector-search') && (
              <div className="space-y-3.5">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Limit Target Document Elements</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={node.fields.limit || 3}
                    onChange={(e) => onUpdateNodeField(node.id, 'limit', parseInt(e.target.value) || 3)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-100 font-mono"
                  />
                </div>

                <div className="pt-2.5 border-t border-slate-850">
                  <label className="block text-[10px] font-bold text-teal-400 uppercase tracking-wider mb-2">Vector Store DB Connection</label>
                  <div className="space-y-2">
                    <div>
                      <span className="text-[9px] text-slate-500 block mb-1">Database Provider</span>
                      <select
                        value={node.fields.vectorDbProvider || 'pgvector'}
                        onChange={(e) => onUpdateNodeField(node.id, 'vectorDbProvider', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300"
                      >
                        <option value="pgvector">🐘 PGVector (PostgreSQL)</option>
                        <option value="pinecone">🌲 Pinecone DB</option>
                        <option value="qdrant">🎯 Qdrant AI</option>
                        <option value="chroma">🎨 Chroma DB (Default)</option>
                      </select>
                    </div>

                    <div>
                      <span className="text-[9px] text-slate-500 block mb-1">Endpoint Connection Host URL</span>
                      <input
                        type="text"
                        placeholder="https://xyz-index.pinecone.io"
                        value={node.fields.vectorDbHost || ''}
                        onChange={(e) => onUpdateNodeField(node.id, 'vectorDbHost', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-205 font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[9px] text-slate-500 block mb-1">Index Name</span>
                        <input
                          type="text"
                          placeholder="wiki_embeddings"
                          value={node.fields.vectorDbIndex || ''}
                          onChange={(e) => onUpdateNodeField(node.id, 'vectorDbIndex', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-205"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 block mb-1">Dimensions</span>
                        <input
                          type="number"
                          placeholder="1536"
                          value={node.fields.vectorDbDim || 1536}
                          onChange={(e) => onUpdateNodeField(node.id, 'vectorDbDim', parseInt(e.target.value) || 1536)}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-205 font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Multimodal settings */}
            {node.type === 'multimodal' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Modality Channel</label>
                  <select
                    value={node.fields.mediaType || 'image'}
                    onChange={(e) => onUpdateNodeField(node.id, 'mediaType', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-900 rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none"
                  >
                    <option value="image">🖼️ Image (Vision OCR)</option>
                    <option value="audio">🎵 Audio (Speech Transcription)</option>
                    <option value="pdf">📄 PDF Document (OCR Comprehension)</option>
                    <option value="excel">📊 Excel / CSV Spreadsheet</option>
                  </select>
                </div>

                <div className="space-y-1.5 font-semibold">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Upload Media Document</label>
                  <div 
                    className="border border-dashed border-slate-800 rounded-xl p-4 bg-slate-950/45 hover:border-amber-500/45 hover:bg-slate-950/70 transition-all text-center space-y-2 cursor-pointer relative"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = node.fields.mediaType === 'image' ? 'image/*' : node.fields.mediaType === 'audio' ? 'audio/*' : node.fields.mediaType === 'pdf' ? 'application/pdf' : '.csv,.xlsx,.xls';
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => {
                            onUpdateNodeField(node.id, 'mediaData', reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      };
                      input.click();
                    }}
                  >
                    <Upload size={18} className="mx-auto text-amber-500 animate-bounce" />
                    <div className="text-[10.5px] text-slate-300 font-medium">Drag or Click to attach file</div>
                  </div>
                </div>
              </div>
            )}

            {/* Human Confirmation Settings */}
            {node.type === 'human_confirmation' && (
              <div className="space-y-3.5">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Verification Inquiry Message</label>
                  <textarea
                    rows={3}
                    value={node.fields.message || ''}
                    onChange={(e) => onUpdateNodeField(node.id, 'message', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-100 placeholder-slate-700"
                    placeholder="Ask for approval instructions..."
                  />
                </div>

                <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 block tracking-wider uppercase mb-1">Interactive Proof (Live simulation)</span>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        onUpdateNodeField(node.id, 'approvedValue', 'approved_by_human_admin');
                        onUpdateNodeField(node.id, 'rejectedMessage', '');
                      }}
                      className={`flex-1 text-[10px] font-bold py-1.5 rounded-lg border transition-all cursor-pointer ${
                        node.fields.approvedValue === 'approved_by_human_admin'
                          ? 'bg-emerald-500/20 text-emerald-350 border-emerald-500/40'
                          : 'bg-slate-900 hover:bg-slate-850 text-slate-400 border-slate-800'
                      }`}
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => {
                        onUpdateNodeField(node.id, 'approvedValue', '');
                        onUpdateNodeField(node.id, 'rejectedMessage', 'Inquiry rejected on live console.');
                      }}
                      className={`flex-1 text-[10px] font-bold py-1.5 rounded-lg border transition-all cursor-pointer ${
                        node.fields.rejectedMessage
                          ? 'bg-rose-500/20 text-rose-350 border-rose-500/40'
                          : 'bg-slate-900 hover:bg-slate-850 text-slate-400 border-slate-800'
                      }`}
                    >
                      ✕ Reject
                    </button>
                  </div>
                  <div className="text-[9px] text-center text-slate-500 font-mono italic font-bold">
                    {node.fields.approvedValue ? "Status: APPROVED ✓" : node.fields.rejectedMessage ? "Status: REJECTED ✕" : "Status: AWAITING APPROVAL ⏱️"}
                  </div>
                </div>
              </div>
            )}

            {/* Prompt Optimizer Settings */}
            {node.type === 'prompt_optimizer' && (
              <div className="space-y-3.5">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-550 uppercase">Input Draft Prompt</label>
                  <textarea
                    rows={4}
                    value={node.fields.originalPrompt || ''}
                    onChange={(e) => onUpdateNodeField(node.id, 'originalPrompt', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-100 placeholder-slate-755 font-mono"
                    placeholder="e.g. Write a brief about marketing..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-550 uppercase">Target Assistant Persona</label>
                  <input
                    type="text"
                    value={node.fields.targetPersona || ''}
                    onChange={(e) => onUpdateNodeField(node.id, 'targetPersona', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-100"
                    placeholder="e.g. Senior Copywriter"
                  />
                </div>

                <button
                  onClick={() => {
                    const optimizedText = `You are a professional ${node.fields.targetPersona || 'expert copywriter assistant'}. Using Step-by-Step Chain-of-Thought (COT) validation and Few-Shot reasoning, follow these guidelines to execute the task perfectly:

## Operational Guidelines:
1. Deconstruct the initial requirements into discrete sub-evaluation items.
2. Self-correct grammar, tone, and logical flows iteratively before reaching a final summary.
3. Keep the output extremely structured, clear, and action-oriented.

## Initial Request Input:
"${node.fields.originalPrompt || 'Write a brief about marketing'}"

## Optimized Reasoning Flow:
- Context Extraction: Define clear target goals.
- Execution Formula: Synthesize final output.`;
                    onUpdateNodeField(node.id, 'optimizedPrompt', optimizedText);
                  }}
                  className="w-full bg-gradient-to-r from-emerald-600/20 to-teal-600/20 hover:from-emerald-600/30 hover:to-teal-600/30 text-emerald-300 hover:text-emerald-250 border border-emerald-500/30 text-[10.5px] font-bold py-1.5 rounded-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1"
                >
                  <Sparkles size={11} className="text-emerald-400 animate-pulse" />
                  <span>Optimize Prompt (Few-Shot & COT)</span>
                </button>

                {node.fields.optimizedPrompt && (
                  <div className="space-y-1 mt-2 font-mono">
                    <span className="text-[9px] text-slate-550 font-bold uppercase block">Optimized Blueprint:</span>
                    <textarea
                      rows={6}
                      readOnly
                      value={node.fields.optimizedPrompt}
                      className="w-full bg-slate-950 border border-slate-900 rounded-lg p-2 text-[9px] text-emerald-400 leading-normal focus:outline-none"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Connection Wire Setup selector */}
            <div className="pt-2">
              <label className="block text-[10px] font-bold text-slate-550 uppercase mb-1.5">Target Connect Link</label>
              <select 
                id={`target-selector-${node.id}`}
                defaultValue="" 
                onChange={(e) => {
                  if (e.target.value) {
                    onConnectNodes(node.id, e.target.value);
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
      ) : (
        <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-slate-850 rounded-2xl p-4 bg-slate-950/20">
          <Info size={18} className="text-slate-650 mb-2" />
          <p className="text-xs font-bold text-slate-400 mb-1">No Block Selected</p>
          <p className="text-[10px] text-slate-505 leading-relaxed max-w-xs">
            Select an action card directly on the center canvas to fine-tune variables and parameters.
          </p>
        </div>
      )}
    </aside>
  );
};
