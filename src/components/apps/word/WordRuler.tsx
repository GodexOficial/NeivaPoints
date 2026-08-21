import React, { useRef, useState, useEffect } from 'react';
import { Target, Globe } from 'lucide-react';

interface WordRulerProps {
  leftMarginCm: number;
  rightMarginCm: number;
  firstLineIndentCm: number;
  onChangeLeftMargin: (valCm: number) => void;
  onChangeRightMargin: (valCm: number) => void;
  onChangeFirstLineIndent: (valCm: number) => void;
  paperWidthPx?: number; // default A4 ~ 794px
  scopeMode?: 'paragraph' | 'all';
  targetSummary?: string;
  onToggleScopeMode?: () => void;
}

export const WordRuler: React.FC<WordRulerProps> = ({
  leftMarginCm,
  rightMarginCm,
  firstLineIndentCm,
  onChangeLeftMargin,
  onChangeRightMargin,
  onChangeFirstLineIndent,
  paperWidthPx = 794,
  scopeMode = 'all',
  targetSummary,
  onToggleScopeMode,
}) => {
  const rulerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<'left' | 'right' | 'indent' | null>(null);

  // A4 paper is 21 cm wide. 1 cm ~ (paperWidthPx / 21) px.
  const pxPerCm = paperWidthPx / 21;

  const handleMouseDown = (type: 'left' | 'right' | 'indent', e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(type);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging || !rulerRef.current) return;
      const rect = rulerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const cmVal = Math.max(0, Math.min(21, mouseX / pxPerCm));
      const roundedCm = Math.round(cmVal * 10) / 10;

      if (dragging === 'left') {
        const maxLeft = 21 - rightMarginCm - 1;
        onChangeLeftMargin(Math.max(0, Math.min(roundedCm, maxLeft)));
      } else if (dragging === 'right') {
        const maxRight = 21 - leftMarginCm - 1;
        onChangeRightMargin(Math.max(0, Math.min(21 - roundedCm, maxRight)));
      } else if (dragging === 'indent') {
        onChangeFirstLineIndent(Math.max(0, Math.min(15, roundedCm)));
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
  }, [dragging, leftMarginCm, rightMarginCm, onChangeLeftMargin, onChangeRightMargin, onChangeFirstLineIndent, pxPerCm]);

  // Tick marks: 0 to 21 cm
  const ticks = Array.from({ length: 22 }, (_, i) => i);

  const leftPx = leftMarginCm * pxPerCm;
  const rightPx = (21 - rightMarginCm) * pxPerCm;
  const indentPx = firstLineIndentCm * pxPerCm;

  return (
    <div className="w-full flex flex-col items-center bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-1 select-none">
      {/* Scope Status Banner */}
      <div className="w-full flex items-center justify-between px-4 max-w-[794px] mb-0.5 text-[11px]">
        <div className="flex items-center gap-1.5">
          {scopeMode === 'paragraph' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-bold">
              <Target size={12} className="text-blue-600 dark:text-blue-400" />
              <span>Régua: Parágrafo Selecionado ({targetSummary || '1 bloco'})</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold">
              <Globe size={12} className="text-slate-500" />
              <span>Régua: Documento Inteiro (Margens A4)</span>
            </span>
          )}
        </div>

        {onToggleScopeMode && (
          <button
            type="button"
            onClick={onToggleScopeMode}
            className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-medium"
            title="Alternar entre aplicar ao parágrafo ativo ou a todo o documento"
          >
            {scopeMode === 'paragraph' ? 'Aplicar a todo documento' : 'Aplicar ao parágrafo atual'}
          </button>
        )}
      </div>

      {/* Physical Ruler Bar */}
      <div
        ref={rulerRef}
        className="relative h-6 bg-slate-200 dark:bg-slate-800 rounded-md border border-slate-300 dark:border-slate-700 shadow-inner select-none font-mono text-[9px] text-slate-500 dark:text-slate-400"
        style={{ width: `${paperWidthPx}px` }}
      >
        {/* Shaded margin areas */}
        <div
          className="absolute top-0 bottom-0 left-0 bg-slate-300/60 dark:bg-slate-700/60 rounded-l-md pointer-events-none"
          style={{ width: `${leftPx}px` }}
        />
        <div
          className="absolute top-0 bottom-0 right-0 bg-slate-300/60 dark:bg-slate-700/60 rounded-r-md pointer-events-none"
          style={{ width: `${rightMarginCm * pxPerCm}px` }}
        />

        {/* Centimeter ticks & numbers */}
        {ticks.map((cm) => {
          const posPx = cm * pxPerCm;
          return (
            <React.Fragment key={cm}>
              <div
                className="absolute top-0 h-2.5 border-l border-slate-400 dark:border-slate-500 pointer-events-none"
                style={{ left: `${posPx}px` }}
              />
              {cm > 0 && cm < 21 && (
                <span
                  className="absolute top-2.5 -translate-x-1/2 pointer-events-none leading-none font-semibold text-[10px]"
                  style={{ left: `${posPx}px` }}
                >
                  {cm}
                </span>
              )}
              {/* Half cm tick mark */}
              {cm < 21 && (
                <div
                  className="absolute top-0 h-1.5 border-l border-slate-300 dark:border-slate-600 pointer-events-none"
                  style={{ left: `${posPx + pxPerCm / 2}px` }}
                />
              )}
            </React.Fragment>
          );
        })}

        {/* Left Margin Drag Marker */}
        <div
          onMouseDown={(e) => handleMouseDown('left', e)}
          className="absolute bottom-0 -translate-x-1/2 cursor-col-resize z-20 group"
          style={{ left: `${leftPx}px` }}
          title={`Margem/Recuo Esquerdo: ${leftMarginCm.toFixed(1)} cm (${scopeMode === 'paragraph' ? 'Parágrafo' : 'Documento'})`}
        >
          <div className="w-3 h-3 bg-blue-600 border border-white dark:border-slate-900 rounded-b-xs shadow-xs group-hover:scale-125 transition-transform" />
          <div className="w-0.5 h-6 bg-blue-500/50 mx-auto -mt-3 pointer-events-none" />
        </div>

        {/* First Line Indent Drag Marker */}
        <div
          onMouseDown={(e) => handleMouseDown('indent', e)}
          className="absolute top-0 -translate-x-1/2 cursor-col-resize z-20 group"
          style={{ left: `${indentPx}px` }}
          title={`Recuo da 1ª Linha: ${firstLineIndentCm.toFixed(1)} cm (${scopeMode === 'paragraph' ? 'Parágrafo' : 'Documento'})`}
        >
          <div className="w-3 h-2.5 bg-purple-600 border border-white dark:border-slate-900 rounded-t-xs shadow-xs group-hover:scale-125 transition-transform" />
        </div>

        {/* Right Margin Drag Marker */}
        <div
          onMouseDown={(e) => handleMouseDown('right', e)}
          className="absolute bottom-0 -translate-x-1/2 cursor-col-resize z-20 group"
          style={{ left: `${rightPx}px` }}
          title={`Margem/Recuo Direito: ${rightMarginCm.toFixed(1)} cm (${scopeMode === 'paragraph' ? 'Parágrafo' : 'Documento'})`}
        >
          <div className="w-3 h-3 bg-blue-600 border border-white dark:border-slate-900 rounded-b-xs shadow-xs group-hover:scale-125 transition-transform" />
          <div className="w-0.5 h-6 bg-blue-500/50 mx-auto -mt-3 pointer-events-none" />
        </div>
      </div>
    </div>
  );
};
