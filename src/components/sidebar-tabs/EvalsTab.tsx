import React from 'react';
import { motion } from 'motion/react';
import { ChevronRight, Trash, Plus, Play, RefreshCcw } from 'lucide-react';

interface EvalsTabProps {
  isEvaluating: boolean;
  evalReport: any;
  evalTestCases: any[];
  setEvalTestCases: React.Dispatch<React.SetStateAction<any[]>>;
  handleRunEvaluationSuite: () => Promise<void>;
}

export const EvalsTab: React.FC<EvalsTabProps> = ({
  isEvaluating,
  evalReport,
  evalTestCases,
  setEvalTestCases,
  handleRunEvaluationSuite,
}) => {
  return (
    <div className="space-y-4">
      <div className="bg-slate-900/40 p-4 border border-slate-850 rounded-2xl space-y-1.5">
        <h4 className="text-xs font-black text-sky-400 uppercase tracking-widest flex items-center gap-1.5">
          <ChevronRight size={14} className="text-sky-400" /> Performance Evaluator
        </h4>
        <p className="text-[11px] text-slate-400 leading-normal">
          Run automated <strong>LLM-as-a-Judge</strong> benchmarks to calculate compilation correctness, semantic accuracy, and latency across multiple custom scenario test lines.
        </p>
      </div>

      {/* Benchmark Suite Control */}
      <button
        id="btn_run_evals"
        onClick={handleRunEvaluationSuite}
        disabled={isEvaluating}
        className="w-full bg-gradient-to-r from-sky-505 to-indigo-650 text-slate-950 font-black py-3 px-4 rounded-xl text-xs hover:from-sky-400 hover:to-indigo-400 cursor-pointer shadow-lg shadow-sky-500/10 flex items-center justify-center gap-2 transition-all disabled:opacity-55 disabled:cursor-not-allowed"
      >
        {isEvaluating ? (
          <>
            <RefreshCcw size={14} className="animate-spin" />
            <span>Evaluating Pipeline Cases...</span>
          </>
        ) : (
          <>
            <Play size={14} fill="currentColor" />
            <span>Run LLM-as-a-Judge Evaluation Suite</span>
          </>
        )}
      </button>

      {/* Evaluation Report Results Block */}
      {evalReport && (
        <motion.div 
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
          id="eval_report_block"
        >
          <div className="grid grid-cols-2 gap-2 bg-slate-950 p-4 rounded-2xl border border-slate-800">
            <div className="text-center border-r border-slate-850">
              <span className="text-[9.5px] font-extrabold text-slate-505 uppercase tracking-wider block">Average Grade</span>
              <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 font-mono">
                {evalReport.avgScore}/10
              </span>
            </div>
            <div className="text-center">
              <span className="text-[9.5px] font-extrabold text-slate-505 uppercase tracking-wider block">Avg Latency</span>
              <span className="text-3xl font-black text-sky-400 font-mono">
                {evalReport.avgLatencyMs} ms
              </span>
            </div>
          </div>

          {/* Result items timeline */}
          <div className="space-y-2.5">
            {evalReport.items.map((it: any, index: number) => (
              <div key={it.id} className="bg-slate-950/60 border border-slate-850 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-850/60 pb-1.5">
                  <span className="text-xs font-bold text-slate-200">
                    Case {index + 1}: {it.name}
                  </span>
                  <span className={`text-xs font-mono font-black px-2 py-0.5 rounded ${
                    it.score >= 8 
                      ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30' 
                      : it.score >= 5 
                      ? 'bg-amber-955/40 text-amber-400 border border-amber-900/20' 
                      : 'bg-rose-950/40 text-rose-455 border border-rose-900/30'
                  }`}>
                    Grade: {it.score}/10
                  </span>
                </div>

                <div className="text-[10.5px] space-y-1">
                  <div>
                    <span className="text-slate-505 font-extrabold text-[9px] uppercase">Input Scenario</span>
                    <p className="text-slate-300 bg-slate-900/50 p-1.5 rounded">{it.query}</p>
                  </div>
                  <div className="pt-1">
                    <span className="text-slate-505 font-extrabold text-[9px] uppercase">Expected standard label</span>
                    <p className="text-slate-400 font-medium">{it.expected}</p>
                  </div>
                  <div className="pt-1">
                    <span className="text-slate-505 font-extrabold text-[9px] uppercase">Actual trace output</span>
                    <pre className="text-xs font-mono text-slate-200 bg-slate-900/70 p-2 rounded max-h-24 overflow-y-auto whitespace-pre-wrap">{it.actual}</pre>
                  </div>
                  <div className="pt-2 border-t border-slate-900/60 bg-sky-950/10 p-2 rounded-lg mt-1.5">
                    <span className="text-sky-400 font-black text-[9.5px] uppercase tracking-wider block">Judge Rationale verdict:</span>
                    <p className="text-slate-300 leading-relaxed italic mt-0.5 text-[10.5px]">"{it.rationale}"</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Configurable test lines list */}
      <div className="space-y-2 pt-2">
        <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">TestSuite QA Assertions</span>
        
        <div className="space-y-2">
          {evalTestCases.map((tc, idx) => (
            <div key={tc.id} className="bg-slate-950/40 border border-slate-850 p-3 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <input 
                  type="text" 
                  value={tc.name}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEvalTestCases(prev => prev.map(c => c.id === tc.id ? { ...c, name: val } : c));
                  }}
                  className="bg-transparent border-none text-xs font-extrabold text-slate-200 p-0 focus:ring-0 w-3/4 outline-none font-sans"
                />
                <button
                  onClick={() => setEvalTestCases(prev => prev.filter(c => c.id !== tc.id))}
                  className="text-slate-600 hover:text-rose-450 p-1 rounded hover:bg-slate-900 cursor-pointer"
                  title="Delete Test Case"
                >
                  <Trash size={12} />
                </button>
              </div>
              
              <div className="space-y-1 text-xs">
                <input
                  type="text"
                  value={tc.query}
                  placeholder="Test Query"
                  onChange={(e) => {
                    const val = e.target.value;
                    setEvalTestCases(prev => prev.map(c => c.id === tc.id ? { ...c, query: val } : c));
                  }}
                  className="w-full bg-slate-950 border border-slate-850/60 rounded-lg p-1.5 text-[11px] text-slate-300 outline-none focus:border-sky-500/30"
                />
                <input
                  type="text"
                  value={tc.expected}
                  placeholder="Expected Evaluation Label Keywords"
                  onChange={(e) => {
                    const val = e.target.value;
                    setEvalTestCases(prev => prev.map(c => c.id === tc.id ? { ...c, expected: val } : c));
                  }}
                  className="w-full bg-slate-950 border border-slate-850/60 rounded-lg p-1.5 text-[11px] text-slate-400 outline-none focus:border-sky-500/30"
                />
              </div>
            </div>
          ))}

          <button
            onClick={() => {
              const nId = `test-${Date.now()}`;
              setEvalTestCases(prev => [
                ...prev,
                { id: nId, name: `Custom Check #${prev.length + 1}`, query: 'User query scenario prompt', expected: 'Outcome golden keywords' }
              ]);
            }}
            className="w-full py-2 bg-slate-950 border border-dashed border-slate-800 hover:border-slate-700 text-[10.5px] font-bold text-slate-400 hover:text-slate-200 rounded-xl cursor-pointer flex items-center justify-center gap-1 transition-all"
          >
            <Plus size={11} /> Add New Suite Test Line
          </button>
        </div>
      </div>
    </div>
  );
};
