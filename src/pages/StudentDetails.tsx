import React, { useState } from 'react';
import {
  ArrowLeft,
  Plus,
  Minus,
  Edit3,
  Trash2,
  Calendar,
  Award,
  Sparkles,
  TrendingUp,
  User,
  KeyRound,
  Copy,
  Check,
} from 'lucide-react';
import { useStudentContext } from '../context/StudentContext';
import { useLanguage } from '../context/LanguageContext';
import { ProgressBar } from '../components/common/ProgressBar';
import { HistoryList } from '../components/history/HistoryList';
import { PointsModal } from '../components/modals/PointsModal';
import { StudentFormModal } from '../components/modals/StudentFormModal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { formatDateTime } from '../utils/dateFormatter';

interface StudentDetailsProps {
  studentId: string;
  onBack: () => void;
}

export const StudentDetails: React.FC<StudentDetailsProps> = ({ studentId, onBack }) => {
  const { getStudentById, getStudentTransactions, deleteStudent, getClassById } = useStudentContext();
  const { language, t, getClassName } = useLanguage();

  const student = getStudentById(studentId);
  const transactions = getStudentTransactions(studentId);

  const [pointsModalOpen, setPointsModalOpen] = useState(false);
  const [pointsModalMode, setPointsModalMode] = useState<'add' | 'remove'>('add');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [copiedCreds, setCopiedCreds] = useState(false);

  const handleCopyCredentials = () => {
    if (!student) return;
    const text = `Student: ${student.name}\nUsername: ${student.username || 'student'}\nPassword: ${student.password || '123456'}`;
    navigator.clipboard?.writeText(text);
    setCopiedCreds(true);
    setTimeout(() => setCopiedCreds(false), 2000);
  };

  if (!student) {
    return (
      <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-4">
        <div className="w-16 h-16 mx-auto bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500">
          <User size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('details.notFoundTitle')}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t('details.notFoundDesc')}
        </p>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-semibold text-sm rounded-xl hover:bg-blue-700 transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>{t('details.returnBtn')}</span>
        </button>
      </div>
    );
  }

  const classInfo = getClassById(student.classId);
  const localizedClassName = getClassName(student.classId, classInfo?.name);

  const handleOpenAddPoints = () => {
    setPointsModalMode('add');
    setPointsModalOpen(true);
  };

  const handleOpenRemovePoints = () => {
    setPointsModalMode('remove');
    setPointsModalOpen(true);
  };

  const handleDelete = () => {
    deleteStudent(student.id);
    setDeleteConfirmOpen(false);
    onBack();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors shadow-2xs cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>{t('details.back')}</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            <Edit3 size={14} />
            <span>{t('details.edit')}</span>
          </button>
          <button
            type="button"
            onClick={() => setDeleteConfirmOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 bg-red-50 dark:bg-red-950/40 hover:bg-red-100/70 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-xl transition-colors cursor-pointer"
          >
            <Trash2 size={14} />
            <span>{t('details.delete')}</span>
          </button>
        </div>
      </div>

      {/* Prominent Student Profile Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 px-3 py-1 rounded-lg">
                {localizedClassName}
              </span>
              {student.isSample && (
                <span className="text-xs text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md font-medium">
                  {t('details.sampleBadge')}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight uppercase">
              {student.name}
            </h1>
            <div className="flex items-center gap-2 mt-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar size={13} className="text-slate-400 dark:text-slate-500" />
                <span>{t('details.registeredDate', { date: formatDateTime(student.createdAt, language === 'pt' ? 'pt-BR' : 'en-US') })}</span>
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px] text-slate-700 dark:text-slate-300">
                @{student.username || 'student'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <button
              type="button"
              onClick={handleOpenAddPoints}
              className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus size={18} />
              <span>{t('details.addPoints')}</span>
            </button>

            <button
              type="button"
              onClick={handleOpenRemovePoints}
              className="inline-flex items-center gap-1.5 px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm rounded-xl transition-colors cursor-pointer text-xs"
            >
              <Minus size={15} className="text-slate-500 dark:text-slate-400" />
              <span>{t('details.removePoints')}</span>
            </button>
          </div>
        </div>

        {/* Level & Points Showcase */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 border-b border-slate-100 dark:border-slate-800">
          {/* Current Level */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200/70 dark:border-slate-800 flex items-center gap-4">
            <div className="p-3.5 bg-indigo-600 text-white rounded-2xl shadow-xs">
              <Award size={28} />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                {t('details.currentLevel')}
              </span>
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white mt-0.5 block uppercase">
                {t('students.level')} {student.level}
              </span>
            </div>
          </div>

          {/* Current Points */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200/70 dark:border-slate-800 flex items-center gap-4">
            <div className="p-3.5 bg-amber-500 text-white rounded-2xl shadow-xs">
              <Sparkles size={28} />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                {t('details.currentPoints')}
              </span>
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white mt-0.5 block">
                {student.points} <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase">{t('history.points')}</span>
              </span>
            </div>
          </div>

          {/* Points Required for Next Level */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200/70 dark:border-slate-800 flex items-center gap-4">
            <div className="p-3.5 bg-emerald-600 text-white rounded-2xl shadow-xs">
              <TrendingUp size={28} />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                {t('details.nextMilestone')}
              </span>
              <span className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5 block">
                {t('details.ptsUntil', { points: student.pointsToNextLevel, nextLevel: student.level + 1 })}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {t('details.ptsInLevel', { current: student.pointsInCurrentLevel, level: student.level })}
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar within Current Level */}
        <div className="pt-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              {t('details.levelProgress', { level: student.level })}
            </span>
            <span className="text-sm font-extrabold text-slate-900 dark:text-white">
              {student.progressPercentage}%
            </span>
          </div>
          <ProgressBar progress={student.progressPercentage} size="lg" showLabel={false} />
          <div className="flex justify-between items-center mt-2 text-xs text-slate-400 dark:text-slate-500 font-medium">
            <span>{t('details.levelStart', { level: student.level, points: (student.level - 1) * 100 })}</span>
            <span>{t('details.levelTarget', { points: student.pointsToNextLevel, nextLevel: student.level + 1, total: student.level * 100 })}</span>
          </div>
        </div>

        {/* Student Login Credentials Box for Teacher */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl">
              <KeyRound size={18} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Student Access Credentials
              </span>
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5 flex items-center gap-3 flex-wrap">
                <span>Login: <code className="font-mono bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">{student.username || 'student'}</code></span>
                <span>Password: <code className="font-mono bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">{student.password || '123456'}</code></span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyCredentials}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors shadow-2xs cursor-pointer self-start sm:self-auto"
          >
            {copiedCreds ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            <span>{copiedCreds ? "Copied!" : "Copy for Student"}</span>
          </button>
        </div>
      </div>

      {/* Point Transaction History Section */}
      <HistoryList
        transactions={transactions}
        studentName={student.name}
      />

      {/* Modals */}
      <PointsModal
        isOpen={pointsModalOpen}
        student={student}
        initialMode={pointsModalMode}
        onClose={() => setPointsModalOpen(false)}
      />

      <StudentFormModal
        isOpen={editModalOpen}
        studentToEdit={student}
        onClose={() => setEditModalOpen(false)}
      />

      {/* Confirmation Dialog for Deleting Student */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        title={t('details.deleteTitle')}
        message={t('details.deleteMsg', { name: student.name })}
        description={t('details.deleteDesc')}
        confirmLabel={t('details.deleteConfirm')}
        cancelLabel={t('modal.cancel')}
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </div>
  );
};
