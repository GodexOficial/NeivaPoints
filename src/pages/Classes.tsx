import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Users,
  UserPlus,
  Trophy,
  Plus,
  Edit3,
  Trash2,
} from 'lucide-react';
import { useStudentContext } from '../context/StudentContext';
import { useLanguage } from '../context/LanguageContext';
import type { ClassId, ClassInfo, StudentWithStats } from '../types';
import { RankingList } from '../components/classes/RankingList';
import { StudentCard } from '../components/students/StudentCard';
import { ProgressBar } from '../components/common/ProgressBar';
import { ClassFormModal } from '../components/modals/ClassFormModal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';

interface ClassesPageProps {
  initialClassId?: ClassId;
  onViewProfile: (studentId: string) => void;
  onOpenAddModal: (classId: ClassId) => void;
  onOpenPointsModal: (student: StudentWithStats) => void;
}

export const ClassesPage: React.FC<ClassesPageProps> = ({
  initialClassId = '6th-grade',
  onViewProfile,
  onOpenAddModal,
  onOpenPointsModal,
}) => {
  const { classes, getClassStats, getStudentsByClass, deleteClass } = useStudentContext();
  const { t, getClassName } = useLanguage();

  const [activeClassId, setActiveClassId] = useState<ClassId>(initialClassId);
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassInfo | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Ensure activeClassId points to an existing class
  useEffect(() => {
    if (classes.length > 0) {
      const exists = classes.some((c) => c.id === activeClassId);
      if (!exists) {
        setActiveClassId(classes[0].id);
      }
    }
  }, [classes, activeClassId]);

  const activeClass = classes.find((c) => c.id === activeClassId) || classes[0];

  const handleOpenCreateClass = () => {
    setEditingClass(null);
    setClassModalOpen(true);
  };

  const handleOpenEditClass = () => {
    if (activeClass) {
      setEditingClass(activeClass);
      setClassModalOpen(true);
    }
  };

  const handleDeleteClass = () => {
    if (activeClass) {
      deleteClass(activeClass.id);
      setDeleteConfirmOpen(false);
      const remaining = classes.filter((c) => c.id !== activeClass.id);
      if (remaining.length > 0) {
        setActiveClassId(remaining[0].id);
      }
    }
  };

  // If there are zero classes registered
  if (classes.length === 0) {
    return (
      <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-4 animate-in fade-in">
        <div className="w-16 h-16 mx-auto bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center">
          <GraduationCap size={36} />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('classes.noClassesRegistered')}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          {t('classes.noClassesDesc')}
        </p>
        <button
          type="button"
          onClick={handleOpenCreateClass}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <Plus size={16} />
          <span>{t('classes.createFirstClass')}</span>
        </button>

        <ClassFormModal
          isOpen={classModalOpen}
          classToEdit={editingClass}
          onClose={() => setClassModalOpen(false)}
          onSuccess={(created) => setActiveClassId(created.id)}
        />
      </div>
    );
  }

  const currentClassId = activeClass?.id || activeClassId;
  const activeStats = getClassStats(currentClassId);
  const classStudents = getStudentsByClass(currentClassId);
  const localizedClassName = getClassName(currentClassId, activeClass?.name);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Class Selector Tabs & Register Class Button */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 flex-1">
          {classes.map((c) => {
            const isSelected = currentClassId === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setActiveClassId(c.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <GraduationCap size={16} className={isSelected ? 'text-white' : 'text-slate-400 dark:text-slate-500'} />
                <span>{getClassName(c.id, c.name)}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleOpenCreateClass}
          className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-semibold text-xs rounded-xl border border-indigo-200 dark:border-indigo-800 transition-colors whitespace-nowrap cursor-pointer flex-shrink-0"
        >
          <Plus size={15} />
          <span>{t('classes.registerClass')}</span>
        </button>
      </div>

      {/* Class Overview Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-extrabold text-2xl shadow-sm">
              {activeClass?.shortName ? activeClass.shortName.substring(0, 2) : localizedClassName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {localizedClassName}
                </h1>
                <span className="text-xs font-semibold px-2.5 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded-full border border-blue-200 dark:border-blue-800">
                  {activeStats.totalStudents === 1
                    ? t('classes.studentSingle')
                    : t('classes.studentsCount', { count: activeStats.totalStudents })}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {activeClass?.description || t('classes.subtitle')}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
            <button
              type="button"
              onClick={handleOpenEditClass}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors cursor-pointer"
              title={t('classes.editClass')}
            >
              <Edit3 size={14} />
              <span>{t('classes.editClass')}</span>
            </button>

            <button
              type="button"
              onClick={() => setDeleteConfirmOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 bg-red-50 dark:bg-red-950/40 hover:bg-red-100/70 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-xl transition-colors cursor-pointer"
              title={t('classes.deleteClass')}
            >
              <Trash2 size={14} />
              <span>{t('classes.deleteClass')}</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenAddModal(currentClassId)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <UserPlus size={16} />
              <span>{t('classes.addStudentTo', { className: localizedClassName })}</span>
            </button>
          </div>
        </div>

        {/* 4 Stat Boxes */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              {t('classes.numStudents')}
            </span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1 block">
              {activeStats.totalStudents}
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              {t('classes.avgPoints')}
            </span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1 block">
              {activeStats.averagePoints}{' '}
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">pts</span>
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              {t('classes.avgLevel')}
            </span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1 block">
              Lvl {activeStats.averageLevel}
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              {t('classes.avgProgress')}
            </span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1 block">
              {activeStats.averageProgress}%
            </span>
            <div className="mt-2">
              <ProgressBar progress={activeStats.averageProgress} size="sm" showLabel={false} />
            </div>
          </div>
        </div>

        {/* Highest-scoring Student */}
        {activeStats.topStudent && (
          <div className="mt-5 p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border border-amber-200/80 dark:border-amber-800/60 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-xs">
                <Trophy size={20} />
              </div>
              <div>
                <span className="text-[11px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider block">
                  {t('classes.highestScoring')}
                </span>
                <span className="text-base font-extrabold text-slate-900 dark:text-white">
                  {activeStats.topStudent.name}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-base font-extrabold text-amber-900 dark:text-amber-300">
                {activeStats.topStudent.points} {t('classes.pts')}
              </span>
              <button
                type="button"
                onClick={() => onViewProfile(activeStats.topStudent!.id)}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300 hover:bg-amber-100/50 dark:hover:bg-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                {t('classes.viewProfile')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Layout: Ranking Leaderboard & Student List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Class Ranking */}
        <div className="lg:col-span-1">
          <RankingList
            students={classStudents}
            onSelectStudent={onViewProfile}
            classNameTitle={localizedClassName}
          />
        </div>

        {/* Complete Student List for this Class */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {t('classes.studentsTitle', { className: localizedClassName, count: classStudents.length })}
            </h2>
          </div>

          {classStudents.length === 0 ? (
            <div className="py-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
              <Users size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {t('classes.noStudentsYet')}
              </p>
              <button
                type="button"
                onClick={() => onOpenAddModal(currentClassId)}
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <UserPlus size={14} />
                <span>{t('classes.addFirstStudent')}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {classStudents.map((student) => (
                <StudentCard
                  key={student.id}
                  student={student}
                  onViewProfile={onViewProfile}
                  onAddPoints={onOpenPointsModal}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <ClassFormModal
        isOpen={classModalOpen}
        classToEdit={editingClass}
        onClose={() => setClassModalOpen(false)}
        onSuccess={(saved) => setActiveClassId(saved.id)}
      />

      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        title={t('classes.deleteClassTitle')}
        message={t('classes.deleteClassMsg', { className: localizedClassName })}
        description={t('classes.deleteClassDesc')}
        confirmLabel={t('classes.deleteClassConfirm')}
        cancelLabel={t('modal.cancel')}
        variant="danger"
        onConfirm={handleDeleteClass}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </div>
  );
};

