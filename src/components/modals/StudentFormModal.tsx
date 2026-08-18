import React, { useState, useEffect } from 'react';
import { UserPlus, Edit3, X, AlertCircle } from 'lucide-react';
import type { ClassId, StudentWithStats } from '../../types';
import { useStudentContext } from '../../context/StudentContext';
import { useLanguage } from '../../context/LanguageContext';

interface StudentFormModalProps {
  isOpen: boolean;
  initialClassId?: ClassId;
  studentToEdit?: StudentWithStats | null;
  onClose: () => void;
  onSuccess?: (student: StudentWithStats) => void;
}

export const StudentFormModal: React.FC<StudentFormModalProps> = ({
  isOpen,
  initialClassId,
  studentToEdit,
  onClose,
  onSuccess,
}) => {
  const { classes, addStudent, updateStudent } = useStudentContext();
  const { t, getClassName } = useLanguage();

  const defaultClassId = initialClassId || (classes.length > 0 ? classes[0].id : '');
  const [name, setName] = useState('');
  const [classId, setClassId] = useState<ClassId>(defaultClassId);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!studentToEdit;

  useEffect(() => {
    if (isOpen) {
      if (studentToEdit) {
        setName(studentToEdit.name);
        setClassId(studentToEdit.classId);
        setUsername(studentToEdit.username || '');
        setPassword(studentToEdit.password || '123456');
      } else {
        setName('');
        setClassId(initialClassId || (classes.length > 0 ? classes[0].id : ''));
        setUsername('');
        setPassword('123456');
      }
      setError(null);
    }
  }, [isOpen, studentToEdit, initialClassId, classes]);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!isEditing && (!username || username === '')) {
      const normalized = val
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, ".")
        .replace(/\.+/g, ".")
        .replace(/^\.|\.$/g, "");
      setUsername(normalized);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(t('form.errorName'));
      return;
    }

    if (!classId) {
      setError(t('form.errorClass'));
      return;
    }

    handleSubmitAsync();
  };

  const handleSubmitAsync = async () => {
    try {
      if (isEditing && studentToEdit) {
        const updated = await updateStudent(studentToEdit.id, {
          name: name.trim(),
          classId,
          username: username.trim() || undefined,
          password: password.trim() || undefined,
        });
        if (onSuccess) onSuccess(updated);
        onClose();
      } else {
        const created = await addStudent({
          name: name.trim(),
          classId,
          username: username.trim() || undefined,
          password: password.trim() || undefined,
        });
        if (onSuccess) onSuccess(created);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save student.');
    }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs cursor-pointer"
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150 cursor-default"
      >
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-lg">
              {isEditing ? <Edit3 size={18} /> : <UserPlus size={18} />}
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {isEditing ? t('form.editTitle') : t('form.newTitle')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isEditing
                  ? t('form.editSubtitle')
                  : t('form.newSubtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2.5 text-xs text-red-700 dark:text-red-300 font-medium">
              <AlertCircle size={16} className="text-red-500 dark:text-red-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              {t('form.fullName')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder={t('form.namePlaceholder')}
              autoFocus
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                {t('auth.username')}
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. ana.silva"
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                {t('auth.password')}
              </label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              {t('form.class')} <span className="text-red-500">*</span>
            </label>
            {classes.length === 0 ? (
              <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 p-2.5 rounded-xl border border-amber-200 dark:border-amber-800">
                {t('form.noClassesYet')}
              </p>
            ) : (
              <select
                value={classId}
                onChange={(e) => {
                  setClassId(e.target.value as ClassId);
                  if (error) setError(null);
                }}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {getClassName(c.id, c.name)}
                  </option>
                ))}
              </select>
            )}
          </div>

          {!isEditing && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 rounded-xl text-xs text-slate-500 dark:text-slate-400 space-y-1">
              <div className="flex items-center justify-between">
                <span>{t('form.initialPoints')}</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{t('form.pointsVal')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>{t('form.initialLevel')}</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{t('form.levelVal')}</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              {t('form.cancel')}
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer"
            >
              {isEditing ? t('form.save') : t('form.register')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
