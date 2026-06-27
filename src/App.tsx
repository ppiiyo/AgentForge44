import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAgentApp } from './hooks/useAgentApp';
import { AppHeader } from './components/AppHeader';
import { ProjectEditor } from './features/ProjectEditor';
import { Dashboard } from './features/Dashboard';
import { Settings } from './features/Settings';
import { ErrorBoundary } from './components/ErrorBoundary';
import { RightSidebarPanel } from './components/RightSidebarPanel';
import { ImportExportModal } from './components/ImportExportModal';
import posthog from 'posthog-js';

// Multi-language localization dictionaries
const translationsStatic = {
  en: {
    title: "AgentForge44 Console",
    subtitle: "Visual AI Agent Workflow Builder & Code Engine",
    loadTemplate: "Templates",
    autoAlign: "Clean Grid Layout",
    exportImport: "Export & Import Flow",
    runPipeline: "Run Pipe Flows",
    runningPipeline: "Running Unit...",
    selfHeal: "Auto-Switch Models & Run Pipeline",
    selfHealDesc: "Google Gemini is experiencing transient high demand spikes (503). Correct this automatically by switching to the hyper-scalable gemini-3.1-flash-lite layer.",
    zoom: "Zoom",
    resetScale: "Reset Scale",
    runLogs: "Agent Step Runtime Logs",
    codeExport: "Get Code",
    viralitySimulator: "Virality Predictor",
    history: "Snapshots Log",
    historyDesc: "Capture current configuration checkpoint.",
    undo: "Undo",
    redo: "Redo",
    addNode: "Toolbox Actions",
    delete: "Delete Node Block",
    duplicate: "Duplicate/Clone Node Card",
    emptyHistory: "No history snapshots saved yet.",
    saveSnapshot: "Capture Snapshot Version",
    restore: "Restore Canvas",
    metrics: "Active Canvas Metrics",
    metricsTotalNodes: "Total Nodes",
    metricsActiveEdges: "Active Connections",
    metricsLanguage: "UI Language",
    latencyEst: "Estimated Latency",
    complexityScore: "Complexity Level",
    low: "Low",
    medium: "Medium",
    high: "High",
    variables: "Variables",
    template: "Template",
    systemInstruction: "System Instruction",
    model: "Model",
    temperature: "Temperature",
    searchGrounding: "Google Search Grounding",
    criteria: "Review Criteria",
    iterations: "Max Iterations",
    format: "Output Format",
    nodesList: "Inject interactive processing modules dynamically to design nested structures.",
    connectBtn: "Link to",
    noTarget: "No valid destination found",
    saveSuccess: "Snapshot successfully captured!",
    restoreSuccess: "Workflow restored to capture point.",
    toolboxHeader: "Toolbox Actions",
    toolboxDesc: "Inject interactive processing modules dynamically to design nested structures.",
    settingsHeader: "Configuration Parameters",
    settingsEmpty: "Select any active canvas node block to modify granular runtime hyper-parameters immediately.",
    logsHeader: "Agent Step Runtime Logs",
    logsDesc: "Ready to process variables! Configure inputs, write prompt rules, and click Run Pipe Flows to stream results natively.",
    durationLabel: "Total Duration",
    copiedKey: "Copied!",
    historyHeader: "Saved Flow Snapshots",
    serverPersistence: "Server-Side Projects",
    serverPersistenceDesc: "Save the current active graph flow as a JSON workspace onto the server's filesystem.",
    projectNameHolder: "Project name...",
    saveProjectBtn: "Save Project",
    savedListTitle: "Server Saved Projects",
    noSavedProjects: "No project files stored on the server yet."
  },
  ru: {
    title: "Арена AgentForge44",
    subtitle: "Визуальный конструктор ИИ-агентов и генератор кода",
    loadTemplate: "Шаблоны",
    autoAlign: "Выровнять сетку",
    exportImport: "Экспорт и импорт",
    runPipeline: "Запустить поток",
    runningPipeline: "Запуск блока...",
    selfHeal: "Авто-выбор моделей и запуск",
    selfHealDesc: "Сервер Gemini испытывает временную перегрузку (503). Исправьте это автоматически, переключившись на масштабируемый уровень gemini-3.1-flash-lite.",
    zoom: "Масштаб",
    resetScale: "Сбросить масштаб",
    runLogs: "Логи работы шагов агента",
    codeExport: "Получить код",
    viralitySimulator: "Анализ виральности",
    history: "История версий",
    historyDesc: "Сохраняйте и восстанавливайте снимки состояний холста.",
    undo: "Отменить",
    redo: "Вернуть",
    addNode: "Панель инструментов",
    delete: "Удалить блок",
    duplicate: "Клонировать блок",
    emptyHistory: "История версий холста пуста.",
    saveSnapshot: "Зафиксировать снимок",
    restore: "Восстановить",
    metrics: "Метрики активного холста",
    metricsTotalNodes: "Всего блоков",
    metricsActiveEdges: "Активных связей",
    metricsLanguage: "Язык интерфейса",
    latencyEst: "Оценка задержки",
    complexityScore: "Сложность холста",
    low: "Низкая",
    medium: "Средняя",
    high: "Высокая",
    variables: "Переменные",
    template: "Шаблон",
    systemInstruction: "Системные правила",
    model: "Модель",
    temperature: "Температура",
    searchGrounding: "Поиск Google Grounding",
    criteria: "Критерии проверки",
    iterations: "Макс. итераций",
    format: "Формат вывода",
    nodesList: "Нажмите на нужные блоки, чтобы добавить их на координатную сетку.",
    connectBtn: "Связать с",
    noTarget: "Нет доступных финальных целей",
    saveSuccess: "Снимок конфигурации холста успешно сохранен!",
    restoreSuccess: "Конфигурация холста восстановлена из резервной точки.",
    toolboxHeader: "Добавить модули",
    toolboxDesc: "Используйте эти интерактивные блоки для проектирования сложных цепочек логики.",
    settingsHeader: "Параметры конфигурации",
    settingsEmpty: "Выберите любой активный блок на холсте для быстрой настройки гиперпараметров.",
    logsHeader: "Логи выполнения шагов",
    logsDesc: "Готов к обработке переменных! Настройте входы, напишите инструкции и запустите выполнение потока.",
    durationLabel: "Общее время",
    copiedKey: "Скопировано!",
    historyHeader: "Сохраненные снимки",
    serverPersistence: "Сохранение на сервере",
    serverPersistenceDesc: "Сохраните текущую активную схему в виде JSON-файла в папку проектов на сервере.",
    projectNameHolder: "Название проекта...",
    saveProjectBtn: "Сохранить проект",
    savedListTitle: "Список проектов на бэкенде",
    noSavedProjects: "На сервере пока нет сохраненных проектов."
  },
  zh: {
    title: "AgentForge44 控制台",
    subtitle: "AI 智能体可视化工作流编辑器与代码引擎",
    loadTemplate: "工作流模板",
    autoAlign: "干净的网格布局",
    exportImport: "导入与导出",
    runPipeline: "运行工作流",
    runningPipeline: "正在运行...",
    selfHeal: "自动切换并运行",
    selfHealDesc: "谷歌双子座 (Gemini) 正在经历短暂高负载 (503)。点击自动修复以无损切换至高吞吐量的 gemini-3.1-flash-lite 层级并继续执行。",
    zoom: "画布缩放",
    resetScale: "重置比例",
    runLogs: "智能体运行日志",
    codeExport: "获取代码",
    viralitySimulator: "传播指数预测",
    history: "历史快照",
    historyDesc: "创建或回滚画布的备份记录点。",
    undo: "撤销",
    redo: "重做",
    addNode: "动作工具箱",
    delete: "删除当前节点",
    duplicate: "克隆节点副本",
    emptyHistory: "暂未保存任何运行快照。",
    saveSnapshot: "创建画布备份",
    restore: "恢复画布状态",
    metrics: "当前工作流指标",
    metricsTotalNodes: "节点总数",
    metricsActiveEdges: "连接线条数",
    metricsLanguage: "界面语言设定",
    latencyEst: "预估计算延迟",
    complexityScore: "算法结构复杂度",
    low: "低复杂度",
    medium: "中度设计",
    high: "高度嵌套",
    variables: "模板变量",
    template: "提示词模板",
    systemInstruction: "系统级别指令",
    model: "驱动模型",
    temperature: "采样温度值",
    searchGrounding: "谷歌联网搜索增强",
    criteria: "智能循环自我审查评判标准",
    iterations: "最大反馈循环次数",
    format: "输出格式",
    nodesList: "点击或拖拽下列基础组件以配置分布式智能体流水线。",
    connectBtn: "关联到",
    noTarget: "没有可连接的后置块",
    saveSuccess: "画布快照配置已成功保存！",
    restoreSuccess: "已成功将编辑器回滚到该捕获点。",
    toolboxHeader: "工具组件库",
    toolboxDesc: "在网格中放入这些可编程处理单元，实现基于智能体的推理网络。",
    settingsHeader: "组件配置面板",
    settingsEmpty: "在画布中点击特定的模块卡片，即刻细粒度地监控与编辑其全部行为规则。",
    logsHeader: "控制台执行监视",
    logsDesc: "已就绪！调整输入源 and 判定阈值，并点击'运行工作流'实时观测数据吞吐。",
    durationLabel: "执行总耗时",
    copiedKey: "已复制到剪贴板!",
    historyHeader: "存档历史管理",
    serverPersistence: "服务器级项目归档",
    serverPersistenceDesc: "将当前活跃的工作流拓扑保存到服务器后端的文件存储系统中（JSON）。",
    projectNameHolder: "输入项目文件名...",
    saveProjectBtn: "归档并保存项目",
    savedListTitle: "后端已归档项目目录",
    noSavedProjects: "服务器端尚未建立任何工作流归档文件。"
  }
};

