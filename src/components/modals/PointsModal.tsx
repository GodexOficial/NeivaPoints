import React, { useState, useEffect } from 'react';
import { PlusCircle, MinusCircle, X, Check, ArrowRight, AlertCircle } from 'lucide-react';
import type { StudentWithStats } from '../../types';
import { QUICK_POINT_OPTIONS, DEFAULT_REASONS } from '../../types';
import { useStudentContext } from '../../context/StudentContext';
import { useLanguage } from '../../context/LanguageContext';
import { calculateLevel, calculateProgress } from '../../utils/levelCalculator';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface PointsModalProps {
  isOpen: boolean;
  student: StudentWithStats | null;
  initialMode?: 'add' | 'remove';
  onClose: () => void;
  onSuccess?: () => void;
}

export const PointsModal: React.FC<PointsModalProps> = ({
  isOpen,
  student,
  initialMode = 'add',
  onClose,
  onSuccess,
}) => {
  const { addPoints, removePoints } = useStudentContext();
  const { t, getClassName, getReasonLabel } = useLanguage();

  const [mode, setMode] = useState<'add' | 'remove'>(initialMode);
  const [amount, setAmount] = useState<number | ''>(10);
  const [selectedQuick, setSelectedQuick] = useState<number | null>(10);
  const [reason, setReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const [isCustomReason, setIsCustomReason] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setAmount(10);
      setSelectedQuick(10);
      setReason('');
      setCustomReason('');
      setIsCustomReason(false);
      setError(null);
      setShowRemoveConfirm(false);
    }
  }, [isOpen, initialMode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || showRemoveConfirm) return;
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showRemoveConfirm, onClose]);

  if (!isOpen || !student) return null;

  const currentPoints = student.points;
  const numAmount = typeof amount === 'number' ? amount : 0;

  const projectedPoints =
    mode === 'add'
      ? currentPoints + numAmount
      : Math.max(0, currentPoints - numAmount);

  const projectedLevel = calculateLevel(projectedPoints);
  const projectedProgress = calculateProgress(projectedPoints);

  const handleQuickSelect = (val: number) => {
    setSelectedQuick(val);
    setAmount(val);
    setError(null);
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    if (rawVal === '') {
      setAmount('');
      setSelectedQuick(null);
      setError(null);
      return;
    }
    const parsed = parseInt(rawVal, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      setAmount(parsed);
      setSelectedQuick(QUICK_POINT_OPTIONS.includes(parsed as any) ? parsed : null);
      setError(null);
    }
  };

  const handleReasonTagClick = (tag: string) => {
    if (reason === tag && !isCustomReason) {
      setReason('');
    } else {
      setReason(tag);
      setIsCustomReason(false);
      setCustomReason('');
    }
  };

  const effectiveReason = isCustomReason ? customReason.trim() : reason;

  const executeAction = () => {
    if (!numAmount || numAmount <= 0) {
      setError(t('modal.errorPositive'));
      return;
    }

    if (mode === 'remove' && numAmount > currentPoints) {
      setError(t('modal.errorInsufficient'));
      return;
    }

    try {
      if (mode === 'add') {
        addPoints(student.id, numAmount, effectiveReason || undefined);
      } else {
        removePoints(student.id, numAmount, effectiveReason || undefined);
      }
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!numAmount || numAmount <= 0) {
      setError(t('modal.errorPositive'));
      return;
    }

    if (mode === 'remove') {
      if (numAmount > currentPoints) {
        setError(t('modal.errorInsufficient'));
        return;
      }
      // Require confirmation for removing points
      setShowRemoveConfirm(true);
      return;
    }

    executeAction();
  };

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs cursor-pointer"
        role="dialog"
        aria-modal="true"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150 cursor-default"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {mode === 'add' ? t('modal.addTitle') : t('modal.removeTitle')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {student.name} • {getClassName(student.classId)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Mode Switcher */}
            <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setMode('add');
                  setError(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  mode === 'add'
                    ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <PlusCircle size={15} />
                {t('modal.addTitle')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('remove');
                  setError(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  mode === 'remove'
                    ? 'bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <MinusCircle size={15} />
                {t('modal.removeTitle')}
              </button>
            </div>

            {/* Quick Amount Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                {t('modal.quickSelect')}
              </label>
              <div className="grid grid-cols-5 gap-2">
                {QUICK_POINT_OPTIONS.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleQuickSelect(val)}
                    className={`py-2 px-3 text-sm font-semibold rounded-xl border transition-all cursor-pointer ${
                      selectedQuick === val && amount === val
                        ? mode === 'add'
                          ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-600 dark:border-blue-500 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20'
                          : 'bg-red-50 dark:bg-red-950/60 border-red-600 dark:border-red-500 text-red-700 dark:text-red-300 ring-2 ring-red-500/20'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    {mode === 'add' ? `+${val}` : `-${val}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Amount Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                {t('modal.customAmount')}
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={amount}
                  onChange={handleCustomAmountChange}
                  placeholder={t('modal.enterPoints')}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Optional Reason */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  {t('modal.reason')} <span className="text-slate-400 dark:text-slate-500 font-normal lowercase">{t('modal.optional')}</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomReason(!isCustomReason);
                    if (!isCustomReason) setReason('');
                  }}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium cursor-pointer"
                >
                  {isCustomReason ? t('modal.presets') : t('modal.customReason')}
                </button>
              </div>

              {isCustomReason ? (
                <input
                  type="text"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder={t('modal.customReasonPlaceholder')}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {DEFAULT_REASONS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleReasonTagClick(tag)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                        reason === tag
                          ? 'bg-blue-600 text-white border-blue-600 font-medium'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      {getReasonLabel(tag)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2.5 text-xs text-red-700 dark:text-red-300 font-medium">
                <AlertCircle size={16} className="text-red-500 dark:text-red-400 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Impact Preview */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-xl">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                {t('modal.projectedChange')}
              </div>
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400">{t('students.points')}: </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{currentPoints}</span>
                  <ArrowRight size={12} className="inline mx-1.5 text-slate-400 dark:text-slate-500" />
                  <span className={`font-bold ${mode === 'add' ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                    {projectedPoints}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">{t('students.level')}: </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{t('students.level')} {student.level}</span>
                  <ArrowRight size={12} className="inline mx-1.5 text-slate-400 dark:text-slate-500" />
                  <span className={`font-bold ${projectedLevel > student.level ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}`}>
                    {t('students.level')} {projectedLevel}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">{t('students.colProgress')}: </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{projectedProgress}%</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                {t('modal.cancel')}
              </button>
              <button
                type="submit"
                disabled={!numAmount || numAmount <= 0}
                className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-xl text-white transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                  mode === 'add'
                    ? 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                    : 'bg-red-600 hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2'
                }`}
              >
                <Check size={16} />
                {mode === 'add'
                  ? t('modal.addSubmit', { amount: numAmount || 0 })
                  : t('modal.removeSubmit', { amount: numAmount || 0 })}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Confirmation Modal for Removing Points */}
      <ConfirmDialog
        isOpen={showRemoveConfirm}
        title={t('modal.removeConfirmTitle')}
        message={t('modal.removeConfirmMsg', { amount: numAmount, name: student.name })}
        description={t('modal.removeConfirmDesc')}
        confirmLabel={t('modal.removeConfirmBtn')}
        cancelLabel={t('modal.cancel')}
        variant="warning"
        onConfirm={() => {
          setShowRemoveConfirm(false);
          executeAction();
        }}
        onCancel={() => setShowRemoveConfirm(false)}
      />
    </>
  );
};
