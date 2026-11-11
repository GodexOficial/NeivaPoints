import { useDialogFocus } from '../../hooks/useDialogFocus';
import React, { useEffect, useState } from 'react';
import { AlertCircle, Check, Users, X } from 'lucide-react';
import { DEFAULT_REASONS, QUICK_POINT_OPTIONS } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { useStudentContext } from '../../context/StudentContext';

interface ClassPointsModalProps {
  isOpen: boolean;
  classId: string | null;
  className: string;
  studentCount: number;
  mode?: 'add' | 'remove';
  onClose: () => void;
  onSuccess?: (studentCount: number) => void;
}

export const ClassPointsModal: React.FC<ClassPointsModalProps> = ({
  isOpen,
  classId,
  className,
  studentCount,
  mode = 'add',
  onClose,
  onSuccess,
}) => {
  const dialogRef = useDialogFocus(isOpen);
  const { t, getReasonLabel } = useLanguage();
  const { addPointsToClass, removePointsFromClass } = useStudentContext();
  const [amount, setAmount] = useState<number | ''>(10);
  const [selectedQuick, setSelectedQuick] = useState<number | null>(10);
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [isCustomReason, setIsCustomReason] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAmount(10);
      setSelectedQuick(10);
      setReason('');
      setCustomReason('');
      setIsCustomReason(false);
      setError(null);
      setSaving(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, saving, onClose]);

  if (!isOpen || !classId) return null;

  const numericAmount = typeof amount === 'number' ? amount : 0;
  const effectiveReason = isCustomReason ? customReason.trim() : reason;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!numericAmount || numericAmount <= 0) {
      setError(t('modal.errorPositive'));
      return;
    }
    if (studentCount === 0) {
      setError(t('classes.bulkPointsNoStudents'));
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const result = mode === 'remove'
        ? await removePointsFromClass(classId, numericAmount, effectiveReason || undefined)
        : await addPointsToClass(classId, numericAmount, effectiveReason || undefined);
      onSuccess?.(result.studentCount);
      onClose();
    } catch (caughtError: unknown) {
      setError(caughtError instanceof Error ? caughtError.message : t(mode === 'remove' ? 'classes.bulkRemovePointsError' : 'classes.bulkPointsError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div ref={dialogRef} tabIndex={-1} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs" role="dialog" aria-modal="true" aria-labelledby="class-points-title">
      <div className="glass-panel relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-xl animate-in zoom-in-95 border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div>
            <h3 id="class-points-title" className="text-base font-semibold text-slate-900 dark:text-white">{t(mode === 'remove' ? 'classes.bulkRemovePointsTitle' : 'classes.bulkPointsTitle')}</h3>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400"><Users size={13} />{className} · {studentCount} {t('classes.bulkPointsStudents')}</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" aria-label={t('modal.cancel')}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <p className={`rounded-xl border p-3 text-xs font-medium ${mode === 'remove' ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200' : 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200'}`}>{t(mode === 'remove' ? 'classes.bulkRemovePointsDesc' : 'classes.bulkPointsDesc', { count: studentCount })}</p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">{t('modal.quickSelect')}</label>
            <div className="grid grid-cols-5 gap-2">
              {QUICK_POINT_OPTIONS.map((value) => (
                <button key={value} type="button" onClick={() => { setSelectedQuick(value); setAmount(value); setError(null); }} className={`py-2 px-3 text-sm font-semibold rounded-xl border transition-all cursor-pointer ${selectedQuick === value && amount === value ? (mode === 'remove' ? 'bg-red-50 dark:bg-red-950/60 border-red-600 text-red-700 dark:text-red-300 ring-2 ring-red-500/20' : 'bg-blue-50 dark:bg-blue-950/60 border-blue-600 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20') : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>{mode === 'remove' ? '-' : '+'}{value}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">{t('modal.customAmount')}</label>
            <input type="number" min="1" step="1" value={amount} onChange={(event) => { const value = event.target.value; setAmount(value === '' ? '' : Number(value)); setSelectedQuick(QUICK_POINT_OPTIONS.includes(Number(value) as 1 | 5 | 10 | 20 | 50) ? Number(value) : null); setError(null); }} placeholder={t('modal.enterPoints')} className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">{t('modal.reason')} <span className="text-slate-400 font-normal lowercase">{t('modal.optional')}</span></label>
              <button type="button" onClick={() => { setIsCustomReason(!isCustomReason); if (!isCustomReason) setReason(''); }} className="text-xs text-blue-600 dark:text-blue-400 font-medium cursor-pointer">{isCustomReason ? t('modal.presets') : t('modal.customReason')}</button>
            </div>
            {isCustomReason ? <input type="text" value={customReason} onChange={(event) => setCustomReason(event.target.value)} placeholder={t('modal.customReasonPlaceholder')} className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" /> : <div className="flex flex-wrap gap-1.5">{DEFAULT_REASONS.map((tag) => <button key={tag} type="button" onClick={() => setReason(reason === tag ? '' : tag)} className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${reason === tag ? 'bg-blue-600 text-white border-blue-600 font-medium' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>{getReasonLabel(tag)}</button>)}</div>}
          </div>

          {error && <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2.5 text-xs text-red-700 dark:text-red-300 font-medium"><AlertCircle size={16} className="text-red-500 shrink-0" /><span>{error}</span></div>}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer">{t('modal.cancel')}</button>
            <button type="submit" disabled={saving || !numericAmount || studentCount === 0} className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-xl text-white transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${mode === 'remove' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}><Check size={16} />{saving ? t(mode === 'remove' ? 'classes.bulkRemovePointsSaving' : 'classes.bulkPointsSaving') : t(mode === 'remove' ? 'classes.bulkRemovePointsSubmit' : 'classes.bulkPointsSubmit', { amount: numericAmount, count: studentCount })}</button>
          </div>
        </form>
      </div>
    </div>
  );
};
