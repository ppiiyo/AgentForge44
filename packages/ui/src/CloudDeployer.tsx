import React, { useState, useEffect, useRef } from 'react';
import { 
  Globe, 
  Terminal, 
  Trash2, 
  ExternalLink, 
  BookOpen, 
  Sparkles, 
  ShieldAlert, 
  CheckCircle, 
  AlertCircle, 
  Plus, 
  Key, 
  Sliders, 
  Loader2, 
  RefreshCcw,
  SlidersHorizontal,
  FileCode,
  Lock,
  Compass
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Deployment {
  id: string;
  graphId: string;
  graphName: string;
  provider: 'vercel' | 'railway' | 'fly';
  status: 'provisioning' | 'active' | 'failed' | 'undeployed';
  url: string;
  createdAt: string;
  config: {
    region: string;
    envVariables: Record<string, string>;
    apiKeyAuth: boolean;
    rateLimit: number;
  };
  logs: string[];
}

interface CloudDeployerProps {
  graphId: string;
  graphName: string;
  currentLang?: 'en' | 'ru' | 'zh';
  activeSnapshot: { name: string; nodes: any[]; connections: any[] };
}

const REGIONS_MAP = {
  vercel: [
    { value: 'sfo1', label: 'US West (San Francisco, sfo1)' },
    { value: 'iad1', label: 'US East (Washington DC, iad1)' },
    { value: 'cdg1', label: 'Europe West (Paris, cdg1)' },
    { value: 'hnd1', label: 'Asia East (Tokyo, hnd1)' }
  ],
  railway: [
    { value: 'us-west', label: 'US West (Oregon)' },
    { value: 'us-east', label: 'US East (Virginia)' },
    { value: 'eu-fortress', label: 'Europe (Frankfurt)' }
  ],
  fly: [
    { value: 'lax', label: 'Los Angeles, USA (lax)' },
    { value: 'ams', label: 'Amsterdam, Netherlands (ams)' },
    { value: 'nrt', label: 'Tokyo, Japan (nrt)' }
  ]
};

const TRANSLATIONS = {
  en: {
    title: 'Cloud Edge Deployments',
    desc: 'Deploy your active agent graph workflow as a production-ready Web Server REST API endpoint with rate-limiting and bearer-token credentials.',
    emptyState: 'No active cloud deployments for this workspace.',
    deployBtn: 'Host Graph as Web API',
    providerLabel: 'Choose Cloud Host provider',
    regionLabel: 'Target Deployment Region',
    authLabel: 'Enable Bearer Key Authentication Protection',
    authDesc: 'Blocks requests unless a valid authorization header is present.',
    apiKeyPlaceholder: 'Custom AGENTFORGE_API_KEY (leave empty to generate)',
    rateLimitLabel: 'Rate Limiter (Requests per Minute)',
    rateLimitDesc: 'Protects endpoint against high concurrency spikes. Put 0 for unlimited.',
    deployingHeader: 'Provisioning Production Endpoint...',
    urlLabel: 'Endpoint Host URI',
    activeStatus: 'ACTIVE',
    undeployConfirm: 'Undeploy Server instance?',
    logsHeader: 'Server Compilation & Deployment Pipeline logs',
    openDocsBtn: 'API Swagger Docs',
    logsBtn: 'Inspect Run Logs',
    undeployBtn: 'Undeploy API',
    docsTitle: 'Interactive API Endpoint specifications',
    docsDesc: 'Post triggers or webhooks to execute your graph logic remotely. Fully CORS-friendly!',
    backBtn: 'Back to Registry',
    provVercelDesc: 'Serverless deployment using Vercel serverless microservices.',
    provRailwayDesc: 'Docker containers hosting with nixpacks engine.',
    provFlyDesc: 'Direct MicroVM hypervisor deployment on regional servers.',
    apiTokenNote: 'Note: Provide provider token in API Settings, or use our pre-configured playground pipeline credentials.',
    openApiSpecs: 'OpenAPI Specification Descriptor'
  },
  ru: {
    title: 'Деплоймент в облако',
    desc: 'Задеплойте свой активный граф как готовый к продакшну REST API сервер с рейт-лимитами и авторизацией по токенам.',
    emptyState: 'Нет активных деплоев для этого графа.',
    deployBtn: 'Задеплоить граф как Web API',
    providerLabel: 'Выберите облачного провайдера',
    regionLabel: 'Регион хостинга',
    authLabel: 'Защитить запросы токеном Bearer',
    authDesc: 'Будет блокировать все внешние POST запросы без заголовка Authorization.',
    apiKeyPlaceholder: 'Свой AGENTFORGE_API_KEY (или сгенерировать)',
    rateLimitLabel: 'Рейт-лимитер (Запросов в минуту)',
    rateLimitDesc: 'Защита от спама и перегрузок. Установите 0 для отключения.',
    deployingHeader: 'Подготовка и инициализация инстанса...',
    urlLabel: 'Адрес хостинга API',
    activeStatus: 'РАБОТАЕТ',
    undeployConfirm: 'Удалить этот сервер безвозвратно?',
    logsHeader: 'Журнал логов сборки контейнера в реальном времени',
    openDocsBtn: 'Документация API',
    logsBtn: 'Логи инстанса',
    undeployBtn: 'Остановить API',
    docsTitle: 'Интерактивная спецификация API эндпоинта',
    docsDesc: 'Отправляйте POST запросы из кода для выполнения логики графа на удаленном сервере.',
    backBtn: 'Назад к списку',
    provVercelDesc: 'Бессерверное развертывание с использованием функций Vercel Serverless.',
    provRailwayDesc: 'Легковесные докер-контейнеры через движок сборки Nixpacks.',
    provFlyDesc: 'Запуск виртуальных машин MicroVM напрямую в дата-центрах.',
    apiTokenNote: 'Примечание: Укажите токен провайдера в настройках или используйте наш демонстрационный аккаунт.',
    openApiSpecs: 'Интерактивная OpenAPI спецификация'
  },
  zh: {
    title: '云端一键部署 (Web API)',
    desc: '将当前画布流打包部署为高并发独立托管 API 服务器，包含流量防暴击限流器及 Bearer 密匙身份认证。',
    emptyState: '当前画布项目暂无运行中的云端 API 实例。',
    deployBtn: '一键部署为独立 OpenAPI REST 节点',
    providerLabel: '选择目标云平台服务商',
    regionLabel: '部署地理区域 / 机房',
    authLabel: '启用安全秘钥鉴权保障 (Bearer Token)',
    authDesc: '不匹配正确的 Bearer Token 将拦截调用以防他人耗尽额度。',
    apiKeyPlaceholder: '输入指定 API 秘钥 (留空将自动产生)',
    rateLimitLabel: '限流门槛速率控制 (每分钟调用次数上限)',
    rateLimitDesc: '有效防御野蛮并发刷单。填 0 开启无上限模式。',
    deployingHeader: '正为您打包微服务并部署到云服务器...',
    urlLabel: '生产环境 API 接口地址',
    activeStatus: '正常托管中',
    undeployConfirm: '确定下线该云节点吗？这将终止一切正在进行的外部调用。',
    logsHeader: '云主控编译环境与镜像拉取日志终端',
    openDocsBtn: 'API 交互文档',
    logsBtn: '监控运行日志',
    undeployBtn: '下线该云服务',
    docsTitle: '拓扑应用对外互联集成终端手册',
    docsDesc: '通过标准的 JSON 调用把您的节点逻辑整合进任何生产业务。完美支持跨域集成！',
    backBtn: '返回部署大厅',
    provVercelDesc: '适用于超省流量的无服务器边缘节点 (Vercel Core Serverless)',
    provRailwayDesc: '全自动高可用虚拟容器云 (Railway Click-To-Deploy Nixpacks)',
    provFlyDesc: '部署在距离终端用户最近的边缘微型虚拟机硬件 (Fly.io Cloud MicroVM)',
    apiTokenNote: '提示：您可以在系统设置中填入您私有的部署令牌。当前版本为您默认提供体验虚拟账号。',
    openApiSpecs: 'OpenAPI 拓扑网络互连参数表'
  }
};

export const CloudDeployer: React.FC<CloudDeployerProps> = ({
  graphId,
  graphName,
  currentLang = 'en',
  activeSnapshot
}) => {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  // Form selections
  const [provider, setProvider] = useState<'vercel' | 'railway' | 'fly'>('vercel');
  const [region, setRegion] = useState('sfo1');
  const [apiKeyAuth, setApiKeyAuth] = useState(true);
  const [customKey, setCustomKey] = useState('');
  const [rateLimit, setRateLimit] = useState(60);
  const [deploying, setDeploying] = useState(false);
  const [currentDepId, setCurrentDepId] = useState<string | null>(null);

  // Detail monitors
  const [logsOpenFor, setLogsOpenFor] = useState<string | null>(null);
  const [logsList, setLogsList] = useState<string[]>([]);
  const [docsOpenFor, setDocsOpenFor] = useState<string | null>(null);
  
  const text = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Sync default region based on provider choice
    if (provider === 'vercel') setRegion('sfo1');
    else if (provider === 'railway') setRegion('us-west');
    else if (provider === 'fly') setRegion('lax');
  }, [provider]);

  const loadDeployments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/deploy/list?graphId=${graphId}`);
      if (res.ok) {
        const data = await res.json();
        setDeployments(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeployments();
  }, [graphId]);

  // Polling logs for active deployment if inspecting
  useEffect(() => {
    if (!logsOpenFor) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/deploy/${logsOpenFor}/logs`);
        if (res.ok) {
          const logs = await res.json();
          setLogsList(logs);
          // Auto scroll to latest logs
          if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
          }
        }
      } catch (err) {
        console.error(err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [logsOpenFor]);

  // Polling provisioning deployments state to refresh UI automatically
  useEffect(() => {
    const hasProvisioning = deployments.some(d => d.status === 'provisioning');
    if (!hasProvisioning) return;

    const interval = setInterval(() => {
      loadDeployments();
    }, 3000);

    return () => clearInterval(interval);
  }, [deployments]);

  const handleStartDeploy = async () => {
    try {
      setDeploying(true);
      const generatedKey = customKey.trim() || `af_key_${Math.random().toString(36).substring(2, 10)}`;
      const payload = {
        graphId,
        graphName,
        provider,
        config: {
          region,
          rateLimit,
          apiKeyAuth,
          envVariables: {
            AGENTFORGE_API_KEY: generatedKey
          }
        }
      };

      const res = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const newDep = await res.json();
        setDeployments(prev => [newDep, ...prev]);
        setFormOpen(false);
        // Open live log window for immediate feedback
        setLogsOpenFor(newDep.id);
        setLogsList(newDep.logs || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeploying(false);
    }
  };

  const handleUndeploy = async (id: string) => {
    if (!window.confirm(text.undeployConfirm)) return;
    try {
      const res = await fetch(`/api/deploy/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadDeployments();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-5">
      
      {/* ------------------------------------------------------------- */}
      {/* 1. DOCUMENTATION DIALOG MODAL                                 */}
      {/* ------------------------------------------------------------- */}
      <AnimatePresence>
        {docsOpenFor && (() => {
          const dep = deployments.find(d => d.id === docsOpenFor);
          if (!dep) return null;
          const keyAuth = dep.config.envVariables?.AGENTFORGE_API_KEY || 'af_key_demo_secret';

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
              >
                {/* Modal Header */}
                <div className="px-6 py-4.5 border-b border-slate-850 flex justify-between items-center bg-slate-950">
                  <span className="text-xs font-black text-slate-100 uppercase tracking-widest flex items-center gap-2">
                    <Compass size={14} className="text-sky-450" />
                    {text.docsTitle}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDocsOpenFor(null)}
                    className="text-slate-400 hover:text-slate-100 font-bold transition-all p-1 text-lg leading-none cursor-pointer"
                  >
                    &times;
                  </button>
                </div>

                {/* Specs Body Layout with Tabbed code block endpoints */}
                <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-300">
                  <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-950/40 p-3 rounded-xl border border-slate-950">
                    {text.docsDesc}
                  </p>

                  <div className="space-y-1.5 font-mono">
                    <span className="text-[9px] uppercase font-black text-slate-500 block">{text.urlLabel}</span>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-950/20 text-sky-400 block font-bold select-all break-all text-left">
                      <span className="bg-sky-950 text-sky-300 font-extrabold px-1.5 py-0.5 rounded text-[9px] uppercase mr-2.5">POST</span>
                      {dep.url}/api/run
                    </div>
                  </div>

                  {/* Header Params */}
                  {dep.config.apiKeyAuth && (
                    <div className="space-y-1.5 font-mono bg-slate-950 p-4 rounded-xl border border-slate-900">
                      <span className="text-[9px] uppercase font-black text-rose-450 block flex items-center gap-1">
                        <Lock size={10} />
                        Authorization Bearer Credentials Require
                      </span>
                      <p className="text-[10px] text-slate-400 leading-relaxed">This endpoint is locked. Include this header with all API requests:</p>
                      <pre className="p-2.5 bg-slate-900 rounded-lg text-[10px] text-amber-400 select-all border border-slate-850">
                        Authorization: Bearer {keyAuth}
                      </pre>
                    </div>
                  )}

                  {/* Request Payload Fields schema parameters dynamically aligned with Node count */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-black uppercase text-slate-450 tracking-wider block border-b border-slate-850 pb-1">
                      {text.openApiSpecs}
                    </span>

                    <table className="w-full text-left font-mono text-[10px] text-slate-400">
                      <thead>
                        <tr className="border-b border-slate-850 text-slate-500 uppercase text-[9px]">
                          <th className="pb-2">Field</th>
                          <th className="pb-2">Type</th>
                          <th className="pb-2">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-slate-900">
                          <td className="py-2.5 text-slate-200 font-bold">prompt</td>
                          <td className="py-2.5 text-indigo-400">string</td>
                          <td className="py-2.5 text-slate-450">LLM System query override prompt or routing seed message.</td>
                        </tr>
                        <tr className="border-b border-slate-900">
                          <td className="py-2.5 text-slate-200 font-bold">variables</td>
                          <td className="py-2.5 text-emerald-400">object</td>
                          <td className="py-2.5 text-slate-450">Custom runtime mapping (dictionary of key-value items).</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 text-slate-200 font-bold">context_docs</td>
                          <td className="py-2.5 text-teal-400">array[string]</td>
                          <td className="py-2.5 text-slate-450">Temporary knowledge inject documents (optional seed lists).</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Interactive cURL template snippet */}
                  <div className="space-y-1.5 font-mono">
                    <span className="text-[9px] uppercase font-black text-slate-500 block flex items-center gap-1.5">
                      <FileCode size={11} />
                      Executable bash / Shell cURL Sandbox
                    </span>
                    <pre className="p-3.5 bg-slate-950 rounded-xl text-[10px] text-slate-350 overflow-x-auto select-all border border-slate-950 leading-relaxed text-left">
                      {`curl -X POST "${dep.url}/api/run" \\
  -H "Content-Type: application/json" ${dep.config.apiKeyAuth ? `\\\n  -H "Authorization: Bearer ${keyAuth}"` : ''} \\
  -d '{
    "prompt": "Tell me a joke",
    "variables": { "user_tier": "pro_partner" }
  }'`}
                    </pre>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 border-t border-slate-850 flex justify-end bg-slate-950">
                  <button
                    onClick={() => setDocsOpenFor(null)}
                    className="text-xs font-bold px-4 py-2 bg-slate-900 hover:bg-slate-800 rounded-xl text-slate-300 cursor-pointer"
                  >
                    Dismiss Spec
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* ------------------------------------------------------------- */}
      {/* 2. LIVE COMPILE & SERVICE SETUP TERMINAL DIALOG               */}
      {/* ------------------------------------------------------------- */}
      <AnimatePresence>
        {logsOpenFor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            >
              {/* Modal Header */}
              <div className="px-6 py-4.5 border-b border-slate-850 flex justify-between items-center bg-slate-950">
                <span className="text-xs font-black text-slate-100 uppercase tracking-widest flex items-center gap-2">
                  <Terminal size={14} className="text-emerald-450" />
                  {text.logsHeader}
                </span>
                <button
                  type="button"
                  onClick={() => { setLogsOpenFor(null); setLogsList([]); loadDeployments(); }}
                  className="text-slate-400 hover:text-slate-100 font-bold transition-all p-1 text-lg leading-none cursor-pointer"
                >
                  &times;
                </button>
              </div>

              {/* Terminal Logs Viewport */}
              <div 
                ref={terminalRef}
                className="bg-slate-950 p-5 font-mono text-xs text-slate-300 h-96 overflow-y-auto border-b border-slate-850 space-y-2 select-all text-left"
              >
                {logsList.length === 0 ? (
                  <p className="text-slate-500 italic flex items-center gap-1.5 py-4">
                    <Loader2 size={12} className="animate-spin text-sky-400" />
                    Opening interface pipeline log streams...
                  </p>
                ) : (
                  logsList.map((log, idx) => {
                    const isErr = log.toLowerCase().includes('error') || log.toLowerCase().includes('fail');
                    const isSys = log.startsWith('[system]') || log.startsWith('[cloud-agent]');
                    return (
                      <div 
                        key={idx} 
                        className={`leading-normal tracking-wide py-0.5 ${
                          isErr ? 'text-rose-400 font-semibold' :
                          isSys ? 'text-sky-450' : 'text-slate-300'
                        }`}
                      >
                        {log}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 flex justify-between items-center bg-slate-950">
                <span className="text-[10px] font-mono text-slate-500 uppercase flex items-center gap-1.5">
                  <Loader2 size={11} className="animate-spin text-emerald-400" />
                  Remote logs streaming online
                </span>
                <button
                  onClick={() => { setLogsOpenFor(null); setLogsList([]); loadDeployments(); }}
                  className="text-xs font-bold px-4 py-2 bg-slate-900 hover:bg-slate-850 rounded-xl text-slate-200 cursor-pointer"
                >
                  {text.backBtn}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ------------------------------------------------------------- */}
      {/* 3. NEW DEPLOYMENT CONFIGURATION FORM                          */}
      {/* ------------------------------------------------------------- */}
      <AnimatePresence>
        {formOpen && (
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
                  <Globe size={14} className="text-sky-400 animate-pulse" />
                  {text.deployBtn}
                </span>
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="text-slate-400 hover:text-slate-100 font-bold transition-all p-1 text-lg leading-none cursor-pointer"
                >
                  &times;
                </button>
              </div>

              {/* Form Scrollable Content */}
              <div className="p-6 overflow-y-auto space-y-4">
                <p className="text-[10px] text-slate-450 leading-relaxed font-semibold bg-slate-950/40 p-3 rounded-xl border border-slate-950 leading-normal">
                  {text.desc}
                </p>

                {/* Cloud Provider Select Grid */}
                <div className="space-y-2">
                  <label className="text-[9px] font-mono text-slate-500 uppercase font-black block">{text.providerLabel}</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'vercel', label: 'Vercel', color: 'border-indigo-505', textClass: 'text-indigo-400', desc: text.provVercelDesc },
                      { id: 'railway', label: 'Railway', color: 'border-pink-505', textClass: 'text-pink-450', desc: text.provRailwayDesc },
                      { id: 'fly', label: 'Fly.io', color: 'border-violet-505', textClass: 'text-violet-400', desc: text.provFlyDesc }
                    ].map(provOpt => {
                      const isSelected = provider === provOpt.id;
                      return (
                        <button
                          key={provOpt.id}
                          type="button"
                          onClick={() => setProvider(provOpt.id as any)}
                          className={`cursor-pointer p-3 rounded-2xl border text-left flex flex-col justify-between h-20 transition-all ${
                            isSelected 
                              ? 'bg-slate-950 border-sky-500/80 ring-1 ring-sky-500/10' 
                              : 'bg-slate-950/30 border-slate-900 hover:border-slate-800'
                          }`}
                        >
                          <span className={`text-[12px] font-black ${provOpt.textClass}`}>{provOpt.label}</span>
                          <span className="text-[8px] text-slate-500 leading-normal line-clamp-2">{provOpt.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Region Select */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono text-slate-500 uppercase font-black block">{text.regionLabel}</label>
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-950 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-504"
                  >
                    {REGIONS_MAP[provider].map(regOpt => (
                      <option key={regOpt.value} value={regOpt.value}>{regOpt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Authorization Switch */}
                <div className="space-y-2 p-3.5 bg-slate-950/40 border border-slate-950 px-4 rounded-xl">
                  <div className="flex justify-between items-center">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-black text-slate-200 block flex items-center gap-1">
                        <Key size={11} className="text-amber-450" />
                        {text.authLabel}
                      </span>
                      <span className="text-[8px] text-slate-500 block leading-normal">{text.authDesc}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={apiKeyAuth}
                      onChange={(e) => setApiKeyAuth(e.target.checked)}
                      className="cursor-pointer accent-sky-500 h-4.5 w-4.5"
                    />
                  </div>

                  {apiKeyAuth && (
                    <div className="pt-2">
                      <input
                        type="text"
                        value={customKey}
                        onChange={(e) => setCustomKey(e.target.value)}
                        placeholder={text.apiKeyPlaceholder}
                        className="w-full bg-slate-950 border border-slate-900 rounded-lg p-1.5 text-[10px] text-slate-300 placeholder-slate-650 focus:outline-none focus:border-sky-505/20 font-mono"
                      />
                    </div>
                  )}
                </div>

                {/* Rate limit Slider */}
                <div className="space-y-1.5 p-3.5 bg-slate-950/40 border border-slate-950 px-4 rounded-xl">
                  <div className="flex justify-between items-center text-[10px] font-black">
                    <span className="text-slate-200 flex items-center gap-1">
                      <Sliders size={11} className="text-indigo-400" />
                      {text.rateLimitLabel}
                    </span>
                    <span className="text-sky-400 font-mono">{rateLimit} rpm</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    step="10"
                    value={rateLimit}
                    onChange={(e) => setRateLimit(Number(e.target.value))}
                    className="w-full accent-sky-500 h-1 cursor-pointer"
                  />
                  <span className="text-[8px] text-slate-500 block leading-normal mt-1">{text.rateLimitDesc}</span>
                </div>

                {/* Notice text */}
                <p className="text-[9px] text-slate-500 italic leading-normal text-center">
                  {text.apiTokenNote}
                </p>
              </div>

              {/* Form Buttons */}
              <div className="px-6 py-4.5 border-t border-slate-850 flex justify-end gap-2.5 bg-slate-950">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="text-xs font-bold px-4 py-2 bg-slate-900 hover:bg-slate-800 rounded-xl text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStartDeploy}
                  disabled={deploying}
                  className="cursor-pointer text-xs font-black uppercase py-2 px-4.5 bg-sky-550 hover:bg-sky-450 disabled:opacity-40 rounded-xl text-white transition-all shadow-lg flex items-center gap-1.5"
                >
                  {deploying ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      Uploading Bundle...
                    </>
                  ) : (
                    <>
                      <Globe size={13} />
                      {text.deployBtn}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ------------------------------------------------------------- */}
      {/* 4. PRIMARY VIEW LIST OF ACTIVE DEPLOYMENTS                    */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-slate-950 p-5 rounded-2xl border border-slate-900 shadow-sm">
        <div className="space-y-1">
          <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <Globe size={18} className="text-sky-450" />
            {text.title}
          </h3>
          <p className="text-[11px] text-slate-400 tracking-normal max-w-xl leading-normal">{text.desc}</p>
        </div>

        <button
          onClick={() => setFormOpen(true)}
          className="cursor-pointer shrink-0 text-xs font-bold px-4 py-2.5 rounded-xl border border-sky-500/20 hover:border-sky-500/50 bg-sky-950/20 hover:bg-sky-950/40 text-sky-400 hover:text-sky-300 transition-all flex items-center gap-1.5"
        >
          <Plus size={14} />
          {text.deployBtn}
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <span className="w-8 h-8 rounded-full border-2 border-t-sky-400 border-slate-900 animate-spin"></span>
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Syncing deployment catalog...</span>
        </div>
      ) : deployments.length === 0 ? (
        <div className="p-12 border border-dashed border-slate-850 rounded-2xl flex flex-col items-center justify-center text-center bg-slate-950/20">
          <Globe size={28} className="text-slate-700 mb-2.5" />
          <p className="text-xs text-slate-400 font-bold max-w-sm">{text.emptyState}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {deployments.map(dep => {
            const isProv = dep.status === 'provisioning';
            return (
              <motion.div
                key={dep.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 bg-slate-950 rounded-2xl border border-slate-900 hover:border-slate-850 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all"
              >
                
                {/* Details text alignment */}
                <div className="space-y-2.5 flex-1 min-w-0 text-left">
                  
                  {/* Status header badge */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[8px] font-black uppercase text-white bg-slate-900 px-2 py-0.5 border border-slate-800 rounded">
                      {dep.provider}
                    </span>
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      dep.status === 'active' ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-900/30' :
                      dep.status === 'provisioning' ? 'bg-sky-950/70 text-sky-400 border border-sky-900/30' :
                      dep.status === 'undeployed' ? 'bg-slate-900 text-slate-500 border border-slate-800' :
                      'bg-rose-950/70 text-rose-450 border border-rose-900/30'
                    }`}>
                      {isProv ? <Loader2 size={9} className="animate-spin" /> : null}
                      {dep.status.toUpperCase()}
                    </span>
                    
                    <span className="text-[9px] font-mono text-slate-500 ml-1">
                      Created: {new Date(dep.createdAt).toLocaleString()}
                    </span>
                  </div>

                  {/* Title & endpoint clicker link */}
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-[13px] text-slate-100 flex items-center gap-1.5">
                      {dep.graphName}
                      <span className="text-[9px] text-slate-550 font-normal">({dep.config.region})</span>
                    </h4>

                    {dep.status === 'active' && (
                      <a 
                        href={`${dep.url}/api/run`}
                        target="_blank" 
                        rel="noreferrer"
                        className="text-[11px] font-mono text-sky-400 hover:text-sky-305 flex items-center gap-1 group block truncate select-all decoration-dotted hover:underline text-left"
                      >
                        {dep.url}/api/run
                        <ExternalLink size={10} className="text-slate-550 group-hover:text-sky-400 transition-colors" />
                      </a>
                    )}
                  </div>

                  {/* Settings characteristics indicator tags */}
                  <div className="flex flex-wrap gap-2 pt-1 font-mono text-[9px] text-slate-500">
                    <span className="bg-slate-900 px-1.5 py-0.5 rounded">
                      Auth: {dep.config.apiKeyAuth ? 'Bearer Guard Key' : 'None'}
                    </span>
                    <span className="bg-slate-900 px-1.5 py-0.5 rounded">
                      Rate Limit: {dep.config.rateLimit > 0 ? `${dep.config.rateLimit}/min` : 'Infinite'}
                    </span>
                  </div>

                </div>

                {/* Interactive Tool Actions */}
                <div className="flex flex-wrap items-center gap-1.5 shrink-0 w-full md:w-auto justify-end">
                  
                  {/* Logs */}
                  <button
                    onClick={() => { setLogsOpenFor(dep.id); setLogsList(dep.logs || []); }}
                    className="cursor-pointer text-xs font-bold px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-350 hover:text-slate-100 rounded-xl border border-slate-850/60 flex items-center gap-1 transition-all"
                  >
                    <Terminal size={12} />
                    {text.logsBtn}
                  </button>

                  {/* Interactive Swagger Docs (only for Active) */}
                  {dep.status === 'active' && (
                    <button
                      onClick={() => setDocsOpenFor(dep.id)}
                      className="cursor-pointer text-xs font-bold px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-350 hover:text-slate-100 rounded-xl border border-slate-850/60 flex items-center gap-1 transition-all"
                    >
                      <BookOpen size={12} className="text-sky-400" />
                      {text.openDocsBtn}
                    </button>
                  )}

                  {/* Stop / Delete endpoints (unless already offlined) */}
                  {dep.status !== 'undeployed' && (
                    <button
                      onClick={() => handleUndeploy(dep.id)}
                      className="cursor-pointer text-xs font-bold p-2 bg-slate-900 hover:bg-rose-950/20 hover:border-rose-900/40 border border-slate-850/60 rounded-xl text-slate-505 hover:text-rose-400 transition-all flex items-center gap-1"
                      title={text.undeployBtn}
                    >
                      <Trash2 size={12} />
                    </button>
                  )}

                </div>

              </motion.div>
            );
          })}
        </div>
      )}

    </div>
  );
};
