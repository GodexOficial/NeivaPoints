import React from 'react';
import { Plus, Minus, History, Clock } from 'lucide-react';
import type { PointTransaction } from '../../types';
import { formatDateTime } from '../../utils/dateFormatter';
import { useLanguage } from '../../context/LanguageContext';

interface HistoryListProps {
  transactions: PointTransaction[];
  emptyMessage?: string;
  studentName?: string;
}

export const HistoryList: React.FC<HistoryListProps> = ({
  transactions,
  emptyMessage,
  studentName,
}) => {
  const { language, t, getReasonLabel } = useLanguage();

  if (transactions.length === 0) {
    return (
      <div className="py-12 px-4 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="w-12 h-12 mx-auto mb-3 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500">
          <History size={22} />
        </div>
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
          {emptyMessage || (studentName ? `${studentName}: ${t('history.empty')}` : t('history.empty'))}
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
          {t('history.emptySub')}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History size={18} className="text-slate-500 dark:text-slate-400" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            {t('history.title')}
          </h3>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          {transactions.length === 1
            ? t('history.recordSingle')
            : t('history.records', { count: transactions.length })}
        </span>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[460px] overflow-y-auto">
        {transactions.map((tx) => {
          const isAdd = tx.type === 'add';
          return (
            <div
              key={tx.id}
              className="p-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors flex items-start justify-between gap-4"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={`mt-0.5 p-2 rounded-xl flex-shrink-0 ${
                    isAdd
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800'
                      : 'bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800'
                  }`}
                >
                  {isAdd ? <Plus size={16} /> : <Minus size={16} />}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-sm font-bold ${
                        isAdd ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'
                      }`}
                    >
                      {isAdd ? `+${tx.amount}` : `-${tx.amount}`} {t('history.points')}
                    </span>
                    {tx.reason && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {getReasonLabel(tx.reason)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock size={12} className="text-slate-400 dark:text-slate-500" />
                      {formatDateTime(tx.createdAt, language === 'pt' ? 'pt-BR' : 'en-US')}
                    </span>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <span>
                      {tx.previousPoints} pts &rarr; <strong className="text-slate-700 dark:text-slate-200">{tx.newPoints} pts</strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
