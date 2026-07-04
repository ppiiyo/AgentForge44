import React, { Suspense } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { 
  RefreshCw, Sparkles, Network, Terminal, ShoppingBag, Globe, 
  TrendingUp, History, ChevronRight, BookOpen, Code, X,
  FileText, Copy, Download, Check
} from 'lucide-react';

import { FlowNode, FlowConnection, StepLog } from '../types';
import { LogsTab } from './sidebar-tabs/LogsTab';
import { EvalsTab } from './sidebar-tabs/EvalsTab';
import { LibraryTab } from './sidebar-tabs/LibraryTab';
import { CodeTab } from './sidebar-tabs/CodeTab';
import { ViralityTab } from './sidebar-tabs/ViralityTab';

import { CopilotPanel } from './CopilotPanel';
import { SyncHubPanel } from './SyncHubPanel';
import { TimeTravelDebugger } from './TimeTravelDebugger';
import { VersionHistory } from './VersionHistory';

// Lazy-loaded heavy views for code-splitting
const MetricsDashboard = React.lazy(() => import('./MetricsDashboard').then(m => ({ default: m.MetricsDashboard })));
const Marketplace = React.lazy(() => import('./Marketplace').then(m => ({ default: m.Marketplace })));
const CloudDeployer = React.lazy(() => import('./CloudDeployer').then(m => ({ default: m.CloudDeployer })));

interface RightSidebarPanelProps {
  currentLang: 'en' | 'ru' | 'zh';
  activeTab: 'logs' | 'code' | 'virality' | 'evals' | 'rag' | 'metrics' | 'versions' | 'market' | 'deploy' | 'copilot' | 'sync' | 'debug' | 'doc';
  setActiveTab: (tab: any) => void;
  setRightSidebarCollapsed: (collapsed: boolean) => void;
  nodes: FlowNode[];
  connections: FlowConnection[];
  projectNameInput: string;
  setNodes: React.Dispatch<React.SetStateAction<FlowNode[]>>;
  setConnections: React.Dispatch<React.SetStateAction<FlowConnection[]>>;
  setProjectNameInput: (name: string) => void;
  runLogs: StepLog[];
  errorText: string | null;
  handleAutoSelfHealAndRun: () => Promise<void>;
  totalDuration: number;
  finalResult: string;
  copiedText: string | null;
  setCopiedText: (text: string | null) => void;
  isEvaluating: boolean;
  evalReport: any;
  evalTestCases: any[];
  setEvalTestCases: React.Dispatch<React.SetStateAction<any[]>>;
  handleRunEvaluationSuite: () => Promise<void>;
  ragSource: string;
  setRagSource: (val: string) => void;
  ragText: string;
  setRagText: (val: string) => void;
  handleIndexDocument: () => Promise<void>;
  isRAGIndexing: boolean;
  ragIndexStatus: string | null;
  ragSearchQuery: string;
  handleRAGSearch: (val: string) => void;
  ragSearchResults: any[];
  codeDisplayType: 'compiled' | 'client';
  setCodeDisplayType: (type: 'compiled' | 'client') => void;
  codeTab: 'typescript' | 'python' | 'curl';
  setCodeTab: (tab: 'typescript' | 'python' | 'curl') => void;
  loadingServerGeneratedCode: boolean;
  serverGeneratedCode: string;
  copiedCodeText?: string | null;
  generateCopieableCode: () => string;
  handleCopyCode: () => void;
  simDocQual: number;
  setSimDocQual: (val: number) => void;
  simUIAesthetic: number;
  setSimUIAesthetic: (val: number) => void;
  simAgentPower: number;
  setSimAgentPower: (val: number) => void;
  simMarketingPush: number;
  setSimMarketingPush: (val: number) => void;
  calculateViralityScore: () => number;
  getViralityLabel: (score: number) => { text: string; color: string };
  handleInstallTemplateFromMarketplace: (template: any) => void;
  handleApplyCopilotGraph: (nodesList: FlowNode[], connectionsList: FlowConnection[]) => void;
  translations: any;
  onHighlightNode: (nodeId: string | null) => void;
  onSetDryRunOutput: (output: Record<string, string>) => void;
}