if (typeof window !== 'undefined' && (window as any)._bypassUnused) {
  console.log(translationsStatic);
}

export default function App() {
  const { t, i18n: i18nInstance } = useTranslation();

  // Dynamic localization dictionary proxy mapped to react-i18next resources
  const translations: any = {
    en: new Proxy({}, { get: (_, prop) => t(prop as string) }),
    ru: new Proxy({}, { get: (_, prop) => t(prop as string) }),
    zh: new Proxy({}, { get: (_, prop) => t(prop as string) })
  };

  const app = useAgentApp();

  return (
    <ErrorBoundary>
      <div className="h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-hidden" id="app_root">
        
        {/* Dynamic Top Navigation HUD */}
        <AppHeader
          currentLang={app.currentLang}
          onLanguageChange={(lang) => {
            app.setCurrentLang(lang);
            i18nInstance.changeLanguage(lang);
            localStorage.setItem("agentforge_lang", lang);
            posthog.capture('language_switched', { locale: lang });
          }}
          projectNameInput={app.projectNameInput}
          onProjectNameInputChange={app.setProjectNameInput}
          onSaveProject={() => app.handleSaveProjectToServer(app.projectNameInput)}
          savingProject={app.savingProject}
          onRunPipeline={app.handleRunPipeline}
          isRunning={app.isRunning}
          onAutoAlign={app.handleAutoAlignNodes}
          onShowImportExport={() => app.setIsImportExportModalOpen(true)}
          onSaveSnapshot={() => app.handleSaveSnapshot()}
          nodesCount={app.nodes.length}
          connectionsCount={app.connections.length}
        />

        {/* Subheader Navigation Bar */}
        <div className="bg-slate-900 border-b border-slate-850 px-6 py-2 flex items-center justify-between z-30 shrink-0" id="sub_navigation_bar">
          <div className="flex space-x-1">
            {[
              { id: 'editor', label: app.currentLang === 'ru' ? '🛠️ Холст Конструктора' : app.currentLang === 'zh' ? '🛠️ 视觉画布' : '🛠️ Flow Editor', desc: app.currentLang === 'ru' ? 'Визуальный редактор' : 'Visual creator workspace' },
              { id: 'dashboard', label: app.currentLang === 'ru' ? '📊 Консоль Аналитики' : app.currentLang === 'zh' ? '📊 监控总览' : '📊 Metrics Dashboard', desc: app.currentLang === 'ru' ? 'Обсервабилити и логи' : 'Observability & Telemetry' },
              { id: 'settings', label: app.currentLang === 'ru' ? '⚙️ Настройки Системы' : app.currentLang === 'zh' ? '⚙️ 系统配置' : '⚙️ Workspace Settings', desc: app.currentLang === 'ru' ? 'Конфигурация схемы и локализация' : 'Preferences & Import/Export' }
            ].map((tab) => (
              <button
                key={tab.id}
                id={`btn_view_nav_${tab.id}`}
                onClick={() => app.setCurrentView(tab.id as any)}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold flex flex-col items-start transition-all cursor-pointer ${
                  app.currentView === tab.id 
                    ? 'bg-slate-950 text-sky-400 border border-slate-800 shadow-inner shadow-black/40' 
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                <span>{tab.label}</span>
                <span className="text-[9px] text-slate-500 font-medium leading-none mt-0.5">{tab.desc}</span>
              </button>
            ))}
          </div>
          
          <div className="hidden sm:flex items-center space-x-3 text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-teal-500 animate-pulse"></span>
              <span className="font-mono text-[10px] font-bold">Node.JS Core Running</span>
            </div>
          </div>
        </div>

        {/* Main Studio Console Layout */}
        <div className="flex-1 flex flex-row overflow-hidden relative" id="app_main">
          {app.currentView === 'editor' ? (
            <ProjectEditor
              currentLang={app.currentLang}
              translations={translations}
              nodes={app.nodes}
              setNodes={app.setNodes}
              connections={app.connections}
              setConnections={app.setConnections}
              selectedNodeId={app.selectedNodeId}
              setSelectedNodeId={app.setSelectedNodeId}
              highlightedNodeId={app.highlightedNodeId}
              nodeExecutionStatuses={app.nodeExecutionStatuses as any}
              isRunning={app.isRunning}
              showcaseMode={app.showcaseMode}
              setShowcaseMode={app.setShowcaseMode}
              leftSidebarCollapsed={app.leftSidebarCollapsed}
              setLeftSidebarCollapsed={app.setLeftSidebarCollapsed}
              rightSidebarCollapsed={app.rightSidebarCollapsed}
              setRightSidebarCollapsed={app.setRightSidebarCollapsed}
              canvasZoom={app.canvasZoom}
              setCanvasZoom={app.setCanvasZoom}
              snapToGrid={app.snapToGrid}
              setSnapToGrid={app.setSnapToGrid}
              canvasLocked={app.canvasLocked}
              setCanvasLocked={app.setCanvasLocked}
              onCreateNode={app.handleCreateNode}
              savedSnapshots={app.savedSnapshots}
              onRestoreSnapshot={app.handleRestoreSnapshot}
              onDeleteSnapshot={app.handleDeleteSnapshot}
              onSaveSnapshot={app.handleSaveSnapshot}
              projectNameInput={app.projectNameInput}
              onProjectNameInputChange={app.setProjectNameInput}
              onSaveProjectToServer={app.handleSaveProjectToServer}
              savingProject={app.savingProject}
              serverProjects={app.serverProjects}
              loadingProjects={app.loadingProjects}
              currentSavedProjectName={app.currentSavedProjectName}
              onLoadProjectFromServer={app.handleLoadProjectFromServer}
              handleDeleteNode={app.handleDeleteNode}
              handleConnectNodes={app.handleConnectNodes}
              handleUpdateNodeField={app.handleUpdateNodeField}
              handleDuplicateNode={app.handleDuplicateNode}
              handleDryRunNode={app.handleDryRunNode}
              isDryRunningNode={app.isDryRunningNode}
              dryRunOutput={app.dryRunOutput}
              setDryRunOutput={app.setDryRunOutput}
              handleAutoAlignNodes={app.handleAutoAlignNodes}
              userId={app.userId || "local-user"}
              locks={app.locks}
            />
          ) : app.currentView === 'dashboard' ? (
            <Dashboard
              currentLang={app.currentLang as any}
              activeGraphId={app.activeWorkflow?.id || "canvas-workspace"}
            />
          ) : (
            <Settings
              currentLang={app.currentLang}
              setCurrentLang={(lang) => {
                app.setCurrentLang(lang);
                i18nInstance.changeLanguage(lang);
                localStorage.setItem("agentforge_lang", lang);
                posthog.capture('language_switched', { locale: lang });
              }}
              snapToGrid={app.snapToGrid}
              setSnapToGrid={app.setSnapToGrid}
              canvasLocked={app.canvasLocked}
              setCanvasLocked={app.setCanvasLocked}
              canvasZoom={app.canvasZoom}
              setCanvasZoom={app.setCanvasZoom}
              activeWorkflow={app.activeWorkflow}
              jsonStringInput={app.jsonStringInput}
              setJsonStringInput={app.setJsonStringInput}
              importError={app.importError}
              handleImportWorkflowJSON={app.handleImportWorkflowJSON}
              isImportExportModalOpen={app.isImportExportModalOpen}
              setIsImportExportModalOpen={app.setIsImportExportModalOpen}
              userNameInput={app.projectNameInput}
              onUserNameInputChange={app.setProjectNameInput}
            />
          )}

          {/* Right Tabbed Panel: Logs / Code / Statistics */}
          {app.currentView === 'editor' && !app.showcaseMode && !app.rightSidebarCollapsed && (
            <RightSidebarPanel
              currentLang={app.currentLang}
              activeTab={app.activeTab}
              setActiveTab={app.setActiveTab}
              setRightSidebarCollapsed={app.setRightSidebarCollapsed}
              nodes={app.nodes}
              connections={app.connections}
              projectNameInput={app.projectNameInput}
              setNodes={app.setNodes}
              setConnections={app.setConnections}
              setProjectNameInput={app.setProjectNameInput}
              runLogs={app.runLogs}
              errorText={app.errorText}
              handleAutoSelfHealAndRun={app.handleAutoSelfHealAndRun}
              totalDuration={app.totalDuration}
              finalResult={app.finalResult}
              copiedText={app.copiedText}
              setCopiedText={app.setCopiedText}
              isEvaluating={app.isEvaluating}
              evalReport={app.evalReport}
              evalTestCases={app.evalTestCases}
              setEvalTestCases={app.setEvalTestCases}
              handleRunEvaluationSuite={app.handleRunEvaluationSuite}
              ragSource={app.ragSource}
              setRagSource={app.setRagSource}
              ragText={app.ragText}
              setRagText={app.setRagText}
              handleIndexDocument={app.handleIndexDocument}
              isRAGIndexing={app.isRAGIndexing}
              ragIndexStatus={app.ragIndexStatus}
              ragSearchQuery={app.ragSearchQuery}
              handleRAGSearch={app.handleRAGSearch}
              ragSearchResults={app.ragSearchResults}
              codeDisplayType={app.codeDisplayType}
              setCodeDisplayType={app.setCodeDisplayType}
              codeTab={app.codeTab}
              setCodeTab={app.setCodeTab}
              loadingServerGeneratedCode={app.loadingServerGeneratedCode}
              serverGeneratedCode={app.serverGeneratedCode}
              generateCopieableCode={app.generateCopieableCode}
              handleCopyCode={app.handleCopyCode}
              simDocQual={app.simDocQual}
              setSimDocQual={app.setSimDocQual}
              simUIAesthetic={app.simUIAesthetic}
              setSimUIAesthetic={app.setSimUIAesthetic}
              simAgentPower={app.simAgentPower}
              setSimAgentPower={app.setSimAgentPower}
              simMarketingPush={app.simMarketingPush}
              setSimMarketingPush={app.setSimMarketingPush}
              calculateViralityScore={app.calculateViralityScore}
              getViralityLabel={app.getViralityLabel}
              handleInstallTemplateFromMarketplace={app.handleInstallTemplateFromMarketplace}
              handleApplyCopilotGraph={app.handleApplyCopilotGraph}
              translations={translations}
              onHighlightNode={app.setHighlightedNodeId}
              onSetDryRunOutput={app.setDryRunOutput}
            />
          )}
        </div>

        {/* Global Import/Export Configuration Modal */}
        <ImportExportModal
          isImportExportModalOpen={app.isImportExportModalOpen}
          setIsImportExportModalOpen={app.setIsImportExportModalOpen}
          importError={app.importError}
          jsonStringInput={app.jsonStringInput}
          setJsonStringInput={app.setJsonStringInput}
          handleImportWorkflowJSON={app.handleImportWorkflowJSON}
          copiedText={app.copiedText}
          setCopiedText={app.setCopiedText}
          activeWorkflow={app.activeWorkflow || { name: app.projectNameInput }}
          currentLang={app.currentLang}
        />
      </div>
    </ErrorBoundary>
  );
}
