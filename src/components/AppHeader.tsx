import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { 
  Sparkles, Play, Database, Workflow, Check, Layers, RefreshCw, RefreshCcw, 
  HelpCircle, Settings, Download, Upload, Globe, LayoutGrid, X, CheckSquare
} from 'lucide-react';
import { FlowNode, FlowConnection } from '../types';
import { AppHealthMonitor } from './AppHealthMonitor';

interface AppHeaderProps {
  currentLang: 'en' | 'ru' | 'zh';
  onLanguageChange: (lang: 'en' | 'ru' | 'zh') => void;
  projectNameInput: string;
  onProjectNameInputChange: (val: string) => void;
  onSaveProject: () => void;
  savingProject: boolean;
  autoSavingStatus?: 'idle' | 'saving' | 'saved' | 'failed';
  onRunPipeline: () => void;
  onValidateWorkflow: () => void;
  isRunning: boolean;
  onAutoAlign: () => void;
  onShowImportExport: () => void;
  onSaveSnapshot: () => void;
  onShowShortcuts: () => void;
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
  autoSavingStatus = 'idle',
  onRunPipeline,
  onValidateWorkflow,
  isRunning,
  onAutoAlign,
  onShowImportExport,
  onSaveSnapshot,
  onShowShortcuts,
  nodesCount,
  connectionsCount
}) => {
  const { t } = useTranslation();
  const [langOpen, setLangOpen] = React.useState(false);

  return (
    <header className="p-3 bg-black/90 backdrop-blur-md border-b border-neutral-900 flex items-center justify-between gap-4 z-40 relative">
      <div className="flex items-center space-x-3">
        <div className="h-9 w-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-volumetric-sm">
          <Workflow size={16} className="text-white" />
        </div>
        <div>
          <h1 className="text-xs font-bold text-white tracking-tight uppercase flex items-center gap-1.5">
            <span>{t('title')}</span>
            <span className="text-[8px] bg-zinc-900 text-zinc-400 font-bold px-1.5 py-0.5 rounded border border-zinc-800">
              v44
            </span>
            <AppHealthMonitor currentLang={currentLang} />
          </h1>
          <span className="text-[10px] text-zinc-500 font-medium block">
            {t('subtitle')}
          </span>
        </div>
      </div>

      {/* Network / Execution metrics bar */}
      <div className="hidden lg:flex items-center space-x-5 bg-zinc-950 px-4 py-1.5 rounded-lg border border-neutral-900">
        <div className="flex flex-col">
          <span className="text-[8px] text-zinc-600 font-bold uppercase tracking-wider">{t('metricsTotalNodes')}</span>
          <span className="text-[11px] font-bold text-zinc-300 font-mono">{nodesCount} active blocks</span>
        </div>
        <div className="h-4 w-px bg-neutral-900"></div>
        <div className="flex flex-col">
          <span className="text-[8px] text-zinc-600 font-bold uppercase tracking-wider">{t('metricsActiveEdges')}</span>
          <span className="text-[11px] font-bold text-zinc-300 font-mono">{connectionsCount} edges linked</span>
        </div>
        <div className="h-4 w-px bg-neutral-900"></div>
        <div className="flex flex-col">
          <span className="text-[8px] text-zinc-600 font-bold uppercase tracking-wider">{t('complexityScore')}</span>
          <span className="text-[11px] font-bold text-zinc-300 flex items-center gap-1">
            <span className={`h-1.5 w-1.5 rounded-full ${nodesCount <= 3 ? 'bg-emerald-500' : nodesCount <= 7 ? 'bg-amber-500' : 'bg-rose-500'}`}></span>
            {nodesCount <= 3 ? t('low') : nodesCount <= 7 ? t('medium') : t('high')}
          </span>
        </div>
      </div>

      {/* Project controls and triggers */}
      <div className="flex items-center space-x-2">
        {autoSavingStatus && autoSavingStatus !== 'idle' && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-950 rounded-lg border border-neutral-900 text-[9px] font-bold font-mono transition-all">
            {autoSavingStatus === 'saving' && (
              <>
                <RefreshCw size={10} className="text-zinc-500 animate-spin" />
                <span className="text-zinc-500">
                  {currentLang === 'ru' ? "Автосохранение..." : currentLang === 'zh' ? "自动保存中..." : "Auto-saving..."}
                </span>
              </>
            )}
            {autoSavingStatus === 'saved' && (
              <>
                <Check size={10} className="text-emerald-400" />
                <span className="text-emerald-400">
                  {currentLang === 'ru' ? "Сохранено" : currentLang === 'zh' ? "保存完毕" : "Changes saved"}
                </span>
              </>
            )}
            {autoSavingStatus === 'failed' && (
              <>
                <X size={10} className="text-rose-455" />
                <span className="text-rose-455">
                  {currentLang === 'ru' ? "Ошибка" : currentLang === 'zh' ? "保存失败" : "Save failed"}
                </span>
              </>
            )}
          </div>
        )}

        <div className="hidden md:flex items-center space-x-1.5 bg-zinc-950 p-1 rounded-lg border border-neutral-900">
          <input
            type="text"
            placeholder={t('projectNameHolder')}
            value={projectNameInput}
            onChange={(e) => onProjectNameInputChange(e.target.value)}
            className="bg-transparent border-0 font-bold font-mono text-[10px] text-zinc-400 focus:outline-none focus:ring-0 w-24 px-2"
          />
          <motion.button
            onClick={onSaveProject}
            disabled={savingProject}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-1 text-[9px] font-bold uppercase px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded border border-zinc-800 hover:border-zinc-700 cursor-pointer transition-all disabled:opacity-50 shadow-volumetric-sm"
          >
            {savingProject ? <RefreshCw size={9} className="animate-spin" /> : <Database size={9} />}
            {t('saveProjectBtn')}
          </motion.button>
        </div>

        {/* Alignment & Snap-to-Grid */}
        <motion.button
          onClick={onAutoAlign}
          title={t('autoAlign')}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          className="p-1.5 text-zinc-400 hover:text-white bg-zinc-950 hover:bg-zinc-900 border border-neutral-900 hover:border-zinc-800 rounded-lg transition-all cursor-pointer shadow-volumetric-sm"
        >
          <LayoutGrid size={13} />
        </motion.button>

        {/* Saved Snapshots history checkpoint marker */}
        <motion.button
          onClick={onSaveSnapshot}
          title={t('saveSnapshot')}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          className="p-1.5 text-zinc-400 hover:text-white bg-zinc-950 hover:bg-zinc-900 border border-neutral-900 hover:border-zinc-800 rounded-lg transition-all cursor-pointer shadow-volumetric-sm"
        >
          <RefreshCcw size={13} />
        </motion.button>

        {/* Import/Export buttons */}
        <motion.button
          onClick={onShowImportExport}
          title={t('exportImport')}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          className="p-1.5 text-zinc-400 hover:text-white bg-zinc-950 hover:bg-zinc-900 border border-neutral-900 hover:border-zinc-800 rounded-lg transition-all cursor-pointer shadow-volumetric-sm"
        >
          <Upload size={13} />
        </motion.button>

        {/* Shortcuts Cheat Sheet help button */}
        <motion.button
          id="btn_show_shortcuts_header"
          onClick={onShowShortcuts}
          title={currentLang === 'ru' ? "Горячие клавиши" : currentLang === 'zh' ? "键盘快捷键" : "Keyboard Shortcuts"}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          className="p-1.5 text-zinc-400 hover:text-white bg-zinc-950 hover:bg-zinc-900 border border-neutral-900 hover:border-zinc-800 rounded-lg transition-all cursor-pointer shadow-volumetric-sm"
        >
          <HelpCircle size={13} />
        </motion.button>

        {/* Language selector */}
        <div className="relative" onMouseLeave={() => setLangOpen(false)}>
          <motion.button 
            type="button"
            onClick={() => setLangOpen(!langOpen)}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="p-1.5 text-zinc-400 hover:text-white bg-zinc-950 hover:bg-zinc-900 border border-neutral-900 rounded-lg transition-all cursor-pointer flex items-center gap-1 text-[10px] font-bold leading-none select-none shadow-volumetric-sm"
          >
            <Globe size={12} />
            <span className="uppercase">{currentLang}</span>
          </motion.button>
          {langOpen && (
            <div className="absolute right-0 top-full mt-1.5 flex flex-col glass-dropdown border border-neutral-900 rounded-lg p-1 shadow-volumetric-md z-50 w-24">
              {(['en', 'ru', 'zh'] as const).map((lang) => (
                <button
                   key={lang}
                   type="button"
                   onClick={() => {
                     onLanguageChange(lang);
                     setLangOpen(false);
                   }}
                   className={`text-[9px] font-bold uppercase px-2 py-1 rounded text-left transition-all ${
                     currentLang === lang ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
                   }`}
                >
                  {lang === 'en' ? 'EN' : lang === 'ru' ? 'РУ' : 'ZH'}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Validate Workflow button */}
        <motion.button
          onClick={onValidateWorkflow}
          id="btn_validate_workflow_header"
          title={t('validateWorkflow')}
          whileHover={{ scale: 1.02, y: -0.5 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center space-x-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white font-bold text-[10px] px-3 py-2 rounded-lg border border-zinc-800 shadow-volumetric-sm transition-all cursor-pointer shrink-0"
        >
          <CheckSquare size={11} />
          <span>{t('validateWorkflow')}</span>
        </motion.button>

        {/* Active execution trigger */}
        <motion.button
          onClick={onRunPipeline}
          disabled={isRunning}
          id="btn-run-pipeline"
          whileHover={isRunning ? {} : { scale: 1.03, y: -0.5 }}
          whileTap={isRunning ? {} : { scale: 0.97 }}
          className="flex items-center space-x-1.5 bg-white hover:bg-zinc-200 text-black font-bold text-[11px] px-4 py-2 rounded-lg shadow-volumetric-md transition-all cursor-pointer disabled:opacity-40 border-0"
        >
          {isRunning ? (
            <>
              <RefreshCw size={11} className="animate-spin" />
              <span>{t('runningPipeline')}</span>
            </>
          ) : (
            <>
              <Play size={11} fill="currentColor" />
              <span>{t('runPipeline')}</span>
            </>
          )}
        </motion.button>
      </div>
    </header>
  );
};

