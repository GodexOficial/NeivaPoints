import React, { useState, useRef, useEffect } from 'react';
import { Pipette, X } from 'lucide-react';

interface WordColorPickerProps {
  value?: string;
  onChange: (color: string) => void;
  title: string;
  icon: React.ReactNode;
  hasNoColorOption?: boolean;
  noColorLabel?: string;
  showChevron?: boolean;
}

// 10 theme color columns x 5 shade rows (Row 0 = Lightest, Row 4 = Darkest)
const THEME_COLORS: string[][] = [
  // Col 0: White / Gray / Black
  ['#ffffff', '#f2f2f2', '#d9d9d9', '#a6a6a6', '#595959'],
  // Col 1: Slate / Dark Gray
  ['#e2e8f0', '#94a3b8', '#64748b', '#334155', '#0f172a'],
  // Col 2: Warm Gray / Tan
  ['#f5f4ef', '#ddd9c3', '#c4bd97', '#948a54', '#494529'],
  // Col 3: Navy Blue
  ['#dce6f1', '#b8cce4', '#8db3e2', '#366092', '#1f497d'],
  // Col 4: Sky / Royal Blue
  ['#e0f2fe', '#7dd3fc', '#38bdf8', '#0284c7', '#0369a1'],
  // Col 5: Crimson / Red
  ['#fee2e2', '#fca5a5', '#ef4444', '#b91c1c', '#7f1d1d'],
  // Col 6: Orange
  ['#ffedd5', '#fdba74', '#f97316', '#c2410c', '#7c2d12'],
  // Col 7: Amber / Yellow
  ['#fef9c3', '#fde047', '#eab308', '#a16207', '#713f12'],
  // Col 8: Green
  ['#dcfce7', '#86efac', '#22c55e', '#15803d', '#14532d'],
  // Col 9: Purple / Violet
  ['#f3e8ff', '#d8b4fe', '#a855f7', '#7e22ce', '#581c87'],
];

const STANDARD_COLORS = [
  '#c00000', // Dark Red
  '#ff0000', // Red
  '#ffc000', // Orange
  '#ffff00', // Yellow
  '#92d050', // Light Green
  '#00b050', // Green
  '#00b0f0', // Light Blue
  '#0070c0', // Blue
  '#002060', // Dark Blue
  '#7030a0', // Purple
];

export const WordColorPicker: React.FC<WordColorPickerProps> = ({
  value = '#000000',
  onChange,
  title,
  icon,
  hasNoColorOption = true,
  noColorLabel = 'Sem Cor',
  showChevron = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customColor, setCustomColor] = useState(value || '#2563eb');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener('mousedown', handleClickOutside);
    }
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelectColor = (color: string) => {
    onChange(color);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative inline-block">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
        title={title}
      >
        <div className="flex flex-col items-center">
          {icon}
          <div
            className="w-4 h-1 rounded-full mt-0.5 border border-slate-300 dark:border-slate-600"
            style={{ backgroundColor: value || 'transparent' }}
          />
        </div>
        {showChevron && (
          <span className="text-[9px] text-slate-400 leading-none">▼</span>
        )}
      </button>

      {/* Color Dropdown Popover */}
      {isOpen && (
        <div
          className="absolute left-0 top-full mt-1 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-3 w-64 text-xs select-none animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header & Clear option */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="font-bold text-slate-700 dark:text-slate-200 text-xs">{title}</span>
            {hasNoColorOption && (
              <button
                type="button"
                onClick={() => handleSelectColor('')}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-colors cursor-pointer"
                title="Remover cor / transparente"
              >
                <X size={12} />
                <span>{noColorLabel}</span>
              </button>
            )}
          </div>

          {/* Theme Colors (10 Columns x 5 Rows Grid) */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Cores do Tema (Claro ao Escuro)
            </div>

            <div className="grid grid-rows-5 grid-flow-col gap-1 w-full">
              {THEME_COLORS.map((column, colIdx) =>
                column.map((color, rowIdx) => (
                  <button
                    key={`${colIdx}-${rowIdx}`}
                    type="button"
                    onClick={() => handleSelectColor(color)}
                    className="w-5 h-5 rounded-md border border-slate-200/80 dark:border-slate-700 hover:scale-125 hover:shadow-md transition-transform cursor-pointer relative"
                    style={{ backgroundColor: color }}
                    title={color}
                  >
                    {value?.toLowerCase() === color.toLowerCase() && (
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-900 drop-shadow-xs font-black">
                        ✓
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Standard Colors */}
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Cores Padrão
            </div>

            <div className="flex items-center justify-between gap-1">
              {STANDARD_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleSelectColor(color)}
                  className="w-5 h-5 rounded-md border border-slate-200/80 dark:border-slate-700 hover:scale-125 hover:shadow-md transition-transform cursor-pointer relative"
                  style={{ backgroundColor: color }}
                  title={color}
                >
                  {value?.toLowerCase() === color.toLowerCase() && (
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white drop-shadow-xs font-black">
                      ✓
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Color Selector */}
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer">
              <div className="flex items-center gap-2">
                <Pipette size={14} className="text-blue-600" />
                <span className="font-semibold text-xs">Mais Cores Personalizadas...</span>
              </div>
              <input
                type="color"
                value={customColor}
                onChange={(e) => {
                  setCustomColor(e.target.value);
                  handleSelectColor(e.target.value);
                }}
                className="w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
};
