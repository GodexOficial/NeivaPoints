import React from "react";

interface ProgressBarProps {
  progress: number; // 0 to 99
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
  barColor?: string;
  level?: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  size = "md",
  showLabel = true,
  className = "",
  barColor,
  level = 1,
}) => {
  // Clamp between 0 and 99 (or 100 max visually)
  const safeProgress = Math.max(0, Math.min(100, Math.round(progress || 0)));
  const tier = Math.floor((Math.max(1, Math.floor(level || 1)) - 1) / 10);
  // Every ten levels advances the palette, staying in the blue/violet family.
  const hue = 205 + (tier * 19) % 95;
  const palette = {
    '--xp-start': `hsl(${hue} 82% 52%)`,
    '--xp-mid': `hsl(${(hue + 24) % 360} 85% 62%)`,
    '--xp-end': `hsl(${(hue + 48) % 360} 82% 58%)`,
  } as React.CSSProperties;

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
          data-xp-active={safeProgress > 0}
          data-xp-tier={tier}
          style={palette}
        >
          <div
            className={`xp-fill relative h-full rounded-full transition-all duration-300 ease-in-out ${
              barColor ||
              "bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600"
            }`}
            style={{ width: `${safeProgress}%`, ...(!barColor ? { backgroundImage: 'linear-gradient(90deg, var(--xp-start), var(--xp-mid), var(--xp-end))' } : {}) }}
          >
            {safeProgress > 0 && <span className="xp-neon" aria-hidden="true" />}
          </div>
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
