import React from 'react';
import { BookOpen, AlertCircle, Sparkles, Sliders } from 'lucide-react';
import { motion } from 'motion/react';

interface ChunkItem {
  id: string;
  source: string;
  text: string;
}

interface RAGVisualizerProps {
  searchQuery: string;
  results: ChunkItem[];
  currentLang?: 'en' | 'ru' | 'zh';
}

const TRANSLATIONS = {
  en: {
    similarityChart: 'Semantic Relevance Chart',
    topMatches: 'Top Document Chunks',
    score: 'Score',
    source: 'Source',
    noData: 'No matches retrieved. Type a keyword query above to test RAG document grounding.',
    relevanceLevel: 'Relevance Level',
    matchedTokens: 'Match Highlights'
  },
  ru: {
    similarityChart: 'График семантической релевантности',
    topMatches: 'Топ-фрагменты совпавших документов',
    score: 'Релевантность',
    source: 'Источник',
    noData: 'Совпадения не найдены. Введите поисковый запрос выше, чтобы проанализировать выдачу RAG.',
    relevanceLevel: 'Уровень совпадения',
    matchedTokens: 'Подсвеченные фрагменты'
  },
  zh: {
    similarityChart: '语义匹配度相关得分图表',
    topMatches: '最相关的知识库文档分片',
    score: '精确得分',
    source: '来源',
    noData: '未检索到相关内容。请在上方输入关键词检索以执行 RAG 联调测试。',
    relevanceLevel: '匹配相关程度',
    matchedTokens: '匹配关键词标记'
  }
};

export const RAGVisualizer: React.FC<RAGVisualizerProps> = ({
  searchQuery,
  results,
  currentLang = 'en'
}) => {
  // Recalculate robust scores on client side for the top 5
  const queryWords = searchQuery.toLowerCase().trim().split(/\s+/).filter(Boolean);

  const scoredResults = results.map((chunk) => {
    let score = 0;
    if (queryWords.length > 0) {
      const docClean = chunk.text.toLowerCase();
      const docWords = new Set(docClean.split(/\s+/));
      let intersections = 0;
      queryWords.forEach(w => {
        if (docWords.has(w) || docClean.includes(w)) {
          intersections++;
        }
      });
      score = intersections / Math.max(1, queryWords.length);
      // Give a little bonus based on substring frequency
      const freqBonus = Math.min(0.15, (chunk.text.match(new RegExp(queryWords[0], 'gi')) || []).length * 0.02);
      score = Math.min(1.0, score + freqBonus);
    } else {
      // Base realistic distribution if search is empty
      score = 0.5 - (Math.random() * 0.2);
    }

    return {
      ...chunk,
      score: Number(score.toFixed(2))
    };
  })
  .sort((a, b) => b.score - a.score)
  .slice(0, 5);

  // Helper to highlight matched query words within text segment
  const renderHighlightedText = (text: string) => {
    if (queryWords.length === 0) return <span>{text}</span>;

    // Build a matching Regex of all query words longer than 2 characters
    const escapedWords = queryWords
      .filter(w => w.length > 1)
      .map(w => w.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));

    if (escapedWords.length === 0) return <span>{text}</span>;

    const regex = new RegExp(`(${escapedWords.join('|')})`, 'gi');
    const parts = text.split(regex);

    return (
      <span className="leading-relaxed">
        {parts.map((part, idx) => {
          const isMatch = escapedWords.some(w => new RegExp(`^${w}$`, 'i').test(part));
          return isMatch ? (
            <span 
              key={idx} 
              className="bg-teal-500/20 text-teal-300 font-extrabold px-1.5 py-0.5 rounded border border-teal-500/20 shadow-sm shadow-teal-500/5 mx-0.5"
            >
              {part}
            </span>
          ) : (
            <span key={idx}>{part}</span>
          );
        })}
      </span>
    );
  };

  const text = TRANSLATIONS[currentLang] || TRANSLATIONS.en;

  return (
    <div className="space-y-4">
      {scoredResults.length === 0 ? (
        <div className="p-8 border border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center bg-slate-950/20">
          <AlertCircle size={24} className="text-slate-600 mb-2" />
          <p className="text-xs text-slate-400 font-bold max-w-md">{text.noData}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* HIGH POLISHED SVG/HTML COGNITIVE BAR CHART */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3">
            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Sliders size={12} className="text-teal-400" />
              {text.similarityChart}
            </h5>

            <div className="space-y-2 pt-1.5">
              {scoredResults.map((item, idx) => {
                const percentage = Math.max(12, Math.round(item.score * 100));
                const barColor = item.score > 0.7 ? 'bg-gradient-to-r from-teal-500 to-emerald-400' : item.score > 0.4 ? 'bg-gradient-to-r from-sky-500 to-teal-400' : 'bg-slate-700';

                return (
                  <div key={item.id} className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-mono leading-none">
                      <span className="text-slate-400 font-bold truncate max-w-sm">
                        #{idx+1} Chunk: "{item.source}"
                      </span>
                      <span className="text-teal-400 font-extrabold">{text.score}: {item.score}</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-800/40 relative">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className={`h-full rounded-full ${barColor}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CHUNKS SCROLL LIST WITH HIGH LIGHTED SUBSTRINGS */}
          <div className="space-y-2.5">
            <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest block pl-1">
              {text.topMatches}
            </h5>

            <div className="space-y-2">
              {scoredResults.map((item, idx) => {
                const scoreColor = item.score > 0.7 ? 'text-teal-400 bg-teal-950/40 border-teal-900/30' : item.score > 0.4 ? 'text-sky-405 bg-sky-950/40 border-sky-900/30' : 'text-slate-400 bg-slate-900/60 border-slate-800';

                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={item.id} 
                    className="p-3.5 bg-slate-950 rounded-xl border border-slate-850/70 hover:border-slate-800 transition-all space-y-2 flex flex-col"
                  >
                    <div className="flex items-center justify-between text-[9px] border-b border-slate-900 pb-1.5 leading-none">
                      <span className="font-extrabold text-slate-500">MATCH RANK #{idx+1}</span>
                      <div className="flex items-center space-x-1.5 font-mono">
                        <span className="text-slate-505 font-bold italic">📦 Source: {item.source}</span>
                        <span className={`px-2 py-0.5 rounded font-extrabold uppercase border text-[8px] ${scoreColor}`}>
                          Score {item.score}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-[11px] font-mono text-slate-300 leading-relaxed font-medium bg-slate-900/20 p-2.5 rounded border border-slate-900/40 whitespace-pre-wrap">
                      {renderHighlightedText(item.text)}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
