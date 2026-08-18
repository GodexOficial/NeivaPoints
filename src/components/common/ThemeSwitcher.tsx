import React from "react";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import { useTheme, type Theme } from "../../context/ThemeContext";
import { useLanguage } from "../../context/LanguageContext";

interface ThemeSwitcherProps {
  variant?: "pill" | "icon" | "toggle" | "full";
  className?: string;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({
  variant = "pill",
  className = "",
}) => {
  const { theme, isDark, setTheme, toggleTheme } = useTheme();
  const { t } = useLanguage();

  // Full variant: cards with light / dark / system choices (for Settings page)
  if (variant === "full") {
    const options: {
      id: Theme;
      label: string;
      desc: string;
      icon: React.ReactNode;
    }[] = [
      {
        id: "light",
        label: t("settings.themeLight"),
        desc: t("settings.themeLightDesc"),
        icon: <Sun size={22} className="text-amber-500" />,
      },
      {
        id: "dark",
        label: t("settings.themeDark"),
        desc: t("settings.themeDarkDesc"),
        icon: <Moon size={22} className="text-indigo-400" />,
      },
      {
        id: "system",
        label: t("settings.themeSystem"),
        desc: t("settings.themeSystemDesc"),
        icon: <Monitor size={22} className="text-blue-500" />,
      },
    ];

    return (
      <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 ${className}`}>
        {options.map((opt) => {
          const isSelected = theme === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setTheme(opt.id)}
              className={`flex items-start justify-between p-4 rounded-2xl border-2 transition-all text-left cursor-pointer ${
                isSelected
                  ? "border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 dark:border-blue-500 shadow-xs"
                  : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl mt-0.5">
                  {opt.icon}
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    {opt.label}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {opt.desc}
                  </div>
                </div>
              </div>

              {isSelected && (
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Segmented toggle variant
  if (variant === "toggle") {
    return (
      <div
        className={`inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700 ${className}`}
      >
        <button
          type="button"
          onClick={() => setTheme("light")}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            !isDark
              ? "bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs font-extrabold"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
          }`}
          title={t("nav.switchToLight")}
          aria-label={t("nav.switchToLight")}
        >
          <Sun size={14} />
          <span>Light</span>
        </button>
        <button
          type="button"
          onClick={() => setTheme("dark")}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            isDark
              ? "bg-slate-900 dark:bg-slate-700 text-indigo-300 shadow-xs font-extrabold"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
          }`}
          title={t("nav.switchToDark")}
          aria-label={t("nav.switchToDark")}
        >
          <Moon size={14} />
          <span>Dark</span>
        </button>
      </div>
    );
  }

  // Compact Icon variant
  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`p-2 rounded-xl border transition-all cursor-pointer ${
          isDark
            ? "bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700 hover:text-amber-300 shadow-2xs"
            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-2xs"
        } ${className}`}
        title={isDark ? t("nav.switchToLight") : t("nav.switchToDark")}
        aria-label={isDark ? t("nav.switchToLight") : t("nav.switchToDark")}
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    );
  }

  // Pill variant (default) - interactive, clearly indicating the action
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-2xs cursor-pointer group ${
        isDark
          ? "bg-slate-800/90 border-slate-700 text-amber-300 hover:bg-slate-700/90 hover:border-slate-600"
          : "bg-slate-50 border-slate-200/90 text-slate-700 hover:bg-slate-100/90 hover:text-slate-900"
      } ${className}`}
      title={isDark ? t("nav.switchToLight") : t("nav.switchToDark")}
      aria-label={isDark ? t("nav.switchToLight") : t("nav.switchToDark")}
    >
      {isDark ? (
        <>
          <Sun
            size={15}
            className="text-amber-400 group-hover:rotate-45 transition-transform duration-300"
          />
          <span className="font-semibold text-slate-200 hidden sm:inline">
            {t("nav.switchToLight")}
          </span>
          <span className="font-semibold text-slate-200 sm:hidden">Light</span>
        </>
      ) : (
        <>
          <Moon
            size={15}
            className="text-indigo-600 group-hover:-rotate-12 transition-transform duration-300"
          />
          <span className="font-semibold text-slate-700 hidden sm:inline">
            {t("nav.switchToDark")}
          </span>
          <span className="font-semibold text-slate-700 sm:hidden">Dark</span>
        </>
      )}
    </button>
  );
};
