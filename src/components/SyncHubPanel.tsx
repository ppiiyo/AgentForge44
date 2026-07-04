import React, { useState, useEffect } from 'react';
import { Calendar, Globe, Plus, Trash, ToggleLeft, ToggleRight, Loader, RefreshCw, Layers, ShieldAlert, Github, GitBranch, Link, Check, Play, AlertCircle } from 'lucide-react';
import { FlowNode, FlowConnection } from '../types';

interface SyncHubPanelProps {
  currentLang: 'en' | 'ru' | 'zh';
  nodes: FlowNode[];
  connections: FlowConnection[];
}

export function SyncHubPanel({ currentLang, nodes, connections }: SyncHubPanelProps) {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [cronInput, setCronInput] = useState('*/10 * * * *');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('applet-key-forge-secret');
  const [feedback, setFeedback] = useState<string | null>(null);

  // GitHub States
  const [gitRepoUrl, setGitRepoUrl] = useState('');
  const [gitBranch, setGitBranch] = useState('main');
  const [gitAutoDeploy, setGitAutoDeploy] = useState(true);
  const [gitConfig, setGitConfig] = useState<any>(null);
  const [gitSyncing, setGitSyncing] = useState(false);
  const [gitFeedback, setGitFeedback] = useState<string | null>(null);

  const fetchGitConfig = async () => {
    try {
      const resp = await fetch('/api/github/config');
      if (resp.ok) {
        const data = await resp.json();
        setGitConfig(data);
        if (data.linked) {
          setGitRepoUrl(data.repoUrl);
          setGitBranch(data.branch);
          setGitAutoDeploy(data.autoDeploy);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLinkGit = async () => {
    if (!gitRepoUrl.trim()) return;
    try {
      const response = await fetch('/api/github/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoUrl: gitRepoUrl,
          branch: gitBranch,
          autoDeploy: gitAutoDeploy
        })
      });
      if (response.ok) {
        setGitFeedback("GitHub repository linked successfully!");
        setTimeout(() => setGitFeedback(null), 3000);
        fetchGitConfig();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUnlinkGit = async () => {
    try {
      const response = await fetch('/api/github/unlink', {
        method: 'POST'
      });
      if (response.ok) {
        setGitFeedback("GitHub repository unlinked.");
        setTimeout(() => setGitFeedback(null), 3000);
        setGitRepoUrl('');
        setGitBranch('main');
        setGitAutoDeploy(true);
        fetchGitConfig();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSyncGit = async () => {
    setGitSyncing(true);
    try {
      const response = await fetch('/api/github/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes, connections })
      });
      if (response.ok) {
        setGitFeedback("Code synchronization initiated...");
        setTimeout(() => setGitFeedback(null), 3000);
        
        let count = 0;
        const interval = setInterval(async () => {
          await fetchGitConfig();
          count++;
          if (count >= 4) {
            clearInterval(interval);
            setGitSyncing(false);
          }
        }, 500);
      } else {
        setGitSyncing(false);
      }
    } catch (err) {
      console.error(err);
      setGitSyncing(false);
    }
  };

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
      successMsg: "Synchronized state updated!"
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
      successMsg: "Изменения сохранены на бэкенде!"
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
      successMsg: "后台配置同步刷新成功！"
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

  useEffect(() => {
    fetchData();
    fetchGitConfig();
  }, []);

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

  return (
    <div className="space-y-6" id="sync_hub_outer">
      {/* Alert banner */}
      {feedback && (
        <div className="bg-emerald-950/30 border border-emerald-900 text-emerald-450 p-3 rounded-xl text-center text-xs font-bold leading-normal">
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
                      Errors: <span className="text-rose-450">{sch.stats.failCount}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    id={`toggle_schedule_btn_${sch.id}`}
                    onClick={() => handleToggleSchedule(sch.id, sch.enabled)}
                    className="text-slate-400 hover:text-sky-400 transition-all cursor-pointer"
                  >
                    {sch.enabled ? <ToggleRight size={22} className="text-emerald-400" /> : <ToggleLeft size={22} />}
                  </button>
                  <button
                    id={`delete_schedule_btn_${sch.id}`}
                    onClick={() => handleDeleteSchedule(sch.id)}
                    className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-850 transition-all cursor-pointer"
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
            className="bg-emerald-600 hover:bg-emerald-555 text-white text-[11px] font-black rounded-lg px-4 active:scale-95 transition-all cursor-pointer flex items-center gap-1 shrink-0"
          >
            <Plus size={12} /> {currentLang === 'ru' ? "Спланировать" : currentLang === 'zh' ? "添加任务" : "Add Timer"}
          </button>
        </div>
      </section>

      {/* Webhooks */}
      <section className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl space-y-4">
        <div className="flex items-start gap-2.5">
          <Globe size={15} className="text-sky-450 mt-1" />
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
                    className="text-slate-400 hover:text-sky-400 transition-all cursor-pointer"
                  >
                    {wh.enabled ? <ToggleRight size={22} className="text-emerald-400" /> : <ToggleLeft size={22} />}
                  </button>
                  <button
                    id={`delete_webhook_btn_${wh.id}`}
                    onClick={() => handleDeleteWebhook(wh.id)}
                    className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-850 transition-all cursor-pointer"
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
              className="bg-sky-600 hover:bg-sky-555 text-white disabled:opacity-50 text-[11px] font-black rounded-lg px-4 active:scale-95 transition-all cursor-pointer flex items-center gap-1 shrink-0"
            >
              <Plus size={12} /> {currentLang === 'ru' ? "Добавить" : currentLang === 'zh' ? "订阅推送" : "Subscribe"}
            </button>
          </div>
        </div>
      </section>

      {/* GitHub Integration Card */}
      <section className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl space-y-4" id="github_integration_section">
        <div className="flex items-start gap-2.5">
          <Github size={15} className="text-purple-400 mt-1 animate-pulse" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-xs text-slate-200 uppercase tracking-widest leading-none">
                {currentLang === 'ru' ? "Интеграция с GitHub" : currentLang === 'zh' ? "GitHub 仓库持续集成" : "GitHub Repository Sync"}
              </h4>
              {gitConfig?.linked && (
                <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-mono font-bold flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  {currentLang === 'ru' ? "СВЯЗАНО" : currentLang === 'zh' ? "已绑定" : "LINKED"}
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
              {currentLang === 'ru' 
                ? "Синхронизируйте код проекта напрямую с репозиторием GitHub и запускайте автоматическое развертывание." 
                : currentLang === 'zh' 
                  ? "将当前 KostromAi44 设计的工作流代码一键推送到您的 GitHub 存储库，配置自动部署策略与版本触发。" 
                  : "Keep your workflow model code synced with your GitHub repository and trigger automatic web/container deployments."}
            </p>
          </div>
        </div>

        {gitFeedback && (
          <div className="bg-purple-950/20 border border-purple-900/40 text-purple-300 p-2.5 rounded-lg text-center text-[11px] font-medium leading-normal animate-in fade-in duration-200">
            {gitFeedback}
          </div>
        )}

        {!gitConfig?.linked ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Repository (owner/repo)</label>
                <input
                  id="github_repo_input"
                  type="text"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 placeholder-slate-600 outline-none"
                  placeholder="e.g. owner/kostromai44-project"
                  value={gitRepoUrl}
                  onChange={(e) => setGitRepoUrl(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Target Branch</label>
                <div className="relative">
                  <GitBranch size={12} className="absolute left-2.5 top-2.5 text-slate-500" />
                  <input
                    id="github_branch_input"
                    type="text"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 pl-7 text-xs text-slate-300 outline-none"
                    placeholder="main"
                    value={gitBranch}
                    onChange={(e) => setGitBranch(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-2 bg-slate-900/50 rounded-lg border border-slate-850">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-300">
                  {currentLang === 'ru' ? "Автоматическое развертывание" : currentLang === 'zh' ? "触发自动化构建部署" : "Automated Deployment Trigger"}
                </span>
                <span className="text-[9px] text-slate-500 mt-0.5">
                  {currentLang === 'ru' ? "Запускать сборку на Cloud Run при синхронизации" : "Rebuild Cloud Run container instances on push sync"}
                </span>
              </div>
              <button
                type="button"
                id="btn_git_toggle_autodeploy"
                onClick={() => setGitAutoDeploy(!gitAutoDeploy)}
                className="text-slate-400 hover:text-purple-400 transition-all cursor-pointer"
              >
                {gitAutoDeploy ? <ToggleRight size={22} className="text-purple-400" /> : <ToggleLeft size={22} />}
              </button>
            </div>

            <button
              type="button"
              id="btn_github_link_repo"
              onClick={handleLinkGit}
              disabled={!gitRepoUrl}
              className="w-full bg-purple-600 hover:bg-purple-550 disabled:opacity-40 text-white font-bold text-xs py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-98"
            >
              <Link size={12} />
              {currentLang === 'ru' ? "Связать Репозиторий" : currentLang === 'zh' ? "绑定 GitHub 仓库" : "Link Repository"}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-slate-900 border border-slate-850 rounded-lg p-3 space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                <div>
                  <span className="text-[9px] text-slate-500 font-extrabold block uppercase tracking-wider">Linked Repository</span>
                  <span className="text-xs text-slate-200 font-mono font-semibold">{gitConfig.repoUrl}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 font-extrabold block uppercase tracking-wider text-right">Branch</span>
                  <span className="text-xs text-purple-400 font-mono font-bold flex items-center justify-end gap-1">
                    <GitBranch size={11} /> {gitConfig.branch}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  {currentLang === 'ru' ? "Автодеплой:" : currentLang === 'zh' ? "持续部署触发:" : "Continuous Deployment:"}
                </span>
                <span className={`font-mono text-[10px] font-bold ${gitConfig.autoDeploy ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {gitConfig.autoDeploy ? 'ENABLED' : 'DISABLED'}
                </span>
              </div>

              {gitConfig.lastSyncedAt && (
                <div className="text-[10px] text-slate-500 flex items-center justify-between border-t border-slate-850/55 pt-2">
                  <span>Last Code Sync:</span>
                  <span className="font-mono text-slate-400">{new Date(gitConfig.lastSyncedAt).toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Sync Console Output logs */}
            {gitConfig.syncLogs && gitConfig.syncLogs.length > 0 && (
              <div className="bg-slate-950/80 border border-slate-900 p-2.5 rounded-lg max-h-32 overflow-y-auto font-mono text-[9px] text-slate-400 space-y-1">
                <span className="text-[8px] font-bold text-slate-500 block uppercase mb-1 tracking-wider">Sync Syncing Pipeline Console</span>
                {gitConfig.syncLogs.map((log: string, idx: number) => (
                  <div key={idx} className="leading-normal border-l border-slate-800 pl-1.5">
                    {log}
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                id="btn_github_sync_now"
                onClick={handleSyncGit}
                disabled={gitSyncing}
                className="flex-1 bg-purple-600 hover:bg-purple-550 text-white disabled:opacity-50 font-bold text-xs py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-98"
              >
                {gitSyncing ? <Loader size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                {currentLang === 'ru' ? "Синхронизировать сейчас" : currentLang === 'zh' ? "开始代码同步" : "Sync Code Now"}
              </button>
              <button
                type="button"
                id="btn_github_unlink"
                onClick={handleUnlinkGit}
                className="bg-slate-950 hover:bg-rose-950/15 border border-slate-850 hover:border-rose-900 text-slate-400 hover:text-rose-400 font-bold text-xs px-3.5 rounded-lg transition-all cursor-pointer active:scale-98"
                title="Unlink Repository"
              >
                Unlink
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
