import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Search, 
  Download, 
  Star, 
  Plus, 
  BookOpen, 
  Tag, 
  User, 
  Calendar, 
  AlertCircle, 
  CheckCircle,
  Eye,
  GitBranch
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FlowNode, FlowConnection } from '../types';

interface MarketplaceItem {
  id: string;
  title: string;
  description: string;
  authorId: string;
  category: 'agent' | 'tool' | 'template' | 'rag-pipeline';
  graphSnapshot: {
    name: string;
    nodes: FlowNode[];
    connections: FlowConnection[];
  };
  tags: string[];
  thumbnailUrl?: string;
  downloadsCount: number;
  rating: number;
  createdAt: string;
}

interface Review {
  id: string;
  itemId: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

interface MarketplaceProps {
  currentLang?: 'en' | 'ru' | 'zh';
  activeGraphSnapshot: { name: string; nodes: FlowNode[]; connections: FlowConnection[] };
  onInstallTemplate: (name: string, nodes: FlowNode[], connections: FlowConnection[]) => void;
}

const TRANSLATIONS = {
  en: {
    headerTitle: 'Agent & Tool Marketplace',
    headerDesc: 'Discover, review, and install ready-made agent architectures or publish your own workflow structures to the global store.',
    searchPlaceholder: 'Search templates by title, description or tag...',
    categoryAll: 'All Categories',
    categoryAgent: 'Agents',
    categoryTool: 'Tools',
    categoryTemplate: 'Templates',
    categoryRAG: 'RAG Pipelines',
    sortPopular: 'Most Popular',
    sortNewest: 'Newest Releases',
    sortRating: 'Top Rated',
    downloads: 'downloads',
    rating: 'Rating',
    tags: 'Tags',
    author: 'Author',
    created: 'Created',
    installBtn: 'Install into Workspace',
    installSuccess: 'Graph installed successfully!',
    installSuccessCopy: 'An existing project named identically has been copied to prevent override!',
    previewTitle: 'Graph Blueprint Preview',
    reviewsTitle: 'Expert Reviews & Comments',
    noReviews: 'No reviews yet. Be the first to express your experience!',
    addReviewHeader: 'Write an Expert Review',
    commentPlaceholder: 'What was your experience running or adapting this flow template?',
    ratingLabel: 'Stars Score',
    submitReview: 'Submit Review',
    publishTitle: 'Publish Current Canvas Flow',
    publishBtn: 'Publish to Store',
    publishHeaderDesc: 'Export the current state of your workflow canvas as a reusable marketplace listing.',
    formLabelTitle: 'Blueprint Title',
    formLabelDesc: 'Full Explanation / Docs',
    formLabelCategory: 'Target Listing Category',
    formLabelTags: 'Tags (comma separated)',
    publishSuccess: 'Blueprint published successfully to store!',
    validationTitleRequired: 'Title is required.',
    validationNodesRequired: 'The canvas must contain at least one node to publish.',
    closeBtn: 'Close',
    backBtn: 'Back to Registry',
    readOnlyNode: 'Read-Only View'
  },
  ru: {
    headerTitle: 'Маркетплейс агентов и шаблонов',
    headerDesc: 'Исследуйте, оценивайте и устанавливайте готовые архитектуры агентов или публикуйте свои собственные разработки.',
    searchPlaceholder: 'Поиск шаблонов по названию, описанию или тегам...',
    categoryAll: 'Все категории',
    categoryAgent: 'Агенты (Agents)',
    categoryTool: 'Инструменты (Tools)',
    categoryTemplate: 'Шаблоны (Templates)',
    categoryRAG: 'Параметры RAG (RAG Pipelines)',
    sortPopular: 'Популярные',
    sortNewest: 'Новинки',
    sortRating: 'Лучшие оценки',
    downloads: 'скачиваний',
    rating: 'Рейтинг',
    tags: 'Теги',
    author: 'Автор',
    created: 'Добавлен',
    installBtn: 'Установить в рабочее пространство',
    installSuccess: 'Успешно установлено!',
    installSuccessCopy: 'Существующий проект с таким же именем был скопирован во избежание перезаписи!',
    previewTitle: 'Предпросмотр архитектуры графа',
    reviewsTitle: 'Отзывы и комментарии специалистов',
    noReviews: 'Отзывов пока нет. Напишите свой отзыв первым!',
    addReviewHeader: 'Оставить экспертный отзыв',
    commentPlaceholder: 'Поделитесь опытом использования или адаптации этого шаблона...',
    ratingLabel: 'Оценка (Звезд)',
    submitReview: 'Отправить отзыв',
    publishTitle: 'Опубликовать текущую схему',
    publishBtn: 'Опубликовать в маркетплейс',
    publishHeaderDesc: 'Экспортируйте текущее состояние холста вашей системы как общедоступный шаблон.',
    formLabelTitle: 'Название шаблона',
    formLabelDesc: 'Подробное описание и документация',
    formLabelCategory: 'Категория публикации',
    formLabelTags: 'Теги (через запятую)',
    publishSuccess: 'Шаблон успешно опубликован в каталог!',
    validationTitleRequired: 'Название обязательно.',
    validationNodesRequired: 'Для публикации холст должен содержать хотя бы один узел.',
    closeBtn: 'Закрыть',
    backBtn: 'Назад в каталог',
    readOnlyNode: 'Режим просмотра'
  },
  zh: {
    headerTitle: '智能体 & 应用模板市场',
    headerDesc: '探索、评价和一键安装预设的优秀智能体架构，或将您在画布中精心设计的节点流发布在公共仓库中。',
    searchPlaceholder: '搜索标题、描述或标签...',
    categoryAll: '所有节点分类',
    categoryAgent: '智能体 (Agents)',
    categoryTool: '外部辅助工具 (Tools)',
    categoryTemplate: '综合画布模板 (Templates)',
    categoryRAG: 'RAG 检索流水线 (RAG Pipelines)',
    sortPopular: '最受欢迎',
    sortNewest: '最近发布',
    sortRating: '好评排行',
    downloads: '下载次数',
    rating: '评分',
    tags: '标签',
    author: '作者',
    created: '发布于',
    installBtn: '一键导入至我的工作台',
    installSuccess: '模板架构成功导入工作台!',
    installSuccessCopy: '已存有同名应用，自动生成副本以防覆盖!',
    previewTitle: '应用流拓扑设计蓝图预览',
    reviewsTitle: '专家测评与历史交互评论',
    noReviews: '暂无评价。快来抢先发布您的使用体验吧!',
    addReviewHeader: '快速提交专家测评结论',
    commentPlaceholder: '您在运行或微调这个应用模板时的经验是什么？有什么参数建议？',
    ratingLabel: '打分评分',
    submitReview: '提交测评结果',
    publishTitle: '快速发布当前画布数据',
    publishBtn: '正式发布至节点市场',
    publishHeaderDesc: '将您当下工作空间正在设计的节点关系打包备份作为公开市场可复用资源。',
    formLabelTitle: '蓝图模组标题',
    formLabelDesc: '文档说明 / 运行指南',
    formLabelCategory: '目标发布的市场分类',
    formLabelTags: '搜索关键词标签 (半角逗号分隔)',
    publishSuccess: '当前设计蓝图成功提交至公共市场！',
    validationTitleRequired: '模组标题不可为空。',
    validationNodesRequired: '画布内不可为空，至少在画布画有 1 个或多个节点才能执行发布。',
    closeBtn: '隐藏窗口',
    backBtn: '返回市场大厅',
    readOnlyNode: '只读监视'
  }
};

export const Marketplace: React.FC<MarketplaceProps> = ({
  currentLang = 'en',
  activeGraphSnapshot,
  onInstallTemplate
}) => {
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('popular');

  // Selected details
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // Add review State
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Publish Dialog
  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [pubTitle, setPubTitle] = useState('');
  const [pubDesc, setPubDesc] = useState('');
  const [pubCategory, setPubCategory] = useState<'agent' | 'tool' | 'template' | 'rag-pipeline'>('agent');
  const [pubTags, setPubTags] = useState('');
  const [pubSubmitting, setPubSubmitting] = useState(false);
  const [pubError, setPubError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const text = TRANSLATIONS[currentLang] || TRANSLATIONS.en;

  // Load marketplace listings from server
  const loadListings = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/marketplace?category=${category}&search=${encodeURIComponent(search)}&sortBy=${sortBy}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to retrieve marketplace assets.');
      const data = await res.json();
      setItems(data);
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  // Re-run search/filter lists on filter triggers
  useEffect(() => {
    loadListings();
  }, [category, sortBy]);

  // Handle manual Enter keys on search queries
  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      loadListings();
    }
  };

