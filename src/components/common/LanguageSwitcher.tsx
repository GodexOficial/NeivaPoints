import React from "react";
import { Globe } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

interface LanguageSwitcherProps {
  variant?: "pill" | "toggle" | "full";
  className?: string;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  variant = "pill",
  className = "",
}) => {
  const { language, setLanguage, toggleLanguage, t } = useLanguage();

  if (variant === "full") {
    return (
      <div className={`flex flex-col sm:flex-row gap-3 ${className}`}>
        <button
          type="button"
          onClick={() => setLanguage("pt")}
          className={`flex-1 flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${
            language === "pt"
              ? "border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 dark:border-blue-500 shadow-xs"
              : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl" role="img" aria-label="Português">
              🇧🇷
            </span>
            <div className="text-left">
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                Português (Brasil)
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Interface em português
              </div>
            </div>
          </div>
          {language === "pt" && (
            <span className="w-3 h-3 rounded-full bg-blue-600 ring-4 ring-blue-100 dark:ring-blue-900/60" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setLanguage("en")}
          className={`flex-1 flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${
            language === "en"
              ? "border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 dark:border-blue-500 shadow-xs"
              : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl" role="img" aria-label="English">
              🇺🇸
            </span>
            <div className="text-left">
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                English (US)
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Interface in English</div>
            </div>
          </div>
          {language === "en" && (
            <span className="w-3 h-3 rounded-full bg-blue-600 ring-4 ring-blue-100 dark:ring-blue-900/60" />
          )}
        </button>
      </div>
    );
  }

  if (variant === "toggle") {
    return (
      <div
        className={`inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700 ${className}`}
      >
        <button
          type="button"
          onClick={() => setLanguage("pt")}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            language === "pt"
              ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-extrabold"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
          }`}
          title="Português"
        >
          <span className="text-sm leading-none">🇧🇷</span>
          <span>PT</span>
        </button>
        <button
          type="button"
          onClick={() => setLanguage("en")}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            language === "en"
              ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-extrabold"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
          }`}
          title="English"
        >
          <span className="text-sm leading-none">🇺🇸</span>
          <span>EN</span>
        </button>
      </div>
    );
  }

  // Pill variant (default)
  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-2xs cursor-pointer ${
        language === "pt"
          ? "bg-amber-50/70 dark:bg-amber-950/40 border-amber-200/80 dark:border-amber-800/60 text-amber-900 dark:text-amber-300 hover:bg-amber-100/80 dark:hover:bg-amber-900/40"
          : "bg-blue-50/70 dark:bg-blue-950/40 border-blue-200/80 dark:border-blue-800/60 text-blue-900 dark:text-blue-300 hover:bg-blue-100/80 dark:hover:bg-blue-900/40"
      } ${className}`}
      title={t("nav.switchLang")}
      aria-label={t("nav.switchLang")}
    >
      <Globe size={14} className="text-slate-600 dark:text-slate-400 shrink-0" />
      <span className="text-sm leading-none">
        {language === "pt" ? "" : ""}
      </span>
      <span className="uppercase tracking-wider font-extrabold">
        {language === "pt" ? "PT-BR" : "EN-US"}
      </span>
    </button>
  );
};
