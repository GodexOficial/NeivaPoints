import React from 'react';
import { Users, Award, ArrowRight } from 'lucide-react';
import type { ClassStats } from '../../types';
import { ProgressBar } from '../common/ProgressBar';
import { useLanguage } from '../../context/LanguageContext';

interface ClassCardProps {
  stats: ClassStats;
  onSelectClass: (classId: string) => void;
  onSelectStudent?: (studentId: string) => void;
}

export const ClassCard: React.FC<ClassCardProps> = ({
  stats,
  onSelectClass,
  onSelectStudent,
}) => {
  const { t, getClassName } = useLanguage();
  const localizedClassName = getClassName(stats.classId, stats.className);

  return (
    <div
      onClick={() => onSelectClass(stats.classId)}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs hover:shadow-md hover:border-blue-300 dark:hover:border-blue-500 transition-all cursor-pointer group flex flex-col justify-between"
    >
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-base group-hover:bg-blue-600 group-hover:text-white transition-colors">
              {localizedClassName.charAt(0)}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {localizedClassName}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                <Users size={13} className="text-slate-400 dark:text-slate-500" />
                <span>
                  {stats.totalStudents === 1
                    ? t('classes.studentSingle')
                    : t('classes.studentsCount', { count: stats.totalStudents })}
                </span>
              </p>
            </div>
          </div>

          <div className="p-2 rounded-xl text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/60 transition-colors">
            <ArrowRight size={18} />
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              {t('classes.avgPoints')}
            </span>
            <span className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5 block">
              {stats.averagePoints}{' '}
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">pts</span>
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              {t('classes.avgProgress')}
            </span>
            <span className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5 block">
              {stats.averageProgress}%
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-medium">
            <span>{t('classes.progression')}</span>
            <span>{stats.averageProgress}%</span>
          </div>
          <ProgressBar progress={stats.averageProgress} size="sm" showLabel={false} />
        </div>
      </div>

      {/* Top Student Highlight */}
      {stats.topStudent && (
        <div
          onClick={(e) => {
            if (onSelectStudent && stats.topStudent) {
              e.stopPropagation();
              onSelectStudent(stats.topStudent.id);
            }
          }}
          className={`mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs ${
            onSelectStudent ? 'hover:text-blue-600 dark:hover:text-blue-400 transition-colors' : ''
          }`}
          title={onSelectStudent ? `View ${stats.topStudent.name}'s profile` : undefined}
        >
          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Award size={14} className="text-amber-500" />
            {t('classes.top')}: <strong className="text-slate-800 dark:text-slate-200 font-semibold truncate max-w-[120px]">{stats.topStudent.name}</strong>
          </span>
          <span className="font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
            {stats.topStudent.points} pts
          </span>
        </div>
      )}
    </div>
  );
};
