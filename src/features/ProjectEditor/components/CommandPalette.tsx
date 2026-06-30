import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Sparkles, 
  Terminal, 
  Settings, 
  Command, 
  Play, 
  ArrowRight, 
  X, 
  LayoutGrid, 
  Database,
  CheckSquare,
  Globe,
  Save,
  HelpCircle,
  Palette,
  PlusCircle,
  Camera
} from 'lucide-react';
import { FlowNode } from '../../../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: FlowNode[];
  onSelectNode: (id: string) => void;
  onAutoAlign: () => void;
  onTieredLayout: () => void;
  onValidateFlow: () => void;
  onSaveProject: () => void;
  onRunPipeline: () => void;
  onSaveSnapshot?: () => void;
  onCreateNode?: (type: any) => void;
  onSetTheme?: (theme: 'cosmic' | 'monotropic' | 'indigo') => void;
  currentLang: 'en' | 'ru' | 'zh';
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  nodes,
  onSelectNode,
  onAutoAlign,
  onTieredLayout,
  onValidateFlow,
  onSaveProject,
  onRunPipeline,
  onSaveSnapshot,
  onCreateNode,
  onSetTheme,
  currentLang
}) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Build the list of commands
  const getCommands = () => {
    const list: Array<{
      id: string;
      title: string;
      subtitle: string;
      category: 'Nodes' | 'Actions' | 'Shortcuts';
      icon: React.ReactNode;
      action: () => void;
    }> = [];

    // Actions Category
    list.push({
      id: 'run-pipeline',
      title: currentLang === 'ru' ? '🚀 Запустить конвейер потока' : currentLang === 'zh' ? '🚀 运行工作流管道' : '🚀 Run Flow Pipeline',
      subtitle: 'Execute all connected active node workflows (Ctrl+Enter)',
      category: 'Actions',
      icon: <Play size={14} className="text-emerald-400" />,
      action: onRunPipeline
    });

    list.push({
      id: 'validate-flow',
      title: currentLang === 'ru' ? '🔍 Проверить топологию схемы' : currentLang === 'zh' ? '🔍 验证工作流拓扑' : '🔍 Validate Flow Topology',
      subtitle: 'Check for disconnected nodes, invalid variables, or empty rules',
      category: 'Actions',
      icon: <CheckSquare size={14} className="text-amber-400" />,
      action: onValidateFlow
    });

    if (onSaveSnapshot) {
      list.push({
        id: 'save-snapshot',
        title: currentLang === 'ru' ? '📸 Сделать снимок' : currentLang === 'zh' ? '📸 创建画布快照' : '📸 Save Snapshot',
        subtitle: 'Save a localized checkpoint state of the current canvas (Ctrl+S)',
        category: 'Actions',
        icon: <Camera size={14} className="text-purple-400" />,
        action: onSaveSnapshot
      });
    }

    list.push({
      id: 'auto-align-grid',
      title: currentLang === 'ru' ? '📐 Сетка: Авто-выравнивание' : currentLang === 'zh' ? '📐 网格: 自动排列节点' : '📐 Grid: Auto-Align Nodes',
      subtitle: 'Arrange nodes in columns automatically by type',
      category: 'Actions',
      icon: <LayoutGrid size={14} className="text-sky-400" />,
      action: onAutoAlign
    });

    list.push({
      id: 'tiered-layout',
      title: currentLang === 'ru' ? '📊 Сетка: Многоуровневый вид' : currentLang === 'zh' ? '📊 网格: 逻辑层级(输入->处理->输出)' : '📊 Grid: Tiered Structure Layout',
      subtitle: 'Organize nodes strictly into Input -> Processing -> Output columns',
      category: 'Actions',
      icon: <LayoutGrid size={14} className="text-indigo-400" />,
      action: onTieredLayout
    });

    list.push({
      id: 'save-project',
      title: currentLang === 'ru' ? '💾 Сохранить проект' : currentLang === 'zh' ? '💾 保存当前项目' : '💾 Save Current Project',
      subtitle: 'Sync the active flow setup onto the server filesystem',
      category: 'Actions',
      icon: <Save size={14} className="text-teal-400" />,
      action: onSaveProject
    });

    if (onSetTheme) {
      list.push({
        id: 'theme-cosmic',
        title: '🎨 Theme: Cosmic Slate',
        subtitle: 'Switch workspace to the default deep slate space scheme',
        category: 'Actions',
        icon: <Palette size={14} className="text-blue-450" />,
        action: () => onSetTheme('cosmic')
      });
      list.push({
        id: 'theme-monotropic',
        title: '🎨 Theme: Monotropic Night',
        subtitle: 'Switch workspace to pure high-contrast flat pitch black style',
        category: 'Actions',
        icon: <Palette size={14} className="text-slate-350" />,
        action: () => onSetTheme('monotropic')
      });
      list.push({
        id: 'theme-indigo',
        title: '🎨 Theme: Luminous Indigo',
        subtitle: 'Switch workspace to glowing vibrant purple neon cosmos style',
        category: 'Actions',
        icon: <Palette size={14} className="text-indigo-455" />,
        action: () => onSetTheme('indigo')
      });
    }

    // Node Creation commands inside Actions category for easy accessibility
    if (onCreateNode) {
      const nodeTypesToCreate = [
        { type: 'input', label: 'Input Variables Node', desc: 'Capture template payload parameters', color: 'text-blue-400', icon: <Database size={13} /> },
        { type: 'prompt', label: 'Prompt Template Node', desc: 'Interpolate custom formatted prompt templates', color: 'text-purple-450', icon: <Terminal size={13} /> },
        { type: 'gemini', label: 'Gemini LLM Unit Node', desc: 'Inference powered by Google Gemini API', color: 'text-teal-400', icon: <Sparkles size={13} /> },
        { type: 'reviewer', label: 'Critique & Review Node', desc: 'Construct critique feedback evaluation loops', color: 'text-amber-450', icon: <CheckSquare size={13} /> },
        { type: 'output', label: 'Final Output Display Node', desc: 'Render and display completed results', color: 'text-indigo-400', icon: <Save size={13} /> },
        { type: 'tool', label: 'External Tool API Node', desc: 'Connect REST API endpoints via HTTP', color: 'text-rose-450', icon: <Globe size={13} /> },
        { type: 'webhook', label: 'Webhook Link Node', desc: 'Connect downstream third-party triggers', color: 'text-pink-400', icon: <Globe size={13} /> },
        { type: 'rag', label: 'RAG Search Retriever Node', desc: 'Query vector knowledge base document libraries', color: 'text-teal-500', icon: <PlusCircle size={13} /> },
      ];

      nodeTypesToCreate.forEach(nt => {
        list.push({
          id: `create-${nt.type}`,
          title: `➕ Create Node: ${nt.label}`,
          subtitle: nt.desc,
          category: 'Actions',
          icon: <span className={nt.color}>{nt.icon}</span>,
          action: () => onCreateNode(nt.type)
        });
      });
    }

    // Nodes Category
    nodes.forEach(node => {
      let nodeIcon = <Terminal size={14} className="text-purple-400" />;
      if (node.type === 'input') nodeIcon = <Database size={14} className="text-blue-400" />;
      if (node.type === 'gemini') nodeIcon = <Sparkles size={14} className="text-teal-400" />;
      if (node.type === 'reviewer') nodeIcon = <CheckSquare size={14} className="text-amber-400" />;
      if (node.type === 'webhook' || node.type === 'tool') nodeIcon = <Globe size={14} className="text-rose-400" />;

      list.push({
        id: `node-${node.id}`,
        title: `Jump to: ${node.title}`,
        subtitle: `Select and center card (${node.type})`,
        category: 'Nodes',
        icon: nodeIcon,
        action: () => onSelectNode(node.id)
      });
    });

    // Shortcuts Category (informative)
    const shortcuts = [
      { keys: ['Ctrl', 'S'], desc: 'Save workspace local checkpoint state' },
      { keys: ['Ctrl', 'Enter'], desc: 'Execute active node pipeline trace' },
      { keys: ['Ctrl', 'Z'], desc: 'Undo last node connection or movement' },
      { keys: ['Ctrl', 'Y'], desc: 'Redo last node connection or movement' },
      { keys: ['Ctrl', 'D'], desc: 'Duplicate highlighted node' },
      { keys: ['Space', 'Drag'], desc: 'Pan canvas freely' },
      { keys: ['Shift', 'Drag'], desc: 'Drag-to-select multiple cards' },
      { keys: ['Shift', 'Click'], desc: 'Multi-select individual nodes' },
      { keys: ['Delete'], desc: 'Remove all selected node cards' },
      { keys: ['Escape'], desc: 'Clear active selections' }
    ];

    shortcuts.forEach((sc, i) => {
      list.push({
        id: `shortcut-${i}`,
        title: `Shortcut: ${sc.keys.join(' + ')}`,
        subtitle: sc.desc,
        category: 'Shortcuts',
        icon: <HelpCircle size={14} className="text-slate-500" />,
        action: () => {}
      });
    });

    return list;
  };

  const filteredCommands = getCommands().filter(cmd => 
    cmd.title.toLowerCase().includes(search.toLowerCase()) ||
    cmd.subtitle.toLowerCase().includes(search.toLowerCase()) ||
    cmd.category.toLowerCase().includes(search.toLowerCase())
  );

  // Keyboard navigation inside the palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          onClose();
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 font-sans select-none">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/85 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Main command palette widget */}
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[60vh] ring-1 ring-white/5 animate-[scaleUp_0.15s_ease-out]">
        
        {/* Search header container */}
        <div className="flex items-center px-4.5 py-3 border-b border-slate-850 bg-slate-950/40 gap-3">
          <Search size={18} className="text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-0 w-full"
            placeholder={currentLang === 'ru' ? 'Поиск команд, узлов и ярлыков... (Ctrl+K)' : currentLang === 'zh' ? '搜索快捷键, 控制节点, 工作流... (Ctrl+K)' : 'Type a command, node, or shortcut... (Ctrl+K)'}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md border border-slate-800 bg-slate-900 text-[10px] font-mono text-slate-400 font-extrabold leading-none">
            <span className="text-xs">⌘</span>K
          </kbd>
          <button 
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 p-1 rounded-lg hover:bg-slate-850 cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Results list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-transparent">
          {filteredCommands.length === 0 ? (
            <div className="py-12 px-4 text-center text-slate-500">
              <Command size={26} className="mx-auto mb-2 text-slate-600 animate-pulse" />
              <p className="text-xs font-bold">No results found for "{search}"</p>
              <p className="text-[10px] text-slate-650 mt-1">Try searching for "validate", "align" or specific node titles.</p>
            </div>
          ) : (
            // Group by Category
            ['Actions', 'Nodes', 'Shortcuts'].map(cat => {
              const catCmds = filteredCommands.filter(c => c.category === cat);
              if (catCmds.length === 0) return null;

              return (
                <div key={cat} className="py-2 first:pt-1">
                  <div className="px-3 py-1 text-[9px] font-extrabold text-slate-500 uppercase tracking-widest">{cat}</div>
                  {catCmds.map(cmd => {
                    const globalIdx = filteredCommands.indexOf(cmd);
                    const isSelected = globalIdx === selectedIndex;

                    return (
                      <div
                        key={cmd.id}
                        onClick={() => {
                          cmd.action();
                          onClose();
                        }}
                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                        className={`group px-3.5 py-2.5 rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                          isSelected 
                            ? 'bg-slate-850 border-sky-500/20 text-sky-400 shadow-md ring-1 ring-white/5' 
                            : 'text-slate-300 hover:text-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`p-1.5 rounded-lg border transition-colors ${
                            isSelected ? 'bg-sky-500/10 border-sky-500/30' : 'bg-slate-950/60 border-slate-850'
                          }`}>
                            {cmd.icon}
                          </span>
                          <div className="text-left min-w-0">
                            <p className="text-xs font-bold truncate leading-none mb-1">{cmd.title}</p>
                            <p className="text-[10px] text-slate-500 group-hover:text-slate-400 truncate leading-none">{cmd.subtitle}</p>
                          </div>
                        </div>

                        {isSelected && cmd.category !== 'Shortcuts' && (
                          <ArrowRight size={13} className="text-sky-400 shrink-0 animate-pulse" />
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Footer info strip */}
        <div className="px-4.5 py-2.5 border-t border-slate-850 bg-slate-950 flex items-center justify-between text-[10px] text-slate-500 font-semibold font-mono">
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 font-extrabold">↓↑</kbd> Navigate
            <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 font-extrabold">Enter</kbd> Execute
          </span>
          <span>Esc to Close</span>
        </div>
      </div>
    </div>
  );
};
