import React from 'react';
import { Network, Zap, RefreshCw, Check, Copy } from 'lucide-react';
import { FlowNode, FlowConnection } from '../../types';

interface CodeTabProps {
  currentLang: 'en' | 'ru' | 'zh';
  activeWorkflow: any;
  nodes: FlowNode[];
  connections: FlowConnection[];
  codeDisplayType: 'compiled' | 'client';
  setCodeDisplayType: (type: 'compiled' | 'client') => void;
  codeTab: 'typescript' | 'python' | 'curl';
  setCodeTab: (tab: 'typescript' | 'python' | 'curl') => void;
  loadingServerGeneratedCode: boolean;
  serverGeneratedCode: string;
  copiedText: string | null;
  generateCopieableCode: () => string;
  handleCopyCode: () => void;
}

export const CodeTab: React.FC<CodeTabProps> = ({
  currentLang,
  activeWorkflow,
  nodes,
  connections,
  codeDisplayType,
  setCodeDisplayType,
  codeTab,
  setCodeTab,
  loadingServerGeneratedCode,
  serverGeneratedCode,
  copiedText,
  generateCopieableCode,
  handleCopyCode,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <p className="text-xs text-slate-400 leading-normal">
          Export your active visual workspace logic into a production-ready, compiled executable script or client sandbox snippet.
        </p>

        {/* Mode Selector Toggle: Simple Sandbox vs Compiled Workflow */}
        <div className="flex border border-slate-850 bg-slate-950/60 rounded-xl p-1 mt-1" id="code_mode_selector">
          <button
            onClick={() => setCodeDisplayType('compiled')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              codeDisplayType === 'compiled'
                ? 'bg-slate-900 border border-slate-800 text-sky-400 shadow'
                : 'text-slate-500 hover:text-slate-300'
            }`}
            id="code_pipeline_toggle"
          >
            <Network size={12} className={codeDisplayType === 'compiled' ? "text-sky-400" : ""} />
            <span>{currentLang === 'ru' ? "Схема сборки (Полный поток)" : "Full Workflow (Compiled)"}</span>
          </button>
          <button
            onClick={() => setCodeDisplayType('client')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              codeDisplayType === 'client'
                ? 'bg-slate-900 border border-slate-800 text-emerald-400 shadow'
                : 'text-slate-500 hover:text-slate-300'
            }`}
            id="code_sandbox_toggle"
          >
            <Zap size={12} className={codeDisplayType === 'client' ? "text-emerald-400" : ""} />
            <span>{currentLang === 'ru' ? "Простой шаблон (Песочница)" : "Simple Block (Sandbox)"}</span>
          </button>
        </div>
      </div>

      {/* Languages Selector */}
      <div className="flex border border-slate-800 rounded-xl overflow-hidden p-0.5" id="code_lang_selector">
        {[
          { id: 'typescript', label: 'TypeScript' },
          { id: 'python', label: 'Python (v2)' },
          { id: 'curl', label: 'cURL / Bash' }
        ].map(lang => (
          <button
            id={`btn-lang-${lang.id}`}
            key={lang.id}
            onClick={() => setCodeTab(lang.id as any)}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${
              codeTab === lang.id 
                ? 'bg-sky-500/15 text-sky-400' 
                : 'text-slate-505 hover:text-slate-300'
            }`}
          >
            {lang.label}
          </button>
        ))}
      </div>

      {/* Code Card Block */}
      <div className="relative">
        {loadingServerGeneratedCode && codeDisplayType === 'compiled' ? (
          <div className="flex flex-col items-center justify-center py-20 bg-slate-950 border border-slate-850 rounded-xl text-slate-500 font-mono text-xs gap-3">
            <RefreshCw size={24} className="animate-spin text-emerald-400" />
            <span>Compiling active workflow topology into direct code...</span>
          </div>
        ) : (
          <>
            <pre className="text-[10.5px] font-mono text-slate-300 bg-slate-955 p-4 rounded-xl max-h-[460px] overflow-y-auto whitespace-pre border border-slate-850 leading-relaxed focus:outline-none select-text">
              {codeDisplayType === 'compiled' 
                ? (codeTab === 'curl' 
                    ? `# cURL Trigger to invoke the current execution pipeline remotely via the server API\ncurl -X POST http://localhost:3000/api/pipeline/run \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "name": "${activeWorkflow?.name || "Custom Flow"}",\n    "nodes": ${JSON.stringify(nodes.map(n => ({ id: n.id, type: n.type, fields: n.fields })), null, 4).replace(/\n/g, '\n    ')},\n    "connections": ${JSON.stringify(connections, null, 4).replace(/\n/g, '\n    ')}\n  }'`
                    : serverGeneratedCode || `// Compiled code for ${codeTab} is not loaded. Try changing modes or click 'Save' to trigger compiler.`)
                : (codeTab === 'curl' 
                    ? `# Simple webhook trigger for executing the workflow\ncurl -X POST http://localhost:3000/api/pipeline/run`
                    : generateCopieableCode())
              }
            </pre>

            <button
              id="copy-code-btn"
              onClick={handleCopyCode}
              className="absolute top-3 right-3 shrink bg-slate-900 border border-slate-750 text-slate-300 hover:text-slate-100 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all shadow hover:border-slate-600 flex items-center gap-1"
            >
              {copiedText === "Copied to clipboard!" ? (
                <>
                  <Check size={12} className="text-emerald-400" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={12} />
                  <span>Copy Exporter Script</span>
                </>
              )}
            </button>
          </>
        )}
      </div>

      <div className="bg-slate-950/40 p-3.5 border border-slate-850 rounded-xl space-y-1 text-xs">
        <span className="font-bold text-slate-300 block font-sans">Integration Instructions:</span>
        <ol className="list-decimal list-inside text-slate-500 space-y-1 leading-normal pl-1 text-[11px] font-sans">
          {codeTab === 'typescript' && (
            <>
              <li>Install SDK & Server tools: <code className="text-teal-400 font-mono">npm install @google/genai express dotenv</code>.</li>
              <li>Run code with support for Node's stripped types directly: <code className="text-teal-400 font-mono">npx tsx script.ts</code>.</li>
            </>
          )}
          {codeTab === 'python' && (
            <>
              <li>Install SDK dependencies: <code className="text-teal-400 font-mono">pip install google-genai requests pydantic</code>.</li>
              <li>Run python runner script directly: <code className="text-teal-400 font-mono">python script.py</code>.</li>
            </>
          )}
          {codeTab === 'curl' && (
            <>
              <li>Ensure the server is running on <code className="text-slate-400 font-mono">http://localhost:3000</code>.</li>
              <li>Execute cURL in your terminal to see raw step execution pathways logs.</li>
            </>
          )}
          <li>Ensure your environment has initialized: <code className="text-emerald-400 font-mono">export GEMINI_API_KEY="AI-KEY"</code>.</li>
        </ol>
      </div>
    </div>
  );
};
