import React, { useState } from 'react';
import { X, Search, Replace, RefreshCw } from 'lucide-react';

interface FindReplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  editorRef: React.RefObject<HTMLDivElement | null>;
  onContentChange: () => void;
}

export const FindReplaceModal: React.FC<FindReplaceModalProps> = ({
  isOpen,
  onClose,
  editorRef,
  onContentChange,
}) => {
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  if (!isOpen) return null;

  const handleFindNext = () => {
    if (!findText.trim() || !editorRef.current) return;

    const win = window as any;
    if (win.find) {
      const found = win.find(findText, false, false, true, false, true, false);
      if (found) {
        setStatusMsg('Ocorrência localizada!');
      } else {
        setStatusMsg('Nenhuma outra ocorrência encontrada.');
      }
    } else {
      setStatusMsg('Busca iniciada.');
    }
  };

  const handleReplace = () => {
    if (!findText.trim() || !editorRef.current) return;
    const selection = window.getSelection();

    if (selection && selection.toString().toLowerCase() === findText.toLowerCase()) {
      document.execCommand('insertText', false, replaceText);
      onContentChange();
      setStatusMsg('Substituído com sucesso!');
      handleFindNext();
    } else {
      handleFindNext();
    }
  };

  const handleReplaceAll = () => {
    if (!findText.trim() || !editorRef.current) return;

    const html = editorRef.current.innerHTML;
    // Escape regex special characters
    const escaped = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');

    const matches = (html.match(regex) || []).length;
    if (matches === 0) {
      setStatusMsg(`Nenhuma ocorrência de "${findText}" encontrada.`);
      return;
    }

    const newHtml = html.replace(regex, replaceText);
    editorRef.current.innerHTML = newHtml;
    onContentChange();
    setStatusMsg(`${matches} ocorrência(s) substituída(s) com sucesso!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-xl">
              <Search size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Localizar e Substituir</h3>
              <p className="text-xs text-slate-500">Busque e substitua textos no documento</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Localizar Texto</label>
            <input
              type="text"
              placeholder="Digite o texto que deseja buscar..."
              value={findText}
              onChange={(e) => {
                setFindText(e.target.value);
                setStatusMsg('');
              }}
              className="w-full mt-1 text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Substituir Por</label>
            <input
              type="text"
              placeholder="Digite o novo texto..."
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              className="w-full mt-1 text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          {statusMsg && (
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 p-2 rounded-xl">
              {statusMsg}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleFindNext}
            className="px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl cursor-pointer inline-flex items-center gap-1.5"
          >
            <Search size={14} />
            <span>Localizar</span>
          </button>

          <button
            type="button"
            onClick={handleReplace}
            className="px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl cursor-pointer inline-flex items-center gap-1.5"
          >
            <Replace size={14} />
            <span>Substituir</span>
          </button>

          <button
            type="button"
            onClick={handleReplaceAll}
            className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-1.5"
          >
            <RefreshCw size={14} />
            <span>Substituir Tudo</span>
          </button>
        </div>
      </div>
    </div>
  );
};
