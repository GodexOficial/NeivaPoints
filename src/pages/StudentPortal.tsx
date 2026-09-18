import React, { useCallback, useEffect, useState } from "react";
import {
  Award,
  Sparkles,
  TrendingUp,
  LogOut,
  User,
  GraduationCap,
  Calendar,
  Shield,
  Info,
  AppWindow,
  LayoutDashboard,
  Menu,
  X,
} from "lucide-react";
import { AppsHub } from "./AppsHub";
import { useAuth } from "../context/AuthContext";
import { useStudentContext } from "../context/StudentContext";
import { useLanguage } from "../context/LanguageContext";
import { ProgressBar } from "../components/common/ProgressBar";
import { LevelBadge } from "../components/common/LevelBadge";
import { HistoryList } from "../components/history/HistoryList";
import { ThemeSwitcher } from "../components/common/ThemeSwitcher";
import { LanguageSwitcher } from "../components/common/LanguageSwitcher";
import { formatDateTime } from "../utils/dateFormatter";
import { LoginXpTracker } from "../components/students/LoginXpTracker";
import { StudentLeaderboard } from "../components/students/StudentLeaderboard";
import { DEFAULT_ENGAGEMENT_SETTINGS, EngagementService, type EngagementSettings } from "../services/engagementService";
import { LeaderboardService, type LeaderboardStudent } from "../services/leaderboardService";

