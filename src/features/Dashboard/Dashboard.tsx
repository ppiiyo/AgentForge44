import React, { Suspense } from 'react';
import { MetricsDashboard } from '../../components/MetricsDashboard';
// @ts-ignore
import styles from './Dashboard.module.css';

interface DashboardProps {
  currentLang: 'en' | 'ru' | 'zh';
  activeGraphId?: string;
}

export const Dashboard: React.FC<DashboardProps> = ({
  currentLang,
  activeGraphId = "canvas-workspace"
}) => {
  return (
    <div className={`flex-1 overflow-y-auto bg-slate-950 p-6 ${styles.dashboardContainer}`} id="dashboard_feature_root">

      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
            {currentLang === 'ru' 
              ? 'Консоль Управления & Аналитика' 
              : currentLang === 'zh' 
                ? '工作流运营大屏与链路透视' 
                : 'Executive Observability Dashboard'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {currentLang === 'ru' 
              ? 'Мониторинг задержек, потребления токенов, логов выполнения и самодиагностики агентов в реальном времени.' 
              : currentLang === 'zh' 
                ? '毫秒级跟踪多代理协作、自主纠错循环，精细化分析上下文 Token 吞吐成本结构。' 
                : 'Real-time telemetry trace analyzer for token volumes, audit run iterations, and latencies.'}
          </p>
        </div>

        <Suspense fallback={
          <div className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-8 flex flex-col items-center justify-center space-y-3 min-h-[300px]">
            <div className="w-8 h-8 rounded-full border-2 border-sky-500/30 border-t-sky-500 animate-spin"></div>
            <span className="text-xs text-slate-400 font-mono">Loading Executive Telemetry...</span>
          </div>
        }>
          <MetricsDashboard currentLang={currentLang} activeGraphId={activeGraphId} />
        </Suspense>
      </div>
    </div>
  );
};
