import React, { useState } from 'react';
import { X, Table as TableIcon, Trash2, Plus } from 'lucide-react';

interface TableEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetTable: HTMLTableElement | null;
  onContentChange: () => void;
}

export const TableEditModal: React.FC<TableEditModalProps> = ({
  isOpen,
  onClose,
  targetTable,
  onContentChange,
}) => {
  const [cellBgColor, setCellBgColor] = useState('#2563eb');
  const [borderColor, setBorderColor] = useState('#cbd5e1');
  const [borderWidth, setBorderWidth] = useState(1);
  const [borderStyle, setBorderStyle] = useState<'solid' | 'dashed' | 'dotted' | 'none'>('solid');

  if (!isOpen || !targetTable) return null;

  // Apply cell background to currently selected or all cells
  const handleApplyCellBg = () => {
    const cells = targetTable.querySelectorAll('td, th');
    cells.forEach((c) => {
      (c as HTMLElement).style.backgroundColor = cellBgColor;
    });
    onContentChange();
  };

  // Apply table border style
  const handleApplyBorders = () => {
    targetTable.style.border = `${borderWidth}px ${borderStyle} ${borderColor}`;
    const cells = targetTable.querySelectorAll('td, th');
    cells.forEach((c) => {
      (c as HTMLElement).style.border = `${borderWidth}px ${borderStyle} ${borderColor}`;
    });
    onContentChange();
  };

  // Insert Row
  const handleAddRow = (below = true) => {
    const newRow = targetTable.insertRow(below ? -1 : 0);
    const colCount = targetTable.rows[0]?.cells.length || 2;
    for (let i = 0; i < colCount; i++) {
      const cell = newRow.insertCell(i);
      cell.innerHTML = 'Nova Célula';
      cell.style.padding = '8px';
      cell.style.border = `${borderWidth}px ${borderStyle} ${borderColor}`;
    }
    onContentChange();
  };

  // Insert Column
  const handleAddCol = () => {
    for (let r = 0; r < targetTable.rows.length; r++) {
      const cell = targetTable.rows[r].insertCell(-1);
      cell.innerHTML = 'Nova Célula';
      cell.style.padding = '8px';
      cell.style.border = `${borderWidth}px ${borderStyle} ${borderColor}`;
    }
    onContentChange();
  };

  // Delete Table
  const handleDeleteTable = () => {
    targetTable.remove();
    onContentChange();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-xl">
              <TableIcon size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Edição Avançada da Tabela</h3>
              <p className="text-xs text-slate-500">Configure cores, bordas, linhas e colunas</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* Cell Shading / Background */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Cor de Fundo das Células</label>
          <div className="flex items-center gap-2">
            <input type="color" value={cellBgColor} onChange={(e) => setCellBgColor(e.target.value)} className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 dark:border-slate-700" />
            <input type="text" value={cellBgColor} onChange={(e) => setCellBgColor(e.target.value)} className="flex-1 text-xs font-mono p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white" />
            <button
              type="button"
              onClick={handleApplyCellBg}
              className="px-3 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer"
            >
              Aplicar Fundo
            </button>
          </div>
        </div>

        {/* Borders */}
        <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Estilo das Bordas</label>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] text-slate-500">Cor Borda</label>
              <input type="color" value={borderColor} onChange={(e) => setBorderColor(e.target.value)} className="w-full h-8 rounded-lg cursor-pointer mt-1" />
            </div>

            <div>
              <label className="text-[11px] text-slate-500">Espessura (px)</label>
              <input type="number" min={0} max={10} value={borderWidth} onChange={(e) => setBorderWidth(Number(e.target.value))} className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white mt-1" />
            </div>

            <div>
              <label className="text-[11px] text-slate-500">Estilo</label>
              <select value={borderStyle} onChange={(e) => setBorderStyle(e.target.value as any)} className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white mt-1">
                <option value="solid">Sólida</option>
                <option value="dashed">Tracejada</option>
                <option value="dotted">Pontilhada</option>
                <option value="none">Sem Borda</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handleApplyBorders}
            className="w-full py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl cursor-pointer"
          >
            Aplicar Estilo de Bordas na Tabela
          </button>
        </div>

        {/* Structure actions */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Ações na Estrutura</label>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => handleAddRow(true)} className="py-2 px-3 text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded-xl cursor-pointer text-left flex items-center gap-1.5">
              <Plus size={14} /> + Linha
            </button>
            <button type="button" onClick={handleAddCol} className="py-2 px-3 text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-xl cursor-pointer text-left flex items-center gap-1.5">
              <Plus size={14} /> + Coluna
            </button>
          </div>

          <button
            type="button"
            onClick={handleDeleteTable}
            className="w-full py-2 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl cursor-pointer flex items-center justify-center gap-1.5 mt-2"
          >
            <Trash2 size={14} />
            <span>Excluir Tabela</span>
          </button>
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
          <button type="button" onClick={onClose} className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs cursor-pointer">
            Concluído
          </button>
        </div>
      </div>
    </div>
  );
};