export const RightSidebarPanel: React.FC<RightSidebarPanelProps> = ({
  currentLang,
  activeTab,
  setActiveTab,
  setRightSidebarCollapsed,
  nodes,
  connections,
  projectNameInput,
  setNodes,
  setConnections,
  setProjectNameInput,
  runLogs,
  errorText,
  handleAutoSelfHealAndRun,
  totalDuration,
  finalResult,
  copiedText,
  setCopiedText,
  isEvaluating,
  evalReport,
  evalTestCases,
  setEvalTestCases,
  handleRunEvaluationSuite,
  ragSource,
  setRagSource,
  ragText,
  setRagText,
  handleIndexDocument,
  isRAGIndexing,
  ragIndexStatus,
  ragSearchQuery,
  handleRAGSearch,
  ragSearchResults,
  codeDisplayType,
  setCodeDisplayType,
  codeTab,
  setCodeTab,
  loadingServerGeneratedCode,
  serverGeneratedCode,
  generateCopieableCode,
  handleCopyCode,
  simDocQual,
  setSimDocQual,
  simUIAesthetic,
  setSimUIAesthetic,
  simAgentPower,
  setSimAgentPower,
  simMarketingPush,
  setSimMarketingPush,
  calculateViralityScore,
  getViralityLabel,
  handleInstallTemplateFromMarketplace,
  handleApplyCopilotGraph,
  translations,
  onHighlightNode,
  onSetDryRunOutput,
}) => {
  const [docCopied, setDocCopied] = React.useState(false);

  const generateREADME = () => {
    let md = `# 🤖 KostromAi44 Pipeline README: ${projectNameInput || 'Untitled Workspace'}\n\n`;
    md += `This workflow pipeline contains **${nodes.length} agent nodes** and **${connections.length} communication connections**. It was dynamically documented using the KostromAi44 Auto-Documenter.\n\n`;

    md += `## 📊 Flow Topology Overview\n\n`;
    if (connections.length === 0) {
      md += `*No active connections configured. Connect node handles to map pipeline logic flows.*\n\n`;
    } else {
      md += `\`\`\`mermaid\ngraph LR\n`;
      connections.forEach(c => {
        const sourceNode = nodes.find(n => n.id === c.sourceId);
        const targetNode = nodes.find(n => n.id === c.targetId);
        if (sourceNode && targetNode) {
          md += `  ${sourceNode.id}["🧠 ${sourceNode.title} (${sourceNode.type.toUpperCase()})"] --> ${targetNode.id}["🧠 ${targetNode.title} (${targetNode.type.toUpperCase()})"]\n`;
        }
      });
      md += `\`\`\`\n\n`;
    }

    md += `## ⚙️ Node Configuration & AI Directives\n\n`;
    nodes.forEach((n, idx) => {
      md += `### ${idx + 1}. ${n.title} (\`${n.type.toUpperCase()}\`)\n`;
      md += `**Id**: \`${n.id}\`  \n`;
      md += `**Description**: *${n.description || 'No description provided.'}*\n\n`;
      
      md += `#### 🔧 Parameters Map\n`;
      md += `\`\`\`json\n${JSON.stringify(n.fields || {}, null, 2)}\n\`\`\`\n\n`;

      const fields = n.fields as any;
      if (fields?.systemInstruction?.trim()) {
        md += `**System Instructions / AI Directives**:\n> ${fields.systemInstruction.trim().replace(/\n/g, '\n> ')}\n\n`;
      }
      if (fields?.template?.trim()) {
        md += `**Prompt Template**:\n\`\`\`text\n${fields.template.trim()}\n\`\`\`\n\n`;
      }
      if (fields?.criteria?.trim()) {
        md += `**Review Critique Criteria**:\n> ${fields.criteria.trim()}\n\n`;
      }
      md += `---\n\n`;
    });

    md += `*Documented with ❤️ by KostromAi44 Auto-Documenter.*`;
    return md;
  };

  const handleCopyReadme = () => {
    const readmeText = generateREADME();
    navigator.clipboard.writeText(readmeText);
    setDocCopied(true);
    setTimeout(() => setDocCopied(false), 2000);
  };

  const handleDownloadReadme = () => {
    const readmeText = generateREADME();
    const dataStr = "data:text/markdown;charset=utf-8," + encodeURIComponent(readmeText);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "README.md");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <section className="absolute md:relative right-0 top-0 h-full w-full max-w-[320px] md:max-w-none md:w-[380px] lg:w-[420px] border-l border-slate-850 bg-slate-900/95 md:bg-slate-900/40 flex flex-col overflow-hidden shrink-0 z-30 shadow-2xl md:shadow-none" id="right_sidebar">
      
      {/* Section tab headers */}
      <div className="flex border-b border-slate-850 bg-slate-900/95 overflow-x-auto items-center relative" id="tab_headers">
        {[
          { id: 'logs', label: currentLang === 'ru' ? '⚡ Запуск' : currentLang === 'zh' ? '⚡ 运行' : '⚡ Run', icon: RefreshCw },
          { id: 'copilot', label: currentLang === 'ru' ? '🤖 Копилот' : currentLang === 'zh' ? '🤖 智能助手' : '🤖 Copilot', icon: Sparkles },
          { id: 'sync', label: currentLang === 'ru' ? '🔄 Синхро' : currentLang === 'zh' ? '🔄 同步中心' : '🔄 Sync Hub', icon: Network },
          { id: 'debug', label: currentLang === 'ru' ? '🐞 Дебаг' : currentLang === 'zh' ? '🐞 调试器' : '⏳ Debugger', icon: Terminal },
          { id: 'market', label: currentLang === 'ru' ? '🛒 Магазин' : currentLang === 'zh' ? '🛒 商店' : '🛒 Store', icon: ShoppingBag },
          { id: 'deploy', label: currentLang === 'ru' ? '🚀 Сервер' : currentLang === 'zh' ? '🚀 云部署' : '🚀 Cloud', icon: Globe },
          { id: 'metrics', label: currentLang === 'ru' ? '📊 Статы' : currentLang === 'zh' ? '📊 指标' : '📊 Stats', icon: TrendingUp },
          { id: 'versions', label: currentLang === 'ru' ? '⏳ Бэкапы' : currentLang === 'zh' ? '⏳ 备份历史' : '⏳ Backups', icon: History },
          { id: 'evals', label: currentLang === 'ru' ? '🎯 Тесты' : currentLang === 'zh' ? '🎯 基准测试' : '🎯 Benchmark', icon: ChevronRight },
          { id: 'rag', label: currentLang === 'ru' ? '📚 Библиотека' : currentLang === 'zh' ? '📚 知识库' : '📚 Library', icon: BookOpen },
          { id: 'code', label: currentLang === 'ru' ? '💻 Код' : currentLang === 'zh' ? '💻 源码' : '💻 Code', icon: Code },
          { id: 'doc', label: currentLang === 'ru' ? '📝 Док' : currentLang === 'zh' ? '📝 说明文档' : '📝 README', icon: FileText }
        ].map(tab => (
          <button
            id={`tab-btn-${tab.id}`}
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 font-bold text-[10px] uppercase tracking-wider py-3 px-2 flex items-center justify-center gap-1 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab.id 
                ? 'border-sky-500 text-sky-450 bg-slate-950/25 font-black' 
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            <tab.icon size={11} className={activeTab === tab.id ? 'animate-pulse' : ''} />
            <span>{tab.label}</span>
          </button>
        ))}

        {/* Sticky close button for mobile screens */}
        <button
          type="button"
          onClick={() => setRightSidebarCollapsed(true)}
          className="md:hidden sticky right-0 bg-slate-900/95 hover:bg-slate-800 text-slate-400 hover:text-slate-100 p-2.5 px-3.5 border-l border-slate-850 z-10 flex items-center justify-center shrink-0"
          title="Close Panel Sidebar"
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5" id="tab_contents">
        <AnimatePresence mode="wait">
          
          {/* Tab 1: Pipeline step-by-step Execution Log timeline */}
          {activeTab === 'logs' && (
            <motion.div 
              key="logs-tab"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <LogsTab
                currentLang={currentLang}
                errorText={errorText}
                runLogs={runLogs}
                totalDuration={totalDuration}
                finalResult={finalResult}
                copiedText={copiedText}
                translations={translations}
                handleAutoSelfHealAndRun={handleAutoSelfHealAndRun}
                setCopiedText={setCopiedText}
              />
            </motion.div>
          )}

          {/* Tab 1.5: Interactive Automated Evaluation Suite */}
          {activeTab === 'evals' && (
            <motion.div 
              key="evals-tab"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <EvalsTab
                isEvaluating={isEvaluating}
                evalReport={evalReport}
                evalTestCases={evalTestCases}
                setEvalTestCases={setEvalTestCases}
                handleRunEvaluationSuite={handleRunEvaluationSuite}
              />
            </motion.div>
          )}

          {/* Tab 1.6: Semantic Knowledge Retrieval Store (RAG) */}
          {activeTab === 'rag' && (
            <motion.div 
              key="rag-tab"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <LibraryTab
                currentLang={currentLang}
                ragSource={ragSource}
                setRagSource={setRagSource}
                ragText={ragText}
                setRagText={setRagText}
                handleIndexDocument={handleIndexDocument}
                isRAGIndexing={isRAGIndexing}
                ragIndexStatus={ragIndexStatus}
                ragSearchQuery={ragSearchQuery}
                handleRAGSearch={handleRAGSearch}
                ragSearchResults={ragSearchResults}
              />
            </motion.div>
          )}

          {/* Tab 2: Code Codebase Generator */}
          {activeTab === 'code' && (
            <motion.div 
              key="code-tab"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <CodeTab
                currentLang={currentLang}
                activeWorkflow={{ name: projectNameInput }}
                nodes={nodes}
                connections={connections}
                codeDisplayType={codeDisplayType}
                setCodeDisplayType={setCodeDisplayType}
                codeTab={codeTab}
                setCodeTab={setCodeTab}
                loadingServerGeneratedCode={loadingServerGeneratedCode}
                serverGeneratedCode={serverGeneratedCode}
                copiedText={copiedText}
                generateCopieableCode={generateCopieableCode}
                handleCopyCode={handleCopyCode}
              />
            </motion.div>
          )}

          {/* Tab 3: Git Virality Score Predictor Dashboard */}
          {activeTab === 'virality' && (
            <motion.div 
              key="virality-tab"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <ViralityTab
                simDocQual={simDocQual}
                setSimDocQual={setSimDocQual}
                simUIAesthetic={simUIAesthetic}
                setSimUIAesthetic={setSimUIAesthetic}
                simAgentPower={simAgentPower}
                setSimAgentPower={setSimAgentPower}
                simMarketingPush={simMarketingPush}
                setSimMarketingPush={setSimMarketingPush}
                calculateViralityScore={calculateViralityScore}
                getViralityLabel={getViralityLabel}
              />
            </motion.div>
          )}

          {/* Tab: Observability Telemetry Metrics dashboard */}
          {activeTab === 'metrics' && (
            <motion.div 
              key="metrics-tab"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <Suspense fallback={<div className="text-xs text-slate-500 font-mono p-4">Loading stats dashboard...</div>}>
                <MetricsDashboard currentLang={currentLang} activeGraphId="canvas-workspace" />
              </Suspense>
            </motion.div>
          )}

          {/* Tab: Canvas checkpoint git-versions rollback history */}
          {activeTab === 'versions' && (
            <motion.div 
              key="versions-tab"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <VersionHistory 
                graphId="canvas-workspace" 
                activeSnapshot={{ name: projectNameInput, nodes, connections }} 
                onRollbackSuccess={(snapshot) => {
                  if (snapshot) {
                    setNodes(snapshot.nodes || []);
                    setConnections(snapshot.connections || []);
                    if (snapshot.name) setProjectNameInput(snapshot.name);
                  }
                }} 
                currentLang={currentLang} 
              />
            </motion.div>
          )}

          {/* Tab: Marketplace for ready-made agent and tool templates */}
          {activeTab === 'market' && (
            <motion.div 
              key="market-tab"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <Suspense fallback={<div className="text-xs text-slate-500 font-mono p-4">Loading template store...</div>}>
                <Marketplace 
                  currentLang={currentLang} 
                  activeGraphSnapshot={{ name: projectNameInput || "Default Project", nodes, connections }} 
                  onInstallTemplate={handleInstallTemplateFromMarketplace} 
                />
              </Suspense>
            </motion.div>
          )}

          {/* Tab: One-click cloud deployment console */}
          {activeTab === 'deploy' && (
            <motion.div 
              key="deploy-tab"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <Suspense fallback={<div className="text-xs text-slate-500 font-mono p-4">Loading deployment center...</div>}>
                <CloudDeployer 
                  graphId="canvas-workspace" 
                  graphName={projectNameInput || "Untitled Flow"} 
                  currentLang={currentLang} 
                  activeSnapshot={{ name: projectNameInput, nodes, connections }} 
                />
              </Suspense>
            </motion.div>
          )}

          {/* Tab: AI Copilot and Graph Architect */}
          {activeTab === 'copilot' && (
            <motion.div 
              key="copilot-tab"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <CopilotPanel 
                currentLang={currentLang}
                nodes={nodes}
                connections={connections}
                onApplyGraph={(appliedNodes, appliedConns) => {
                  handleApplyCopilotGraph(appliedNodes, appliedConns);
                }}
              />
            </motion.div>
          )}

          {/* Tab: Real-time sync hub and active participants session */}
          {activeTab === 'sync' && (
            <motion.div 
              key="sync-tab"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <SyncHubPanel currentLang={currentLang} nodes={nodes} connections={connections} />
            </motion.div>
          )}

          {/* Tab: Time Travel state rollback and debugger execution trace console */}
          {activeTab === 'debug' && (
            <motion.div 
              key="debug-tab"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <TimeTravelDebugger 
                nodes={nodes}
                connections={connections}
                onHighlightNode={onHighlightNode} 
                onSetDryRunOutput={onSetDryRunOutput} 
                currentLang={currentLang} 
              />
            </motion.div>
          )}

          {/* Tab: Auto-Documenter generated markdown README.md output */}
          {activeTab === 'doc' && (
            <motion.div 
              key="doc-tab"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4 flex flex-col h-full min-h-0"
            >
              <div className="border border-slate-800 rounded-2xl p-4 bg-slate-900/60 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                      {currentLang === 'ru' ? '📝 Авто-Документатор' : currentLang === 'zh' ? '📝 智能工作流说明文档' : '📝 Auto-Documenter'}
                    </h3>
                    <p className="text-[10.5px] text-slate-500 mt-1 leading-normal">
                      {currentLang === 'ru' 
                        ? 'Автоматически генерирует файл README.md для текущего холста, включая все узлы, настройки и системные промпты.' 
                        : currentLang === 'zh' 
                          ? '智能一键生成完整 README.md 工作流设计说明书，涵盖全部节点参数、指令框架及关系图。' 
                          : 'Dynamically structures a professional README.md summarizing all pipeline agents, configurations, and topology.'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2.5 pt-1">
                  <button
                    onClick={handleCopyReadme}
                    className="flex-1 bg-sky-500/10 hover:bg-sky-500/15 text-sky-400 border border-sky-500/20 rounded-xl py-2 px-3 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    {docCopied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span>{docCopied ? 'Copied!' : (currentLang === 'ru' ? 'Копировать' : currentLang === 'zh' ? '复制文档' : 'Copy README')}</span>
                  </button>

                  <button
                    onClick={handleDownloadReadme}
                    className="flex-1 bg-teal-500/10 hover:bg-teal-500/15 text-teal-400 border border-teal-500/20 rounded-xl py-2 px-3 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Download size={12} />
                    <span>{currentLang === 'ru' ? 'Скачать .md' : currentLang === 'zh' ? '下载文档' : 'Download .md'}</span>
                  </button>
                </div>
              </div>

              <div className="flex-1 min-h-[220px] bg-slate-950/60 border border-slate-850 rounded-2xl p-3.5 overflow-auto font-mono text-[10.5px] leading-relaxed text-slate-300 select-text whitespace-pre-wrap">
                {generateREADME()}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </section>
  );
};