  // View specific item details and loading internal expert comments
  const handleViewDetails = async (id: string) => {
    setSelectedId(id);
    setReviewsLoading(true);
    setReviewError(null);
    setReviewComment('');
    setReviewRating(5);
    try {
      const res = await fetch(`/api/marketplace/${id}`);
      if (!res.ok) throw new Error('Could not fetch blueprint specifications.');
      const data = await res.json();
      setSelectedItem(data.item);
      setReviews(data.reviews || []);
    } catch (err: any) {
      setReviewError(err.message || String(err));
    } finally {
      setReviewsLoading(false);
    }
  };

  // Submit dynamic rating reviews
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !reviewComment.trim()) return;

    setReviewSubmitting(true);
    setReviewError(null);
    try {
      const res = await fetch(`/api/marketplace/${selectedId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'Developer Expert', // Fixed simulation or custom identifier
          rating: reviewRating,
          comment: reviewComment
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to publish review feedback.');
      }

      const newReview = await res.json();
      setReviews(prev => [newReview, ...prev]);
      setReviewComment('');
      
      // Reload parent information to update average star count on screen
      const reloadRes = await fetch(`/api/marketplace/${selectedId}`);
      if (reloadRes.ok) {
        const reloadData = await reloadRes.json();
        setSelectedItem(reloadData.item);
        // Refresh root list state to keep overall dashboard in-sync
        loadListings();
      }
    } catch (err: any) {
      setReviewError(err.message || String(err));
    } finally {
      setReviewSubmitting(false);
    }
  };

  // Core install pipeline action calling parent context
  const handleInstall = async (item: MarketplaceItem) => {
    try {
      // Increment download counter on API
      const dlRes = await fetch(`/api/marketplace/${item.id}/download`, { method: 'POST' });
      if (dlRes.ok) {
        const dlData = await dlRes.json();
        // Update local state views if matches
        if (selectedItem && selectedItem.id === item.id) {
          setSelectedItem(prev => prev ? { ...prev, downloadsCount: dlData.downloadsCount } : null);
        }
      }

      onInstallTemplate(
        item.graphSnapshot.name,
        item.graphSnapshot.nodes,
        item.graphSnapshot.connections
      );

      setToastMessage(text.installSuccess);
      setTimeout(() => setToastMessage(null), 4000);
      setSelectedId(null);
      setSelectedItem(null);
    } catch (err: any) {
      console.error(err);
    }
  };

  // Open Canvas publication dialog
  const handleOpenPublish = () => {
    setPubTitle(activeGraphSnapshot.name || '');
    setPubDesc('');
    setPubTags('');
    setPubError(null);
    setIsPublishOpen(true);
  };

  // Execute Canvas publication post requests
  const handlePublishSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPubError(null);

    if (!pubTitle.trim()) {
      setPubError(text.validationTitleRequired);
      return;
    }

    if (!activeGraphSnapshot.nodes || activeGraphSnapshot.nodes.length === 0) {
      setPubError(text.validationNodesRequired);
      return;
    }

    setPubSubmitting(true);
    try {
      const parsedTags = pubTags
        .split(',')
        .map(t => t.trim().toLowerCase())
        .filter(Boolean);

      const res = await fetch('/api/marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: pubTitle,
          description: pubDesc,
          category: pubCategory,
          graphSnapshot: activeGraphSnapshot,
          tags: parsedTags,
          authorId: 'user_anonymous'
        })
      });

      if (!res.ok) {
        const errPayload = await res.json();
        throw new Error(errPayload.error || 'Failed to publish blueprint.');
      }

      setIsPublishOpen(false);
      setToastMessage(text.publishSuccess);
      setTimeout(() => setToastMessage(null), 4000);
      loadListings(); // reload list
    } catch (err: any) {
      setPubError(err.message || String(err));
    } finally {
      setPubSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Toast Notification HUD */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-emerald-950/95 border border-emerald-500 rounded-2xl px-5 py-3.5 shadow-2xl flex items-center gap-3"
          >
            <CheckCircle className="text-emerald-400 w-5 h-5 shrink-0" />
            <div className="text-xs">
              <span className="font-extrabold text-white block">{toastMessage}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {!selectedId ? (
          /* ========================================================== */
          /* 1. MAIN MARKETPLACE LIST VIEW                              */
          /* ========================================================== */
          <motion.div 
            key="list-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-5"
          >
            {/* Header / Intro section with publish button */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-slate-950 p-5 rounded-2xl border border-slate-900 shadow-sm">
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  <ShoppingBag size={18} className="text-sky-400" />
                  {text.headerTitle}
                </h3>
                <p className="text-[11px] text-slate-400 tracking-normal max-w-xl leading-normal">{text.headerDesc}</p>
              </div>

              <button
                onClick={handleOpenPublish}
                className="cursor-pointer shrink-0 text-xs font-bold px-4 py-2.5 rounded-xl border border-sky-500/20 hover:border-sky-500/50 bg-sky-950/20 hover:bg-sky-950/40 text-sky-400 hover:text-sky-300 transition-all flex items-center gap-1.5"
              >
                <Plus size={14} />
                {text.publishBtn}
              </button>
            </div>

            {/* Filter Hub Toolbar */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center bg-slate-950/50 p-3 rounded-xl border border-slate-900/40">
              
              {/* Search Bar (Cols 1-5) */}
              <div className="relative sm:col-span-5 flex items-center">
                <Search size={14} className="absolute left-3.5 text-slate-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleSearchKeyPress}
                  placeholder={text.searchPlaceholder}
                  className="w-full bg-slate-950 border border-slate-900 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-sky-500/40"
                />
                {search && (
                  <button 
                    onClick={() => { setSearch(''); setTimeout(() => loadListings()); }}
                    className="absolute right-3.5 text-[10px] font-bold text-slate-500 hover:text-slate-300"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Category Filter Pills (Cols 6-12) */}
              <div className="sm:col-span-7 flex flex-wrap gap-1.5 justify-start sm:justify-end items-center">
                
                {/* Category selectors */}
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="bg-slate-950 border border-slate-900 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-sky-500/20 mr-1 max-w-[140px]"
                >
                  <option value="all">{text.categoryAll}</option>
                  <option value="agent">{text.categoryAgent}</option>
                  <option value="tool">{text.categoryTool}</option>
                  <option value="template">{text.categoryTemplate}</option>
                  <option value="rag-pipeline">{text.categoryRAG}</option>
                </select>

                {/* Sort Order select */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-slate-950 border border-slate-900 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-sky-500/20 mr-1 max-w-[140px]"
                >
                  <option value="popular">{text.sortPopular}</option>
                  <option value="newest">{text.sortNewest}</option>
                  <option value="rating">{text.sortRating}</option>
                </select>

                <button 
                  onClick={loadListings}
                  className="cursor-pointer bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs px-3.5 py-1.5 rounded-xl border border-slate-850 font-bold transition-all"
                >
                  Filter
                </button>
              </div>

            </div>

            {/* ERROR HANDLERS */}
            {error && (
              <div className="p-5 border border-rose-900/30 bg-rose-950/10 text-rose-400 rounded-2xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
                <div>
                  <h4 className="font-bold text-rose-300 shrink-0">Catalog Load Interrupted</h4>
                  <p className="text-xs mt-1">{error}</p>
                </div>
              </div>
            )}

            {/* Grid of Template Listings */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 space-y-3">
                <span className="w-8 h-8 rounded-full border-2 border-t-sky-400 border-slate-900 animate-spin"></span>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Loading Marketplace Hub...</span>
              </div>
            ) : items.length === 0 ? (
              <div className="p-12 border border-dashed border-slate-850 rounded-2xl flex flex-col items-center justify-center text-center bg-slate-950/20">
                <ShoppingBag size={28} className="text-slate-700 mb-2.5" />
                <p className="text-xs text-slate-400 font-bold max-w-sm">No listings found matching these specifications.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {items.map((item) => {
                  return (
                    <motion.div
                      layoutId={`item-card-${item.id}`}
                      key={item.id}
                      onClick={() => handleViewDetails(item.id)}
                      className="group cursor-pointer bg-slate-950 hover:bg-slate-900 rounded-2xl border border-slate-900 hover:border-slate-800 p-4.5 transition-all flex flex-col justify-between shadow-lg hover:shadow-2xl relative"
                    >
                      <div className="space-y-3.5 flex-1 pb-4">
                        {/* Title and category tag */}
                        <div className="flex justify-between items-start gap-2">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase inline-block border ${
                            item.category === 'agent' ? 'bg-indigo-950/60 text-indigo-400 border-indigo-900/40' :
                            item.category === 'tool' ? 'bg-amber-950/60 text-amber-400 border-amber-900/40' :
                            item.category === 'rag-pipeline' ? 'bg-teal-950/60 text-teal-400 border-teal-900/40' :
                            'bg-sky-950/60 text-sky-400 border-sky-900/40'
                          }`}>
                            {item.category}
                          </span>
                          
                          {/* Rating & Downloads */}
                          <div className="flex items-center gap-2 text-[9px] font-mono text-slate-500">
                            <span className="flex items-center gap-0.5 text-amber-450 font-bold">
                              <Star size={10} fill="currentColor" />
                              {item.rating}
                            </span>
                            <span className="flex items-center gap-0.5 font-bold">
                              <Download size={10} />
                              {item.downloadsCount}
                            </span>
                          </div>
                        </div>

                        {/* Text description */}
                        <div className="space-y-1.5 focus:outline-none">
                          <h4 className="font-bold text-slate-100 text-[13px] group-hover:text-sky-400 transition-colors line-clamp-1">{item.title}</h4>
                          <p className="text-[11px] text-slate-450 leading-relaxed line-clamp-2 leading-relaxed">{item.description}</p>
                        </div>

                        {/* Interactive schema size details */}
                        <div className="flex items-center gap-2.5 pt-1 font-mono text-[9px] text-slate-500">
                          <span className="bg-slate-900 px-1.5 py-0.5 rounded">
                            Nodes: {item.graphSnapshot.nodes?.length || 0}
                          </span>
                          <span className="bg-slate-900 px-1.5 py-0.5 rounded">
                            Edges: {item.graphSnapshot.connections?.length || 0}
                          </span>
                        </div>
                      </div>

                      {/* Footer tags list */}
                      <div className="border-t border-slate-900 pt-3 flex flex-wrap gap-1">
                        {item.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="text-[9px] font-mono text-slate-505 bg-slate-900/40 px-2 py-0.5 rounded border border-slate-900/20">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        ) : (
          /* ========================================================== */
          /* 2. BLUEPRINT DETAILS VIEW                                  */
          /* ========================================================== */
          <motion.div 
            key="details-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Back Nav and Install action */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between border-b border-slate-900 pb-4">
              <button
                onClick={() => { setSelectedId(null); setSelectedItem(null); }}
                className="cursor-pointer text-xs font-bold text-slate-400 hover:text-slate-100 flex items-center gap-1 bg-slate-950 px-3.5 py-1.5 rounded-xl border border-slate-850 leading-none"
              >
                &larr; {text.backBtn}
              </button>

              {selectedItem && (
                <button
                  onClick={() => handleInstall(selectedItem)}
                  className="cursor-pointer text-xs font-black uppercase py-2.5 px-4.5 bg-gradient-to-r from-sky-500 to-indigo-500 text-white rounded-xl shadow-lg hover:shadow-sky-500/20 active:translate-y-0.5 transition-all flex items-center gap-1.5 leading-none"
                >
                  <Download size={13} strokeWidth={2.5} />
                  {text.installBtn}
                </button>
              )}
            </div>

            {reviewsLoading || !selectedItem ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-3">
                <span className="w-8 h-8 rounded-full border-2 border-t-sky-400 border-slate-900 animate-spin"></span>
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Compiling Specifications...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Panel LHS: Main specifications and preview (Cols 1-7) */}
                <div className="lg:col-span-7 space-y-5">
                  <div className="bg-slate-950 p-6 rounded-2xl border border-slate-900 space-y-4">
                    
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 text-[8px] font-black uppercase inline-block border bg-indigo-950/40 text-indigo-400 border-indigo-900/40 rounded-full">
                        {selectedItem.category}
                      </span>
                      
                      <div className="flex items-center gap-3 text-xs font-mono text-slate-400 leading-none">
                        <span className="flex items-center gap-1 font-bold text-amber-450">
                          <Star size={12} fill="currentColor" /> {selectedItem.rating}
                        </span>
                        <span className="flex items-center gap-1 font-bold">
                          <Download size={12} /> {selectedItem.downloadsCount} {text.downloads}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <h3 className="text-lg font-black text-slate-100 tracking-tight leading-snug">{selectedItem.title}</h3>
                      <p className="text-xs text-slate-400 leading-relaxed font-normal whitespace-pre-wrap">{selectedItem.description}</p>
                    </div>

                    {/* Metadata summary grid */}
                    <div className="grid grid-cols-2 gap-4 border-t border-slate-900 pt-4 font-mono text-[10px] text-slate-500">
                      <div className="space-y-1">
                        <span className="block text-[8px] uppercase font-black text-slate-500 tracking-wider flex items-center gap-1">
                          <User size={10} />
                          {text.author}
                        </span>
                        <span className="text-slate-350 block font-bold truncate">@{selectedItem.authorId}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="block text-[8px] uppercase font-black text-slate-500 tracking-wider flex items-center gap-1">
                          <Calendar size={10} />
                          {text.created}
                        </span>
                        <span className="text-slate-350 block font-bold">{new Date(selectedItem.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                  </div>

                  {/* Interactive Diagram Preview representation of the flow nodes */}
                  <div className="bg-slate-950 p-5 rounded-2xl border border-slate-900 space-y-3.5">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <GitBranch size={13} className="text-sky-450" />
                      {text.previewTitle}
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-slate-900 text-slate-500 ml-auto border border-slate-850">
                        {text.readOnlyNode}
                      </span>
                    </h5>

                    {/* Graph Visualizer representation */}
                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-950 relative overflow-hidden min-h-[220px] max-h-[350px] overflow-y-auto space-y-2 text-xs font-mono select-none">
                      {selectedItem.graphSnapshot.nodes?.map((node, idx) => {
                        const iconColor = 
                          node.type === 'gemini' ? 'bg-indigo-950 text-indigo-400 border-indigo-900/60' :
                          node.type === 'tool' ? 'bg-rose-950 text-rose-400 border-rose-900/60' :
                          node.type === 'rag' ? 'bg-teal-950 text-teal-400 border-teal-900/60' :
                          'bg-slate-950 text-slate-450 border-slate-850';

                        return (
                          <div 
                            key={node.id} 
                            className={`p-3 bg-slate-950 rounded-xl border border-slate-850/60 shadow flex items-center gap-3 border-l-2 ${
                              node.type === 'gemini' ? 'border-l-indigo-500' :
                              node.type === 'tool' ? 'border-l-rose-500' :
                              node.type === 'rag' ? 'border-l-teal-500' :
                              'border-l-slate-400'
                            }`}
                          >
                            <span className="text-slate-500 text-[10px] font-bold">#{idx+1}</span>
                            <div>
                              <span className="font-extrabold text-slate-200 block text-[11px]">{node.title}</span>
                              <span className="text-[9px] text-slate-500 font-bold block bg-slate-900 px-1 rounded inline-block uppercase mt-0.5">{node.type}</span>
                            </div>
                            <span className="text-[10px] text-slate-450 italic line-clamp-1 max-w-[280px] ml-auto">{node.description || 'Core flow action node.'}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>

                {/* Panel RHS: Reviews Sandbox and submission comments layout (Cols 8-12) */}
                <div className="lg:col-span-5 space-y-5">
                  
                  {/* Rating Reviews list panel */}
                  <div className="bg-slate-950 p-5 rounded-2xl border border-slate-900 space-y-4">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest block border-b border-slate-900 pb-2">
                      {text.reviewsTitle}
                    </h5>

                    {reviews.length === 0 ? (
                      <p className="text-xs text-slate-505 italic text-center py-6">{text.noReviews}</p>
                    ) : (
                      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                        {reviews.map((rev) => (
                          <div key={rev.id} className="p-3 bg-slate-900/40 rounded-xl border border-slate-900 space-y-1.5 text-xs">
                            <div className="flex justify-between items-center text-[10px] font-mono leading-none">
                              <span className="text-slate-405 font-bold">@{rev.userId}</span>
                              <span className="flex items-center gap-0.5 text-amber-450">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star 
                                    key={i} 
                                    size={10} 
                                    fill={i < rev.rating ? "currentColor" : "none"} 
                                    className={i < rev.rating ? "text-amber-450" : "text-slate-705"} 
                                  />
                                ))}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-350 leading-relaxed font-normal whitespace-pre-wrap">{rev.comment}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Submission review feedback */}
                  <div className="bg-slate-950 p-5 rounded-2xl border border-slate-900 space-y-3.5">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                      {text.addReviewHeader}
                    </h5>

                    <form onSubmit={handleSubmitReview} className="space-y-3.5">
                      
                      {/* Rating Selector */}
                      <div className="space-y-1">
                        <label className="text-[9px] font-mono text-slate-500 uppercase font-black">{text.ratingLabel}</label>
                        <div className="flex gap-1">
                          {Array.from({ length: 5 }).map((_, i) => {
                            const starNum = i + 1;
                            return (
                              <button
                                type="button"
                                key={i}
                                onClick={() => setReviewRating(starNum)}
                                className="p-1 cursor-pointer text-slate-600 hover:text-amber-400 transition-colors"
                              >
                                <Star 
                                  size={16} 
                                  fill={starNum <= reviewRating ? "currentColor" : "none"} 
                                  className={starNum <= reviewRating ? "text-amber-450" : "text-slate-705"} 
                                />
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Comment text area input */}
                      <div className="space-y-1.5">
                        <textarea
                          placeholder={text.commentPlaceholder}
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          className="w-full text-xs bg-slate-900 border border-slate-900 focus:border-sky-505 rounded-xl px-2.5 py-2 h-20 text-slate-300 focus:outline-none placeholder-slate-650"
                        />
                      </div>

                      {reviewError && (
                        <p className="text-[10px] font-semibold text-rose-400 flex items-center gap-1">
                          <AlertCircle size={11} /> {reviewError}
                        </p>
                      )}

                      <button
                        type="submit"
                        disabled={reviewSubmitting || !reviewComment.trim()}
                        className="cursor-pointer w-full text-xs font-bold py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 rounded-xl border border-slate-850 text-slate-200 font-extrabold transition-all hover:border-slate-750"
                      >
                        {reviewSubmitting ? 'Evaluating...' : text.submitReview}
                      </button>

                    </form>
                  </div>

                </div>

              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================== */}
      /* 3. CANVAS BLUEPRINT PUBLISH DIALOG MODAL                  */
      /* ========================================================== */
      <AnimatePresence>
        {isPublishOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="px-6 py-4.5 border-b border-slate-850 flex justify-between items-center bg-slate-950">
                <span className="text-xs font-black text-slate-100 uppercase tracking-widest flex items-center gap-2">
                  <ShoppingBag size={14} className="text-sky-400" />
                  {text.publishTitle}
                </span>
                <button
                  type="button"
                  onClick={() => setIsPublishOpen(false)}
                  className="text-slate-400 hover:text-slate-100 font-bold transition-all p-1 text-lg leading-none cursor-pointer"
                >
                  &times;
                </button>
              </div>

              {/* Form Body layout */}
              <form onSubmit={handlePublishSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                <p className="text-[10px] text-slate-450 leading-relaxed font-semibold bg-slate-950/40 p-3 rounded-xl border border-slate-950 leading-normal">{text.publishHeaderDesc}</p>

                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono text-slate-500 uppercase block font-black">{text.formLabelTitle}</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Real-Time Customer Support agent"
                    value={pubTitle}
                    onChange={(e) => setPubTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-950 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-504 focus:ring-1 focus:ring-sky-505/10"
                  />
                </div>

                {/* Category select router */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono text-slate-500 uppercase block font-black">{text.formLabelCategory}</label>
                  <select
                    value={pubCategory}
                    onChange={(e) => setPubCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-950 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-504"
                  >
                    <option value="agent">{text.categoryAgent}</option>
                    <option value="tool">{text.categoryTool}</option>
                    <option value="template">{text.categoryTemplate}</option>
                    <option value="rag-pipeline">{text.categoryRAG}</option>
                  </select>
                </div>

                {/* Decription */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono text-slate-500 uppercase block font-black">{text.formLabelDesc}</label>
                  <textarea
                    required
                    placeholder="Explain what LLM prompt guidelines are configured in notes, models parameters utilized, and output formats."
                    value={pubDesc}
                    onChange={(e) => setPubDesc(e.target.value)}
                    className="w-full h-24 bg-slate-950 border border-slate-950 rounded-xl px-2.5 py-2 text-xs text-slate-220 leading-relaxed focus:outline-none focus:border-sky-504 placeholder-slate-650"
                  />
                </div>

                {/* Tags keyword */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono text-slate-500 uppercase block font-black">{text.formLabelTags}</label>
                  <input
                    type="text"
                    placeholder="chatbot, reasoning, custom-agent, prompt-injection"
                    value={pubTags}
                    onChange={(e) => setPubTags(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-950 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-504 focus:ring-1 focus:ring-sky-505/10 font-mono"
                  />
                </div>

                {pubError && (
                  <p className="text-[10px] text-rose-450 font-bold flex items-center gap-1 leading-none mt-1">
                    <AlertCircle size={11} /> {pubError}
                  </p>
                )}

                {/* Submit action */}
                <div className="pt-2 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsPublishOpen(false)}
                    className="text-xs font-bold px-4 py-2 bg-slate-955 hover:bg-slate-850 rounded-xl text-slate-350 cursor-pointer transition-colors"
                  >
                    {text.closeBtn}
                  </button>
                  <button
                    type="submit"
                    disabled={pubSubmitting}
                    className="cursor-pointer text-xs font-black uppercase py-2 px-4.5 bg-sky-505 hover:bg-sky-455 rounded-xl text-white transition-all shadow-lg shadow-sky-950/20"
                  >
                    {pubSubmitting ? 'Submitting Blueprint...' : 'Publish Snapshot'}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
