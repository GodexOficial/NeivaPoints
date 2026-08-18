import React, { useEffect, useState } from 'react';
import { Award, Sparkles, X } from 'lucide-react';
import type { LevelUpEvent } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

interface LevelUpToastProps {
  notification: LevelUpEvent | null;
  onDismiss: () => void;
}

export const LevelUpToast: React.FC<LevelUpToastProps> = ({ notification, onDismiss }) => {
  const { t } = useLanguage();
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!notification) return;

    setProgress(100);
    const duration = 5000;
    const interval = 50;
    const step = (interval / duration) * 100;

    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= step) {
          clearInterval(progressTimer);
          return 0;
        }
        return prev - step;
      });
    }, interval);

    const dismissTimer = setTimeout(() => {
      onDismiss();
    }, duration);

    return () => {
      clearInterval(progressTimer);
      clearTimeout(dismissTimer);
    };
  }, [notification, onDismiss]);

  if (!notification) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 sm:max-w-sm w-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-2xl border-2 border-indigo-200 dark:border-indigo-800 overflow-hidden animate-level-up"
      role="alert"
      aria-live="polite"
    >
      <div className="p-4 flex items-start gap-3.5">
        <div className="p-3 bg-gradient-to-tr from-amber-400 via-indigo-600 to-violet-600 rounded-2xl text-white shadow-md flex-shrink-0 relative">
          <Award size={24} className="animate-bounce" />
          <Sparkles size={12} className="absolute -top-1 -right-1 text-amber-300 animate-spin" />
        </div>

        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-md">
              {t('toast.levelUp')}
            </span>
            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-md">
              {t('toast.lvl')} {notification.newLevel}
            </span>
          </div>
          <p className="mt-1 text-sm font-extrabold text-slate-900 dark:text-white truncate">
            {notification.studentName}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
            {t('toast.advanced', { oldLevel: notification.oldLevel, newLevel: notification.newLevel })}
          </p>
        </div>

        <button
          onClick={onDismiss}
          className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0 cursor-pointer"
          aria-label="Dismiss notification"
        >
          <X size={16} />
        </button>
      </div>

      {/* Auto-dismiss countdown bar */}
      <div className="h-1 bg-slate-100 dark:bg-slate-800 w-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 transition-all duration-75 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};
