import React from 'react';
import { Award, Medal, Trophy, Users } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import type { LeaderboardStudent } from '../../services/leaderboardService';

interface StudentLeaderboardProps {
  students: LeaderboardStudent[];
  currentStudentId: string;
  currentClassId: string;
}

const rankStudents = (students: LeaderboardStudent[]) => {
  const ordered = [...students].sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
  return ordered.reduce<Array<{ student: LeaderboardStudent; position: number }>>((entries, student, index) => {
    const previousEntry = entries[index - 1];
    entries.push({
      student,
      position: previousEntry && previousEntry.student.points === student.points
        ? previousEntry.position
        : index + 1,
    });
    return entries;
  }, []);
};

const RankIcon: React.FC<{ position: number }> = ({ position }) => {
  if (position === 1) return <Trophy size={16} className="text-amber-600 dark:text-amber-400" />;
  if (position === 2) return <Medal size={16} className="text-slate-600 dark:text-slate-300" />;
  if (position === 3) return <Award size={16} className="text-orange-700 dark:text-orange-400" />;
  return <span className="text-xs font-extrabold">{position}</span>;
};

const RankingRows: React.FC<{
  entries: ReturnType<typeof rankStudents>;
  currentStudentId: string;
  emptyLabel: string;
  classLabel?: string;
}> = ({ entries, currentStudentId, emptyLabel, classLabel }) => {
  const { t } = useLanguage();
  const topThree = entries.slice(0, 3);
  const currentEntry = entries.find(({ student }) => student.id === currentStudentId);
  const visibleEntries = currentEntry && !topThree.some(({ student }) => student.id === currentStudentId)
    ? [...topThree, currentEntry]
    : topThree;

  if (entries.length === 0) return <p className="px-4 py-5 text-xs text-slate-500 dark:text-slate-400">{emptyLabel}</p>;

  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-800">
      {visibleEntries.map(({ student, position }) => {
        const isCurrent = student.id === currentStudentId;
        const isOutsideTopThree = !topThree.some(({ student: topStudent }) => topStudent.id === student.id);
        return (
          <div key={student.id} className={`flex items-center justify-between gap-3 px-4 py-3 ${isCurrent ? 'bg-blue-50/70 dark:bg-blue-950/30' : ''}`}>
            <div className="flex min-w-0 items-center gap-3">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${position <= 3 ? 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40' : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'}`} aria-label={t('leaderboard.position', { position })}>
                <RankIcon position={position} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{student.name}{isCurrent ? ` (${t('leaderboard.you')})` : ''}</p>
                {classLabel && <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{classLabel}</p>}
                {isOutsideTopThree && <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">{t('leaderboard.yourPosition', { position })}</p>}
              </div>
            </div>
            <span className="shrink-0 text-sm font-extrabold text-amber-700 dark:text-amber-300">{student.points} XP</span>
          </div>
        );
      })}
    </div>
  );
};

export const StudentLeaderboard: React.FC<StudentLeaderboardProps> = ({ students, currentStudentId, currentClassId }) => {
  const { t } = useLanguage();
  const ownClassStudents = students.filter((student) => student.classId === currentClassId);
  const otherClassGroups = Array.from(new Map(
    students.filter((student) => student.classId !== currentClassId).map((student) => [student.classId, { classId: student.classId, className: student.className }]),
  ).values());
  const ownClassName = ownClassStudents[0]?.className || t('leaderboard.yourClass');

  return (
    <section className="space-y-4" aria-labelledby="student-leaderboard-title">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"><Trophy size={20} /></div>
        <div>
          <h2 id="student-leaderboard-title" className="text-base font-extrabold text-slate-900 dark:text-white">{t('leaderboard.title')}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('leaderboard.subtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-xs dark:border-amber-900/70 dark:bg-slate-900">
          <div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50/60 px-4 py-3 dark:border-amber-900/60 dark:bg-amber-950/20"><Users size={16} className="text-amber-600 dark:text-amber-400" /><h3 className="text-sm font-extrabold text-slate-900 dark:text-white">{t('leaderboard.yourClassTitle', { className: ownClassName })}</h3></div>
          <RankingRows entries={rankStudents(ownClassStudents)} currentStudentId={currentStudentId} emptyLabel={t('leaderboard.empty')} />
        </div>

        <div className="space-y-4">
          {otherClassGroups.length === 0 ? <div className="rounded-2xl border border-slate-200 bg-white p-5 text-xs text-slate-500 shadow-xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">{t('leaderboard.noOtherClasses')}</div> : otherClassGroups.map((group) => {
            const classStudents = students.filter((student) => student.classId === group.classId);
            return <div key={group.classId} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900"><div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800"><h3 className="text-sm font-extrabold text-slate-900 dark:text-white">{t('leaderboard.otherClassTitle', { className: group.className })}</h3></div><RankingRows entries={rankStudents(classStudents)} currentStudentId={currentStudentId} emptyLabel={t('leaderboard.empty')} /></div>;
          })}
        </div>
      </div>
    </section>
  );
};
