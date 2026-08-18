import React from 'react';
import { Trophy, Medal, Award, ArrowRight } from 'lucide-react';
import type { StudentWithStats } from '../../types';
import { LevelBadge } from '../common/LevelBadge';
import { useLanguage } from '../../context/LanguageContext';

interface RankingListProps {
  students: StudentWithStats[];
  onSelectStudent: (studentId: string) => void;
  classNameTitle?: string;
}

export const RankingList: React.FC<RankingListProps> = ({
  students,
  onSelectStudent,
  classNameTitle,
}) => {
  const { t } = useLanguage();

  // Sort descending by points, then name
  const ranked = [...students].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return a.name.localeCompare(b.name);
  });

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold text-xs shadow-xs border border-amber-300 dark:border-amber-700">
            <Trophy size={14} className="text-amber-600 dark:text-amber-400" />
          </div>
        );
      case 2:
        return (
          <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-xs shadow-xs border border-slate-300 dark:border-slate-600">
            <Medal size={14} className="text-slate-600 dark:text-slate-300" />
          </div>
        );
      case 3:
        return (
          <div className="w-7 h-7 rounded-full bg-amber-700/10 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 flex items-center justify-center font-bold text-xs shadow-xs border border-amber-600/30 dark:border-amber-700/50">
            <Award size={14} className="text-amber-700 dark:text-amber-400" />
          </div>
        );
      default:
        return (
          <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center font-semibold text-xs">
            {rank}
          </div>
        );
    }
  };

  if (ranked.length === 0) {
    return (
      <div className="py-10 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
        <Trophy size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{t('classes.noStudentsYet')}</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t('classes.registerToRank')}</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850">
        <div className="flex items-center gap-2">
          <Trophy size={18} className="text-amber-500" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            {classNameTitle
              ? t('classes.rankingTitle', { className: classNameTitle })
              : t('classes.rankingTitle', { className: '' })}
          </h3>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          {ranked.length === 1
            ? t('classes.studentSingle')
            : t('classes.studentsCount', { count: ranked.length })}
        </span>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[500px] overflow-y-auto">
        {ranked.map((student, index) => {
          const rank = index + 1;
          const isTop3 = rank <= 3;

          return (
            <div
              key={student.id}
              onClick={() => onSelectStudent(student.id)}
              className={`px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 cursor-pointer transition-colors ${
                rank === 1 ? 'bg-amber-50/30 dark:bg-amber-950/20' : ''
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                {getRankBadge(rank)}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-bold truncate ${
                        isTop3 ? 'text-slate-900 dark:text-white font-extrabold' : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {student.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <LevelBadge level={student.level} size="sm" showIcon={false} />
                    <span className="text-xs text-slate-400 dark:text-slate-500">•</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {t('classes.progressPct', { pct: student.progressPercentage })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-right">
                  <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {student.points}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 ml-1 font-medium">pts</span>
                </div>
                <ArrowRight size={15} className="text-slate-300 dark:text-slate-600 group-hover:text-blue-500" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
