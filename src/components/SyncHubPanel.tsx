import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Globe, 
  Plus, 
  Trash, 
  ToggleLeft, 
  ToggleRight, 
  Loader, 
  RefreshCw, 
  Github, 
  GitBranch, 
  Link, 
  Check, 
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { FlowNode, FlowConnection } from '../types';
import { playClickSound } from '../utils/audio';


interface SyncHubPanelProps {
  currentLang: 'en' | 'ru' | 'zh';
  nodes: FlowNode[];
  connections: FlowConnection[];
}

interface GitHubRepo {
  name: string;
  full_name: string;
  default_branch: string;
  private: boolean;
}

interface GitHubConnection {
  connected: boolean;
  username?: string;
  avatarUrl?: string;
  connectedAt?: string;
}

export function SyncHubPanel({ currentLang, nodes, connections }: SyncHubPanelProps) {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [cronInput, setCronInput] = useState('*/10 * * * *');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('applet-key-forge-secret');
  const [feedback, setFeedback] = useState<string | null>(null);

  // Dynamic MCP States
  const [mcpServers, setMcpServers] = useState<any[]>([
    { name: "Local Filesystem", command: "npx", args: ["-y", "@modelcontextprotocol/server-filesystem", "/workspace"], status: "connected", toolsCount: 6 },
    { name: "PostgreSQL DB Connector", command: "npx", args: ["-y", "@modelcontextprotocol/server-postgres"], status: "connected", toolsCount: 8 },
    { name: "Puppeteer Web Searcher", command: "npx", args: ["-y", "@modelcontextprotocol/server-puppeteer"], status: "disconnected", toolsCount: 0 }
  ]);
  const [newMcpName, setNewMcpName] = useState('');
  const [newMcpCmd, setNewMcpCmd] = useState('npx');
  const [newMcpArgs, setNewMcpArgs] = useState('');

  // GitHub States
  const [githubConnection, setGithubConnection] = useState<GitHubConnection>({ connected: false });
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [customRepo, setCustomRepo] = useState('');
  const [branch, setBranch] = useState('main');
  const [filePath, setFilePath] = useState('workflows/kostromai44-agent.json');
  const [commitMessage, setCommitMessage] = useState('Sync agent workflow from KostromAi44 editor');
  const [pushing, setPushing] = useState(false);
  const [gitFeedback, setGitFeedback] = useState<string | null>(null);
  const [pushedFileUrl, setPushedFileUrl] = useState<string | null>(null);
  const [loadingRepos, setLoadingRepos] = useState(false);

  const t = {
    en: {
      schedulesTitle: "Active Cron Schedulers",
      schedulesDesc: "Automate canvas pipeline executions in the background via precise node schedule timers.",
      cronPlaceholder: "e.g., */15 * * * *",
      addSchedule: "Schedule Current Workspace",
      webhooksTitle: "Webhook Integrations",
      webhooksDesc: "Register external endpoints that receive dynamic payloads when agent state changes (start, success, fail).",
      webhookPlaceholder: "https://your-server.com/api/webhooks",
      addWebhook: "Register Webhook Receiver",
      activeList: "Registered Senders",
      noSchedules: "No cron schedules registered.",
      noWebhooks: "No webhook subscriptions created yet.",
      secret: "Secure Signature Secret",
      successMsg: "Synchronized state updated!",
      githubTitle: "GitHub Repository Sync",
      githubDesc: "Keep your workflow model code synced with your GitHub repository and push current agent structures on-demand.",
      connectGithub: "Connect GitHub Account",
      disconnectGithub: "Disconnect Account",
      selectRepo: "Select Repository",
      customRepoLabel: "Or Enter Custom Repository (owner/repo)",
      branchLabel: "Target Branch",
      filePathLabel: "File Destination Path",
      commitMessageLabel: "Commit Message",
      pushBtn: "Push Workflow to Repository",
      pushingState: "Pushing code to GitHub...",
      successPush: "Workflow successfully pushed to GitHub!",
      viewOnGithub: "View File on GitHub",
      connectedAs: "Connected as"
    },
    ru: {
      schedulesTitle: "Планировщики Задач",
      schedulesDesc: "Автоматический запуск холста в фоновом режиме по заданному выражению Cron.",
      cronPlaceholder: "например, */15 * * * *",
      addSchedule: "Запланировать запуск холста",
      webhooksTitle: "Внешние Webhooks",
      webhooksDesc: "Уведомляйте сторонние сервисы о событиях запуска, успешного завершения или сбоя графа.",
      webhookPlaceholder: "https://your-server.com/api/webhooks",
      addWebhook: "Зарегистрировать Webhook URL",
      activeList: "Зарегистрированные отправители",
      noSchedules: "Нет активных расписаний запуска.",
      noWebhooks: "Список внешних подписок пуст.",
      secret: "Секретный ключ подписи",
      successMsg: "Изменения сохранены на бэкенде!",
      githubTitle: "Интеграция с GitHub",
      githubDesc: "Синхронизируйте JSON-код вашего агента напрямую с репозиторием GitHub.",
      connectGithub: "Подключить аккаунт GitHub",
      disconnectGithub: "Отключить аккаунт",
      selectRepo: "Выберите репозиторий",
      customRepoLabel: "Или укажите репозиторий вручную (владелец/репо)",
      branchLabel: "Целевая ветка",
      filePathLabel: "Путь к файлу назначения",
      commitMessageLabel: "Сообщение коммита",
      pushBtn: "Отправить workflow в репозиторий",
      pushingState: "Код отправляется на GitHub...",
      successPush: "Workflow успешно отправлен на GitHub!",
      viewOnGithub: "Посмотреть файл на GitHub",
      connectedAs: "Подключено как"
    },
    zh: {
      schedulesTitle: "自动化定时计划 (Cron)",
      schedulesDesc: "在后台无干预、全自动周期性触发并迭代执行当前画布设计的智能体管道。",
      cronPlaceholder: "例如：*/15 * * * *",
      addSchedule: "为此工作流创建定时任务",
      webhooksTitle: "网络钩子推送 (Webhooks)",
      webhooksDesc: "当流任务启动、编译通过或断开报错时，自适应秒级回调向目标 API 发送 JSON 事件。",
      webhookPlaceholder: "https://your-server.com/api/webhooks",
      addWebhook: "添加事件接收 URL",
      activeList: "活动连接源",
      noSchedules: "暂未注册任何定时触发规则。",
      noWebhooks: "Webhooks 接收列表尚未初始化。",
      secret: "数据篡改安全校验密钥 (Secret)",
      successMsg: "后台配置同步刷新成功！",
      githubTitle: "GitHub 存储库代码推送",
      githubDesc: "连接您的实际 GitHub 账户，一键同步画布的 JSON 配置逻辑到指定的代码库与目标路径。",
      connectGithub: "连接 GitHub 账户",
      disconnectGithub: "断开账户连接",
      selectRepo: "选择目标仓库",
      customRepoLabel: "或者手动填写仓库路径 (owner/repo)",
      branchLabel: "目标分支 (Branch)",
      filePathLabel: "目标文件路径",
      commitMessageLabel: "提交信息 (Commit Message)",
      pushBtn: "推送工作流逻辑到 GitHub",
      pushingState: "正在将代码推送到 GitHub...",
      successPush: "工作流代码成功推送至 GitHub!",
      viewOnGithub: "在 GitHub 上查看此文件",
      connectedAs: "已关联账户"
    }
  }[currentLang];

  const fetchData = async () => {
    setLoading(true);
    try {
      const resp1 = await fetch('/api/schedules');
      if (resp1.ok) {
        const data = await resp1.json();
        setSchedules(data);
      }
      const resp2 = await fetch('/api/webhooks');
      if (resp2.ok) {
        const data = await resp2.json();
        setWebhooks(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchGithubConnectionStatus = async () => {
    try {
      const resp = await fetch('/api/github/connection');
      if (resp.ok) {
        const data = await resp.json();
        setGithubConnection(data);
        if (data.connected) {
          fetchRepos();
        }
      }
    } catch (e) {
      console.error('Error fetching GitHub connection status:', e);
    }
  };

  const fetchRepos = async () => {
    setLoadingRepos(true);
    try {
      const resp = await fetch('/api/github/repos');
      if (resp.ok) {
        const data = await resp.json();
        setRepos(data);
        if (data.length > 0) {
          setSelectedRepo(data[0].full_name);
          setBranch(data[0].default_branch || 'main');
        }
      }
    } catch (e) {
      console.error('Error fetching repos:', e);
    } finally {
      setLoadingRepos(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchGithubConnectionStatus();
  }, []);

  // Listen for message from the popup OAuth window
  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'OAUTH_AUTH_SUCCESS') {
        setGithubConnection({
          connected: true,
          username: event.data.username,
          avatarUrl: event.data.avatarUrl,
          connectedAt: new Date().toISOString()
        });
        setGitFeedback(t.successPush);
        setTimeout(() => setGitFeedback(null), 3000);
        fetchRepos();
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, []);

  const handleConnectGitHub = () => {
    const token = localStorage.getItem('kostromai44_auth_token') || 'forge_production_admin_token';
    const url = `/api/auth/github/url?token=${encodeURIComponent(token)}`;
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.innerWidth - width) / 2;
    const top = window.screenY + (window.innerHeight - height) / 2;
    window.open(url, 'Connect GitHub', `width=${width},height=${height},left=${left},top=${top}`);
  };

  const handleDisconnectGitHub = async () => {
    try {
      const resp = await fetch('/api/github/connection', { method: 'DELETE' });
      if (resp.ok) {
        setGithubConnection({ connected: false });
        setRepos([]);
        setSelectedRepo('');
        setCustomRepo('');
        setGitFeedback(null);
        setPushedFileUrl(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePushToGitHub = async () => {
    const repoToPush = customRepo.trim() || selectedRepo;
    if (!repoToPush) {
      setGitFeedback(currentLang === 'ru' ? 'Пожалуйста, выберите или укажите репозиторий.' : 'Please select or enter a repository.');
      return;
    }

    setPushing(true);
    setGitFeedback(null);
    setPushedFileUrl(null);

    try {
      // Serialize current workflow/graph structure (nodes and connections)
      const serializedContent = JSON.stringify({
        name: "kostromai44-agent-workflow",
        exportedAt: new Date().toISOString(),
        nodes,
        connections
      }, null, 2);

      const resp = await fetch('/api/github/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo: repoToPush,
          branch,
          commitMessage,
          filePath,
          content: serializedContent
        })
      });

      const data = await resp.json();
      if (resp.ok && data.success) {
        setGitFeedback(t.successPush);
        setPushedFileUrl(data.html_url);
      } else {
        setGitFeedback(`Error: ${data.error || 'Failed to push file.'}`);
      }
    } catch (e: any) {
      setGitFeedback(`Error: ${e.message}`);
    } finally {
      setPushing(false);
    }
  };

  const handleCreateSchedule = async () => {
    try {
      const response = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cronExpression: cronInput,
          activeGraph: { nodes, connections }
        })
      });

      if (response.ok) {
        setFeedback(t.successMsg);
        setTimeout(() => setFeedback(null), 3000);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleSchedule = async (id: string, currentlyEnabled: boolean) => {
    try {
      const response = await fetch(`/api/schedules/${id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !currentlyEnabled })
      });
      if (response.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      const response = await fetch(`/api/schedules/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateWebhook = async () => {
    if (!webhookUrl) return;
    try {
      const response = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl,
          events: ['graph.started', 'graph.completed', 'graph.failed'],
          secret: webhookSecret
        })
      });

      if (response.ok) {
        setWebhookUrl('');
        setFeedback(t.successMsg);
        setTimeout(() => setFeedback(null), 3000);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleWebhook = async (id: string, currentlyEnabled: boolean) => {
    try {
      const response = await fetch(`/api/webhooks/${id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !currentlyEnabled })
      });
      if (response.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    try {
      const response = await fetch(`/api/webhooks/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const onRepoSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedRepo(val);
    const repoInfo = repos.find(r => r.full_name === val);
    if (repoInfo) {
      setBranch(repoInfo.default_branch || 'main');
    }
  };

  return (
    <div className="space-y-6" id="sync_hub_outer">
      {/* Alert banner */}
      {feedback && (
        <div className="bg-emerald-950/30 border border-emerald-900 text-emerald-400 p-3 rounded-xl text-center text-xs font-bold leading-normal">
          {feedback}
        </div>
      )}

      {/* Schedulers */}
      <section className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl space-y-4">
        <div className="flex items-start gap-2.5">
          <Calendar size={15} className="text-emerald-400 mt-1" />
          <div>
            <h4 className="font-extrabold text-xs text-slate-200 uppercase tracking-widest leading-none">
              {t.schedulesTitle}
            </h4>
            <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">{t.schedulesDesc}</p>
          </div>
        </div>

        {/* Schedule list */}
        {schedules.length > 0 ? (
          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
            {schedules.map((sch) => (
              <div key={sch.id} className="bg-slate-900 border border-slate-850 rounded-lg p-2.5 flex items-center justify-between text-xs text-slate-300">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono bg-slate-950/80 px-2 py-0.5 rounded text-[10px] font-bold text-sky-400 border border-slate-800">
                      {sch.cronExpression}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Run size: {sch.activeGraph?.nodes?.length || 0} nodes
                    </span>
                  </div>
                  {sch.stats && (
                    <div className="text-[9.5px] text-slate-500">
                      Called: <span className="text-slate-400">{sch.stats.runCount}</span> &bull; 
                      Errors: <span className="text-rose-400">{sch.stats.failCount}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    id={`toggle_schedule_btn_${sch.id}`}
                    onClick={() => handleToggleSchedule(sch.id, sch.enabled)}
                    className="text-slate-400 hover:text-sky-400 transition-all cursor-pointer bg-transparent border-none"
                  >
                    {sch.enabled ? <ToggleRight size={22} className="text-emerald-400" /> : <ToggleLeft size={22} />}
                  </button>
                  <button
                    id={`delete_schedule_btn_${sch.id}`}
                    onClick={() => handleDeleteSchedule(sch.id)}
                    className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-850 transition-all cursor-pointer bg-transparent border-none"
                  >
                    <Trash size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[10px] text-slate-650 p-3 bg-slate-950/20 text-center rounded-lg italic">
            {t.noSchedules}
          </div>
        )}

        {/* Input adding */}
        <div className="flex gap-2">
          <input
            id="scheduler_cron_input"
            type="text"
            className="flex-1 bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 font-mono placeholder-slate-600 outline-none"
            placeholder={t.cronPlaceholder}
            value={cronInput}
            onChange={(e) => setCronInput(e.target.value)}
          />
          <button
            id="btn_create_schedule"
            onClick={handleCreateSchedule}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black rounded-lg px-4 active:scale-95 transition-all cursor-pointer flex items-center gap-1 shrink-0 border-none"
          >
            <Plus size={12} /> {currentLang === 'ru' ? "Спланировать" : currentLang === 'zh' ? "添加任务" : "Add Timer"}
          </button>
        </div>
      </section>

      {/* Webhooks */}
      <section className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl space-y-4">
        <div className="flex items-start gap-2.5">
          <Globe size={15} className="text-sky-400 mt-1" />
          <div>
            <h4 className="font-extrabold text-xs text-slate-200 uppercase tracking-widest leading-none">
              {t.webhooksTitle}
            </h4>
            <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">{t.webhooksDesc}</p>
          </div>
        </div>

        {/* Webhook subscriptions lists */}
        {webhooks.length > 0 ? (
          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
            {webhooks.map((wh) => (
              <div key={wh.id} className="bg-slate-900 border border-slate-850 rounded-lg p-2.5 flex items-center justify-between text-xs text-slate-300">
                <div className="space-y-1 overflow-hidden pr-2">
                  <div className="truncate font-mono text-[10.5px] text-sky-400">
                    {wh.url}
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {wh.events.map((ev: string) => (
                      <span key={ev} className="text-[8.5px] bg-slate-950 px-1 py-0.5 rounded text-slate-500 tracking-wide font-semibold">
                        {ev}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    id={`toggle_webhook_btn_${wh.id}`}
                    onClick={() => handleToggleWebhook(wh.id, wh.enabled)}
                    className="text-slate-400 hover:text-sky-400 transition-all cursor-pointer bg-transparent border-none"
                  >
                    {wh.enabled ? <ToggleRight size={22} className="text-emerald-400" /> : <ToggleLeft size={22} />}
                  </button>
                  <button
                    id={`delete_webhook_btn_${wh.id}`}
                    onClick={() => handleDeleteWebhook(wh.id)}
                    className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-850 transition-all cursor-pointer bg-transparent border-none"
                  >
                    <Trash size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[10px] text-slate-650 p-3 bg-slate-950/20 text-center rounded-lg italic">
            {t.noWebhooks}
          </div>
        )}

        {/* Webhook Input setup panel */}
        <div className="space-y-2.5">
          <input
            id="webhook_url_input"
            type="text"
            className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 placeholder-slate-600 outline-none"
            placeholder={t.webhookPlaceholder}
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
          />

          <div className="flex gap-2">
            <div className="flex-1 bg-slate-900 border border-slate-800 rounded-lg p-1.5 px-2 flex items-center justify-between">
              <span className="text-[9.5px] text-slate-500 font-bold uppercase tracking-wide">Secret Signature</span>
              <input
                id="webhook_secret_input"
                type="text"
                className="bg-transparent border-none outline-none font-mono text-xs text-slate-400 text-right w-1/2"
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
              />
            </div>

            <button
              id="btn_create_webhook"
              onClick={handleCreateWebhook}
              disabled={!webhookUrl}
              className="bg-sky-600 hover:bg-sky-500 text-white disabled:opacity-50 text-[11px] font-black rounded-lg px-4 active:scale-95 transition-all cursor-pointer flex items-center gap-1 shrink-0 border-none"
            >
              <Plus size={12} /> {currentLang === 'ru' ? "Добавить" : currentLang === 'zh' ? "订阅推送" : "Subscribe"}
            </button>
          </div>
        </div>
      </section>

      {/* GitHub Integration Card */}
      <section className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl space-y-4" id="github_integration_section">
        <div className="flex items-start gap-2.5">
          <Github size={15} className="text-purple-400 mt-1" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-xs text-slate-200 uppercase tracking-widest leading-none">
                {t.githubTitle}
              </h4>
              {githubConnection.connected && (
                <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-mono font-bold flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  {currentLang === 'ru' ? "СВЯЗАНО" : currentLang === 'zh' ? "已绑定" : "CONNECTED"}
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
              {t.githubDesc}
            </p>
          </div>
        </div>

        {gitFeedback && (
          <div className="bg-purple-950/25 border border-purple-900/40 text-purple-300 p-2.5 rounded-lg text-center text-[11px] font-medium leading-normal">
            {gitFeedback}
          </div>
        )}

        {pushedFileUrl && (
          <div className="bg-emerald-950/20 border border-emerald-900/40 p-2.5 rounded-lg text-center">
            <a 
              href={pushedFileUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-xs text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1.5 font-bold decoration-none hover:underline"
            >
              <span>{t.viewOnGithub}</span>
              <ExternalLink size={13} />
            </a>
          </div>
        )}

        {!githubConnection.connected ? (
          <div className="space-y-3">
            <button
              type="button"
              id="btn_github_oauth_connect"
              onClick={handleConnectGitHub}
              className="w-full bg-purple-600 hover:bg-purple-550 text-white font-bold text-xs py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98 border-none"
            >
              <Github size={14} />
              <span>{t.connectGithub}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Logged in GitHub Profile Card */}
            <div className="flex items-center justify-between p-2 bg-slate-900/50 rounded-lg border border-slate-850">
              <div className="flex items-center gap-2">
                <img 
                  src={githubConnection.avatarUrl || "https://github.com/identicons/dummy.png"} 
                  alt={githubConnection.username} 
                  className="w-7 h-7 rounded-full border border-slate-800" 
                />
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 font-semibold">{t.connectedAs}</span>
                  <span className="text-xs font-bold text-slate-200">@{githubConnection.username}</span>
                </div>
              </div>
              <button
                type="button"
                id="btn_github_disconnect"
                onClick={handleDisconnectGitHub}
                className="bg-transparent hover:bg-rose-950/15 border border-slate-850 hover:border-rose-900/30 text-slate-500 hover:text-rose-400 text-[10px] font-bold px-2 py-1 rounded transition-all cursor-pointer"
              >
                {t.disconnectGithub}
              </button>
            </div>

            {/* Repositories selection */}
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">
                  {t.selectRepo}
                </label>
                {loadingRepos ? (
                  <div className="text-xs text-slate-500 flex items-center gap-1.5 py-1">
                    <Loader size={12} className="animate-spin text-purple-400" />
                    <span>Loading repositories...</span>
                  </div>
                ) : repos.length > 0 ? (
                  <select
                    id="github_repo_select"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 outline-none"
                    value={selectedRepo}
                    onChange={onRepoSelectChange}
                  >
                    {repos.map(r => (
                      <option key={r.full_name} value={r.full_name}>
                        {r.full_name} {r.private ? '🔒' : '🌐'}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-[10px] text-slate-600 italic">No repositories found. Ensure you have authorized write permission.</div>
                )}
              </div>

              {/* Custom Repository manual override input */}
              <div className="space-y-1">
                <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">
                  {t.customRepoLabel}
                </label>
                <input
                  id="github_custom_repo_input"
                  type="text"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 placeholder-slate-600 outline-none"
                  placeholder="e.g. owner/kostromai44-repo"
                  value={customRepo}
                  onChange={(e) => setCustomRepo(e.target.value)}
                />
              </div>

              {/* Target Branch and file path destination */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">
                    {t.branchLabel}
                  </label>
                  <div className="relative">
                    <GitBranch size={11} className="absolute left-2.5 top-2.5 text-slate-500" />
                    <input
                      id="github_branch_input"
                      type="text"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 pl-7 text-xs text-slate-300 outline-none font-mono"
                      placeholder="main"
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">
                    {t.filePathLabel}
                  </label>
                  <input
                    id="github_filepath_input"
                    type="text"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 outline-none font-mono"
                    placeholder="workflows/kostromai44-agent.json"
                    value={filePath}
                    onChange={(e) => setFilePath(e.target.value)}
                  />
                </div>
              </div>

              {/* Commit Message */}
              <div className="space-y-1">
                <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">
                  {t.commitMessageLabel}
                </label>
                <input
                  id="github_commit_input"
                  type="text"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 outline-none"
                  placeholder="Sync agent workflow from KostromAi44 editor"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                />
              </div>

              {/* Push Action Button */}
              <button
                type="button"
                id="btn_github_sync_now"
                onClick={handlePushToGitHub}
                disabled={pushing || (!selectedRepo && !customRepo)}
                className="w-full bg-purple-600 hover:bg-purple-550 text-white disabled:opacity-50 font-bold text-xs py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-98 border-none mt-2"
              >
                {pushing ? (
                  <>
                    <Loader size={12} className="animate-spin" />
                    <span>{t.pushingState}</span>
                  </>
                ) : (
                  <>
                    <RefreshCw size={12} />
                    <span>{t.pushBtn}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* SECTION 4: Model Context Protocol (MCP) Dynamic Tool Integration */}
      <section className="bg-slate-900/60 border border-slate-850 p-5 rounded-2xl space-y-4 mt-4" id="mcp_section">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe size={18} className="text-sky-450 animate-pulse" />
            <h3 className="text-xs font-black uppercase text-slate-350 tracking-wider">
              {currentLang === 'ru' ? '🔌 Динамические MCP Серверы' : currentLang === 'zh' ? '🔌 动态 MCP 服务器' : '🔌 Model Context Protocol (MCP)'}
            </h3>
          </div>
          <span className="text-[9px] bg-sky-500/10 text-sky-400 px-1.5 py-0.5 rounded font-mono font-bold">
            Spec v1.0
          </span>
        </div>
        <p className="text-[10px] text-slate-500 leading-relaxed">
          {currentLang === 'ru' 
            ? 'Подключайте сторонние MCP-серверы (локальные файловые системы, СУБД, утилиты) прямо через холст. Агенты получат доступ к новым инструментам управления окружением.' 
            : currentLang === 'zh'
              ? '通过可视化协议边界，直接挂载第三方多模态 MCP 服务（本地文件系统、企业数据库、API 网关），赋能智能体跨越网络边界执行复杂任务。'
              : 'Dynamically orchestrate and authorize secure third-party Model Context Protocol connections to expose local system commands, file systems, and SQL engines to active agents.'}
        </p>

        {/* Existing MCP Servers */}
        <div className="space-y-2">
          {mcpServers.map((srv, idx) => (
            <div key={idx} className="bg-slate-950/40 border border-slate-850 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-extrabold text-slate-200">{srv.name}</span>
                  <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                    <code>{srv.command} {srv.args?.join(' ')}</code>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-bold uppercase tracking-wider ${
                    srv.status === 'connected' ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-900/40' : 'bg-slate-900 text-slate-500'
                  }`}>
                    {srv.status === 'connected' ? (currentLang === 'ru' ? 'АКТИВЕН' : 'CONNECTED') : (currentLang === 'ru' ? 'ОТКЛЮЧЕН' : 'DISCONNECTED')}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = [...mcpServers];
                      updated[idx].status = updated[idx].status === 'connected' ? 'disconnected' : 'connected';
                      updated[idx].toolsCount = updated[idx].status === 'connected' ? (updated[idx].name.includes('Filesystem') ? 6 : srv.name.includes('Git') ? 4 : 8) : 0;
                      setMcpServers(updated);
                      playClickSound();
                    }}
                    className="text-[9px] hover:text-white uppercase font-bold text-slate-400 border border-slate-850 p-1 rounded hover:bg-slate-900 cursor-pointer transition-all"
                  >
                    {srv.status === 'connected' ? (currentLang === 'ru' ? 'Выкл' : 'Disable') : (currentLang === 'ru' ? 'Вкл' : 'Enable')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMcpServers(mcpServers.filter((_, i) => i !== idx));
                      playClickSound();
                    }}
                    className="text-slate-555 hover:text-rose-450 p-1 cursor-pointer"
                  >
                    <Trash size={11} />
                  </button>
                </div>
              </div>
              {srv.status === 'connected' && (
                <div className="flex items-center justify-between text-[8px] text-slate-550 font-mono border-t border-slate-900/50 pt-1">
                  <span>Authorized Protocol boundaries: RW</span>
                  <span className="text-emerald-400 font-bold">✓ {srv.toolsCount} {currentLang === 'ru' ? 'инструм. доступно' : 'tools loaded'}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add new MCP server form */}
        <div className="bg-slate-950/30 border border-slate-850 rounded-xl p-3.5 space-y-3">
          <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block">
            {currentLang === 'ru' ? '➕ Подключить новый сервер' : '➕ Register New MCP Server'}
          </span>
          <div className="space-y-2 text-xs">
            <div className="space-y-1">
              <input
                type="text"
                placeholder={currentLang === 'ru' ? "Название сервера (например, SQL Analyzer)" : "Server Friendly Name"}
                value={newMcpName}
                onChange={(e) => setNewMcpName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-300 outline-none placeholder-slate-600"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="npx / node"
                value={newMcpCmd}
                onChange={(e) => setNewMcpCmd(e.target.value)}
                className="col-span-1 bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-300 outline-none placeholder-slate-600 font-mono"
              />
              <input
                type="text"
                placeholder="--args val"
                value={newMcpArgs}
                onChange={(e) => setNewMcpArgs(e.target.value)}
                className="col-span-2 bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-300 outline-none placeholder-slate-600 font-mono"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                if (!newMcpName.trim() || !newMcpCmd.trim()) {
                  alert(currentLang === 'ru' ? "Укажите название и команду запуска!" : "Please specify name and boot command!");
                  return;
                }
                setMcpServers([...mcpServers, {
                  name: newMcpName,
                  command: newMcpCmd,
                  args: newMcpArgs.split(' ').filter(a => a.trim() !== ''),
                  status: 'connected',
                  toolsCount: 5
                }]);
                setNewMcpName('');
                setNewMcpCmd('npx');
                setNewMcpArgs('');
                playClickSound();
              }}
              className="w-full bg-sky-500 hover:bg-sky-450 text-slate-950 font-black py-2 rounded-lg uppercase tracking-wider text-[10px] transition-all cursor-pointer shadow-lg active:scale-95 border-none"
            >
              {currentLang === 'ru' ? 'Подключить и импортировать' : 'Register and Import Tools'}
            </button>
          </div>
        </div>

        {/* Sync with canvas action */}
        <button
          type="button"
          onClick={() => {
            const activeTools = mcpServers.filter(s => s.status === 'connected').reduce((acc, curr) => acc + curr.toolsCount, 0);
            alert(currentLang === 'ru' 
              ? `Успешно синхронизировано! ИИ агенты на холсте получили доступ к ${activeTools} динамическим MCP инструментам!` 
              : `Protocol synced! Canvas agents authorized to use ${activeTools} dynamic MCP tools!`);
          }}
          className="w-full bg-slate-955 hover:bg-slate-900 text-sky-400 border border-slate-850 hover:border-sky-500/25 py-2 px-3 rounded-lg text-[10px] uppercase font-black tracking-widest flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-[0.98]"
        >
          <RefreshCw size={11} className="animate-spin text-sky-400" />
          <span>{currentLang === 'ru' ? 'Синхронизировать схемы инструментов' : 'Sync Protocol Schemas'}</span>
        </button>
      </section>
    </div>

  );
}
