import React from 'react';
import {
  Scissors,
  Copy,
  Clipboard,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Table,
  Plus,
  Trash2,
  Search,
  Highlighter,
  Eraser,
  Bookmark,
} from 'lucide-react';

interface WordContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onExecCommand: (command: string, value?: string) => void;
  targetElement: HTMLElement | null;
  onOpenTableModal: () => void;
  onOpenFindReplace: () => void;
  onInsertFootnote: () => void;
  onChangeCellBg: (color: string) => void;
  onModifyTable: (action: 'addRowAbove' | 'addRowBelow' | 'addColLeft' | 'addColRight' | 'deleteRow' | 'deleteCol' | 'deleteTable') => void;
}

export const WordContextMenu: React.FC<WordContextMenuProps> = ({
  x,
  y,
  onClose,
  onExecCommand,
  targetElement,
  onOpenFindReplace,
  onInsertFootnote,
  onChangeCellBg,
  onModifyTable,
}) => {
  // Check if click was inside a table
  const isInsideTable = targetElement ? !!targetElement.closest('td, th, table') : false;

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <div
      className="fixed z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl py-2 w-56 text-xs font-semibold text-slate-700 dark:text-slate-200 divide-y divide-slate-100 dark:divide-slate-800 selection:bg-none animate-in fade-in zoom-in-95 duration-100"
      style={{ top: `${y}px`, left: `${x}px` }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Clipboard / Edit */}
      <div className="py-1">
        <button
          type="button"
          onClick={() => handleAction(() => onExecCommand('cut'))}
          className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer text-left"
        >
          <Scissors size={14} className="text-slate-400" />
          <span>Recortar</span>
        </button>
        <button
          type="button"
          onClick={() => handleAction(() => onExecCommand('copy'))}
          className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer text-left"
        >
          <Copy size={14} className="text-slate-400" />
          <span>Copiar</span>
        </button>
        <button
          type="button"
          onClick={() =>
            handleAction(async () => {
              try {
                const text = await navigator.clipboard.readText();
                onExecCommand('insertText', text);
              } catch {
                onExecCommand('paste');
              }
            })
          }
          className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer text-left"
        >
          <Clipboard size={14} className="text-slate-400" />
          <span>Colar</span>
        </button>
      </div>

      {/* Formatting Quick Access */}
      <div className="py-1">
        <div className="flex items-center justify-around px-2 py-1">
          <button
            type="button"
            onClick={() => handleAction(() => onExecCommand('bold'))}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
            title="Negrito"
          >
            <Bold size={15} />
          </button>
          <button
            type="button"
            onClick={() => handleAction(() => onExecCommand('italic'))}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
            title="Itálico"
          >
            <Italic size={15} />
          </button>
          <button
            type="button"
            onClick={() => handleAction(() => onExecCommand('underline'))}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
            title="Sublinhado"
          >
            <Underline size={15} />
          </button>
          <button
            type="button"
            onClick={() => handleAction(() => onExecCommand('hiliteColor', '#fef08a'))}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer text-amber-500"
            title="Destaque Amarelo"
          >
            <Highlighter size={15} />
          </button>
        </div>

        <div className="flex items-center justify-around px-2 py-1">
          <button
            type="button"
            onClick={() => handleAction(() => onExecCommand('justifyLeft'))}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
            title="Esquerda"
          >
            <AlignLeft size={15} />
          </button>
          <button
            type="button"
            onClick={() => handleAction(() => onExecCommand('justifyCenter'))}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
            title="Centralizar"
          >
            <AlignCenter size={15} />
          </button>
          <button
            type="button"
            onClick={() => handleAction(() => onExecCommand('justifyRight'))}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
            title="Direita"
          >
            <AlignRight size={15} />
          </button>
          <button
            type="button"
            onClick={() => handleAction(() => onExecCommand('justifyFull'))}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
            title="Justificar"
          >
            <AlignJustify size={15} />
          </button>
        </div>
      </div>

      {/* Table Context Options */}
      {isInsideTable && (
        <div className="py-1 bg-blue-50/50 dark:bg-blue-950/30">
          <div className="px-3 py-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1">
            <Table size={12} />
            <span>Opções da Tabela</span>
          </div>

          <button
            type="button"
            onClick={() => handleAction(() => onModifyTable('addRowAbove'))}
            className="w-full flex items-center gap-2.5 px-3 py-1 hover:bg-blue-100 dark:hover:bg-slate-800 cursor-pointer text-left"
          >
            <Plus size={13} className="text-blue-600" />
            <span>Inserir Linha Acima</span>
          </button>
          <button
            type="button"
            onClick={() => handleAction(() => onModifyTable('addRowBelow'))}
            className="w-full flex items-center gap-2.5 px-3 py-1 hover:bg-blue-100 dark:hover:bg-slate-800 cursor-pointer text-left"
          >
            <Plus size={13} className="text-blue-600" />
            <span>Inserir Linha Abaixo</span>
          </button>
          <button
            type="button"
            onClick={() => handleAction(() => onModifyTable('addColLeft'))}
            className="w-full flex items-center gap-2.5 px-3 py-1 hover:bg-blue-100 dark:hover:bg-slate-800 cursor-pointer text-left"
          >
            <Plus size={13} className="text-indigo-600" />
            <span>Inserir Coluna à Esquerda</span>
          </button>
          <button
            type="button"
            onClick={() => handleAction(() => onModifyTable('addColRight'))}
            className="w-full flex items-center gap-2.5 px-3 py-1 hover:bg-blue-100 dark:hover:bg-slate-800 cursor-pointer text-left"
          >
            <Plus size={13} className="text-indigo-600" />
            <span>Inserir Coluna à Direita</span>
          </button>

          <div className="px-3 py-1 flex items-center justify-between gap-2 border-t border-slate-200/50 dark:border-slate-800 mt-1">
            <span className="text-[11px] text-slate-500">Cor da Célula:</span>
            <input
              type="color"
              onChange={(e) => {
                onChangeCellBg(e.target.value);
                onClose();
              }}
              className="w-5 h-5 rounded cursor-pointer border-0"
            />
          </div>

          <button
            type="button"
            onClick={() => handleAction(() => onModifyTable('deleteRow'))}
            className="w-full flex items-center gap-2.5 px-3 py-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer text-left"
          >
            <Trash2 size={13} />
            <span>Excluir Linha</span>
          </button>
          <button
            type="button"
            onClick={() => handleAction(() => onModifyTable('deleteTable'))}
            className="w-full flex items-center gap-2.5 px-3 py-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer text-left font-bold"
          >
            <Trash2 size={13} />
            <span>Excluir Tabela Inteira</span>
          </button>
        </div>
      )}

      {/* Utilities */}
      <div className="py-1">
        <button
          type="button"
          onClick={() => handleAction(onOpenFindReplace)}
          className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer text-left"
        >
          <Search size={14} className="text-slate-400" />
          <span>Localizar e Substituir</span>
        </button>

        <button
          type="button"
          onClick={() => handleAction(onInsertFootnote)}
          className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer text-left"
        >
          <Bookmark size={14} className="text-slate-400" />
          <span>Inserir Nota de Rodapé</span>
        </button>

        <button
          type="button"
          onClick={() => handleAction(() => onExecCommand('removeFormat'))}
          className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer text-left text-slate-500"
        >
          <Eraser size={14} />
          <span>Limpar Formatação</span>
        </button>
      </div>
    </div>
  );
};
