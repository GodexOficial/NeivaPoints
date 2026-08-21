import React, { useRef, useState, useEffect } from 'react';

interface WordVerticalRulerProps {
  topMarginCm: number;
  bottomMarginCm: number;
  onChangeTopMargin: (valCm: number) => void;
  onChangeBottomMargin: (valCm: number) => void;
  paperHeightPx?: number; // default A4 height ~ 1123px (29.7cm)
}

export const WordVerticalRuler: React.FC<WordVerticalRulerProps> = ({
  topMarginCm,
  bottomMarginCm,
  onChangeTopMargin,
  onChangeBottomMargin,
  paperHeightPx = 1123,
}) => {
  const rulerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<'top' | 'bottom' | null>(null);

  // A4 paper is 29.7 cm high. 1 cm ~ (paperHeightPx / 29.7) px.
  const pxPerCm = paperHeightPx / 29.7;

  const handleMouseDown = (type: 'top' | 'bottom', e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(type);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging || !rulerRef.current) return;
      const rect = rulerRef.current.getBoundingClientRect();
      const mouseY = e.clientY - rect.top;
      const cmVal = Math.max(0, Math.min(29.7, mouseY / pxPerCm));
      const roundedCm = Math.round(cmVal * 10) / 10;

      if (dragging === 'top') {
        const maxTop = 29.7 - bottomMarginCm - 2;
        onChangeTopMargin(Math.max(0.5, Math.min(roundedCm, maxTop)));
      } else if (dragging === 'bottom') {
        const maxBottom = 29.7 - topMarginCm - 2;
        onChangeBottomMargin(Math.max(0.5, Math.min(29.7 - roundedCm, maxBottom)));
      }
    };

    const handleMouseUp = () => {
      setDragging(null);
    };

    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, topMarginCm, bottomMarginCm, onChangeTopMargin, onChangeBottomMargin, pxPerCm]);

  // Tick marks: 0 to 29 cm
  const ticks = Array.from({ length: 30 }, (_, i) => i);

  const topPx = topMarginCm * pxPerCm;
  const bottomPx = (29.7 - bottomMarginCm) * pxPerCm;

  return (
    <div
      ref={rulerRef}
      className="relative w-6 shrink-0 bg-slate-200 dark:bg-slate-800 rounded-l-md border-y border-l border-slate-300 dark:border-slate-700 shadow-inner select-none font-mono text-[9px] text-slate-500 dark:text-slate-400 self-start"
      style={{ height: `${paperHeightPx}px` }}
      title="Régua Vertical (Margens Superior e Inferior)"
    >
      {/* Shaded top margin area */}
      <div
        className="absolute top-0 left-0 right-0 bg-slate-300/60 dark:bg-slate-700/60 rounded-tl-md pointer-events-none"
        style={{ height: `${topPx}px` }}
      />

      {/* Shaded bottom margin area */}
      <div
        className="absolute bottom-0 left-0 right-0 bg-slate-300/60 dark:bg-slate-700/60 rounded-bl-md pointer-events-none"
        style={{ height: `${bottomMarginCm * pxPerCm}px` }}
      />

      {/* Centimeter ticks & numbers */}
      {ticks.map((cm) => {
        const posPx = cm * pxPerCm;
        return (
          <React.Fragment key={cm}>
            <div
              className="absolute left-0 w-2.5 border-t border-slate-400 dark:border-slate-500 pointer-events-none"
              style={{ top: `${posPx}px` }}
            />
            {cm > 0 && cm < 30 && (
              <span
                className="absolute left-2.5 -translate-y-1/2 pointer-events-none leading-none font-semibold text-[9px]"
                style={{ top: `${posPx}px` }}
              >
                {cm}
              </span>
            )}
            {/* Half cm tick mark */}
            {cm < 29 && (
              <div
                className="absolute left-0 w-1.5 border-t border-slate-300 dark:border-slate-600 pointer-events-none"
                style={{ top: `${posPx + pxPerCm / 2}px` }}
              />
            )}
          </React.Fragment>
        );
      })}

      {/* Top Margin Drag Marker */}
      <div
        onMouseDown={(e) => handleMouseDown('top', e)}
        className="absolute left-0 right-0 -translate-y-1/2 cursor-row-resize z-20 group"
        style={{ top: `${topPx}px` }}
        title={`Margem Superior: ${topMarginCm.toFixed(1)} cm`}
      >
        <div className="h-2.5 w-full bg-blue-600 border border-white dark:border-slate-900 rounded-r-xs shadow-xs group-hover:scale-110 transition-transform" />
      </div>

      {/* Bottom Margin Drag Marker */}
      <div
        onMouseDown={(e) => handleMouseDown('bottom', e)}
        className="absolute left-0 right-0 -translate-y-1/2 cursor-row-resize z-20 group"
        style={{ top: `${bottomPx}px` }}
        title={`Margem Inferior: ${bottomMarginCm.toFixed(1)} cm`}
      >
        <div className="h-2.5 w-full bg-blue-600 border border-white dark:border-slate-900 rounded-r-xs shadow-xs group-hover:scale-110 transition-transform" />
      </div>
    </div>
  );
};
