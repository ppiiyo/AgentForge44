import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, Plus, RefreshCcw, Eye, Trash2, Search, X, 
  Check, Copy, Calendar, FileText, Database 
} from 'lucide-react';

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
  const [allChunks, setAllChunks] = React.useState<any[]>([]);
  const [loadingChunks, setLoadingChunks] = React.useState(false);
  const [previewDoc, setPreviewDoc] = React.useState<any | null>(null);
  const [docSearchQuery, setDocSearchQuery] = React.useState("");
  const [isCopied, setIsCopied] = React.useState(false);

  // Internationalization translation dictionary
  const t = React.useMemo(() => {
    const dict = {
      en: {
        ragTitle: "RAG Knowledge Indexer",
        ragDesc: "Chunk, overlapping slice, and index reference context and manuals to provide accurate grounding injections.",
        sourceLabel: "Context source name",
        blockTypeLabel: "Index block type",
        payloadLabel: "Reference source text payload",
        placeholder: "Paste raw documentation text, API guides, or knowledge base articles...",
        btnIndex: "Index Document into retrieval cache",
        btnIndexing: "Chunking text streams...",
        searchTitle: "Semantic Search Retrieval debug",
        searchPlaceholder: "Type keywords to query indexed chunks (e.g., rust, safety)...",
        noResults: "No matching blocks located. Indexes are isolated to this process pipeline state.",
        libraryTitle: "Indexed Documents Library",
        noDocs: "No documents indexed yet. Paste or seed documents to populate the database.",
        chunks: "chunks",
        viewContent: "View Content",
        deleteDoc: "Delete Document",
        previewHeader: "RAG Document Preview",
        filterPlaceholder: "Search within document text...",
        copyContent: "Copy Content",
        closePreview: "Close Preview",
        createdAt: "Indexed on"
      },
      ru: {
        ragTitle: "RAG Индексатор знаний",
        ragDesc: "Разбивайте на части, перекрывайте фрагменты и индексируйте справочный контекст и руководства для точного заземления ИИ.",
        sourceLabel: "Название источника контекста",
        blockTypeLabel: "Тип блока индекса",
        payloadLabel: "Полезная нагрузка текста",
        placeholder: "Вставьте необработанный текст документации, руководства по API или статьи базы знаний...",
        btnIndex: "Индексировать документ",
        btnIndexing: "Разбиение текстовых потоков...",
        searchTitle: "Семантический поиск и отладка",
        searchPlaceholder: "Введите ключевые слова для поиска (например, rust, безопасность)...",
        noResults: "Совпадающие блоки не найдены. Индексы изолированы в текущем процессе.",
        libraryTitle: "Библиотека индексированных файлов",
        noDocs: "Документы еще не индексированы. Вставьте текст выше для заполнения базы.",
        chunks: "фрагм.",
        viewContent: "Просмотр",
        deleteDoc: "Удалить файл",
        previewHeader: "Предпросмотр документа RAG",
        filterPlaceholder: "Поиск по тексту документа...",
        copyContent: "Копировать текст",
        closePreview: "Закрыть предпросмотр",
        createdAt: "Индексировано"
      },
      zh: {
        ragTitle: "RAG 知识索引库",
        ragDesc: "对参考上下文和手册进行分块、重叠切片和索引，以提供准确的 AI 提示词背景支撑。",
        sourceLabel: "上下文来源名称",
        blockTypeLabel: "索引块类型",
        payloadLabel: "参考文本内容",
        placeholder: "在此粘贴原始文档、API 指南或知识库文章内容...",
        btnIndex: "将文档索引至向量检索缓存",
        btnIndexing: "正在对文本流进行分块...",
        searchTitle: "语义搜索检索调试",
        searchPlaceholder: "输入关键字查询已索引的分块 (例如: rust, 安全)...",
        noResults: "未找到匹配的数据块。索引数据完全隔离在当前管道中。",
        libraryTitle: "已索引文档库",
        noDocs: "暂无已索引文档。请在上方输入并索引文档以填充库。",
        chunks: "分块",
        viewContent: "查看内容",
        deleteDoc: "删除文档",
        previewHeader: "RAG 文档预览",
        filterPlaceholder: "在文档文本内搜索...",
        copyContent: "复制全部内容",
        closePreview: "关闭预览",
        createdAt: "索引时间"
      }
    };
    return dict[currentLang] || dict.en;
  }, [currentLang]);

  // Fetch all chunks from API
  const fetchChunks = async () => {
    setLoadingChunks(true);
    try {
      const response = await fetch('/api/rag/chunks');
      if (response.ok) {
        const data = await response.json();
        setAllChunks(data.chunks || []);
      }
    } catch (err) {
      console.error("Failed to fetch RAG chunks:", err);
    } finally {
      setLoadingChunks(false);
    }
  };

  React.useEffect(() => {
    fetchChunks();
  }, []);

  // Sync / Refresh when a document gets indexed successfully
  const prevIsIndexing = React.useRef(isRAGIndexing);
  React.useEffect(() => {
    if (prevIsIndexing.current && !isRAGIndexing) {
      fetchChunks();
    }
    prevIsIndexing.current = isRAGIndexing;
  }, [isRAGIndexing]);

  // Group chunks by source name
  const documents = React.useMemo(() => {
    const grouped: Record<string, typeof allChunks> = {};
    allChunks.forEach(chunk => {
      const src = chunk.source || "Unnamed Source";
      if (!grouped[src]) {
        grouped[src] = [];
      }
      grouped[src].push(chunk);
    });
    
    return Object.entries(grouped).map(([source, chunks]) => {
      // Sort chunks so they display sequentially if needed
      const sortedChunks = [...chunks].sort((a, b) => a.id.localeCompare(b.id));
      const combinedText = sortedChunks.map(c => c.text).join('\n\n');
      return {
        source,
        chunks: sortedChunks,
        combinedText,
        chunkCount: chunks.length,
        createdAt: chunks[0]?.createdAt || Date.now()
      };
    });
  }, [allChunks]);

  // Delete Document handler
  const handleDeleteDoc = async (sourceName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmMsg = currentLang === 'ru' 
      ? `Вы действительно хотите удалить документ "${sourceName}" и все его ${allChunks.filter(c => c.source === sourceName).length} фрагментов из базы RAG?` 
      : currentLang === 'zh' 
        ? `您确定要从 RAG 向量存储中永久删除文档 "${sourceName}"（含 ${allChunks.filter(c => c.source === sourceName).length} 个分块）吗？` 
        : `Are you sure you want to permanently delete document "${sourceName}" and all of its ${allChunks.filter(c => c.source === sourceName).length} chunks from the RAG store?`;

    if (!window.confirm(confirmMsg)) {
      return;
    }

    try {
      const response = await fetch(`/api/rag/document/${encodeURIComponent(sourceName)}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        fetchChunks();
        if (previewDoc && previewDoc.source === sourceName) {
          setPreviewDoc(null);
        }
      }
    } catch (err) {
      console.error("Failed to delete RAG document:", err);
    }
  };

  // Copy document combined text inside previewer modal
  const handleCopyDocText = () => {
    if (!previewDoc) return;
    navigator.clipboard.writeText(previewDoc.combinedText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Text highlighting renderer
  const renderHighlightedText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')})`, 'gi'));
    return (
      <>
        {parts.map((part, index) => 
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={index} className="bg-amber-500/40 text-amber-100 font-bold px-0.5 rounded-sm">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  return (
    <div className="space-y-4 flex flex-col h-full min-h-0" id="rag_library_tab">
      <div className="bg-slate-900/40 p-4 border border-slate-850 rounded-2xl space-y-1.5 shrink-0">
        <h4 className="text-xs font-black text-teal-400 uppercase tracking-widest flex items-center gap-1.5">
          <BookOpen size={14} className="text-teal-400 animate-pulse" /> {t.ragTitle}
        </h4>
        <p className="text-[11px] text-slate-400 leading-normal font-medium">
          {t.ragDesc}
        </p>
      </div>

      {/* Manual Paste Section */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3 shrink-0">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[9.5px] font-black text-slate-500 uppercase block mb-1">{t.sourceLabel}</label>
            <input 
              type="text" 
              value={ragSource}
              onChange={(e) => setRagSource(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 p-2 rounded-lg text-xs text-slate-200 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[9.5px] font-black text-slate-500 uppercase block mb-1">{t.blockTypeLabel}</label>
            <select className="w-full bg-slate-900 border border-slate-800 p-2 rounded-lg text-xs text-slate-400 font-semibold focus:outline-none">
              <option>Semantics Text Chunk</option>
              <option>API Endpoints Spec</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-[9.5px] font-black text-slate-500 uppercase block mb-1">{t.payloadLabel}</label>
          <textarea
            rows={3}
            value={ragText}
            onChange={(e) => setRagText(e.target.value)}
            placeholder={t.placeholder}
            className="w-full bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-teal-500/40 placeholder:text-slate-600 leading-relaxed"
          />
        </div>

        <button
          onClick={handleIndexDocument}
          disabled={isRAGIndexing || !ragText.trim()}
          className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-black py-2.5 px-3 rounded-xl text-xs cursor-pointer flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-98"
        >
          {isRAGIndexing ? (
            <>
              <RefreshCcw size={13} className="animate-spin" />
              <span>{t.btnIndexing}</span>
            </>
          ) : (
            <>
              <Plus size={13} />
              <span>{t.btnIndex}</span>
            </>
          )}
        </button>

        {ragIndexStatus && (
          <p className="text-[10px] font-mono font-bold text-center text-teal-400 leading-normal bg-teal-950/20 py-1.5 px-3 rounded border border-teal-900/30">
            {ragIndexStatus}
          </p>
        )}
      </div>

      {/* RAG Indexed Documents Library */}
      <div className="bg-slate-900/10 border border-slate-850 p-4 rounded-2xl flex flex-col min-h-[160px] max-h-[300px] overflow-hidden">
        <div className="flex items-center justify-between mb-3 shrink-0">
          <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Database size={12} className="text-slate-500" />
            {t.libraryTitle}
          </span>
          <span className="text-[9.5px] font-mono font-extrabold text-teal-400 bg-teal-500/10 border border-teal-500/20 rounded-md px-1.5 py-0.5">
            {documents.length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 select-none">
          {loadingChunks && allChunks.length === 0 ? (
            <div className="flex items-center justify-center py-8 gap-2 text-slate-500 text-xs font-mono">
              <RefreshCcw size={13} className="animate-spin text-slate-400" />
              <span>Loading library...</span>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 px-4 text-slate-500 text-[10.5px] italic leading-relaxed border border-dashed border-slate-850 rounded-xl">
              {t.noDocs}
            </div>
          ) : (
            documents.map((doc) => (
              <div 
                key={doc.source}
                onClick={() => {
                  setDocSearchQuery("");
                  setPreviewDoc(doc);
                }}
                className="group border border-slate-850/50 bg-slate-950/45 hover:bg-slate-950 p-2.5 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-all hover:border-teal-500/20"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1.5 rounded-lg bg-teal-500/5 group-hover:bg-teal-500/10 border border-teal-500/10">
                    <FileText size={14} className="text-teal-400" />
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-[11.5px] font-bold text-slate-200 truncate group-hover:text-teal-300 transition-colors" title={doc.source}>
                      {doc.source}
                    </h5>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[9.5px] text-slate-500 font-medium">
                      <span className="font-mono text-slate-400 font-extrabold bg-slate-900 px-1 py-0.5 rounded-sm">{doc.chunkCount} {t.chunks}</span>
                      <span>•</span>
                      <span className="truncate">{new Date(doc.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDocSearchQuery("");
                      setPreviewDoc(doc);
                    }}
                    title={t.viewContent}
                    className="p-1.5 rounded-lg bg-slate-900/60 hover:bg-sky-500/10 border border-slate-800 hover:border-sky-500/20 text-slate-400 hover:text-sky-450 transition-all cursor-pointer"
                  >
                    <Eye size={12.5} />
                  </button>
                  <button
                    onClick={(e) => handleDeleteDoc(doc.source, e)}
                    title={t.deleteDoc}
                    className="p-1.5 rounded-lg bg-slate-900/60 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/20 text-slate-400 hover:text-rose-450 transition-all cursor-pointer"
                  >
                    <Trash2 size={12.5} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Interactive Query Sandbox */}
      <div className="space-y-2.5 pt-3 border-t border-slate-850 shrink-0">
        <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">{t.searchTitle}</span>
        
        <div className="space-y-2">
          <div className="relative">
            <input 
              type="text"
              placeholder={t.searchPlaceholder}
              value={ragSearchQuery}
              onChange={(e) => handleRAGSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 p-2.5 pl-8 rounded-xl text-xs text-slate-200 outline-none focus:border-teal-500/35"
            />
            <Search size={13} className="text-slate-500 absolute left-2.5 top-3.5" />
          </div>

          {ragSearchResults.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {ragSearchResults.map((chunk, ci) => (
                <div key={chunk.id} className="bg-slate-950/70 border border-teal-900/20 p-3 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between text-[9px] border-b border-slate-850/60 pb-1">
                    <span className="font-extrabold text-teal-400">Match Rank #{ci+1}</span>
                    <span className="text-slate-500 font-mono italic max-w-[150px] truncate">{chunk.source}</span>
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
                {t.noResults}
              </div>
            )
          )}
        </div>
      </div>

      {/* Visual File Previewer Modal Overlay */}
      <AnimatePresence>
        {previewDoc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 md:p-6 select-text"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="border-b border-slate-800 p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 shrink-0">
                    <FileText size={20} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-black uppercase text-teal-400 tracking-wider font-mono">
                      {t.previewHeader}
                    </span>
                    <h3 className="text-base font-black text-slate-100 truncate mt-0.5" title={previewDoc.source}>
                      {previewDoc.source}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyDocText}
                    className="p-2 bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-slate-100 border border-slate-800 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                    title={t.copyContent}
                  >
                    {isCopied ? (
                      <>
                        <Check size={14} className="text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setDocSearchQuery("");
                      setPreviewDoc(null);
                    }}
                    className="p-2 bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-100 border border-slate-800 rounded-xl transition-all cursor-pointer"
                    title={t.closePreview}
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Sub-Header / Search Input */}
              <div className="bg-slate-950 px-4 py-3 border-b border-slate-850 flex items-center justify-between gap-4 shrink-0">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder={t.filterPlaceholder}
                    value={docSearchQuery}
                    onChange={(e) => setDocSearchQuery(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 py-1.5 pl-8 pr-3 rounded-lg text-xs text-slate-200 outline-none focus:border-teal-500/30"
                  />
                  <Search size={12} className="text-slate-500 absolute left-2.5 top-2.5" />
                </div>
                <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium whitespace-nowrap">
                  <Calendar size={11} className="text-slate-500" />
                  <span>{t.createdAt}: {new Date(previewDoc.createdAt).toLocaleString()}</span>
                </div>
              </div>

              {/* Monospace Document Chunks Text Body */}
              <div className="flex-1 overflow-y-auto p-5 md:p-6 bg-slate-950/40 text-slate-350 text-[11.5px] font-mono leading-relaxed select-text space-y-4">
                {previewDoc.chunks.map((chunk: any, index: number) => {
                  const matchesSearch = docSearchQuery.trim() === "" || chunk.text.toLowerCase().includes(docSearchQuery.toLowerCase());
                  
                  if (!matchesSearch) return null;

                  return (
                    <div 
                      key={chunk.id} 
                      className="border border-slate-850/60 bg-slate-900/30 p-3.5 rounded-2xl relative group"
                    >
                      <span className="absolute top-2.5 right-3 text-[9px] font-mono text-slate-600 group-hover:text-teal-500/50 transition-colors uppercase font-bold tracking-wider">
                        chunk #{index + 1}
                      </span>
                      <p className="whitespace-pre-wrap leading-relaxed mt-1">
                        {renderHighlightedText(chunk.text, docSearchQuery)}
                      </p>
                    </div>
                  );
                })}

                {docSearchQuery.trim() !== "" && previewDoc.chunks.every((c: any) => !c.text.toLowerCase().includes(docSearchQuery.toLowerCase())) && (
                  <div className="text-center py-12 text-slate-500 italic">
                    No matching occurrences found for &ldquo;{docSearchQuery}&rdquo; within this document index.
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
