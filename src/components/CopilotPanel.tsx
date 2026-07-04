import React, { useState } from 'react';
import { Sparkles, Zap, Award, CheckCircle, AlertTriangle, ArrowRight, RefreshCw, Layers } from 'lucide-react';
import { FlowNode, FlowConnection } from '../types';

interface CopilotPanelProps {
  currentLang: 'en' | 'ru' | 'zh';
  nodes: FlowNode[];
  connections: FlowConnection[];
  onApplyGraph: (nodes: FlowNode[], connections: FlowConnection[]) => void;
}

export function CopilotPanel({ currentLang, nodes, connections, onApplyGraph }: CopilotPanelProps) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [proposal, setProposal] = useState<{
    explanation: string;
    nodes: FlowNode[];
    connections: FlowConnection[];
    plan?: string[];
  } | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const t = {
    en: {
      architectTitle: "AI Workflow Architect",
      architectDesc: "Describe what you want to build in plain English, and the AI will auto-wire the entire node diagram.",
      placeholder: "e.g., Create a flow that translates customer questions, answers them using gemini, and tests final length...",
      buildBtn: "Build Agent Architecture",
      optimizeTitle: "Self-Optimizer Engine",
      optimizeDesc: "Run an AI-powered diagnostic check on your active workspace to find bottlenecks, and cost/speed issues.",
      optimizeBtn: "Analyze & Optimize Canvas",
      applying: "Applying graph to workbench...",
      appliedSuccess: "Workspace successfully updated with optimized layout!",
      proposedExplanation: "AI Architect Logic",
      applyProposal: "Inject & Overwrite Canvas",
      proposalTitle: "Proposed System Layout",
      diagnosticTitle: "Optimization Action Items"
    },
    ru: {
      architectTitle: "ИИ Архитектор Потоков",
      architectDesc: "Опишите желаемую цепочку простым языком, и ИИ автоматически соберет и свяжет все блоки на холсте.",
      placeholder: "например: Создай поток, который переводит вопросы клиентов, отвечает через Gemini и проверяет длину текста...",
      buildBtn: "Построить архитектуру агента",
      optimizeTitle: "Модуль Оптимизации ИИ",
      optimizeDesc: "Запустите диагностику вашей схемы на предмет узких мест, задержек и стоимости вызовов.",
      optimizeBtn: "Диагностика и оптимизация",
      applying: "Загрузка схемы на холст...",
      appliedSuccess: "Холст был успешно обновлен новой оптимизированной схемой!",
      proposedExplanation: "Логика ИИ-архитектора",
      applyProposal: "Применить схему на холст",
      proposalTitle: "Предложенная структура",
      diagnosticTitle: "Рекомендации по оптимизации"
    },
    zh: {
      architectTitle: "AI 架构规划师",
      architectDesc: "用普通文字描述你的需求，AI 将自动铺设并连线整个工作流节点拓扑图。",
      placeholder: "例如：创建一个工作流，翻译客户问题，使用 Gemini 智能解答并校验最终字符长度...",
      buildBtn: "全自动构建智能体结构",
      optimizeTitle: "自我性能优化引擎",
      optimizeDesc: "运行基于 AI 的多维检测，挖掘活性节点瓶颈、调用成本或不必要的循环开销。",
      optimizeBtn: "诊断并优化工作流",
      applying: "正在注入拓扑到画布面...",
      appliedSuccess: "画布已成功更新为最新建议的最优布局！",
      proposedExplanation: "AI 架构解析",
      applyProposal: "注入并覆盖当前画布",
      proposalTitle: "模型构建建议",
      diagnosticTitle: "优化改进方案列表"
    }
  }[currentLang];

  const handleArchitect = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setFeedback(null);
    setProposal(null);

    try {
      const response = await fetch('/api/copilot/architect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || "Generation error");
      }

      setProposal({
        explanation: data.explanation || "Layout successfully mapped by deep context neural network schema.",
        nodes: data.nodes || [],
        connections: data.connections || []
      });
    } catch (err: any) {
      setFeedback(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOptimize = async () => {
    if (loading) return;
    setLoading(true);
    setFeedback(null);
    setProposal(null);

    try {
      const response = await fetch('/api/copilot/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes, connections })
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || "Optimization check failed");
      }

      setProposal({
        explanation: data.explanation || "Diagnostic sweep complete.",
        plan: data.plan || ["Consolidated nested prompts", "Aligned output checkpoints", "Optimized vertex positions"],
        nodes: data.nodes || nodes,
        connections: data.connections || connections
      });
    } catch (err: any) {
      setFeedback(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const applyProposed = () => {
    if (!proposal) return;
    onApplyGraph(proposal.nodes, proposal.connections);
    setFeedback(t.appliedSuccess);
    setProposal(null);
    setPrompt('');
    setTimeout(() => setFeedback(null), 4000);
  };

  return (
    <div className="space-y-5" id="copilot_panel_outer">
      {/* Header alert */}
      <div className="bg-sky-950/40 border border-sky-850 p-4 rounded-xl flex items-start gap-3">
        <div className="bg-sky-900/50 p-2 rounded-lg text-sky-400">
          <Sparkles size={16} className="animate-spin" style={{ animationDuration: '6s' }} />
        </div>
        <div>
          <h4 className="font-bold text-xs text-sky-300 uppercase tracking-widest flex items-center gap-1.5">
            KostromAi44 Copilot <span className="bg-sky-500/20 text-sky-300 text-[8.5px] font-black px-1.5 py-0.5 rounded-full uppercase">VIP Extreme Edition</span>
          </h4>
          <p className="text-[11px] text-sky-450 mt-1 leading-relaxed">
            {currentLang === 'ru' 
              ? "Уникальный инструмент компиляции графов на лету и интеллектуальной авто-оптимизации."
              : currentLang === 'zh'
              ? "基于双子座 3.5 认知层的顶级工作流编译。前所未有的智能体设计器体验。"
              : "Generative AI multi-agent workflow compilation & self-tuning loops right inside the design console."}
          </p>
        </div>
      </div>

      {/* Architect Card */}
      <div className="bg-slate-950/50 border border-slate-850 p-4 rounded-xl space-y-3">
        <label className="block space-y-1">
          <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-300 flex items-center gap-1.5">
            <Layers size={12} className="text-violet-400" />
            {t.architectTitle}
          </span>
          <span className="text-[10px] text-slate-500 block leading-relaxed">{t.architectDesc}</span>
        </label>
        
        <textarea
          id="copilot_prompt_input"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={t.placeholder}
          rows={3}
          className="w-full bg-slate-900 border border-slate-800 focus:border-violet-650 rounded-lg text-xs p-3 text-slate-200 placeholder-slate-600 focus:ring-1 focus:ring-violet-650 outline-none transition-all leading-relaxed"
        />

        <button
          id="btn_copilot_architect"
          onClick={handleArchitect}
          disabled={loading || !prompt.trim()}
          className="w-full bg-gradient-to-r from-violet-600 to-indigo-650 text-white font-black py-2.5 px-4 rounded-lg text-[11px] hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <RefreshCw size={12} className="animate-spin" />
          ) : (
            <Sparkles size={12} />
          )}
          <span>{t.buildBtn}</span>
        </button>
      </div>

      {/* Self-Optimizer Card */}
      <div className="bg-slate-950/50 border border-slate-850 p-4 rounded-xl space-y-3">
        <div>
          <h4 className="text-[11px] font-extrabold uppercase tracking-wide text-slate-300 flex items-center gap-1.5">
            <Zap size={12} className="text-amber-400" />
            {t.optimizeTitle}
          </h4>
          <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{t.optimizeDesc}</p>
        </div>

        <button
          id="btn_copilot_optimize"
          onClick={handleOptimize}
          disabled={loading || nodes.length === 0}
          className="w-full bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 font-extrabold py-2 px-4 rounded-lg text-[11px] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <RefreshCw size={12} className="animate-spin" />
          ) : (
            <Award size={12} className="text-amber-400" />
          )}
          <span>{t.optimizeBtn}</span>
        </button>
      </div>

      {/* Feedback Alert status banner */}
      {feedback && (
        <div className="bg-emerald-950/30 border border-emerald-900 text-emerald-450 p-3.5 rounded-lg text-[10.5px] leading-relaxed flex items-center gap-2">
          <CheckCircle size={14} className="text-emerald-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Proposal Outputs Rendering block */}
      {proposal && (
        <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300" id="copilot_proposal_box">
          <div className="flex items-center justify-between border-b border-slate-850 pb-2">
            <h5 className="font-extrabold text-[11px] uppercase tracking-wider text-slate-200">
              {t.proposalTitle}
            </h5>
            <span className="text-[9px] font-mono text-slate-500 uppercase px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
              {proposal.nodes.length} Nodes &bull; {proposal.connections.length} Connections
            </span>
          </div>

          <div className="space-y-2">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">
              {t.proposedExplanation}
            </span>
            <p className="text-[11px] text-slate-350 bg-slate-900/55 p-3 rounded-lg border border-slate-900/80 leading-relaxed font-medium">
              {proposal.explanation}
            </p>
          </div>

          {proposal.plan && proposal.plan.length > 0 && (
            <div className="space-y-2 bg-slate-950 p-3 rounded-lg border border-amber-950/30">
              <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1">
                <AlertTriangle size={11} /> {t.diagnosticTitle}
              </span>
              <ul className="space-y-1 mt-1 text-[10.5px] text-slate-400 list-inside list-disc pl-1">
                {proposal.plan.map((item, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action apply button */}
          <button
            id="btn_apply_copilot_proposal"
            onClick={applyProposed}
            className="w-full bg-emerald-600 hover:bg-emerald-555 text-white font-black py-2.5 px-4 rounded-lg text-[11px] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/40"
          >
            <CheckCircle size={12} />
            <span>{t.applyProposal}</span>
          </button>
        </div>
      )}
    </div>
  );
}
