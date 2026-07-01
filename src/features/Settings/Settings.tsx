import React, { useState } from 'react';
import { 
  FileJson, 
  X, 
  AlertCircle, 
  Download, 
  Copy, 
  Upload, 
  Sliders, 
  LayoutGrid, 
  Languages, 
  User, 
  Palette,
  Key,
  Eye,
  EyeOff,
  HelpCircle,
  CheckCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import Markdown from 'react-markdown';
// @ts-ignore
import quickStartMd from '../../docs/QuickStart.md?raw';

interface SettingsProps {
  currentLang: 'en' | 'ru' | 'zh';
  setCurrentLang: (lang: 'en' | 'ru' | 'zh') => void;
  snapToGrid: boolean;
  setSnapToGrid: (v: boolean) => void;
  canvasLocked: boolean;
  setCanvasLocked: (v: boolean) => void;
  canvasZoom: number;
  setCanvasZoom: (v: number) => void;
  
  // Import/Export States & Callback Props
  activeWorkflow: any;
  jsonStringInput: string;
  setJsonStringInput: (val: string) => void;
  importError: string | null;
  handleImportWorkflowJSON: (json: string) => void;
  isImportExportModalOpen: boolean;
  setIsImportExportModalOpen: (v: boolean) => void;

  // Personalization settings
  userNameInput?: string;
  onUserNameInputChange?: (name: string) => void;
  userColorInput?: string;
  onUserColorInputChange?: (color: string) => void;
}

export const Settings: React.FC<SettingsProps> = ({
  currentLang,
  setCurrentLang,
  snapToGrid,
  setSnapToGrid,
  canvasLocked,
  setCanvasLocked,
  canvasZoom,
  setCanvasZoom,
  activeWorkflow,
  jsonStringInput,
  setJsonStringInput,
  importError,
  handleImportWorkflowJSON,
  isImportExportModalOpen,
  setIsImportExportModalOpen,
  userNameInput = "",
  onUserNameInputChange,
  userColorInput = "#38bdf8",
  onUserColorInputChange
}) => {
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'preferences' | 'import_export' | 'help'>('preferences');

  // API Key local state (autosaved to localStorage)
  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem('agentforge_gemini_api_key') || '');
  const [openaiKey, setOpenaiKey] = useState(() => localStorage.getItem('agentforge_openai_api_key') || '');
  const [anthropicKey, setAnthropicKey] = useState(() => localStorage.getItem('agentforge_anthropic_api_key') || '');

  // Visibility toggle state
  const [showGemini, setShowGemini] = useState(false);
  const [showOpenai, setShowOpenai] = useState(false);
  const [showAnthropic, setShowAnthropic] = useState(false);

  // Status indicator
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const saveKey = (provider: 'gemini' | 'openai' | 'anthropic', value: string) => {
    if (provider === 'gemini') {
      setGeminiKey(value);
      localStorage.setItem('agentforge_gemini_api_key', value);
    } else if (provider === 'openai') {
      setOpenaiKey(value);
      localStorage.setItem('agentforge_openai_api_key', value);
    } else if (provider === 'anthropic') {
      setAnthropicKey(value);
      localStorage.setItem('agentforge_anthropic_api_key', value);
    }
    setSaveStatus('Keys saved successfully');
    setTimeout(() => setSaveStatus(null), 1500);
  };

  const handleDownloadJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(jsonStringInput);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${activeWorkflow?.name?.replace(/\s+/g, '-')?.toLowerCase() || 'agentforge'}-export.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    
    setCopiedText("Downloaded File!");
    setTimeout(() => setCopiedText(null), 1500);
  };

  const handleCopyClipboard = () => {
    navigator.clipboard.writeText(jsonStringInput);
    setCopiedText("Copied Clipboard!");
    setTimeout(() => setCopiedText(null), 1500);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-6" id="settings_feature_root">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Block */}
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Sliders className="text-sky-400 rotate-90" size={24} />
            {currentLang === 'ru' 
              ? 'Конфигурация Системы & Настройки' 
              : currentLang === 'zh' 
                ? '系统配置与高级偏好设置' 
                : 'System Settings & Preferences'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {currentLang === 'ru' 
              ? 'Управляйте парадигмами привязки сетки холста, языковыми предпочтениями, данными сессионного экспорта и профилем.' 
              : currentLang === 'zh' 
                ? '微调画布贴合网格、多国语言本地化包切换、网络拓扑 JSON 协议以及协作账户信息。' 
                : 'Fine-tune network snapping topologies, localization packages, JSON workflow protocols, and user collaboration credentials.'}
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-850 gap-2 pb-px" id="settings_tab_bar">
          <button
            onClick={() => setActiveTab('preferences')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'preferences'
                ? 'border-sky-400 text-sky-400 font-black'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {currentLang === 'ru' ? '⚙️ Основные настройки' : currentLang === 'zh' ? '⚙️ 偏好设置' : '⚙️ General Preferences'}
          </button>
          <button
            onClick={() => setActiveTab('import_export')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'import_export'
                ? 'border-sky-400 text-sky-400 font-black'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {currentLang === 'ru' ? '📂 Импорт / Экспорт' : currentLang === 'zh' ? '📂 导入/导出' : '📂 Import / Export'}
          </button>
          <button
            onClick={() => setActiveTab('help')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'help'
                ? 'border-sky-400 text-sky-400 font-black'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {currentLang === 'ru' ? '📖 Справка / Начало работы' : currentLang === 'zh' ? '📖 帮助/教程' : '📖 Help / Setup'}
          </button>
        </div>

        {/* Tab Contents */}
        {activeTab === 'preferences' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Section 1: Localization & App Parameters */}
              <div className="border border-slate-850 rounded-2xl p-5 bg-slate-900/40 space-y-4">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Languages size={14} className="text-teal-400" />
                  {currentLang === 'ru' ? 'Язык и Персонализация' : currentLang === 'zh' ? '语言及个人设定' : 'App Parameters & Persona'}
                </h2>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1.5">
                      {currentLang === 'ru' ? 'Интерфейсный язык' : currentLang === 'zh' ? '应用显示语言' : 'Language Localization'}
                    </label>
                    <div className="flex gap-2">
                      {(['en', 'ru', 'zh'] as const).map((lang) => (
                        <button
                          key={lang}
                          onClick={() => setCurrentLang(lang)}
                          className={`flex-1 text-xs py-2 px-3 rounded-xl border font-bold uppercase cursor-pointer transition-all ${
                            currentLang === lang 
                              ? 'bg-sky-500/10 text-sky-400 border-sky-500/40' 
                              : 'bg-slate-950/60 border-slate-800 text-slate-500 hover:text-slate-350'
                          }`}
                        >
                          {lang === 'en' ? 'English (EN)' : lang === 'ru' ? 'Русский (RU)' : '中文 (ZH)'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Personalization Options if handlers are provided */}
                  {onUserNameInputChange && (
                    <div className="pt-2 space-y-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">
                          <span className="flex items-center gap-1">
                            <User size={12} className="text-slate-500" />
                            {currentLang === 'ru' ? 'Имя пользователя (Синхро)' : currentLang === 'zh' ? '团队协作姓名昵称' : 'Nickname'}
                          </span>
                        </label>
                        <input
                          type="text"
                          value={userNameInput}
                          onChange={(e) => onUserNameInputChange(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500/40 focus:ring-1 focus:ring-sky-500/10 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none"
                          placeholder="e.g. Architect-44"
                        />
                      </div>

                      {onUserColorInputChange && (
                        <div>
                          <label className="block text-[11px] font-bold text-slate-400 mb-1">
                            <span className="flex items-center gap-1">
                              <Palette size={12} className="text-slate-500" />
                              {currentLang === 'ru' ? 'Цвет курсора' : currentLang === 'zh' ? '协同光标主题代表色' : 'Presence Cursor Accent'}
                            </span>
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={userColorInput}
                              onChange={(e) => onUserColorInputChange(e.target.value)}
                              className="w-8 h-8 rounded-lg overflow-hidden border border-slate-850 cursor-pointer bg-slate-950"
                            />
                            <span className="text-[10px] font-mono text-slate-500">{userColorInput}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Section 2: Canvas Preferences */}
              <div className="border border-slate-850 rounded-2xl p-5 bg-slate-900/40 space-y-4">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <LayoutGrid size={14} className="text-sky-400" />
                  {currentLang === 'ru' ? 'Поведение редактора холста' : currentLang === 'zh' ? '画布编辑参数设定' : 'Canvas Workspace Rules'}
                </h2>

                <div className="space-y-4 pt-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-350 block">
                        {currentLang === 'ru' ? 'Режим привязки сетки' : currentLang === 'zh' ? '网格对齐附着' : 'Grid Node Snapping'}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {currentLang === 'ru' ? 'Выравнивание блоков' : currentLang === 'zh' ? '自动对齐拖拽卡片' : 'Align dragged cards directly to coordinate lines'}
                      </span>
                    </div>
                    <button
                      onClick={() => setSnapToGrid(!snapToGrid)}
                      className={`w-12 h-6 rounded-full p-0.5 transition-colors cursor-pointer relative flex items-center ${
                        snapToGrid ? 'bg-emerald-500' : 'bg-slate-800'
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-full bg-slate-950 shadow-sm transition-transform ${
                        snapToGrid ? 'translate-x-6' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-350 block">
                        {currentLang === 'ru' ? 'Фиксация координат' : currentLang === 'zh' ? '防止画布位置移动' : 'Lock Node Positions'}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {currentLang === 'ru' ? 'Запретить случайный сдвиг' : currentLang === 'zh' ? '禁止意外拖拽坐标' : 'Disable node card coordinate shifting on viewport'}
                      </span>
                    </div>
                    <button
                      onClick={() => setCanvasLocked(!canvasLocked)}
                      className={`w-12 h-6 rounded-full p-0.5 transition-colors cursor-pointer relative flex items-center ${
                        canvasLocked ? 'bg-rose-500' : 'bg-slate-800'
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-full bg-slate-950 shadow-sm transition-transform ${
                        canvasLocked ? 'translate-x-6' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      {currentLang === 'ru' ? 'Базовый коэффициент масштабирования' : currentLang === 'zh' ? '工作台默认视口比例' : 'Viewport Zoom Calibration'}
                    </label>
                    <div className="flex items-center space-x-3 bg-slate-950/60 p-2.5 rounded-xl border border-slate-850">
                      <input
                        type="range"
                        min="0.5"
                        max="1.5"
                        step="0.1"
                        value={canvasZoom}
                        onChange={(e) => setCanvasZoom(Number(e.target.value))}
                        className="flex-1 accent-sky-400 h-1 bg-slate-800 rounded-lg cursor-pointer appearance-none"
                      />
                      <span className="text-xs font-mono font-bold text-slate-300 w-12 text-right">
                        {Math.round(canvasZoom * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* NEW Section: API Provider Credentials */}
            <div className="border border-slate-850 rounded-2xl p-5 bg-slate-900/40 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Key size={14} className="text-amber-400" />
                  {currentLang === 'ru' ? 'Пользовательские API-Ключи (Браузер)' : currentLang === 'zh' ? '浏览器本地 AI 接口密钥' : 'AI Provider API Keys (Local Sandbox)'}
                </h2>
                {saveStatus && (
                  <span className="text-[10px] text-teal-400 font-bold flex items-center gap-1">
                    <CheckCircle size={10} />
                    {saveStatus}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-500">
                {currentLang === 'ru'
                  ? 'Конфигурируйте ваши API-ключи прямо в браузере. Ключи сохраняются локально в целях безопасности и переопределяют значения по умолчанию сервера при запуске холстов.'
                  : currentLang === 'zh'
                    ? '在此输入您的个人 API 密钥，它们将被保存在当前浏览器的 localStorage 中，并在发起画布运行任务时，作为请求头传递，优先于后端的默认配置。'
                    : 'Configure LLM provider API credentials here. They are stored securely in your browser\'s localStorage and override backend system defaults during manual run evaluations.'}
              </p>

              <div className="space-y-4 pt-1">
                {/* Gemini Key */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold text-slate-300">Google Gemini API Key</label>
                    <span className="text-[9px] text-slate-500 font-mono">GEMINI_API_KEY</span>
                  </div>
                  <div className="relative">
                    <input
                      type={showGemini ? 'text' : 'password'}
                      value={geminiKey}
                      onChange={(e) => saveKey('gemini', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/10 rounded-xl pl-3 pr-16 py-2 text-xs font-mono text-slate-200 outline-none"
                      placeholder="AIzaSy... (Mandatory for core nodes)"
                    />
                    <button
                      type="button"
                      onClick={() => setShowGemini(!showGemini)}
                      className="absolute right-3 top-2 text-[10px] font-bold uppercase text-slate-400 hover:text-slate-250 cursor-pointer"
                    >
                      {showGemini ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {/* OpenAI Key */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold text-slate-300">OpenAI API Key</label>
                    <span className="text-[9px] text-slate-500 font-mono">OPENAI_API_KEY</span>
                  </div>
                  <div className="relative">
                    <input
                      type={showOpenai ? 'text' : 'password'}
                      value={openaiKey}
                      onChange={(e) => saveKey('openai', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/10 rounded-xl pl-3 pr-16 py-2 text-xs font-mono text-slate-200 outline-none"
                      placeholder="sk-proj-..."
                    />
                    <button
                      type="button"
                      onClick={() => setShowOpenai(!showOpenai)}
                      className="absolute right-3 top-2 text-[10px] font-bold uppercase text-slate-400 hover:text-slate-250 cursor-pointer"
                    >
                      {showOpenai ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {/* Anthropic Key */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold text-slate-300">Anthropic Claude API Key</label>
                    <span className="text-[9px] text-slate-500 font-mono">ANTHROPIC_API_KEY</span>
                  </div>
                  <div className="relative">
                    <input
                      type={showAnthropic ? 'text' : 'password'}
                      value={anthropicKey}
                      onChange={(e) => saveKey('anthropic', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/10 rounded-xl pl-3 pr-16 py-2 text-xs font-mono text-slate-200 outline-none"
                      placeholder="sk-ant-..."
                    />
                    <button
                      type="button"
                      onClick={() => setShowAnthropic(!showAnthropic)}
                      className="absolute right-3 top-2 text-[10px] font-bold uppercase text-slate-400 hover:text-slate-250 cursor-pointer"
                    >
                      {showAnthropic ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'import_export' && (
          <div className="border border-slate-850 rounded-2xl bg-slate-900/20 overflow-hidden animate-in fade-in duration-200">
            <div className="p-5 border-b border-slate-850 bg-slate-950/40 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 bg-sky-500/10 rounded-xl border border-sky-500/20">
                  <FileJson className="text-sky-400" size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider">
                    {currentLang === 'ru' ? 'Импорт / Экспорт Схем JSON' : currentLang === 'zh' ? '网络协议方案导入导出' : 'Protocol JSON Payload Panel'}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-bold">
                    {currentLang === 'ru' ? 'Выгружайте или загружайте чертежи пайплайнов' : currentLang === 'zh' ? '导出多级链路配置的轻量级协议映射并进行序列化' : 'Load or dump graph structures as unified telemetry blueprints'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {importError && (
                <div className="p-3 bg-rose-950/30 border border-rose-900/40 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span className="font-semibold leading-relaxed">{importError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Export Panel Block */}
                <div className="border border-slate-850 rounded-xl p-4 bg-slate-950/40 space-y-3 flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] font-black text-sky-400 uppercase tracking-wider block mb-1">⚡ Share Schema Draft</span>
                    <p className="text-[10.5px] text-slate-400 leading-normal">
                      {currentLang === 'ru' ? 'Скопируйте конфигурацию в буфер обмена или сохраните файлом.' : currentLang === 'zh' ? '一键生成自适应描述蓝图结构，或者将其转储为本地磁盘文件。' : 'Copy string snippet to clipboard or serialize directly into standard file format.'}
                    </p>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleDownloadJSON}
                      className="flex-1 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Download size={13} />
                      <span>Download JSON</span>
                    </button>

                    <button
                      onClick={handleCopyClipboard}
                      className="flex-1 bg-slate-950 hover:bg-slate-850 text-slate-200 border border-slate-800 font-bold text-xs py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Copy size={13} className="text-slate-400" />
                      <span>{copiedText === "Copied Clipboard!" ? "Copied!" : "Copy String"}</span>
                    </button>
                  </div>
                </div>

                {/* Import Panel Block */}
                <div className="border border-slate-850 rounded-xl p-4 bg-slate-950/40 space-y-3 flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] font-black text-teal-400 uppercase tracking-wider block mb-1">📂 Upload Blueprint</span>
                    <p className="text-[10.5px] text-slate-400 leading-normal">
                      {currentLang === 'ru' ? 'Выберите файл JSON на вашем устройстве, чтобы загрузить проект на холст.' : currentLang === 'zh' ? '支持标准的多智能体描述卡片，秒级读取坐标及执行策略。' : 'Browse coordinates descriptor file to instantly mount pipeline workflow into memory.'}
                    </p>
                  </div>

                  <label className="border border-dashed border-slate-800 hover:border-teal-900/65 rounded-xl p-3 flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors">
                    <Upload size={16} className="text-teal-400" />
                    <span className="text-[10px] font-bold text-slate-400 hover:text-teal-350">Choose local JSON File</span>
                    <input 
                      type="file" 
                      accept=".json"
                      className="hidden" 
                      onChange={(e) => {
                        const uploadedFile = e.target.files?.[0];
                        if (!uploadedFile) return;
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const resultString = event.target?.result as string;
                          if (resultString) {
                            setJsonStringInput(resultString);
                            handleImportWorkflowJSON(resultString);
                          }
                        };
                        reader.readAsText(uploadedFile);
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Direct JSON Editor Textarea */}
              <div className="space-y-2 pt-2 border-t border-slate-850">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Raw JSON Schema</label>
                  <span className="text-[9px] text-slate-500 font-mono">Real-time parser</span>
                </div>
                <textarea
                  rows={5}
                  value={jsonStringInput}
                  onChange={(e) => setJsonStringInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 focus:border-sky-500/40 rounded-xl p-3.5 text-xs font-mono text-slate-350 outline-none resize-y select-text"
                  placeholder={`{ "nodes": [...], "connections": [...] }`}
                />
                <div className="flex justify-end gap-2 pt-1.5">
                  <button
                    onClick={() => setIsImportExportModalOpen(false)}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    Close Settings View
                  </button>
                  <button
                    onClick={() => handleImportWorkflowJSON(jsonStringInput)}
                    className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs rounded-xl transition-all active:scale-95 cursor-pointer"
                  >
                    Apply Network JSON
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'help' && (
          <div className="border border-slate-850 rounded-2xl bg-slate-900/20 overflow-hidden p-6 animate-in fade-in duration-200" id="help_markdown_container">
            <div className="flex items-center space-x-2.5 mb-5 border-b border-slate-850 pb-4">
              <div className="p-1.5 bg-sky-500/10 rounded-xl border border-sky-500/20">
                <HelpCircle className="text-sky-400" size={16} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider">
                  {currentLang === 'ru' ? 'Руководство Быстрого Старта' : currentLang === 'zh' ? '快速入门指南' : 'Quick Start Documentation'}
                </h3>
                <p className="text-[10px] text-slate-500 font-bold">
                  {currentLang === 'ru' ? 'Инструкции по настройке окружения' : currentLang === 'zh' ? '获取 API 密钥及本地运行开发指南' : 'Complete details on obtaining credentials and running the orchestrator'}
                </p>
              </div>
            </div>

            {/* Markdown rendering body following environment constraints */}
            <div className="markdown-body max-h-[60vh] overflow-y-auto pr-2 select-text text-left">
              <Markdown
                components={{
                  h1: ({ children }) => <h1 className="text-lg font-bold text-slate-100 border-b border-slate-800/60 pb-1.5 mb-4 mt-6 first:mt-0">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-sm font-bold text-slate-200 mt-5 mb-2.5 border-b border-slate-850/30 pb-1">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-xs font-semibold text-slate-300 mt-4 mb-2">{children}</h3>,
                  p: ({ children }) => <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc list-inside space-y-1.5 text-[11px] text-slate-400 mb-3.5 pl-2">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-400 mb-3.5 pl-2">{children}</ol>,
                  li: ({ children }) => <li className="text-[11px] text-slate-400">{children}</li>,
                  code: ({ children, className }) => {
                    const isInline = !className;
                    return isInline ? (
                      <code className="bg-slate-950 px-1.5 py-0.5 rounded text-rose-400 font-mono text-[10px]">{children}</code>
                    ) : (
                      <pre className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 font-mono text-[10px] text-slate-350 overflow-x-auto my-3 select-text leading-relaxed">
                        <code>{children}</code>
                      </pre>
                    );
                  },
                  a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">{children}</a>,
                  hr: () => <hr className="border-slate-850 my-5" />
                }}
              >
                {quickStartMd}
              </Markdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
