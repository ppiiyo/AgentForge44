import React, { useState, useEffect } from 'react';
import { 
  GitCommit, GitBranch, History, ChevronRight, User, Clock, 
  RotateCcw, Sparkles, MessageSquare, AlertCircle, Plus, Edit, Trash2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Version {
  id: string;
  graphId: string;
  versionNumber: number;
  createdAt: string;
  author: string;
  snapshot: any;
  commitMessage: string;
  diffSummary: string;
}

interface DiffReport {
  addedIds: string[];
  deletedIds: string[];
  modifiedIds: string[];
}

interface VersionHistoryProps {
  graphId: string;
  activeSnapshot: {
    name: string;
    nodes: any[];
    connections: any[];
  };
  onRollbackSuccess: (snapshot: any) => void;
  currentLang?: 'en' | 'ru' | 'zh';
}

const TRANSLATIONS = {
  en: {
    title: 'Flow Version Control Hierarchy',
    commitHeading: 'Record Workspace State',
    commitPlaceholder: 'Enter descriptive message for review (e.g., added safety validator nodes)',
    commitBtn: 'Commit Snapshot',
    fallbackAuthor: 'Forge Craftsman',
    historyTimeline: 'Git Version History Path',
    rollbackBtn: 'Time Rollback Workspace',
    rollbackProgress: 'Time Traveling Workspace State...',
    diffTitle: 'Structural Graph Diff Review',
    nodeAdded: 'Elements Added',
    nodeEdited: 'Elements Modified',
    nodeDeleted: 'Elements Deleted',
    emptyHistory: 'No workspace backups committed. Record a checkpoint above to preserve states.',
    backups: 'Backups'
  },
  ru: {
    title: 'История версий и изменений',
    commitHeading: 'Сделать снимок холста',
    commitPlaceholder: 'Введите описание изменений (например: добавил ноду самопроверки)',
    commitBtn: 'Зафиксировать версию',
    fallbackAuthor: 'Инженер Forge',
    historyTimeline: 'Временная лента версий',
    rollbackBtn: 'Откатить холст во времени',
    rollbackProgress: 'Путешествуем во времени...',
    diffTitle: 'Анализ различий (Diff)',
    nodeAdded: 'Узлов создано',
    nodeEdited: 'Узлов изменено',
    nodeDeleted: 'Узлов удалено',
    emptyHistory: 'Бекапы не зафиксированы. Создайте первый коммит выше для отслеживания версий.',
    backups: 'Бекапы'
  },
  zh: {
    title: '画布版本管理与 Git 历史时光机',
    commitHeading: '提交当前画布分支快照',
    commitPlaceholder: '输入本次修改的内容说明 (例如：优化了 RAG 节点的 prompt 参数)',
    commitBtn: '提交画布快照 (Commit)',
    fallbackAuthor: '工作流架构师',
    historyTimeline: '工作流快照版本时间线',
    rollbackBtn: '回滚画布快照',
    rollbackProgress: '画布正在回溯复原中...',
    diffTitle: '节点拓扑变更明细对比 (Diff)',
    nodeAdded: '新增节点',
    nodeEdited: '变更节点',
    nodeDeleted: '删除节点',
    emptyHistory: '画布暂未发现快照备份。您可以在上方发起首次画布快照提交以作为后续回滚基准点。',
    backups: '备份'
  }
};

export const VersionHistory: React.FC<VersionHistoryProps> = ({
  graphId,
  activeSnapshot,
  onRollbackSuccess,
  currentLang = 'en'
}) => {
  const [versions, setVersions] = useState<Version[]>([]);
  const [commitMessage, setCommitMessage] = useState('');
  const [author, setAuthor] = useState('');
  const [committing, setCommitting] = useState(false);
  const [rollingId, setRollingId] = useState<string | null>(null);
  
  // Diff viewer state
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [diffData, setDiffData] = useState<DiffReport | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);

  const text = TRANSLATIONS[currentLang] || TRANSLATIONS.en;

  const fetchVersions = async () => {
    try {
      const res = await fetch(`/api/graphs/${graphId}/versions`);
      if (res.ok) {
        const list = await res.json();
        setVersions(list);
      }
    } catch (err) {
      console.error('Error fetching graph versions:', err);
    }
  };

  useEffect(() => {
    fetchVersions();
  }, [graphId]);

  // Diff inspection effect
  useEffect(() => {
    if (!selectedVersionId || versions.length === 0) {
      setDiffData(null);
      return;
    }

    const loadDiff = async () => {
      setDiffLoading(true);
      try {
        const sorted = [...versions].sort((a,b) => a.versionNumber - b.versionNumber);
        const idxCurrent = sorted.findIndex(v => v.id === selectedVersionId);
        
        // Find previous version in sorted sequence to diff against
        const prevId = idxCurrent > 0 ? sorted[idxCurrent - 1].id : selectedVersionId;
        
        const res = await fetch(`/api/graphs/${graphId}/diff?v1=${prevId}&v2=${selectedVersionId}`);
        if (res.ok) {
          const delta = await res.json();
          setDiffData(delta);
        }
      } catch (err) {
        console.error('Diff render failed:', err);
      } finally {
        setDiffLoading(false);
      }
    };

    loadDiff();
  }, [selectedVersionId, versions]);

  const handleCommit = async () => {
    if (!commitMessage.trim()) return;
    setCommitting(true);
    try {
      const payload = {
        message: commitMessage.trim(),
        author: author.trim() || text.fallbackAuthor,
        snapshot: activeSnapshot
      };

      const res = await fetch(`/api/graphs/${graphId}/versions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setCommitMessage('');
        fetchVersions();
      }
    } catch (err) {
      console.error('Commit failed:', err);
    } finally {
      setCommitting(false);
    }
  };

  const handleRollback = async (vId: string) => {
    setRollingId(vId);
    try {
      const res = await fetch(`/api/graphs/${graphId}/rollback/${vId}`, {
        method: 'POST'
      });

      if (res.ok) {
        const data = await res.json();
        
        // Success! Perform gorgeous time travel animation callback to App layout
        if (data.success && data.restored) {
          onRollbackSuccess(data.restored.snapshot);
        }
      }
    } catch (err) {
      console.error('Rollback failed:', err);
    } finally {
      // Keep loading on for secondary tick to sustain the temporal flash UI experience
      setTimeout(() => {
        setRollingId(null);
      }, 700);
    }
  };

  return (
    <div className="space-y-5">
      {/* Temporal flash loading overlay if rollback is active */}
      <AnimatePresence>
        {rollingId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-indigo-950/40 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4"
          >
            <motion.div
              animate={{ 
                scale: [1, 1.1, 0.95, 1.05, 1],
                rotate: [0, 180, 360],
              }}
              transition={{ duration: 1.2, ease: 'easeInOut' }}
              className="text-purple-400 bg-slate-950 p-6 rounded-full border border-purple-500/20 shadow-2xl shrink-0"
            >
              <RotateCcw size={40} className="animate-spin" />
            </motion.div>
            <h3 className="text-sm font-black text-slate-100 uppercase tracking-widest mt-6 bg-slate-950/80 p-3.5 rounded-2xl border border-slate-900 shadow-md">
              {text.rollbackProgress}
            </h3>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Commit current canvas area */}
      <div className="bg-slate-950 border border-slate-900 rounded-xl p-4.5 space-y-3">
        <h4 className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
          <GitCommit size={12} className="text-purple-400" />
          {text.commitHeading}
        </h4>

        <div className="space-y-2.5">
          <textarea
            placeholder={text.commitPlaceholder}
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            className="w-full bg-slate-900 border border-slate-850 focus:border-purple-500/40 rounded-lg p-2.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none h-18 resize-none font-sans"
          />

          <div className="flex gap-2.5">
            <input
              type="text"
              placeholder={currentLang === 'ru' ? 'Имя автора (опционально)' : 'Author (Optional name)'}
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-850 focus:border-purple-500/40 rounded-lg px-2.5 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none font-sans"
            />
            <button
              onClick={handleCommit}
              disabled={committing || !commitMessage.trim()}
              className="bg-purple-600 hover:bg-purple-500 text-slate-950 px-4 py-2 rounded-lg text-xs font-black select-none cursor-pointer hover:shadow-lg hover:shadow-purple-500/10 transition-all disabled:opacity-45 disabled:cursor-not-allowed uppercase shrink-0"
            >
              {committing ? 'Saving...' : text.commitBtn}
            </button>
          </div>
        </div>
      </div>

      {/* History timeline */}
      <div className="space-y-3">
        <h4 className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider flex items-center gap-1.5 pl-1">
          <History size={12} className="text-slate-450" />
          {text.historyTimeline}
        </h4>

        {versions.length === 0 ? (
          <div className="p-8 border border-dashed border-slate-900 rounded-xl text-center bg-slate-950/20">
            <History size={18} className="text-slate-700 mb-1.5 mx-auto" />
            <p className="text-[11px] text-slate-505 italic max-w-sm mx-auto leading-relaxed">{text.emptyHistory}</p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
            {versions.map((ver) => {
              const isSelected = selectedVersionId === ver.id;
              
              return (
                <div 
                  key={ver.id}
                  className={`bg-slate-955 border rounded-xl p-3.5 hover:border-slate-800 transition-all cursor-pointer relative flex flex-col gap-2.5 ${
                    isSelected ? 'border-purple-500/45 bg-purple-950/5' : 'border-slate-900'
                  }`}
                  onClick={() => setSelectedVersionId(isSelected ? null : ver.id)}
                >
                  {/* Commiter timestamp header */}
                  <div className="flex justify-between items-center text-[9px] font-mono leading-none border-b border-slate-900 pb-1.5 w-full">
                    <span className="font-extrabold text-slate-500 uppercase flex items-center gap-1">
                      <GitBranch size={9} className="text-purple-400" />
                      v{ver.versionNumber} Checkpoint
                    </span>
                    <span className="text-slate-600 flex items-center gap-1">
                      <Clock size={9} />
                      {new Date(ver.createdAt).toLocaleTimeString()}
                    </span>
                  </div>

                  {/* Message */}
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-200 leading-tight flex items-start gap-1">
                      <MessageSquare size={11} className="text-purple-400 shrink-0 mt-0.5" />
                      <span>{ver.commitMessage}</span>
                    </p>
                    <span className="text-[9px] text-slate-500 flex items-center gap-1 font-mono">
                      <User size={9} />
                      Author: {ver.author}
                    </span>
                  </div>

                  {/* Diff Delta small overview line */}
                  <div className="text-[8px] font-mono text-purple-450 uppercase flex items-center gap-1 bg-purple-500/5 px-2 py-0.5 border border-purple-500/10 rounded w-fit select-none">
                    <span>Delta: {ver.diffSummary}</span>
                  </div>

                  {/* RESTORE ROLLBACK button & Diff details rendering */}
                  {isSelected && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="border-t border-slate-900 pt-3.5 space-y-3.5 overflow-hidden"
                      onClick={(e) => e.stopPropagation()} // Stop selection toggle propagation
                    >
                      {/* Diff subsegment */}
                      {diffLoading ? (
                        <p className="text-[10px] text-slate-505 animate-pulse font-mono">Loading diff data...</p>
                      ) : (
                        diffData && (
                          <div className="space-y-2 select-none">
                            <h5 className="text-[8px] font-mono font-extrabold uppercase text-slate-500 tracking-wider">
                              {text.diffTitle}
                            </h5>
                            
                            <div className="grid grid-cols-3 gap-1.5 text-[8px] font-mono">
                              {/* Added */}
                              <div className="bg-emerald-950/20 px-2 py-1 border border-emerald-900/35 rounded-lg flex flex-col">
                                <span className="text-emerald-400 uppercase font-black flex items-center gap-1">
                                  <Plus size={8} /> {text.nodeAdded}
                                </span>
                                <span className="text-[10px] font-bold text-slate-200 mt-1">{diffData.addedIds.length}</span>
                              </div>

                              {/* Modified */}
                              <div className="bg-amber-950/20 px-2 py-1 border border-amber-900/35 rounded-lg flex flex-col">
                                <span className="text-amber-400 uppercase font-black flex items-center gap-1">
                                  <Edit size={8} /> {text.nodeEdited}
                                </span>
                                <span className="text-[10px] font-bold text-slate-200 mt-1">{diffData.modifiedIds.length}</span>
                              </div>

                              {/* Deleted */}
                              <div className="bg-rose-950/19 px-2 py-1 border border-rose-900/40 rounded-lg flex flex-col">
                                <span className="text-rose-450 uppercase font-black flex items-center gap-1">
                                  <Trash2 size={8} /> {text.nodeDeleted}
                                </span>
                                <span className="text-[10px] font-bold text-slate-200 mt-1">{diffData.deletedIds.length}</span>
                              </div>
                            </div>
                          </div>
                        )
                      )}

                      {/* Restore action */}
                      <button
                        onClick={() => handleRollback(ver.id)}
                        className="w-full text-xs font-black uppercase py-2 px-3 border border-purple-505 hover:border-purple-400 text-purple-400 hover:text-slate-950 hover:bg-purple-400 bg-purple-500/10 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer selection:bg-purple-200"
                      >
                        <RotateCcw size={12} />
                        <span>{text.rollbackBtn}</span>
                      </button>
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
