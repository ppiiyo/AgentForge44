import React from 'react';
import { motion } from 'motion/react';
import { BookOpen, Plus, RefreshCcw } from 'lucide-react';

interface LibraryTabProps {
  currentLang: 'en' | 'ru' | 'zh';
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
}

export const LibraryTab: React.FC<LibraryTabProps> = ({
  currentLang,
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
}) => {
  return (
    <div className="space-y-4">
      <div className="bg-slate-900/40 p-4 border border-slate-850 rounded-2xl space-y-1.5">
        <h4 className="text-xs font-black text-teal-400 uppercase tracking-widest flex items-center gap-1.5">
          <BookOpen size={14} className="text-teal-400" /> RAG Knowledge Indexer
        </h4>
        <p className="text-[11px] text-slate-400 leading-normal font-medium">
          Chunk, overlapping slice, and index reference context and manuals to provide accurate grounding injections.
        </p>
      </div>

      {/* Manual Paste Section */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[9.5px] font-black text-slate-505 uppercase block mb-1">Context source name</label>
            <input 
              type="text" 
              value={ragSource}
              onChange={(e) => setRagSource(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 p-2 rounded-lg text-xs text-slate-200 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[9.5px] font-black text-slate-505 uppercase block mb-1">Index block type</label>
            <select className="w-full bg-slate-900 border border-slate-800 p-2 rounded-lg text-xs text-slate-400 font-semibold focus:outline-none">
              <option>Semantics Text Chunk</option>
              <option>API Endpoints Spec</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-[9.5px] font-black text-slate-505 uppercase block mb-1">Reference source text payload</label>
          <textarea
            rows={4}
            value={ragText}
            onChange={(e) => setRagText(e.target.value)}
            placeholder="Paste raw documentation text, API guides, or knowledge base articles..."
            className="w-full bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-teal-500/40 placeholder:text-slate-600 leading-relaxed"
          />
        </div>

        <button
          onClick={handleIndexDocument}
          disabled={isRAGIndexing || !ragText.trim()}
          className="w-full bg-teal-555 hover:bg-teal-400 text-slate-955 font-black py-2 px-3 rounded-lg text-xs cursor-pointer flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRAGIndexing ? (
            <>
              <RefreshCcw size={13} className="animate-spin" />
              <span>Chunking text streams...</span>
            </>
          ) : (
            <>
              <Plus size={13} />
              <span>Index Document into retrieval cache</span>
            </>
          )}
        </button>

        {ragIndexStatus && (
          <p className="text-[10px] font-mono font-bold text-center text-teal-400 leading-normal bg-teal-950/20 py-1.5 px-3 rounded border border-teal-900/30">
            {ragIndexStatus}
          </p>
        )}
      </div>

      {/* Interactive Query Sandbox */}
      <div className="space-y-2.5 pt-2 border-t border-slate-850">
        <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">Semantic Search Retrieval debug</span>
        
        <div className="space-y-2">
          <input 
            type="text"
            placeholder="Type keywords to query indexed chunks (e.g., rust, safety)..."
            value={ragSearchQuery}
            onChange={(e) => handleRAGSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs text-slate-200 outline-none focus:border-teal-500/35"
          />

          {ragSearchResults.length > 0 ? (
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {ragSearchResults.map((chunk, ci) => (
                <div key={chunk.id} className="bg-slate-950/70 border border-teal-900/20 p-3 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between text-[9px] border-b border-slate-850/60 pb-1">
                    <span className="font-extrabold text-teal-400">Match Rank #{ci+1}</span>
                    <span className="text-slate-500 font-mono italic">{chunk.source}</span>
                  </div>
                  <p className="text-[11px] font-mono text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-900/30 p-2 rounded">
                    {chunk.text}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            ragSearchQuery.trim() && (
              <div className="text-center py-4 text-slate-500 text-[11px] italic font-sans">
                No matching blocks located. Indexes are isolated to this process pipeline state.
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
