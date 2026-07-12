import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { ToastMessage, ToastType } from '../utils/toast';

export const ToastContainer: React.FC<{ currentLang?: 'en' | 'ru' | 'zh' }> = ({ currentLang = 'en' }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handleToastEvent = (e: Event) => {
      const customEvent = e as CustomEvent<ToastMessage>;
      if (customEvent && customEvent.detail) {
        const newToast = customEvent.detail;
        setToasts(prev => [...prev, newToast]);

        // Auto remove
        if (newToast.duration !== 0) {
          setTimeout(() => {
            removeToast(newToast.id);
          }, newToast.duration || 4000);
        }
      }
    };

    window.addEventListener('app-toast', handleToastEvent);
    return () => {
      window.removeEventListener('app-toast', handleToastEvent);
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const getToastStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-slate-950/90 border-emerald-500/30 text-emerald-400',
          icon: <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />,
          progress: 'bg-emerald-500'
        };
      case 'error':
        return {
          bg: 'bg-slate-950/90 border-rose-500/30 text-rose-400',
          icon: <XCircle size={16} className="text-rose-400 shrink-0" />,
          progress: 'bg-rose-500'
        };
      case 'warning':
        return {
          bg: 'bg-slate-950/90 border-amber-500/30 text-amber-400',
          icon: <AlertTriangle size={16} className="text-amber-400 shrink-0" />,
          progress: 'bg-amber-500'
        };
      case 'info':
      default:
        return {
          bg: 'bg-slate-950/90 border-sky-500/30 text-sky-400',
          icon: <Info size={16} className="text-sky-400 shrink-0" />,
          progress: 'bg-sky-500'
        };
    }
  };

  const getDefaultTitle = (type: ToastType) => {
    const titles = {
      en: {
        success: 'Action Successful',
        error: 'Execution Failure',
        warning: 'Warning Raised',
        info: 'System Information'
      },
      ru: {
        success: 'Успешная операция',
        error: 'Ошибка выполнения',
        warning: 'Предупреждение',
        info: 'Информация'
      },
      zh: {
        success: '操作成功',
        error: '执行失败',
        warning: '系统警告',
        info: '系统信息'
      }
    };

    const lang = currentLang === 'ru' ? 'ru' : currentLang === 'zh' ? 'zh' : 'en';
    return titles[lang][type];
  };

  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none select-none">
      <AnimatePresence>
        {toasts.map(toast => {
          const styles = getToastStyles(toast.type);
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              layout
              className={`pointer-events-auto flex gap-3 p-3.5 rounded-xl border backdrop-blur-md shadow-2xl ${styles.bg} transition-all relative overflow-hidden`}
              id={`toast-${toast.id}`}
            >
              {styles.icon}
              <div className="flex-1 min-w-0 pr-2">
                <span className="text-[11px] font-black uppercase tracking-wider block mb-0.5 text-slate-100">
                  {toast.title || getDefaultTitle(toast.type)}
                </span>
                <p className="text-[10.5px] font-medium leading-relaxed text-slate-300 break-words">
                  {toast.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="text-slate-500 hover:text-white transition-colors cursor-pointer self-start p-0.5 shrink-0"
              >
                <X size={12} />
              </button>

              {/* Progress Bar Animation for lifetime */}
              {toast.duration !== 0 && (
                <motion.div
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: (toast.duration || 4000) / 1000, ease: 'linear' }}
                  className={`absolute bottom-0 left-0 h-0.5 ${styles.progress}`}
                />
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
