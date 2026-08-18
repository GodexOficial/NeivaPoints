import React from "react";

interface ProgressBarProps {
  progress: number; // 0 to 99
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
  barColor?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  size = "md",
  showLabel = true,
  className = "",
  barColor,
}) => {
  // Clamp between 0 and 99 (or 100 max visually)
  const safeProgress = Math.max(0, Math.min(100, Math.round(progress || 0)));

  const heightClasses = {
    sm: "h-2",
    md: "h-3",
    lg: "h-4",
  };

  const textClasses = {
    sm: "text-xs",
    md: "text-xs font-semibold",
    lg: "text-sm font-semibold",
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center gap-3">
        <div
          className={`relative flex-1 bg-slate-200/80 dark:bg-slate-800 rounded-full overflow-hidden ${heightClasses[size]}`}
          role="progressbar"
          aria-valuenow={safeProgress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${
              barColor ||
              "bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600"
            }`}
            style={{ width: `${safeProgress}%` }}
          />
        </div>
        {showLabel && (
          <span
            className={`text-slate-600 dark:text-slate-400 tabular-nums min-w-[38px] text-right ${textClasses[size]}`}
          >
            {safeProgress}%
          </span>
        )}
      </div>
    </div>
  );
};
