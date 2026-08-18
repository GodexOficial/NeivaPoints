import React from "react";
import { Award, Sparkles } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

interface LevelBadgeProps {
  level: number;
  size?: "sm" | "md" | "lg";
  variant?: "pill" | "badge" | "card";
  className?: string;
  showIcon?: boolean;
}

export const LevelBadge: React.FC<LevelBadgeProps> = ({
  level,
  size = "md",
  variant = "pill",
  className = "",
  showIcon = true,
}) => {
  // Styling tier based on level
  const getLevelTheme = (lvl: number) => {
    if (lvl >= 10) {
      return {
        bg: "bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700/60",
        iconColor: "text-amber-500 dark:text-amber-400",
        ring: "ring-amber-500/20",
      };
    }
    if (lvl >= 5) {
      return {
        bg: "bg-purple-500/10 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700/60",
        iconColor: "text-purple-600 dark:text-purple-400",
        ring: "ring-purple-500/20",
      };
    }
    if (lvl >= 3) {
      return {
        bg: "bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700/60",
        iconColor: "text-indigo-600 dark:text-indigo-400",
        ring: "ring-indigo-500/20",
      };
    }
    return {
      bg: "bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700/60",
      iconColor: "text-blue-600 dark:text-blue-400",
      ring: "ring-blue-500/20",
    };
  };

  const { t } = useLanguage();
  const theme = getLevelTheme(level);

  const sizeStyles = {
    sm: "text-xs px-2 py-0.5 gap-1",
    md: "text-xs font-medium px-2.5 py-1 gap-1.5",
    lg: "text-sm font-semibold px-3 py-1.5 gap-2",
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16,
  };

  if (variant === "card") {
    return (
      <div
        className={`inline-flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs ${className}`}
      >
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {t('students.level')}
        </span>
        <span className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
          {level}
        </span>
      </div>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${theme.bg} ${sizeStyles[size]} ${className}`}
    >
      {showIcon &&
        (level >= 5 ? (
          <Sparkles size={iconSizes[size]} className={theme.iconColor} />
        ) : (
          <Award size={iconSizes[size]} className={theme.iconColor} />
        ))}
      <span>{t('students.level')} {level}</span>
    </span>
  );
};
