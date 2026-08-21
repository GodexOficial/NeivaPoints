import React, { useState } from 'react';
import { X, Table as TableIcon } from 'lucide-react';

interface InsertTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertHtml: (tableHtml: string) => void;
}

export const InsertTableModal: React.FC<InsertTableModalProps> = ({ isOpen, onClose, onInsertHtml }) => {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [hasHeader, setHasHeader] = useState(true);
  const [theme, setTheme] = useState<'blue' | 'slate' | 'emerald'>('blue');

  if (!isOpen) return null;

  const handleConfirm = () => {
    let headerStyle = 'background-color: #2563eb; color: #ffffff; text-align: left; font-weight: bold;';
    if (theme === 'slate') headerStyle = 'background-color: #334155; color: #ffffff; text-align: left; font-weight: bold;';
    if (theme === 'emerald') headerStyle = 'background-color: #059669; color: #ffffff; text-align: left; font-weight: bold;';

    let tableHtml = `<table style="width: 100%; border-collapse: collapse; margin: 16px 0; border: 1px solid #cbd5e1;">`;

    if (hasHeader) {
      tableHtml += `<thead><tr>`;
      for (let c = 1; c <= cols; c++) {
        tableHtml += `<th style="padding: 10px; border: 1px solid #cbd5e1; ${headerStyle}">Cabeçalho ${c}</th>`;
      }
      tableHtml += `</tr></thead>`;
    }

    tableHtml += `<tbody>`;
    for (let r = 1; r <= rows; r++) {
      const bg = r % 2 === 0 ? 'background-color: #f8fafc;' : 'background-color: #ffffff;';
      tableHtml += `<tr style="${bg}">`;
      for (let c = 1; c <= cols; c++) {
        tableHtml += `<td style="padding: 8px 10px; border: 1px solid #cbd5e1;">Item ${r}-${c}</td>`;
      }
      tableHtml += `</tr>`;
    }
    tableHtml += `</tbody></table><p><br></p>`;

    onInsertHtml(tableHtml);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-xl">
              <TableIcon size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Inserir Tabela</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Defina o número de linhas e colunas</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Linhas (1 a 20)</label>
            <input
              type="number"
              min={1}
              max={20}
              value={rows}
              onChange={(e) => setRows(Math.min(20, Math.max(1, Number(e.target.value))))}
              className="w-full mt-1 text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Colunas (1 a 10)</label>
            <input
              type="number"
              min={1}
              max={10}
              value={cols}
              onChange={(e) => setCols(Math.min(10, Math.max(1, Number(e.target.value))))}
              className="w-full mt-1 text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="hasHeader"
            checked={hasHeader}
            onChange={(e) => setHasHeader(e.target.checked)}
            className="w-4 h-4 rounded-md text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
          />
          <label htmlFor="hasHeader" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
            Incluir linha de cabeçalho destacada
          </label>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Estilo de Cor do Cabeçalho</label>
          <div className="flex gap-2 mt-1">
            {[
              { id: 'blue', label: 'Azul Word', bg: 'bg-blue-600' },
              { id: 'slate', label: 'Grafite', bg: 'bg-slate-700' },
              { id: 'emerald', label: 'Esmeralda', bg: 'bg-emerald-600' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTheme(t.id as any)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                  theme === t.id
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <span className={`w-3 h-3 rounded-full ${t.bg}`} />
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer">
            Cancelar
          </button>
          <button type="button" onClick={handleConfirm} className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs cursor-pointer">
            Criar Tabela
          </button>
        </div>
      </div>
    </div>
  );
};