export const StudentPortal: React.FC = () => {
  const { currentStudent, logout, refreshAuth } = useAuth();
  const { getClassById, transactions, students, refreshData } = useStudentContext();
  const { t, language, getClassName } = useLanguage();
  const [activeTab, setActiveTab] = useState<'portal' | 'apps'>('portal');
  const [isWordEditorOpen, setIsWordEditorOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [engagementSettings, setEngagementSettings] = useState<EngagementSettings>(DEFAULT_ENGAGEMENT_SETTINGS);
  const [leaderboardStudents, setLeaderboardStudents] = useState<LeaderboardStudent[]>([]);

  useEffect(() => {
    EngagementService.getSettings().then(setEngagementSettings).catch((error) => console.error("Could not load XP settings:", error));
  }, []);

  useEffect(() => {
    let active = true;
    LeaderboardService.getStudents(students)
      .then((data) => {
        if (active) setLeaderboardStudents(data);
      })
      .catch((error) => console.error("Could not load leaderboard:", error));
    return () => { active = false; };
  }, [students]);

  const refreshPoints = useCallback(() => {
    void refreshData();
    void refreshAuth();
  }, [refreshAuth, refreshData]);

  if (!currentStudent) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 text-center space-y-4">
          <User size={36} className="mx-auto text-slate-400" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {t("details.notFoundTitle")}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t("details.notFoundDesc")}
          </p>
          <button
            type="button"
            onClick={logout}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold cursor-pointer"
          >
            {t("auth.logout")}
          </button>
        </div>
      </div>
    );
  }

  const studentClass = getClassById(currentStudent.classId);
  const localizedClassName = getClassName(
    currentStudent.classId,
    studentClass?.name,
  );

  // Filter transactions strictly for this student
  const studentTransactions = transactions.filter(
    (tx) => tx.studentId === currentStudent.id,
  );
  const monthlyXp = (() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    return studentTransactions.filter((transaction) => transaction.type === "add" && new Date(transaction.createdAt).getTime() >= monthStart).reduce((sum, transaction) => sum + transaction.amount, 0);
  })();
  const monthlyCycleProgress = monthlyXp % engagementSettings.monthlyGoal;
  const monthlyProgressPercentage = Math.round((monthlyCycleProgress / engagementSettings.monthlyGoal) * 100);

  return (
    <div className={`${isWordEditorOpen ? 'h-screen overflow-hidden' : 'min-h-screen'} bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200 selection:bg-blue-100 selection:text-blue-900 dark:selection:bg-blue-900 dark:selection:text-blue-100`}>
      {/* Student Top Header Navigation */}
      {!isWordEditorOpen && <header className="bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 sticky top-0 z-30 shadow-2xs">
        <div className="safe-area-x max-w-6xl mx-auto px-0 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-2 h-16">
            {/* Logo & Student Portal Badge */}
            <div className="flex shrink-0 items-center gap-3">
              <img src={`${import.meta.env.BASE_URL}Logo MD.webp`} alt="NeivaPoints" className="w-10 h-10 shrink-0 rounded-full object-cover shadow-xs" />
              <div className="hidden lg:block">
                <span className="font-extrabold text-slate-900 dark:text-white text-base leading-tight block tracking-tight">
                  {t("nav.brand")}
                </span>
                <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
                  {t("auth.studentPortalTitle")}
                </span>
              </div>
            </div>

            {/* Navigation Tabs for Student: Meu Painel / Apps */}
            <div className="flex shrink-0 items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => { setActiveTab('portal'); setIsMenuOpen(false); }}
                className={`inline-flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  activeTab === 'portal'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <LayoutDashboard size={15} />
                <span className="hidden sm:inline">Meu Painel</span>
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('apps'); setIsMenuOpen(false); }}
                className={`inline-flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  activeTab === 'apps'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <AppWindow size={15} />
                <span className="hidden sm:inline">Aplicativos</span>
              </button>
            </div>

            {/* Quick Actions: Theme, Language, Log Out */}
            <div className="hidden sm:flex shrink-0 items-center gap-1.5">
              <ThemeSwitcher variant="icon" />
              <div className="hidden md:block"><LanguageSwitcher variant="pill" /></div>

              <button
                type="button"
                onClick={logout}
                className="inline-flex h-10 items-center gap-1.5 px-2.5 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800/60 transition-colors shadow-2xs cursor-pointer"
                title={t("auth.logout")}
              >
                <LogOut size={14} />
                <span className="hidden xl:inline">{t("auth.logout")}</span>
              </button>
            </div>
            <button type="button" onClick={() => setIsMenuOpen((current) => !current)} className="sm:hidden inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" aria-label={isMenuOpen ? "Fechar menu" : "Abrir menu"} aria-expanded={isMenuOpen}>
              {isMenuOpen ? <X size={21} /> : <Menu size={21} />}
            </button>
          </div>
        </div>
      </header>}
      {!isWordEditorOpen && isMenuOpen && <div className="safe-area-x sm:hidden sticky top-16 z-20 border-b border-slate-200 bg-white px-0 py-3 shadow-lg dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-6xl flex-col gap-2">
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800"><span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t("settings.themeTitle")}</span><ThemeSwitcher variant="toggle" /></div>
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800"><span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t("settings.langTitle")}</span><LanguageSwitcher variant="toggle" /></div>
          <button type="button" onClick={logout} className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-bold text-red-600 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400"><LogOut size={16} />{t("auth.logout")}</button>
        </div>
      </div>}

      {/* Main Content View */}
      {activeTab === 'apps' ? (
        <main className={isWordEditorOpen ? 'flex-1 min-h-0 w-full' : 'max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1'}>
          <AppsHub onWordEditorChange={setIsWordEditorOpen} />
        </main>
      ) : (
        <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6 flex-1">
        {/* Welcome & Privacy Banner */}
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200/80 dark:border-blue-800/60 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs">
              <GraduationCap size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                {t("portal.welcome", { name: currentStudent.name })}
              </h2>
              <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                {t("portal.yourClass", { className: localizedClassName })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-semibold bg-white/70 dark:bg-slate-900/70 px-3 py-1.5 rounded-xl border border-blue-100 dark:border-blue-900/50 self-start sm:self-auto">
            <Shield
              size={13}
              className="text-emerald-600 dark:text-emerald-400"
            />
            <span>{t("portal.securityNote")}</span>
          </div>
        </div>

        <LoginXpTracker studentId={currentStudent.id} settings={engagementSettings} onPointsChanged={refreshPoints} />

        <StudentLeaderboard
          students={leaderboardStudents.map((student) => ({
            ...student,
            className: getClassName(student.classId, student.className),
          }))}
          currentStudentId={currentStudent.id}
          currentClassId={currentStudent.classId}
        />

        <div className="rounded-2xl border border-violet-200 bg-white p-5 shadow-xs dark:border-violet-900/70 dark:bg-slate-900">
          <div className="mb-2 flex items-center justify-between gap-3"><div><p className="text-sm font-extrabold text-slate-900 dark:text-white">Recompensa mensal</p><p className="text-xs text-slate-500 dark:text-slate-400">A barra reinicia automaticamente ao completar cada meta.</p></div><span className="text-sm font-extrabold text-violet-600 dark:text-violet-400">{monthlyCycleProgress} / {engagementSettings.monthlyGoal} XP</span></div>
          <ProgressBar progress={monthlyProgressPercentage} size="lg" showLabel={false} />
          <p className="mt-2 text-right text-[11px] font-semibold text-slate-500 dark:text-slate-400">{monthlyXp >= engagementSettings.monthlyGoal ? `${Math.floor(monthlyXp / engagementSettings.monthlyGoal)} meta(s) concluída(s) neste mês` : "Continue acumulando XP neste mês"}</p>
        </div>

        {/* Hero Card: Points & Level Progress */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 px-3 py-1 rounded-lg">
                  {localizedClassName}
                </span>
                {currentStudent.username && (
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                    @{currentStudent.username}
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight uppercase mt-2 break-words">
                {currentStudent.name}
              </h1>
              <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Calendar size={13} className="text-slate-400" />
                <span>
                  {t("details.registeredDate", {
                    date: formatDateTime(
                      currentStudent.createdAt,
                      language === "pt" ? "pt-BR" : "en-US",
                    ),
                  })}
                </span>
              </div>
            </div>

            <LevelBadge level={currentStudent.level} size="lg" />
          </div>

          {/* 3 Metric Summary Boxes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Current Points */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 p-5 rounded-2xl border border-amber-200/80 dark:border-amber-800/60 shadow-2xs flex items-center gap-4">
              <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-xs">
                <Sparkles size={24} />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400 block">
                  {t("portal.yourPoints")}
                </span>
                <span className="text-2xl sm:text-3xl font-extrabold text-amber-950 dark:text-amber-200 mt-0.5 block">
                  {currentStudent.points}{" "}
                  <span className="text-xs font-semibold text-amber-700/80 dark:text-amber-400 uppercase">
                    pts
                  </span>
                </span>
              </div>
            </div>

            {/* Current Level */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-2xs flex items-center gap-4">
              <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-xs">
                <Award size={24} />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  {t("portal.yourLevel")}
                </span>
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-0.5 block uppercase">
                  {t("students.level")} {currentStudent.level}
                </span>
              </div>
            </div>

            {/* Next Milestone */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-2xs flex items-center gap-4">
              <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-xs">
                <TrendingUp size={24} />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  {t("portal.nextLevel")}
                </span>
                <span className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5 block">
                  {t("portal.ptsNeeded", {
                    points: currentStudent.pointsToNextLevel,
                    level: currentStudent.level + 1,
                  })}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {t("details.ptsInLevel", {
                    current: currentStudent.pointsInCurrentLevel,
                    level: currentStudent.level,
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Level Progress Bar */}
          <div className="pt-2">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                {t("portal.levelProgress", {
                  level: currentStudent.level,
                  progress: currentStudent.progressPercentage,
                })}
              </span>
              <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400">
                {currentStudent.progressPercentage}%
              </span>
            </div>
            <ProgressBar
              progress={currentStudent.progressPercentage}
              size="lg"
              showLabel={false}
            />
            <div className="flex justify-between items-center mt-2 text-xs text-slate-400 dark:text-slate-500 font-medium">
              <span>
                {t("details.levelStart", {
                  level: currentStudent.level,
                  points: (currentStudent.level - 1) * 100,
                })}
              </span>
              <span>
                {t("details.levelTarget", {
                  points: currentStudent.pointsToNextLevel,
                  nextLevel: currentStudent.level + 1,
                  total: currentStudent.level * 100,
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Point Transactions History (Only this student's records) */}
        <div>
          <HistoryList
            transactions={studentTransactions}
            studentName={currentStudent.name}
            emptyMessage={t("portal.historyEmpty")}
          />
        </div>

        {/* Motivational / Rules Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex items-start gap-3.5">
          <div className="p-2.5 bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 rounded-xl mt-0.5">
            <Info size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {t("settings.rulesTitle")}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              {t("settings.formulaDesc")}
            </p>
          </div>
        </div>
      </main>
      )}

    </div>
  );
};
