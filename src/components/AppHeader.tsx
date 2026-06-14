import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Sparkles, Play, Database, Workflow, Check, Layers, RefreshCw, RefreshCcw, 
  HelpCircle, Settings, Download, Upload, Globe, LayoutGrid
} from 'lucide-react';
import { FlowNode, FlowConnection } from '../types';

interface AppHeaderProps {
  currentLang: 'en' | 'ru' | 'zh';
  onLanguageChange: (lang: 'en' | 'ru' | 'zh') => void;
  projectNameInput: string;
  onProjectNameInputChange: (val: string) => void;
  onSaveProject: () => void;
  savingProject: boolean;
  onRunPipeline: () => void;
  isRunning: boolean;
  onAutoAlign: () => void;
  onShowImportExport: () => void;
  onSaveSnapshot: () => void;
  nodesCount: number;
  connectionsCount: number;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  currentLang,
  onLanguageChange,
  projectNameInput,
  onProjectNameInputChange,
  onSaveProject,
  savingProject,
  onRunPipeline,
  isRunning,
  onAutoAlign,
  onShowImportExport,
  onSaveSnapshot,
  nodesCount,
  connectionsCount
}) => {
  const { t } = useTranslation();

  return (
    <header className="p-4 bg-slate-900/90 backdrop-blur border-b border-slate-800 flex items-center justify-between gap-4 z-40 relative">
      <div className="flex items-center space-x-3.5">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Workflow size={20} className="text-white animate-pulse" />
        </div>
        <div>
          <h1 className="text-sm font-black text-slate-100 tracking-wide uppercase flex items-center gap-1.5">
            {t('title')}
            <span className="text-[9px] bg-sky-500/10 text-sky-400 font-extrabold px-1.5 py-0.5 rounded-full tracking-normal border border-sky-500/20">
              v44
            </span>
          </h1>
          <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
            {t('subtitle')}
          </span>
        </div>
      </div>

      {/* Network / Execution metrics bar */}
      <div className="hidden lg:flex items-center space-x-6 bg-slate-950/40 px-5 py-2 rounded-2xl border border-slate-850">
        <div className="flex flex-col">
          <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider">{t('metricsTotalNodes')}</span>
          <span className="text-xs font-bold text-slate-200 mt-0.5 font-mono">{nodesCount} active blocks</span>
        </div>
        <div className="h-6 w-px bg-slate-850"></div>
        <div className="flex flex-col">
          <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider">{t('metricsActiveEdges')}</span>
          <span className="text-xs font-bold text-slate-205 mt-0.5 font-mono">{connectionsCount} edges linked</span>
        </div>
        <div className="h-6 w-px bg-slate-850"></div>
        <div className="flex flex-col">
          <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider">{t('complexityScore')}</span>
          <span className="text-xs font-bold text-slate-205 mt-0.5 flex items-center gap-1">
            <span className={`h-2 w-2 rounded-full ${nodesCount <= 3 ? 'bg-emerald-450' : nodesCount <= 7 ? 'bg-amber-450' : 'bg-rose-400'}`}></span>
            {nodesCount <= 3 ? t('low') : nodesCount <= 7 ? t('medium') : t('high')}
          </span>
        </div>
      </div>

      {/* Project controls and triggers */}
      <div className="flex items-center space-x-2.5">
        <div className="hidden md:flex items-center space-x-1.5 bg-slate-950/60 p-1.5 rounded-xl border border-slate-850">
          <input
            type="text"
            placeholder={t('projectNameHolder')}
            value={projectNameInput}
            onChange={(e) => onProjectNameInputChange(e.target.value)}
            className="bg-transparent border-0 font-bold font-mono text-[11px] text-slate-350 focus:outline-none focus:ring-0 w-28 px-2"
          />
          <button
            onClick={onSaveProject}
            disabled={savingProject}
            className="flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white rounded-lg cursor-pointer transition-all border border-slate-700 hover:border-slate-600 disabled:opacity-50"
          >
            {savingProject ? <RefreshCw size={10} className="animate-spin" /> : <Database size={10} />}
            {t('saveProjectBtn')}
          </button>
        </div>

        {/* Alignment & Snap-to-Grid */}
        <button
          onClick={onAutoAlign}
          title={t('autoAlign')}
          className="p-2 text-slate-400 hover:text-slate-100 bg-slate-950/40 hover:bg-slate-850 border border-slate-850 hover:border-slate-700/60 rounded-xl transition-all cursor-pointer"
        >
          <LayoutGrid size={15} />
        </button>

        {/* Saved Snapshots history checkpoint marker */}
        <button
          onClick={onSaveSnapshot}
          title={t('saveSnapshot')}
          className="p-2 text-slate-400 hover:text-slate-100 bg-slate-950/40 hover:bg-slate-850 border border-slate-850 hover:border-slate-700/60 rounded-xl transition-all cursor-pointer"
        >
          <RefreshCcw size={15} />
        </button>

        {/* Import/Export buttons */}
        <button
          onClick={onShowImportExport}
          title={t('exportImport')}
          className="p-2 text-slate-400 hover:text-slate-100 bg-slate-950/40 hover:bg-slate-850 border border-slate-850 hover:border-slate-700/60 rounded-xl transition-all cursor-pointer"
        >
          <Upload size={15} />
        </button>

        {/* Language selector */}
        <div className="relative group">
          <button className="p-2 text-slate-400 hover:text-slate-100 bg-slate-950/40 border border-slate-850 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-xs font-bold leading-none select-none">
            <Globe size={14} />
            <span className="uppercase">{currentLang}</span>
          </button>
          <div className="absolute right-0 top-full mt-1.5 hidden group-hover:flex flex-col bg-slate-900 border border-slate-800 rounded-xl p-1 shadow-2xl z-50 w-24">
            {(['en', 'ru', 'zh'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => onLanguageChange(lang)}
                className={`text-[10px] font-extrabold uppercase px-2 py-1.5 rounded-lg text-left transition-all ${
                  currentLang === lang ? 'bg-sky-500/10 text-sky-400' : 'text-slate-400 hover:bg-slate-850 hover:text-slate-100'
                }`}
              >
                {lang === 'en' ? 'EN' : lang === 'ru' ? 'РУ' : 'ZH'}
              </button>
            ))}
          </div>
        </div>

        {/* Active execution trigger */}
        <button
          onClick={onRunPipeline}
          disabled={isRunning}
          id="btn-run-pipeline"
          className="flex items-center space-x-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-4.5 py-2.5 rounded-xl shadow-lg shadow-emerald-505 shadow-emerald-500/10 transition-all cursor-pointer active:scale-95 disabled:opacity-50 border-0"
        >
          {isRunning ? (
            <>
              <RefreshCw size={13} className="animate-spin" />
              <span>{t('runningPipeline')}</span>
            </>
          ) : (
            <>
              <Play size={13} fill="currentColor" />
              <span>{t('runPipeline')}</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
