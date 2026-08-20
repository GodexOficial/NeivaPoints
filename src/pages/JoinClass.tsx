import React, { useState, useEffect } from "react";
import {
  GraduationCap,
  CheckCircle,
  ArrowRight,
  RotateCcw,
  ShieldAlert,
  ArrowLeft,
} from "lucide-react";
import type { ClassId, StudentWithStats } from "../types";
import { useStudentContext } from "../context/StudentContext";
import { useLanguage } from "../context/LanguageContext";
import { LanguageSwitcher } from "../components/common/LanguageSwitcher";
import { ThemeSwitcher } from "../components/common/ThemeSwitcher";

interface JoinClassProps {
  onReturnToTeacher: () => void;
}

export const JoinClassPage: React.FC<JoinClassProps> = ({
  onReturnToTeacher,
}) => {
  const { classes, addStudent, getClassById } = useStudentContext();
  const { t, getClassName } = useLanguage();

  const [name, setName] = useState("");
  const [classId, setClassId] = useState<ClassId>(classes.length > 0 ? classes[0].id : "");
  const [error, setError] = useState<string | null>(null);
  const [registeredStudent, setRegisteredStudent] =
    useState<StudentWithStats | null>(null);

  useEffect(() => {
    if (classes.length > 0 && !classId) {
      setClassId(classes[0].id);
    }
  }, [classes, classId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(t("join.errorName"));
      return;
    }

    if (!classId) {
      setError(t("join.errorClass"));
      return;
    }

    try {
      const student = await addStudent(trimmedName, classId);
      setRegisteredStudent(student);
      setName("");
    } catch (err: any) {
      setError(err.message || "Failed to complete registration.");
    }
  };

  const handleRegisterAnother = () => {
    setRegisteredStudent(null);
    setName("");
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50/50 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 flex flex-col justify-between p-4 sm:p-6 lg:p-8 transition-colors duration-200">
      {/* Top Bar with Discrete Teacher Return, Theme Switcher & Language Switcher */}
      <div className="max-w-xl mx-auto w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-extrabold text-sm shadow-xs">
            P
          </div>
          <span className="hidden sm:inline font-bold text-slate-800 dark:text-white text-sm tracking-tight">
            PointsTracker
          </span>
        </div>

        <div className="flex items-center gap-2">
          <ThemeSwitcher variant="icon" className="scale-90" />
          <LanguageSwitcher variant="pill" className="scale-90" />

          <button
            type="button"
            onClick={onReturnToTeacher}
            className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white font-medium inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 shadow-2xs transition-colors cursor-pointer"
          >
            <ArrowLeft size={13} />
            <span className="hidden sm:inline">{t("join.teacherBtn")}</span>
          </button>
        </div>
      </div>

      {/* Main Student Card Container */}
      <div className="max-w-md mx-auto w-full my-auto py-8">
        {!registeredStudent ? (
          /* Registration Form Screen */
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl overflow-hidden p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="text-center mb-8">
              <div className="w-14 h-14 mx-auto mb-4 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-md">
                <GraduationCap size={28} />
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {t("join.title")}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {t("join.subtitle")}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 font-medium flex items-center gap-2">
                  <ShieldAlert
                    size={16}
                    className="text-red-500 dark:text-red-400 flex-shrink-0"
                  />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  {t("join.fullName")}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder={t("join.namePlaceholder")}
                  autoFocus
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  {t("join.selectClass")}
                </label>
                <select
                  value={classId}
                  onChange={(e) => {
                    setClassId(e.target.value as ClassId);
                    if (error) setError(null);
                  }}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {getClassName(c.id, c.name)}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 uppercase tracking-wider cursor-pointer"
              >
                <span>{t("join.btn")}</span>
                <ArrowRight size={18} />
              </button>
            </form>
          </div>
        ) : (
          /* Registration Success Screen (Spec Section 7) */
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-emerald-100 dark:border-emerald-900/60 shadow-xl overflow-hidden p-6 sm:p-8 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center">
              <CheckCircle size={36} />
            </div>

            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {t("join.successTitle")}
            </h2>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-2">
              {t("join.welcome", { name: registeredStudent.name })}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t("join.addedTo", {
                className: getClassName(
                  registeredStudent.classId,
                  getClassById(registeredStudent.classId)?.name
                ),
              })}
            </p>

            {/* Initial Stats & Credentials Display */}
            <div className="mt-6 space-y-3">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl grid grid-cols-2 gap-3">
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    {t("join.currentPoints")}
                  </span>
                  <span className="text-xl font-extrabold text-slate-900 dark:text-white mt-1 block">
                    0
                  </span>
                </div>

                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    {t("join.currentLevel")}
                  </span>
                  <span className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1 block">
                    {t("join.level1")}
                  </span>
                </div>
              </div>

              {/* Login Credentials Note */}
              <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-800/60 rounded-2xl text-left text-xs">
                <span className="font-bold text-blue-900 dark:text-blue-300 block mb-1">
                  Your Login Credentials:
                </span>
                <div className="flex items-center justify-between font-mono text-slate-800 dark:text-slate-200 bg-white/80 dark:bg-slate-900/80 p-2 rounded-xl border border-blue-100 dark:border-blue-900/40">
                  <span>Login: <strong>{registeredStudent.username || 'student'}</strong></span>
                  <span>Password: <strong>{registeredStudent.password || '123456'}</strong></span>
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-3">
              <button
                type="button"
                onClick={handleRegisterAnother}
                className="w-full py-3 px-4 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 uppercase tracking-wider cursor-pointer"
              >
                <RotateCcw size={14} />
                <span>{t("join.registerAnother")}</span>
              </button>

              <button
                type="button"
                onClick={onReturnToTeacher}
                className="w-full py-2.5 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                {t("join.done")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer / Info */}
      <div className="max-w-xl mx-auto w-full text-center text-xs text-slate-400 dark:text-slate-500">
        <span>{t("join.footer")}</span>
      </div>
    </div>
  );
};
