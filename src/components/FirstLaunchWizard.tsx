import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { 
  Sparkles, 
  Languages, 
  User, 
  Palette, 
  Key, 
  ArrowRight, 
  Play, 
  CheckCircle2, 
  Info, 
  Flame, 
  Terminal, 
  FileJson,
  X
} from 'lucide-react';
import { PREBUILT_TEMPLATES } from '../types';

interface FirstLaunchWizardProps {
  isOpen: boolean;
  onClose: (config: {
    lang: 'en' | 'ru' | 'zh';
    geminiKey: string;
    userName: string;
    userColor: string;
    selectedTemplateId: string;
    generateWorkspaceFiles?: boolean;
  }) => void;
  currentLang: 'en' | 'ru' | 'zh';
}

export const FirstLaunchWizard: React.FC<FirstLaunchWizardProps> = ({
  isOpen,
  onClose,
  currentLang: initialLang
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [lang, setLang] = useState<'en' | 'ru' | 'zh'>(initialLang);
  const [userName, setUserName] = useState('');
  const [userColor, setUserColor] = useState('#10b981'); // Emerald default
  const [geminiKey, setGeminiKey] = useState('');
  const [useSimulation, setUseSimulation] = useState(false);
  const [generateWorkspaceFiles, setGenerateWorkspaceFiles] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState('multi-agent-coder');

  const presetColors = [
    '#10b981', // Emerald
    '#38bdf8', // Sky
    '#8b5cf6', // Violet
    '#f59e0b', // Amber
    '#ec4899', // Pink
    '#ef4444'  // Red
  ];

  const translations = {
    en: {
      welcomeTitle: "Welcome to KostromAi44 Arena",
      welcomeSubtitle: "Let's configure your visual multi-agent workflow builder and code generation engine for first launch.",
      chooseLang: "Choose Interface Language",
      profileTitle: "Configure Workspace Profile",
      profileSubtitle: "Personalize your local identity for canvas tracking and real-time multiplayer presence.",
      enterName: "Enter your nickname / developer moniker",
      chooseColor: "Choose your identity presence color accent",
      credentialTitle: "Configure LLM Execution Engine",
      credentialSubtitle: "Set up API keys to power node blocks, prompt optimization, and self-correction flows.",
      apiKeyLabel: "Google Gemini API Key",
      apiKeyDesc: "Saved locally in your browser sandbox. Your key is never exposed to external telemetry.",
      simulationBtn: "Enable Free Local Simulation Mode",
      simulationDesc: "Uses a mock-sandbox API provider key to evaluate flow logic and compile run pipelines for free!",
      keyPlaceholder: "AIzaSy...",
      templateTitle: "Select Initial Canvas Template",
      templateSubtitle: "Kickstart your project with a pre-configured multi-agent template or start fresh.",
      launchBtn: "Launch Workspace Console",
      nextStep: "Proceed to next configuration step",
      backStep: "Back",
      stepIndicator: "Step {{step}} of 4",
      simulationActive: "Simulation Mode Active"
    },
    ru: {
      welcomeTitle: "Добро пожаловать в Арену KostromAi44",
      welcomeSubtitle: "Давайте настроим ваш визуальный конструктор цепочек ИИ-агентов и генератор кода для первого запуска.",
      chooseLang: "Выберите язык интерфейса",
      profileTitle: "Настройка профиля рабочей среды",
      profileSubtitle: "Персонализируйте свое имя и цветовой акцент для отображения авторов изменений на холсте.",
      enterName: "Введите ваш никнейм / имя разработчика",
      chooseColor: "Выберите цветовой акцент вашего присутствия",
      credentialTitle: "Параметры запуска языковых моделей",
      credentialSubtitle: "Настройте ключи для выполнения нод Gemini, оптимизации промптов и авто-коррекции.",
      apiKeyLabel: "Ключ Google Gemini API",
      apiKeyDesc: "Сохраняется локально в вашей песочнице браузера. Ключ не передается сторонним сервисам.",
      simulationBtn: "Включить бесплатный режим симуляции",
      simulationDesc: "Использует встроенный симулятор API для проверки логики и структуры холста абсолютно бесплатно!",
      keyPlaceholder: "AIzaSy...",
      templateTitle: "Выберите стартовый шаблон холста",
      templateSubtitle: "Начните работу с готового шаблона многоагентного пайплайна или создайте чистый проект.",
      launchBtn: "Запустить консоль Арены",
      nextStep: "Продолжить настройку",
      backStep: "Назад",
      stepIndicator: "Шаг {{step}} из 4",
      simulationActive: "Режим симуляции активен"
    },
    zh: {
      welcomeTitle: "欢迎使用 KostromAi44 控制台",
      welcomeSubtitle: "为您的首次运行快速配置可视化多智能体工作流编辑器和代码引擎。",
      chooseLang: "选择您的界面语言",
      profileTitle: "配置工作区个人身份",
      profileSubtitle: "个性化您的本地名称与亮色标识，用于画布编辑与实时在线状态追溯。",
      enterName: "输入您的开发者昵称",
      chooseColor: "选择您的身份高亮颜色",
      credentialTitle: "配置大模型驱动引擎",
      credentialSubtitle: "配置 API 密钥来激活各种智能体节点、提示词优化以及自纠错反馈循环。",
      apiKeyLabel: "Google Gemini API 密钥",
      apiKeyDesc: "保存在本地浏览器沙盒中，您的密钥绝不会上传至外部遥测系统。",
      simulationBtn: "启用本地免费模拟测试模式",
      simulationDesc: "使用公用沙盒模拟密钥来评估节点流逻辑并完全免费编译运行工作流！",
      keyPlaceholder: "AIzaSy...",
      templateTitle: "选择您的首个画布模板",
      templateSubtitle: "使用预配置的多智能体架构快速初始化您的第一个画布或从空白开始。",
      launchBtn: "开启工作流控制台",
      nextStep: "继续下一步配置",
      backStep: "返回",
      stepIndicator: "第 {{step}} 步 (共 4 步)",
      simulationActive: "模拟测试模式已启用"
    }
  }[lang];

  useEffect(() => {
    if (isOpen) {
      // Send onboarding telemetry transition metrics
      fetch('/api/telemetry/funnel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step })
      }).catch(() => {});
    }
  }, [step, isOpen]);

  const handleNext = () => {
    if (step < 4) {
      setStep((prev) => (prev + 1) as any);
    } else {
      // Track successful final wizard completion (Step 5)
      fetch('/api/telemetry/funnel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 5 })
      }).catch(() => {});

      const finalKey = useSimulation ? 'sandbox_free_test_gemini' : geminiKey;
      onClose({
        lang,
        geminiKey: finalKey,
        userName: userName.trim() || 'KostromAiDev',
        userColor,
        selectedTemplateId,
        generateWorkspaceFiles
      });
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => (prev - 1) as any);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden" id="first-launch-wizard-overlay">
          {/* Dark Ambient Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl pointer-events-auto"
          />

          {/* Main Glassmorphic Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="w-full max-w-2xl bg-slate-900/90 border border-slate-800 rounded-3xl p-6 md:p-8 relative z-10 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
          >
        {/* Glow Highlights */}
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-sky-500/5 blur-[120px] rounded-full pointer-events-none" />

        {/* Progress header indicator */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-6 shrink-0">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20 text-emerald-400">
              <Sparkles size={18} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-100">
                KostromAi44 Setup Wizard
              </h2>
              <span className="text-[10px] text-slate-500 block font-mono">
                {translations.stepIndicator.replace('{{step}}', String(step))}
              </span>
            </div>
          </div>

          {/* Dots step indicator */}
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4].map((s) => (
              <div 
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s === step 
                    ? 'w-6 bg-emerald-400' 
                    : s < step 
                    ? 'w-2 bg-emerald-500/40' 
                    : 'w-2 bg-slate-800'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Dynamic Step Content viewport with beautiful motion transitions */}
        <div className="flex-1 overflow-y-auto pr-1 py-1 space-y-6" id="wizard-step-container">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-100 font-sans tracking-tight">
                    {translations.welcomeTitle}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {translations.welcomeSubtitle}
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Languages size={14} className="text-emerald-400" />
                    {translations.chooseLang}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { id: 'en', label: 'English', desc: 'Default developer console interface' },
                      { id: 'ru', label: 'Русский', desc: 'Русскоязычная локализация Арены' },
                      { id: 'zh', label: '中文', desc: '中文多智能体可视化控制面板' }
                    ].map((l) => (
                      <motion.button
                        key={l.id}
                        onClick={() => setLang(l.id as any)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`p-4 rounded-2xl border text-left cursor-pointer transition-all ${
                          lang === l.id 
                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-black shadow-lg shadow-emerald-500/5'
                            : 'bg-slate-950/40 border-slate-850 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className="text-sm font-bold flex items-center justify-between">
                          {l.label}
                          {lang === l.id && <CheckCircle2 size={14} className="text-emerald-400" />}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                          {l.desc}
                        </p>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-100 tracking-tight">
                    {translations.profileTitle}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {translations.profileSubtitle}
                  </p>
                </div>

                {/* Nickname Input field */}
                <div className="space-y-2.5">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <User size={14} className="text-emerald-400" />
                    {translations.enterName}
                  </label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="e.g. KostromAiDev, Chief Architect"
                    maxLength={24}
                    className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:outline-none p-3.5 rounded-xl text-sm text-slate-100 font-bold transition-all"
                  />
                </div>

                {/* Presence Color picker */}
                <div className="space-y-2.5">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Palette size={14} className="text-emerald-400" />
                    {translations.chooseColor}
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {presetColors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setUserColor(color)}
                        className={`w-10 h-10 rounded-xl transition-all relative cursor-pointer border ${
                          userColor === color 
                            ? 'border-white scale-110 shadow-lg' 
                            : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      >
                        {userColor === color && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-xl">
                            <CheckCircle2 size={16} className="text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-100 tracking-tight">
                    {translations.credentialTitle}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {translations.credentialSubtitle}
                  </p>
                </div>

                {/* API Key box */}
                <div className={`space-y-2.5 transition-all ${useSimulation ? 'opacity-40 pointer-events-none' : ''}`}>
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <Key size={14} className="text-emerald-400" />
                      {translations.apiKeyLabel}
                    </label>
                    <a 
                      href="https://aistudio.google.com/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[10px] text-emerald-400 hover:underline font-bold"
                    >
                      Obtain Free Key →
                    </a>
                  </div>
                  <input
                    type="password"
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    placeholder={translations.keyPlaceholder}
                    disabled={useSimulation}
                    className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:outline-none p-3.5 rounded-xl text-sm text-slate-100 font-mono transition-all"
                  />
                  <div className="flex items-start gap-1.5 text-[10px] text-slate-500">
                    <Info size={12} className="shrink-0 text-slate-400 mt-0.5" />
                    <span>{translations.apiKeyDesc}</span>
                  </div>
                </div>

                {/* Simulation toggle bar */}
                <div 
                  onClick={() => {
                    setUseSimulation(!useSimulation);
                    if (!useSimulation) {
                      setGeminiKey('sandbox_free_test_gemini');
                    } else {
                      setGeminiKey('');
                    }
                  }}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3.5 select-none ${
                    useSimulation 
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' 
                      : 'bg-slate-950/30 border-slate-850 text-slate-400 hover:border-slate-800'
                  }`}
                >
                  <div className={`p-2 rounded-xl border shrink-0 ${
                    useSimulation ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-slate-900 border-slate-800'
                  }`}>
                    <Flame size={16} className={useSimulation ? 'animate-bounce' : ''} />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                      {translations.simulationBtn}
                      {useSimulation && (
                        <span className="bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded text-[9px] border border-amber-500/20 font-mono font-black">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      {translations.simulationDesc}
                    </p>
                  </div>
                </div>

                {/* Workspace Config File Pre-generation toggle */}
                <div 
                  onClick={() => setGenerateWorkspaceFiles(!generateWorkspaceFiles)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3.5 select-none ${
                    generateWorkspaceFiles 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                      : 'bg-slate-950/30 border-slate-850 text-slate-400 hover:border-slate-800'
                  }`}
                  id="wizard-generate-workspace-toggle"
                >
                  <div className={`p-2 rounded-xl border shrink-0 ${
                    generateWorkspaceFiles ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-slate-900 border-slate-800'
                  }`}>
                    <FileJson size={16} className={generateWorkspaceFiles ? 'animate-pulse' : ''} />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                      {lang === 'ru' ? 'Записать конфигурацию в рабочую область' : lang === 'zh' ? '将配置保存至工作区' : 'Generate Workspace Config Files'}
                      {generateWorkspaceFiles && (
                        <span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded text-[9px] border border-emerald-500/20 font-mono font-black">
                          RECOMMENDED
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed font-sans">
                      {lang === 'ru' 
                        ? 'Автоматически запишет файлы .env и workspace_config.json с демо-токенами "sandbox" для мгновенного запуска всех функций.' 
                        : lang === 'zh' 
                        ? '自动将包含沙盒测试令牌的 .env 和 workspace_config.json 模版写入工作区。' 
                        : 'Automatically pre-generates and saves .env and workspace_config.json template pre-populated with sandbox demo tokens.'}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step-4"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-100 tracking-tight">
                    {translations.templateTitle}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {translations.templateSubtitle}
                  </p>
                </div>

                {/* Templates Selector List */}
                <div className="grid grid-cols-1 gap-3">
                  {[
                    ...PREBUILT_TEMPLATES.map(t => ({
                      id: t.id,
                      name: t.name,
                      desc: t.description,
                      badge: t.category,
                      icon: <FileJson size={14} className="text-emerald-400" />
                    })),
                    {
                      id: 'blank-canvas',
                      name: lang === 'ru' ? 'Чистый рабочий холст' : lang === 'zh' ? '空白网格画布' : 'Blank Grid Workspace',
                      desc: lang === 'ru' ? 'Запустите пустой проект и добавляйте блоки из панели инструментов.' : lang === 'zh' ? '以完全空白的全新网格画布开始您的分布式智能体设计。' : 'Start with a completely blank workspace and design your multi-agent workflow from scratch.',
                      badge: 'Custom',
                      icon: <Terminal size={14} className="text-sky-400" />
                    }
                  ].map((temp) => (
                    <button
                      key={temp.id}
                      onClick={() => setSelectedTemplateId(temp.id)}
                      className={`p-4 rounded-2xl border text-left cursor-pointer transition-all flex items-center gap-3.5 relative overflow-hidden ${
                        selectedTemplateId === temp.id 
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold'
                          : 'bg-slate-950/40 border-slate-850 hover:border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className={`p-2.5 rounded-xl border shrink-0 ${
                        selectedTemplateId === temp.id 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                          : 'bg-slate-900 border-slate-850'
                      }`}>
                        {temp.icon}
                      </div>

                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black font-sans leading-none">{temp.name}</span>
                          <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded border leading-none font-bold ${
                            selectedTemplateId === temp.id 
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                              : 'bg-slate-900 border-slate-800 text-slate-500'
                          }`}>
                            {temp.badge}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-normal max-w-lg">
                          {temp.desc}
                        </p>
                      </div>

                      {selectedTemplateId === temp.id && (
                        <CheckCircle2 size={16} className="text-emerald-400 shrink-0 ml-2" />
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Navigation Bar */}
        <div className="flex justify-between items-center border-t border-slate-800 pt-5 mt-6 shrink-0">
          <motion.button
            onClick={handleBack}
            disabled={step === 1}
            whileHover={step === 1 ? {} : { scale: 1.05 }}
            whileTap={step === 1 ? {} : { scale: 0.95 }}
            className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all border flex items-center gap-1 cursor-pointer select-none ${
              step === 1 
                ? 'bg-transparent border-transparent text-slate-600 cursor-not-allowed' 
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {translations.backStep}
          </motion.button>

          <motion.button
            onClick={handleNext}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="px-6 py-2.5 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all flex items-center gap-1.5 shadow-lg hover:shadow-emerald-500/15 cursor-pointer select-none"
            title={step === 4 ? translations.launchBtn : translations.nextStep}
          >
            {step === 4 ? (
              <>
                <Play size={12} fill="currentColor" />
                {translations.launchBtn}
              </>
            ) : (
              <>
                {translations.nextStep}
                <ArrowRight size={12} />
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    </div>
      )}
    </AnimatePresence>
  );
};
