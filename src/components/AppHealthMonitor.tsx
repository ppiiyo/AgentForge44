import React, { useEffect, useState } from 'react';
import { Database, Zap, ShieldAlert, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

interface AppHealthMonitorProps {
  currentLang: 'en' | 'ru' | 'zh';
}

interface HealthCheckResult {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  checks: {
    database: {
      status: 'ok' | 'error';
      latency?: number;
    };
    redis: {
      status: 'up' | 'down' | 'disabled';
      latency?: number;
    };
    providers?: Record<string, { status: string; latency?: number }>;
  };
}

export const AppHealthMonitor: React.FC<AppHealthMonitorProps> = ({ currentLang }) => {
  const [health, setHealth] = useState<HealthCheckResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data: HealthCheckResult = await res.json();
        setHealth(data);
        setError(false);
      } else {
        setError(true);
      }
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000); // Check every 15 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    if (loading && !health) return 'bg-slate-500';
    if (error) return 'bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]';
    if (!health) return 'bg-slate-500';

    if (health.status === 'ok') {
      return 'bg-emerald-500 animate-[pulse_2s_infinite] shadow-[0_0_8px_rgba(16,185,129,0.5)]';
    } else {
      return 'bg-amber-500 animate-[pulse_2s_infinite] shadow-[0_0_8px_rgba(245,158,11,0.5)]';
    }
  };

  const getStatusLabel = () => {
    if (loading && !health) return currentLang === 'ru' ? 'Загрузка...' : currentLang === 'zh' ? '检测中...' : 'Checking...';
    if (error) return currentLang === 'ru' ? 'ОФФЛАЙН' : currentLang === 'zh' ? '离线' : 'OFFLINE';
    if (!health) return '';

    if (health.status === 'ok') {
      return currentLang === 'ru' ? 'ОНЛАЙН' : currentLang === 'zh' ? '在线' : 'ONLINE';
    } else {
      return currentLang === 'ru' ? 'ДЕГРАДАЦИЯ' : currentLang === 'zh' ? '降级' : 'DEGRADED';
    }
  };

  const getTooltipContent = () => {
    if (error || !health) {
      return (
        <div className="space-y-1 text-rose-400">
          <div className="flex items-center gap-1.5 font-bold text-[10px]">
            <ShieldAlert size={12} />
            <span>{currentLang === 'ru' ? 'Сервер недоступен' : currentLang === 'zh' ? '服务未就绪' : 'Server Unreachable'}</span>
          </div>
          <p className="text-[9px] text-slate-400">
            {currentLang === 'ru' ? 'Не удалось связаться с оркестратором API.' : currentLang === 'zh' ? '无法连接到 API 业务网关。' : 'Failed to establish connection to the API orchestrator.'}
          </p>
        </div>
      );
    }

    const { database, redis } = health.checks;
    return (
      <div className="space-y-2.5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            {currentLang === 'ru' ? 'Здоровье Системы' : currentLang === 'zh' ? '微服务可用性' : 'Service Topology'}
          </span>
          <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-black ${
            health.status === 'ok' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
          }`}>
            {health.status.toUpperCase()}
          </span>
        </div>

        {/* Database Status */}
        <div className="flex items-center justify-between gap-4 text-[10px]">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Database size={11} className={database.status === 'ok' ? 'text-emerald-400' : 'text-rose-400'} />
            <span className="font-bold">Database (SQLite/PG)</span>
          </div>
          <div className="flex items-center gap-1">
            {database.status === 'ok' ? (
              <>
                <CheckCircle2 size={11} className="text-emerald-400" />
                <span className="font-mono text-[9px] text-slate-400">({database.latency ?? 0}ms)</span>
              </>
            ) : (
              <AlertTriangle size={11} className="text-rose-400" />
            )}
          </div>
        </div>

        {/* Redis Status */}
        <div className="flex items-center justify-between gap-4 text-[10px]">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Zap size={11} className={redis.status === 'up' ? 'text-emerald-400' : redis.status === 'disabled' ? 'text-slate-500' : 'text-rose-400'} />
            <span className="font-bold">Cache (Redis)</span>
          </div>
          <div className="flex items-center gap-1">
            {redis.status === 'up' ? (
              <>
                <CheckCircle2 size={11} className="text-emerald-400" />
                <span className="font-mono text-[9px] text-slate-400">({redis.latency ?? 0}ms)</span>
              </>
            ) : redis.status === 'disabled' ? (
              <span className="text-[9px] text-slate-500 uppercase font-mono">disabled</span>
            ) : (
              <AlertTriangle size={11} className="text-amber-400 animate-pulse" />
            )}
          </div>
        </div>

        {/* LLM Providers */}
        {health.checks.providers && (
          <div className="border-t border-slate-900 pt-2.5 mt-2.5 space-y-2">
            <span className="text-[8.5px] text-slate-500 font-extrabold uppercase tracking-wider block">
              {currentLang === 'ru' ? 'LLM ПРОВАЙДЕРЫ' : currentLang === 'zh' ? '大模型连接' : 'LLM Providers'}
            </span>
            {Object.entries(health.checks.providers).map(([name, val]) => {
              const prov = val as { status: string; latency?: number };
              return (
                <div key={name} className="flex items-center justify-between gap-4 text-[10px]">
                  <span className="capitalize text-slate-400 font-bold font-mono">{name}</span>
                  <div className="flex items-center gap-1 font-mono text-[9.5px]">
                    {prov.status === 'ok' ? (
                      <span className="text-emerald-400 font-extrabold flex items-center gap-0.5">
                        ● ONLINE {prov.latency !== undefined ? `(${prov.latency}ms)` : ''}
                      </span>
                    ) : prov.status === 'sandbox' ? (
                      <span className="text-sky-400 font-extrabold">SANDBOX</span>
                    ) : prov.status === 'missing' ? (
                      <span className="text-slate-600 font-extrabold">MISSING</span>
                    ) : prov.status === 'invalid_key' ? (
                      <span className="text-rose-450 font-extrabold">INVALID KEY</span>
                    ) : (
                      <span className="text-rose-500 font-extrabold animate-pulse">OFFLINE</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div 
      className="relative flex items-center"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      id="app-health-monitor-indicator"
    >
      <div className="flex items-center gap-1.5 bg-slate-950/50 hover:bg-slate-950/85 px-2 py-1 rounded-lg border border-slate-800/80 cursor-pointer transition-all">
        <span className={`h-2 w-2 rounded-full ${getStatusColor()}`} />
        <span className="text-[9px] font-black font-mono text-slate-400 uppercase tracking-wider">
          {getStatusLabel()}
        </span>
      </div>

      {showTooltip && (
        <div className="absolute top-full left-0 mt-2 bg-slate-950/95 border border-slate-800 p-3 rounded-xl shadow-2xl z-50 min-w-56 backdrop-blur-xl animate-[fadeIn_0.15s_ease-out]">
          <div className="absolute top-0 left-4 -mt-1 w-2 h-2 bg-slate-950 border-t border-l border-slate-800 rotate-45" />
          {getTooltipContent()}
        </div>
      )}
    </div>
  );
};
