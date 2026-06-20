import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Plus, Database, Terminal, Sparkles, CheckSquare, GitBranch, Globe, 
  BookOpen, Layers, FileCode, History, Trash, FolderPlus, Compass
} from 'lucide-react';
import { FlowNode, NodeType } from '../types';

interface ToolboxProps {
  currentLang: 'en' | 'ru' | 'zh';
  onCreateNode: (type: NodeType) => void;
  savedSnapshots: Array<{
    id: string;
    name: string;
    timestamp: string;
  }>;
  onRestoreSnapshot: (id: string) => void;
  onDeleteSnapshot: (id: string, e: React.MouseEvent) => void;
  onSaveSnapshot: () => void;
  projectNameInput: string;
  onProjectNameInputChange: (val: string) => void;
  onSaveProjectToServer: (name: string) => void;
  savingProject: boolean;
  serverProjects: Array<{
    name: string;
  }>;
  loadingProjects: boolean;
  currentSavedProjectName: string | null;
  onLoadProjectFromServer: (proj: any) => void;
}

export const Toolbox: React.FC<ToolboxProps> = ({
  currentLang,
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
  onLoadProjectFromServer
}) => {
  const { t } = useTranslation();
  const [toolboxSearch, setToolboxSearch] = useState<string>("");

  const creators = [
    { type: 'input' as NodeType, label: 'Inputs', desc: 'Variables parameters', color: 'hover:border-blue-500/40 hover:bg-blue-950/10' },
    { type: 'prompt' as NodeType, label: 'Prompt Template', desc: 'Formula parameters', color: 'hover:border-purple-500/40 hover:bg-purple-950/10' },
    { type: 'gemini' as NodeType, label: 'Gemini LLM', desc: 'Trigger twin core reasoning models', color: 'hover:border-teal-500/40 hover:bg-teal-950/10' },
    { type: 'reviewer' as NodeType, label: 'Critique Review', desc: 'Feedback loops system rules', color: 'hover:border-amber-500/40 hover:bg-amber-950/10' },
    { type: 'router' as NodeType, label: 'Router (If-Else)', desc: 'Condition route switch', color: 'hover:border-sky-500/40 hover:bg-sky-950/10' },
    { type: 'tool' as NodeType, label: 'HTTP API Custom Tool', desc: 'Execute outer REST fetch', color: 'hover:border-rose-500/40 hover:bg-rose-950/10' },
    { type: 'rag' as NodeType, label: 'RAG Knowledge Search', desc: 'Semantic Vector Db lookup', color: 'hover:border-teal-500/40 hover:bg-teal-950/10' },
    { type: 'multimodal' as NodeType, label: 'Multimodal (PDF/Audio/Excel)', desc: 'Process documents pipeline', color: 'hover:border-amber-500/40 hover:bg-amber-950/10' },
    { type: 'output' as NodeType, label: 'Outputs', desc: 'Compiled visual payload', color: 'hover:border-indigo-500/40 hover:bg-indigo-950/10' }
  ];

  const filteredCreators = creators.filter(tb => {
    if (!toolboxSearch) return true;
    const s = toolboxSearch.toLowerCase();
    return tb.label.toLowerCase().includes(s) || tb.type.toLowerCase().includes(s) || tb.desc.toLowerCase().includes(s);
  });

  return (
    <aside className="w-full md:w-64 lg:w-72 border-b md:border-b-0 md:border-r border-slate-850 bg-slate-900/50 flex flex-col overflow-y-auto shrink-0 animate-[fadeIn_0.3s_ease-out]" id="left_toolbox">
      <div className="p-4 border-b border-slate-850">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-3">
          <Plus size={14} className="text-sky-400" /> {t('toolboxHeader')}
        </h3>
        <p className="text-xs text-slate-500 mb-3.5 leading-relaxed">
          {t('toolboxDesc')}
        </p>

        {/* Search tool actions */}
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
              className="absolute right-2.5 top-1.5 text-slate-500 hover:text-slate-300 text-xs cursor-pointer"
            >
              &times;
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-2" id="toolbox_creators">
          {filteredCreators.map(tb => (
            <button
              id={`btn-add-${tb.type}`}
              key={tb.type}
              onClick={() => onCreateNode(tb.type)}
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
                {tb.type === 'multimodal' && <Layers size={11} className="text-amber-400" />}
                {tb.type === 'output' && <FileCode size={11} className="text-indigo-400" />}
                {tb.label}
              </span>
              <span className="text-[9px] text-slate-500">Add node</span>
            </button>
          ))}
        </div>
      </div>

      {/* Checkpoint / History checkpoints list */}
      <div className="p-4 border-b border-slate-850 bg-slate-900/40">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <History size={14} className="text-purple-400" /> {t('history')}
          </h3>
          <button
            id="btn_capture_session_snapshot"
            onClick={onSaveSnapshot}
            className="text-[10px] font-bold text-sky-450 hover:text-sky-300 flex items-center gap-0.5 cursor-pointer bg-sky-950/20 px-2 py-1 border border-sky-850 rounded-lg active:scale-95 transition-all"
            title={t('historyDesc')}
          >
            <Plus size={10} /> {currentLang === 'ru' ? "Снять" : "Save"}
          </button>
        </div>

        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {savedSnapshots.length === 0 ? (
            <p className="text-[10px] text-slate-500 italic py-2 text-center">{t('emptyHistory')}</p>
          ) : (
            savedSnapshots.map(snap => (
              <div 
                id={`snap-item-${snap.id}`}
                key={snap.id}
                onClick={() => onRestoreSnapshot(snap.id)}
                className="p-2 bg-slate-950 border border-slate-850 hover:border-sky-500/20 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-2 group hover:bg-slate-900/30"
              >
                <div className="truncate leading-tight">
                  <span className="text-[10px] font-bold text-slate-300 block truncate leading-tight">{snap.name}</span>
                  <span className="text-[9px] text-slate-500 font-mono block mt-0.5">⏱️ {snap.timestamp}</span>
                </div>
                <button
                  id={`delete-snap-${snap.id}`}
                  onClick={(e) => onDeleteSnapshot(snap.id, e)}
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

      {/* Server-Side Persistence files list */}
      <div className="p-4 bg-slate-900/80">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
          <FolderPlus size={14} className="text-emerald-400" /> {t('serverPersistence')}
        </h3>
        <p className="text-[10px] text-slate-500 mb-3 leading-normal">
          {t('serverPersistenceDesc')}
        </p>

        <div className="space-y-2.5">
          <div className="flex gap-1.5">
            <input
              type="text"
              placeholder={t('projectNameHolder')}
              value={projectNameInput}
              onChange={(e) => onProjectNameInputChange(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-805 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500/50"
              id="project-name-txt"
            />
            <button
              id="save-project-dir-btn"
              onClick={() => {
                if (projectNameInput.trim()) {
                  onSaveProjectToServer(projectNameInput);
                }
              }}
              disabled={savingProject}
              className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold px-3 py-1.5 text-xs rounded-xl active:scale-95 transition-all cursor-pointer flex items-center justify-center min-w-[70px]"
            >
              {savingProject ? "..." : t('saveProjectBtn')}
            </button>
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              {t('savedListTitle')}
            </span>

            {loadingProjects ? (
              <p className="text-[10px] text-slate-500 italic py-1 text-center">Loading server assets...</p>
            ) : serverProjects.length === 0 ? (
              <p className="text-[10px] text-slate-500 italic py-1 text-center">
                {t('noSavedProjects')}
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
                        onClick={() => onLoadProjectFromServer(proj)}
                        className="truncate cursor-pointer flex-1"
                      >
                        <span className="block truncate font-mono text-slate-200">{proj.name}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};
