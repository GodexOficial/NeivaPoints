import React, { useEffect } from "react";
import {
  AppWindow,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import { LanguageSwitcher } from "../common/LanguageSwitcher";
import { ThemeSwitcher } from "../common/ThemeSwitcher";

export type NavTab = "dashboard" | "students" | "classes" | "apps" | "settings" | "join-class";

interface NavbarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  mobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab, mobileMenuOpen, onToggleMobileMenu }) => {
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
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && mobileMenuOpen) onToggleMobileMenu();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen, onToggleMobileMenu]);

  const selectTab = (tab: NavTab) => onSelectTab(tab);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 shadow-2xs backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
      <div className="safe-area-x mx-auto max-w-7xl px-0 sm:px-5 lg:px-8">
        <div className="flex h-16 min-w-0 items-center gap-2 lg:gap-3">
          <button type="button" onClick={() => selectTab("dashboard")} className="group flex shrink-0 items-center gap-2.5 rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label={t("nav.dashboard")}>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-lg font-extrabold text-white shadow-xs transition-transform group-hover:scale-105">P</span>
            <span className="hidden min-w-0 sm:block xl:max-w-[170px]">
              <span className="block truncate text-base font-extrabold leading-tight tracking-tight text-slate-900 dark:text-white">{t("nav.brand")}</span>
              <span className="block truncate text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">{t("nav.subtitle")}</span>
            </span>
          </button>

          {/* Desktop: icons first, labels only when there is space. */}
          <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 lg:flex" aria-label="Navegação principal">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = currentTab === item.id;
              return (
                <button key={item.id} type="button" onClick={() => selectTab(item.id)} title={item.label} className={`inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-2.5 text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-500 xl:px-3 ${active ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"}`}>
                  <Icon size={17} className={active ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500"} />
                  <span className="hidden xl:inline">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Tablet/desktop actions stay compact; labels expand only on very wide screens. */}
          <div className="hidden shrink-0 items-center gap-1.5 lg:flex">
            <ThemeSwitcher variant="icon" />
            <div className="hidden xl:block"><LanguageSwitcher variant="pill" /></div>
            <button type="button" onClick={() => selectTab("join-class")} title={t("nav.joinClass")} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-2.5 text-xs font-bold text-indigo-700 transition-colors hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-900/50 2xl:px-3">
              <UserCheck size={16} />
              <span className="hidden 2xl:inline">{t("nav.joinClass")}</span>
            </button>
            <div className="hidden max-w-40 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 px-2.5 py-2 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 2xl:flex">
              <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
              <span className="truncate">{currentUser?.name || t("auth.roleTeacher")}</span>
            </div>
            <button type="button" onClick={logout} title={t("auth.logout")} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs font-bold text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-red-800 dark:hover:bg-red-950/40 dark:hover:text-red-400 2xl:px-3">
              <LogOut size={16} />
              <span className="hidden 2xl:inline">{t("auth.logout")}</span>
            </button>
          </div>

          {/* Phone: only the essential menu trigger remains in the header. */}
          <button type="button" onClick={onToggleMobileMenu} className="ml-auto inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden" aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"} aria-expanded={mobileMenuOpen}>
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="safe-area-x border-t border-slate-200 bg-white px-0 py-3 shadow-lg dark:border-slate-800 dark:bg-slate-900 lg:hidden">
          <div className="mx-auto max-w-7xl space-y-1 sm:px-2">
            <div className="mb-2 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500 text-xs font-bold text-white">{currentUser?.name?.slice(0, 1).toUpperCase() || "P"}</span>
              <span className="min-w-0"><span className="block truncate text-sm font-bold text-slate-800 dark:text-white">{currentUser?.name || t("auth.roleTeacher")}</span><span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">{t("auth.roleTeacher")}</span></span>
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = currentTab === item.id;
              return <button key={item.id} type="button" onClick={() => selectTab(item.id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors ${active ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"}`}><Icon size={18} /><span>{item.label}</span></button>;
            })}
            <button type="button" onClick={() => selectTab("join-class")} className="mt-2 flex w-full items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2.5 text-left text-sm font-bold text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300"><UserCheck size={18} /><span>{t("nav.joinClass")}</span></button>
            <div className="mt-3 grid grid-cols-1 gap-2 border-t border-slate-100 pt-3 dark:border-slate-800 sm:grid-cols-2 sm:items-center sm:px-1">
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800"><span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t("settings.themeTitle")}</span><ThemeSwitcher variant="toggle" /></div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800"><span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t("settings.langTitle")}</span><LanguageSwitcher variant="toggle" /></div>
            </div>
            <button type="button" onClick={logout} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-bold text-red-600 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400"><LogOut size={16} /><span>{t("auth.logout")}</span></button>
          </div>
        </div>
      )}
    </header>
  );
};
