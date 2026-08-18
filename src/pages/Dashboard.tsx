import React from 'react';
import {
  Users,
  UserPlus,
  Sparkles,
  GraduationCap,
  Plus,
} from 'lucide-react';
import { useStudentContext } from '../context/StudentContext';
import { useLanguage } from '../context/LanguageContext';
import type { ClassId } from '../types';
import { ClassCard } from '../components/classes/ClassCard';

interface DashboardProps {
  onSelectClass: (classId: ClassId) => void;
  onNavigateToStudents: (filterClass?: ClassId) => void;
  onOpenAddStudentModal: () => void;
  onOpenAddClassModal?: () => void;
  onSelectStudent: (studentId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onSelectClass,
  onNavigateToStudents,
  onOpenAddStudentModal,
  onOpenAddClassModal,
  onSelectStudent,
}) => {
  const { classes, dashboardStats } = useStudentContext();
  const { t, getClassName } = useLanguage();

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Top Banner / Welcome */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-800 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-semibold mb-3">
              <Sparkles size={14} className="text-amber-300" />
              <span>{t('dash.badge')}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {t('dash.title')}
            </h1>
            <p className="mt-1 text-sm text-blue-100 max-w-xl">
              {t('dash.subtitle')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenAddStudentModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-blue-700 hover:bg-blue-50 font-bold text-sm rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <UserPlus size={16} />
              <span>{t('dash.registerStudent')}</span>
            </button>

            {onOpenAddClassModal && (
              <button
                onClick={onOpenAddClassModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white font-bold text-sm rounded-xl border border-white/20 transition-all cursor-pointer backdrop-blur-xs"
              >
                <Plus size={16} />
                <span>{t('dash.registerClass')}</span>
              </button>
            )}

            <button
              onClick={() => onNavigateToStudents()}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-sm rounded-xl border border-white/20 transition-all cursor-pointer"
            >
              <Users size={16} />
              <span>{t('dash.viewAllStudents')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Global Stat Cards */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3.5">
          {t('dash.overview')}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Total Students */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              {t('dash.totalStudents')}
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1 block">
              {dashboardStats.totalStudents}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">{t('dash.enrolled')}</span>
          </div>

          {/* Dynamic Class Summaries */}
          {classes.map((c) => {
            const count = dashboardStats.gradeCounts[c.id] || 0;
            const label = getClassName(c.id, c.name);
            return (
              <div
                key={c.id}
                onClick={() => onSelectClass(c.id)}
                className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-blue-300 dark:hover:border-blue-500 cursor-pointer transition-colors"
              >
                <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block truncate">
                  {label}
                </span>
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1 block">
                  {count}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">{t('dash.students')}</span>
              </div>
            );
          })}

          {/* Total Accumulated Points */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 p-5 rounded-2xl border border-amber-200/80 dark:border-amber-800/50 shadow-xs">
            <span className="text-[11px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider block">
              {t('dash.totalPoints')}
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-900 dark:text-amber-300 mt-1 block">
              {dashboardStats.totalAccumulatedPoints}
            </span>
            <span className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-0.5 block">{t('dash.pointsAwarded')}</span>
          </div>
        </div>
      </div>

      {/* Academic Classes Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('dash.academicClasses')}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('dash.classesSubtitle')}
            </p>
          </div>

          {onOpenAddClassModal && (
            <button
              type="button"
              onClick={onOpenAddClassModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-semibold text-xs rounded-xl border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
            >
              <Plus size={14} />
              <span>{t('dash.registerClass')}</span>
            </button>
          )}
        </div>

        {classes.length === 0 ? (
          <div className="py-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-3">
            <GraduationCap size={36} className="mx-auto text-slate-300 dark:text-slate-600" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">{t('dash.noClasses')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">{t('dash.noClassesDesc')}</p>
            {onOpenAddClassModal && (
              <button
                type="button"
                onClick={onOpenAddClassModal}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Plus size={14} />
                <span>{t('dash.registerClass')}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {classes.map((classItem) => {
              const stats = dashboardStats.classStats[classItem.id] || {
                classId: classItem.id,
                className: classItem.name,
                totalStudents: 0,
                totalPoints: 0,
                averagePoints: 0,
                averageLevel: 0,
                averageProgress: 0,
              };
              return (
                <ClassCard
                  key={classItem.id}
                  stats={stats}
                  onSelectClass={(id) => onSelectClass(id as ClassId)}
                  onSelectStudent={onSelectStudent}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

