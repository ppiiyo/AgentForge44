import React from 'react';
import { motion } from 'motion/react';
import { GitFork } from 'lucide-react';

interface ViralityTabProps {
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
}

export const ViralityTab: React.FC<ViralityTabProps> = ({
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
}) => {
  const score = calculateViralityScore();
  const label = getViralityLabel(score);

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-505 leading-relaxed font-sans">
        Visual developer playgrounds and agent workflow tools gather the absolute largest fork & star indices on GitHub. Tweak your project factors below to calculate potential virality.
      </p>

      <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-850 space-y-3.5">
        <div className="flex items-center justify-between border-b border-slate-850 pb-2">
          <span className="text-xs font-extrabold text-slate-300 font-sans">GitHub Fork Metric Tweak</span>
          <span className="text-xs text-slate-505 flex items-center gap-0.5 font-sans"><GitFork size={12} /> Sim Config</span>
        </div>

        <div className="space-y-3 font-sans">
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-slate-400 font-semibold">Documentation & Readme Clarity</span>
              <span className="font-mono text-sky-400">{simDocQual}%</span>
            </div>
            <input 
              type="range" 
              min="30" 
              max="100" 
              value={simDocQual} 
              onChange={(e) => setSimDocQual(parseInt(e.target.value))}
              className="w-full accent-sky-500 bg-slate-850 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-slate-400 font-semibold">UI Aesthetic Polishing (Interactive Grids)</span>
              <span className="font-mono text-sky-400">{simUIAesthetic}%</span>
            </div>
            <input 
              type="range" 
              min="30" 
              max="100" 
              value={simUIAesthetic} 
              onChange={(e) => setSimUIAesthetic(parseInt(e.target.value))}
              className="w-full accent-sky-500 bg-slate-850 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-slate-400 font-semibold">Agent Workflow Recursion Depth</span>
              <span className="font-mono text-sky-400">{simAgentPower}%</span>
            </div>
            <input 
              type="range" 
              min="30" 
              max="100" 
              value={simAgentPower} 
              onChange={(e) => setSimAgentPower(parseInt(e.target.value))}
              className="w-full accent-sky-500 bg-slate-850 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-slate-400 font-semibold">Marketing Launch Push (Reddit/Twitter)</span>
              <span className="font-mono text-sky-400">{simMarketingPush}%</span>
            </div>
            <input 
              type="range" 
              min="30" 
              max="100" 
              value={simMarketingPush} 
              onChange={(e) => setSimMarketingPush(parseInt(e.target.value))}
              className="w-full accent-sky-500 bg-slate-850 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Calculated Results Block */}
      <div className="bg-slate-955 p-4 rounded-2xl border border-slate-800 space-y-3 text-center">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-sans">Projected Virality Coefficient</span>
        
        <div className="flex justify-center items-baseline space-x-1.5 py-1">
          <span className="text-4xl font-black font-mono tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-teal-300 to-indigo-400 animate-pulse">
            {score}
          </span>
          <span className="text-sm font-extrabold text-slate-500 font-sans">/100 Stars Intensity</span>
        </div>

        <span className={`text-xs font-bold leading-normal block font-sans ${label.color}`}>
          {label.text}
        </span>

        <p className="text-[11px] text-slate-500 px-2 leading-relaxed leading-normal pt-1.5 border-t border-slate-850/60 text-left font-sans">
          💡 <strong>Virality Tip:</strong> Flow-builders and node canvases like <strong>KostromAi44</strong> have high fork-to-star ratios because developers Fork them to write customized workflow components for SaaS solutions!
        </p>
      </div>
    </div>
  );
};
