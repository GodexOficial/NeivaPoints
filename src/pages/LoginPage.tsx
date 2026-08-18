import React, { useState } from "react";
import {
  GraduationCap,
  ShieldCheck,
  User,
  KeyRound,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  BookOpen,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useStudentContext } from "../context/StudentContext";
import { useLanguage } from "../context/LanguageContext";
import { ThemeSwitcher } from "../components/common/ThemeSwitcher";
import { LanguageSwitcher } from "../components/common/LanguageSwitcher";
import type { ClassId } from "../types";

export const LoginPage: React.FC = () => {
  const {
    loginStudent,
    registerStudent,
    loginTeacher,
    registerTeacher,
  } = useAuth();
  const { classes } = useStudentContext();
  const { t, getClassName } = useLanguage();

  const [activeRole, setActiveRole] = useState<"student" | "teacher">("student");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  // Student Login fields
  const [studentUsername, setStudentUsername] = useState("");
  const [studentPassword, setStudentPassword] = useState("");

  // Student Register fields
  const [studentRegName, setStudentRegName] = useState("");
  const [studentRegClassId, setStudentRegClassId] = useState<ClassId>(
    classes[0]?.id || "6th-grade"
  );
  const [studentRegUsername, setStudentRegUsername] = useState("");
  const [studentRegPassword, setStudentRegPassword] = useState("");

  // Teacher Login fields
  const [teacherUser, setTeacherUser] = useState("");
  const [teacherPassword, setTeacherPassword] = useState("");

  // Teacher Register fields
  const [teacherRegName, setTeacherRegName] = useState("");
  const [teacherRegUser, setTeacherRegUser] = useState("");
  const [teacherRegPassword, setTeacherRegPassword] = useState("");
  const [teacherSecurityKey, setTeacherSecurityKey] = useState("");

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDemoCredentials, setShowDemoCredentials] = useState(false);

  // Auto-fill username when student types full name
  const handleStudentNameChange = (name: string) => {
    setStudentRegName(name);
    if (!studentRegUsername || studentRegUsername === "") {
      const normalized = name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, ".")
        .replace(/\.+/g, ".")
        .replace(/^\.|\.$/g, "");
      setStudentRegUsername(normalized);
    }
  };

  const handleRoleSwitch = (role: "student" | "teacher") => {
    setActiveRole(role);
    setAuthMode("login");
    setErrorMessage(null);
  };

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const res = await loginStudent(studentUsername, studentPassword);
    if (!res.success) {
      setErrorMessage(res.error || t("auth.errorFillAll"));
    }
  };

  const handleStudentRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!studentRegName.trim()) {
      setErrorMessage(t("auth.errorFillAll"));
      return;
    }
    if (!studentRegClassId) {
      setErrorMessage(t("auth.errorSelectClass"));
      return;
    }
    const res = await registerStudent({
      name: studentRegName,
      classId: studentRegClassId,
      username: studentRegUsername || undefined,
      password: studentRegPassword || "123456",
    });
    if (!res.success) {
      setErrorMessage(res.error || t("auth.errorFillAll"));
    }
  };

  const handleTeacherLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const res = await loginTeacher(teacherUser, teacherPassword);
    if (!res.success) {
      setErrorMessage(res.error || t("auth.errorFillAll"));
    }
  };

  const handleTeacherRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!teacherRegName.trim() || !teacherRegUser.trim() || !teacherRegPassword) {
      setErrorMessage(t("auth.errorFillAll"));
      return;
    }
    const res = await registerTeacher({
      name: teacherRegName,
      emailOrUsername: teacherRegUser,
      password: teacherRegPassword,
      securityKey: teacherSecurityKey,
    });
    if (!res.success) {
      setErrorMessage(res.error || t("auth.errorInvalidKey"));
    }
  };

  const fillDemoStudent = (user: string, pass: string) => {
    setActiveRole("student");
    setAuthMode("login");
    setStudentUsername(user);
    setStudentPassword(pass);
    setErrorMessage(null);
  };

  const fillDemoTeacher = () => {
    setActiveRole("teacher");
    setAuthMode("login");
    setTeacherUser("teacher");
    setTeacherPassword("admin123");
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 flex flex-col justify-between p-4 sm:p-6 lg:p-8 transition-colors duration-200">
      {/* Top Bar with Language and Theme switchers */}
      <header className="max-w-5xl mx-auto w-full flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-extrabold text-xl shadow-md">
            P
          </div>
          <div>
            <span className="font-extrabold text-slate-900 dark:text-white text-base leading-tight block tracking-tight">
              {t("nav.brand")}
            </span>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              {t("nav.subtitle")}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <ThemeSwitcher variant="pill" />
          <LanguageSwitcher variant="pill" />
        </div>
      </header>

      {/* Main Login / Register Container */}
      <main className="max-w-md mx-auto w-full my-6">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xl overflow-hidden p-6 sm:p-8 animate-in fade-in duration-200">
          {/* Role Switcher Tabs */}
          <div className="flex p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => handleRoleSwitch("student")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeRole === "student"
                  ? "bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <GraduationCap size={16} />
              <span>{t("auth.roleStudent")}</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleSwitch("teacher")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeRole === "teacher"
                  ? "bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <ShieldCheck size={16} />
              <span>{t("auth.roleTeacher")}</span>
            </button>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-5 p-3.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-2xl flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300 font-medium animate-in fade-in">
              <AlertCircle size={17} className="text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ======================================================== */}
          {/* STUDENT ROLE: LOGIN & REGISTRATION                       */}
          {/* ======================================================== */}
          {activeRole === "student" && authMode === "login" && (
            <div>
              <div className="text-center mb-6">
                <div className="w-12 h-12 mx-auto mb-3 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center shadow-2xs">
                  <GraduationCap size={26} />
                </div>
                <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {t("auth.studentLogin")}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t("portal.infoDesc")}
                </p>
              </div>

              <form onSubmit={handleStudentLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    {t("auth.username")}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={studentUsername}
                      onChange={(e) => {
                        setStudentUsername(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder={t("auth.usernamePlaceholder")}
                      autoFocus
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                    <User size={16} className="absolute left-3.5 top-3 text-slate-400 dark:text-slate-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    {t("auth.password")}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={studentPassword}
                      onChange={(e) => {
                        setStudentPassword(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder={t("auth.passwordPlaceholder")}
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                    <Lock size={16} className="absolute left-3.5 top-3 text-slate-400 dark:text-slate-500" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  <span>{t("auth.loginBtn")}</span>
                  <ArrowRight size={16} />
                </button>
              </form>

              <div className="mt-5 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("register");
                    setErrorMessage(null);
                  }}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer"
                >
                  {t("auth.dontHaveAccount")}
                </button>
              </div>
            </div>
          )}

          {activeRole === "student" && authMode === "register" && (
            <div>
              <div className="text-center mb-6">
                <div className="w-12 h-12 mx-auto mb-3 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center shadow-2xs">
                  <User size={26} />
                </div>
                <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {t("auth.studentRegister")}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t("join.subtitle")}
                </p>
              </div>

              <form onSubmit={handleStudentRegister} className="space-y-4">
                {/* Required: Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    {t("auth.fullName")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={studentRegName}
                    onChange={(e) => handleStudentNameChange(e.target.value)}
                    placeholder={t("auth.fullNamePlaceholder")}
                    autoFocus
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                {/* Required: Class selection box */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <BookOpen size={13} className="text-slate-400 dark:text-slate-500" />
                    <span>{t("auth.class")}</span> <span className="text-red-500">*</span>
                  </label>
                  {classes.length === 0 ? (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                      {t("form.noClassesYet")}
                    </div>
                  ) : (
                    <select
                      value={studentRegClassId}
                      onChange={(e) => setStudentRegClassId(e.target.value as ClassId)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                    >
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {getClassName(c.id, c.name)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Username */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    {t("auth.username")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={studentRegUsername}
                    onChange={(e) => setStudentRegUsername(e.target.value)}
                    placeholder={t("auth.usernamePlaceholder")}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    {t("auth.password")} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={studentRegPassword}
                      onChange={(e) => setStudentRegPassword(e.target.value)}
                      placeholder={t("auth.passwordPlaceholder")}
                      className="w-full px-3.5 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  <CheckCircle2 size={16} />
                  <span>{t("auth.registerBtn")}</span>
                </button>
              </form>

              <div className="mt-5 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("login");
                    setErrorMessage(null);
                  }}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer"
                >
                  {t("auth.alreadyHaveAccount")}
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TEACHER ROLE: LOGIN & HIGH-SECURITY REGISTRATION         */}
          {/* ======================================================== */}
          {activeRole === "teacher" && authMode === "login" && (
            <div>
              <div className="text-center mb-6">
                <div className="w-12 h-12 mx-auto mb-3 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center shadow-2xs">
                  <ShieldCheck size={26} />
                </div>
                <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {t("auth.teacherLogin")}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t("dash.subtitle")}
                </p>
              </div>

              <form onSubmit={handleTeacherLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    {t("auth.emailOrUser")}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={teacherUser}
                      onChange={(e) => {
                        setTeacherUser(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder={t("auth.emailOrUserPlaceholder")}
                      autoFocus
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                    <User size={16} className="absolute left-3.5 top-3 text-slate-400 dark:text-slate-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    {t("auth.password")}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={teacherPassword}
                      onChange={(e) => {
                        setTeacherPassword(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder={t("auth.passwordPlaceholder")}
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                    <Lock size={16} className="absolute left-3.5 top-3 text-slate-400 dark:text-slate-500" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  <ShieldCheck size={16} />
                  <span>{t("auth.loginBtn")}</span>
                </button>
              </form>

              <div className="mt-5 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("register");
                    setErrorMessage(null);
                  }}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer"
                >
                  {t("auth.dontHaveAccount")}
                </button>
              </div>
            </div>
          )}

          {activeRole === "teacher" && authMode === "register" && (
            <div>
              <div className="text-center mb-5">
                <div className="w-12 h-12 mx-auto mb-3 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center shadow-2xs">
                  <ShieldCheck size={26} />
                </div>
                <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {t("auth.teacherRegister")}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t("auth.teacherSecurityKeyHelp")}
                </p>
              </div>

              <form onSubmit={handleTeacherRegister} className="space-y-3.5">
                {/* Security Access Code Notice */}
                <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 rounded-2xl flex items-start gap-2.5 text-xs text-indigo-900 dark:text-indigo-300">
                  <KeyRound size={17} className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                  <span>{t("auth.teacherSecurityKeyHelp")}</span>
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    {t("auth.fullName")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={teacherRegName}
                    onChange={(e) => setTeacherRegName(e.target.value)}
                    placeholder={t("auth.fullNamePlaceholder")}
                    autoFocus
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>

                {/* Username / Email */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    {t("auth.emailOrUser")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={teacherRegUser}
                    onChange={(e) => setTeacherRegUser(e.target.value)}
                    placeholder={t("auth.emailOrUserPlaceholder")}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    {t("auth.password")} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={teacherRegPassword}
                      onChange={(e) => setTeacherRegPassword(e.target.value)}
                      placeholder={t("auth.passwordPlaceholder")}
                      className="w-full px-3.5 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Master Teacher Security Code */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span>{t("auth.teacherSecurityKey")}</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      value={teacherSecurityKey}
                      onChange={(e) => setTeacherSecurityKey(e.target.value)}
                      placeholder={t("auth.teacherSecurityKeyPlaceholder")}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                    <KeyRound size={16} className="absolute left-3.5 top-3 text-indigo-500" />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer mt-3"
                >
                  <ShieldCheck size={16} />
                  <span>{t("auth.registerBtn")}</span>
                </button>
              </form>

              <div className="mt-5 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("login");
                    setErrorMessage(null);
                  }}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer"
                >
                  {t("auth.alreadyHaveAccount")}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Demo Credentials Helper */}
        <div className="mt-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 text-xs text-slate-600 dark:text-slate-400">
          <button
            type="button"
            onClick={() => setShowDemoCredentials(!showDemoCredentials)}
            className="w-full flex items-center justify-between font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-500" />
              <span>{t("auth.demoAccounts")}</span>
            </span>
            <span className="text-[11px] text-blue-600 dark:text-blue-400 underline">
              {showDemoCredentials ? "Hide" : "Show"}
            </span>
          </button>

          {showDemoCredentials && (
            <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800 space-y-2 text-[11px]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <strong className="text-indigo-700 dark:text-indigo-300">Teacher:</strong>
                  <span className="ml-1">teacher / admin123</span>
                  <span className="text-slate-400 ml-1">(Key: PROF2025)</span>
                </div>
                <button
                  type="button"
                  onClick={fillDemoTeacher}
                  className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg font-bold text-[10px] hover:bg-indigo-700 transition-colors cursor-pointer self-start sm:self-auto"
                >
                  Quick Fill
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <strong className="text-blue-700 dark:text-blue-300">Student (sample01):</strong>
                  <span className="ml-1">sample01 / 123</span>
                </div>
                <button
                  type="button"
                  onClick={() => fillDemoStudent("sample01", "123")}
                  className="px-2.5 py-1 bg-blue-600 text-white rounded-lg font-bold text-[10px] hover:bg-blue-700 transition-colors cursor-pointer self-start sm:self-auto"
                >
                  Quick Fill
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <strong className="text-blue-700 dark:text-blue-300">Student (sample04):</strong>
                  <span className="ml-1">sample04 / 123</span>
                </div>
                <button
                  type="button"
                  onClick={() => fillDemoStudent("sample04", "123")}
                  className="px-2.5 py-1 bg-blue-600 text-white rounded-lg font-bold text-[10px] hover:bg-blue-700 transition-colors cursor-pointer self-start sm:self-auto"
                >
                  Quick Fill
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-md mx-auto w-full text-center text-xs text-slate-400 dark:text-slate-500">
        <span>{t("join.footer")}</span>
      </footer>
    </div>
  );
};
