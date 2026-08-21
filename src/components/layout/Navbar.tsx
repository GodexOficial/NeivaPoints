import React, { useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Settings,
  UserCheck,
  Menu,
  X,
  AppWindow,
} from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import { LanguageSwitcher } from "../common/LanguageSwitcher";
import { ThemeSwitcher } from "../common/ThemeSwitcher";
import { LogOut } from "lucide-react";

export type NavTab =
  | "dashboard"
  | "students"
  | "classes"
  | "apps"
  | "settings"
  | "join-class";

interface NavbarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  mobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  mobileMenuOpen,
  onToggleMobileMenu,
}) => {
  const { t } = useLanguage();
  const { logout, currentUser } = useAuth();

  const navItems = [
    { id: "dashboard" as NavTab, label: t("nav.dashboard"), icon: LayoutDashboard },
    { id: "students" as NavTab, label: t("nav.students"), icon: Users },
    { id: "classes" as NavTab, label: t("nav.classes"), icon: GraduationCap },
    { id: "apps" as NavTab, label: t("nav.apps"), icon: AppWindow },
    { id: "settings" as NavTab, label: t("nav.settings"), icon: Settings },
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileMenuOpen) {
        onToggleMobileMenu();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen, onToggleMobileMenu]);

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 sticky top-0 z-30 shadow-2xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Logo / Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onSelectTab("dashboard")}
              className="flex items-center gap-2.5 text-left group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-extrabold text-lg shadow-xs group-hover:scale-105 transition-transform shrink-0">
                P
              </div>
              <div className="hidden sm:block shrink-0">
                <span className="font-extrabold text-slate-900 dark:text-white text-base leading-tight block tracking-tight">
                  {t("nav.brand")}
                </span>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  {t("nav.subtitle")}
                </span>
              </div>
            </button>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden xl:flex items-center space-x-0.5 xl:space-x-1 shrink-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`inline-flex items-center gap-1.5 xl:gap-2 px-2.5 xl:px-3.5 py-2 rounded-xl text-xs xl:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    isActive
                      ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/70"
                  }`}
                >
                  <Icon
                    size={17}
                    className={isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500"}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Quick Actions: Dark Mode Button, Language Switcher, Join Mode, Teacher Badge & Logout */}
          <div className="hidden xl:flex items-center gap-1.5 xl:gap-2 shrink-0">
            <ThemeSwitcher variant="pill" />
            <LanguageSwitcher variant="pill" />

            <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

            <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="truncate max-w-[120px]">{currentUser?.name || t("auth.roleTeacher")}</span>
            </div>

            <button
              type="button"
              onClick={() => onSelectTab("join-class")}
              className="inline-flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200/80 dark:border-indigo-800 transition-colors shadow-2xs cursor-pointer whitespace-nowrap"
            >
              <UserCheck size={15} />
              <span className="hidden xl:inline">{t("nav.joinClass")}</span>
              <span className="xl:hidden">{t("nav.joinClassShort")}</span>
            </button>

            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/40 border border-slate-200 dark:border-slate-700 hover:border-red-200 dark:hover:border-red-800 transition-colors shadow-2xs cursor-pointer whitespace-nowrap"
              title={t("auth.logout")}
            >
              <LogOut size={14} />
              <span className="hidden xl:inline">{t("auth.logout")}</span>
            </button>
          </div>

          {/* Mobile menu button & quick switch */}
          <div className="flex xl:hidden items-center gap-1.5">
            <ThemeSwitcher variant="icon" className="scale-90" />
            <LanguageSwitcher variant="pill" className="scale-90" />
            <button
              type="button"
              onClick={() => onSelectTab("join-class")}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 cursor-pointer whitespace-nowrap"
            >
              <UserCheck size={14} />
              <span className="hidden sm:inline">{t("nav.joinClassShort")}</span>
            </button>
            <button
              onClick={onToggleMobileMenu}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-hidden cursor-pointer"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-2 pb-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onToggleMobileMenu();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                  isActive
                    ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50"
                }`}
              >
                <Icon
                  size={18}
                  className={isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500"}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
          <div className="pt-3 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between px-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t("settings.themeTitle")}
            </span>
            <ThemeSwitcher variant="toggle" />
          </div>
          <div className="pt-2 flex items-center justify-between px-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t("settings.langTitle")}
            </span>
            <LanguageSwitcher variant="toggle" />
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl cursor-pointer"
            >
              <LogOut size={15} />
              <span>{t("auth.logout")}</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
