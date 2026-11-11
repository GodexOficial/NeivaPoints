import React from 'react';
import { Plus, User } from 'lucide-react';
import type { StudentWithStats } from '../../types';
import { ProgressBar } from '../common/ProgressBar';
import { LevelBadge } from '../common/LevelBadge';
import { useStudentContext } from '../../context/StudentContext';
import { useLanguage } from '../../context/LanguageContext';

interface StudentCardProps {
  student: StudentWithStats;
  onViewProfile: (studentId: string) => void;
  onAddPoints: (student: StudentWithStats) => void;
}

export const StudentCard = React.memo<StudentCardProps>(({
  student,
  onViewProfile,
  onAddPoints,
}) => {
  const { getClassById } = useStudentContext();
  const { t, getClassName } = useLanguage();
  const classInfo = getClassById(student.classId);
  const localizedClassName = getClassName(student.classId, classInfo?.name);

  return (
    <article data-motion-id={student.id} className="student-card glass-panel motion-card bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700/60 transition-all duration-300 flex flex-col justify-between overflow-hidden group">
      {/* Card Header */}
      <div className="student-card-body p-5 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1 min-w-0">
              <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800/60 px-2 py-0.5 rounded-md uppercase tracking-wider">
                {localizedClassName}
              </span>
              {student.username && (
                <span className="max-w-full truncate text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono" title={`@${student.username}`}>
                  @{student.username}
                </span>
              )}
              {student.isSample && (
                <span className="text-[10px] text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-medium">
                  {t('students.sample')}
                </span>
              )}
            </div>
            <h3>
            <button type="button"
              onClick={() => onViewProfile(student.id)}
              className="block max-w-full text-left text-base font-bold text-slate-900 dark:text-white truncate hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors"
              title={student.name}
            >
              {student.name}
            </button>
            </h3>
          </div>

          <LevelBadge level={student.level} size="md" className="student-card-level shrink-0" />
        </div>

        {/* Points Display */}
        <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <div>
            <span key={student.points} className="student-card-points text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight tabular-nums">
              {student.points}
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1.5">{t('classes.pts')}</span>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {t('students.ptsToNext', { points: student.pointsToNextLevel, level: student.level + 1 })}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="mt-2.5">
          <ProgressBar progress={student.progressPercentage} level={student.level} size="md" />
        </div>
      </div>

      {/* Card Footer Actions */}
      <div className="student-card-actions px-5 py-3.5 bg-slate-50/70 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onAddPoints(student)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <Plus size={14} />
          {t('students.addPoints')}
        </button>

        <button
          type="button"
          onClick={() => onViewProfile(student.id)}
          className="inline-flex items-center justify-center gap-1 py-2 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
        >
          <User size={13} />
          <span>{t('students.profile')}</span>
        </button>
      </div>
    </article>
  );
});
