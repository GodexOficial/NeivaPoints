import React, { useState } from "react";
import {
  Database,
  Trash2,
  Download,
  Info,
  CheckCircle,
  HardDrive,
  ShieldAlert,
  Globe,
  SunMoon,
  KeyRound,
  Lock,
} from "lucide-react";
import { useStudentContext } from "../context/StudentContext";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { ConfirmDialog } from "../components/common/ConfirmDialog";
import { LanguageSwitcher } from "../components/common/LanguageSwitcher";
import { ThemeSwitcher } from "../components/common/ThemeSwitcher";

export const SettingsPage: React.FC = () => {
  const {
    classes,
    students,
    transactions,
    hasSampleData,
    loadSampleData,
    clearSampleData,
    resetClassesToDefault,
    clearAllData,
  } = useStudentContext();
  const { t } = useLanguage();
  const {
    teacherSecurityKey,
    studentSecurityKey,
    updateTeacherSecurityKey,
    updateStudentSecurityKey,
  } = useAuth();

  const [newKeyInput, setNewKeyInput] = useState(teacherSecurityKey);
  const [newStudentKeyInput, setNewStudentKeyInput] = useState(studentSecurityKey);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [clearSampleConfirmOpen, setClearSampleConfirmOpen] = useState(false);
  const [resetClassesConfirmOpen, setResetClassesConfirmOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  const handleLoadSample = () => {
    loadSampleData();
    showFeedback(t("settings.sampleLoaded"));
  };

  const handleClearSample = () => {
    clearSampleData();
    setClearSampleConfirmOpen(false);
    showFeedback(t("settings.sampleCleared"));
  };

  const handleResetClasses = () => {
    resetClassesToDefault();
    setResetClassesConfirmOpen(false);
    showFeedback(t("settings.classesRestored"));
  };

  const handleResetAll = () => {
    clearAllData();
    setResetConfirmOpen(false);
    showFeedback(t("settings.resetDone"));
  };

  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in duration-150">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {t("settings.title")}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {t("settings.subtitle")}
        </p>
      </div>

      {feedbackMessage && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-3 text-sm text-emerald-800 dark:text-emerald-300 font-semibold animate-in fade-in">
          <CheckCircle size={18} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Appearance & Theme Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="p-2.5 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-xl">
            <SunMoon size={22} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {t("settings.themeTitle")}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("settings.themeSubtitle")}
            </p>
          </div>
        </div>

        <ThemeSwitcher variant="full" />
      </div>

      {/* Language Selection Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Globe size={22} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {t("settings.langTitle")}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("settings.langSubtitle")}
            </p>
          </div>
        </div>

        <LanguageSwitcher variant="full" />
      </div>

      {/* Teacher Security Master Key Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="p-2.5 bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 rounded-xl">
            <KeyRound size={22} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {t("settings.teacherSecurityTitle")}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("settings.teacherSecurityDesc")}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={newKeyInput}
              onChange={(e) => setNewKeyInput(e.target.value)}
              placeholder="e.g. PROF2025"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
            />
            <Lock size={16} className="absolute left-3.5 top-3 text-slate-400 dark:text-slate-500" />
          </div>
          <button
            type="button"
            onClick={async () => {
              if (newKeyInput.trim()) {
                try {
                  await updateTeacherSecurityKey(newKeyInput.trim());
                  showFeedback(t("settings.keyUpdated"));
                } catch (error) {
                  console.error("Could not update teacher security key:", error);
                  showFeedback("Não foi possível atualizar a chave no Supabase.");
                }
              }
            }}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            {t("settings.updateKey")}
          </button>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800 pt-5">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
            {t("settings.studentSecurityTitle")}
          </label>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            {t("settings.studentSecurityDesc")}
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={newStudentKeyInput}
                onChange={(e) => setNewStudentKeyInput(e.target.value)}
                placeholder="e.g. ALUNO2026"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
              <Lock size={16} className="absolute left-3.5 top-3 text-slate-400 dark:text-slate-500" />
            </div>
            <button
              type="button"
              onClick={async () => {
                if (newStudentKeyInput.trim()) {
                  try {
                    await updateStudentSecurityKey(newStudentKeyInput.trim());
                    showFeedback(t("settings.studentKeyUpdated"));
                  } catch (error) {
                    console.error("Could not update student security key:", error);
                    showFeedback("Não foi possível atualizar a chave no Supabase.");
                  }
                }
              }}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              {t("settings.updateKey")}
            </button>
          </div>
        </div>
      </div>

      {/* Data Management Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl">
            <Database size={22} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {t("settings.dataTitle")}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("settings.dataSubtitle")}
            </p>
          </div>
        </div>

        {/* Current Storage Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              {t("settings.regStudents")}
            </span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5 block">
              {students.length}
            </span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              {t("settings.regClasses")}
            </span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5 block">
              {classes.length}
            </span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              {t("settings.pointTx")}
            </span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5 block">
              {transactions.length}
            </span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              {t("settings.persistence")}
            </span>
            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 mt-1 flex items-center gap-1.5">
              <HardDrive size={15} /> {t("settings.localEngine")}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            type="button"
            onClick={handleLoadSample}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-semibold text-xs rounded-xl border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
          >
            <Download size={15} />
            <span>{t("settings.loadSample")}</span>
          </button>

          <button
            type="button"
            onClick={() => setResetClassesConfirmOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
          >
            <span>{t("settings.resetClasses")}</span>
          </button>

          {hasSampleData && (
            <button
              type="button"
              onClick={() => setClearSampleConfirmOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            >
              <Trash2 size={15} />
              <span>{t("settings.clearSample")}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setResetConfirmOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 font-semibold text-xs rounded-xl border border-red-200 dark:border-red-800 transition-colors cursor-pointer sm:ml-auto"
          >
            <ShieldAlert size={15} />
            <span>{t("settings.resetAll")}</span>
          </button>
        </div>
      </div>

      {/* Level Progression Reference */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="p-2.5 bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 rounded-xl">
            <Info size={22} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {t("settings.rulesTitle")}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("settings.formula")}
            </p>
          </div>
        </div>

        <div className="text-xs text-slate-600 dark:text-slate-300 space-y-2">
          <p>
            {t("settings.formulaDesc")}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-4">{t("settings.thLevel")}</th>
                <th className="py-2.5 px-4">{t("settings.thRange")}</th>
                <th className="py-2.5 px-4">{t("settings.thExample")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              <tr>
                <td className="py-2.5 px-4 font-bold text-blue-700 dark:text-blue-400">{t("students.level")} 1</td>
                <td className="py-2.5 px-4">0 – 99 {t("history.points")}</td>
                <td className="py-2.5 px-4">50 pts &rarr; {t("students.level")} 1, 50%</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-bold text-blue-700 dark:text-blue-400">{t("students.level")} 2</td>
                <td className="py-2.5 px-4">100 – 199 {t("history.points")}</td>
                <td className="py-2.5 px-4">150 pts &rarr; {t("students.level")} 2, 50%</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-bold text-indigo-700 dark:text-indigo-400">
                  {t("students.level")} 3
                </td>
                <td className="py-2.5 px-4">200 – 299 {t("history.points")}</td>
                <td className="py-2.5 px-4">272 pts &rarr; {t("students.level")} 3, 72%</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-bold text-indigo-700 dark:text-indigo-400">
                  {t("students.level")} 4
                </td>
                <td className="py-2.5 px-4">300 – 399 {t("history.points")}</td>
                <td className="py-2.5 px-4">350 pts &rarr; {t("students.level")} 4, 50%</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-bold text-purple-700 dark:text-purple-400">
                  {t("students.level")} 5
                </td>
                <td className="py-2.5 px-4">400 – 499 {t("history.points")}</td>
                <td className="py-2.5 px-4">420 pts &rarr; {t("students.level")} 5, 20%</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-bold text-amber-700 dark:text-amber-400">
                  {t("students.level")} N
                </td>
                <td className="py-2.5 px-4">(N-1)*100 – (N*100 - 1)</td>
                <td className="py-2.5 px-4">Floor(points / 100) + 1</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={resetClassesConfirmOpen}
        title={t("settings.resetClassesTitle")}
        message={t("settings.resetClassesMsg")}
        description={t("settings.resetClassesDesc")}
        confirmLabel={t("settings.resetClassesConfirm")}
        cancelLabel={t("modal.cancel")}
        variant="warning"
        onConfirm={handleResetClasses}
        onCancel={() => setResetClassesConfirmOpen(false)}
      />

      <ConfirmDialog
        isOpen={clearSampleConfirmOpen}
        title={t("settings.clearSampleTitle")}
        message={t("settings.clearSampleMsg")}
        description={t("settings.clearSampleDesc")}
        confirmLabel={t("settings.clearSampleConfirm")}
        cancelLabel={t("modal.cancel")}
        variant="warning"
        onConfirm={handleClearSample}
        onCancel={() => setClearSampleConfirmOpen(false)}
      />

      <ConfirmDialog
        isOpen={resetConfirmOpen}
        title={t("settings.resetTitle")}
        message={t("settings.resetMsg")}
        description={t("settings.resetDesc")}
        confirmLabel={t("settings.resetConfirm")}
        cancelLabel={t("modal.cancel")}
        variant="danger"
        onConfirm={handleResetAll}
        onCancel={() => setResetConfirmOpen(false)}
      />
    </div>
  );
};
