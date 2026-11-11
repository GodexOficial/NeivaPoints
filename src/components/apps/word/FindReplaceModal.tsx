import { useState } from 'react';
import type React from 'react';
import { X } from 'lucide-react';

interface FindReplaceModalProps {
  isOpen: boolean; onClose: () => void;
  editorRef: React.RefObject<HTMLDivElement | null>;
  getEditors?: () => HTMLDivElement[];
  onContentChange: () => void;
}
/** Search text nodes, never HTML markup, attributes or image URLs. */
export const FindReplaceModal = ({ isOpen, onClose, editorRef, getEditors, onContentChange }: FindReplaceModalProps) => {
  const [find, setFind] = useState('');
  const [replace, setReplace] = useState('');
  const [status, setStatus] = useState('');
  const [index, setIndex] = useState(0);
  const [matchCase, setMatchCase] = useState(false);
  if (!isOpen) return null;
  const matches = () => {
    const result: Range[] = [];
    if (!find) return result;
    const editors = getEditors?.() || (editorRef.current ? [editorRef.current] : []);
    for (const editor of editors) {
      const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
      const nodes: { node: Node; start: number; end: number }[] = [];
      let text = '', node: Node | null;
      while ((node = walker.nextNode())) { const start = text.length; text += node.textContent; nodes.push({ node, start, end: text.length }); }
      const source = matchCase ? text : text.toLocaleLowerCase('pt-BR');
      const needle = matchCase ? find : find.toLocaleLowerCase('pt-BR');
      let offset = 0;
      while ((offset = source.indexOf(needle, offset)) !== -1) {
        const first = nodes.find(n => n.end > offset), last = nodes.find(n => n.end >= offset + needle.length);
        if (first && last) { const range = document.createRange(); range.setStart(first.node, offset - first.start); range.setEnd(last.node, offset + needle.length - last.start); result.push(range); }
        offset += needle.length;
      }
    }
    return result;
  };
  const select = (range: Range) => { const page = range.startContainer.parentElement?.closest<HTMLElement>('[contenteditable]'); page?.focus(); const selection = window.getSelection(); selection?.removeAllRanges(); selection?.addRange(range); range.startContainer.parentElement?.scrollIntoView({ block: 'center' }); };
  const findNext = () => { const all = matches(); if (!all.length) { setStatus('Nenhuma ocorrência encontrada.'); return; } const current = index % all.length; select(all[current]); setIndex(current + 1); setStatus(`Ocorrência ${current + 1} de ${all.length}.`); };
  const replaceOne = () => { const selection = window.getSelection(); if (!selection || (matchCase ? selection.toString() !== find : selection.toString().toLocaleLowerCase('pt-BR') !== find.toLocaleLowerCase('pt-BR'))) { findNext(); return; } document.execCommand('insertText', false, replace); onContentChange(); setStatus('Ocorrência substituída.'); };
  const replaceAll = () => { const all = matches(); for (const range of all.reverse()) { select(range); document.execCommand('insertText', false, replace); } onContentChange(); setIndex(0); setStatus(`${all.length} ocorrência(s) substituída(s).`); };
  return <div className="word-dialog-backdrop" role="dialog" aria-modal="true" aria-label="Localizar e substituir"><section className="word-dialog"><header><h2>Localizar e substituir</h2><button aria-label="Fechar busca" onClick={onClose}><X size={20} /></button></header><label>Localizar<input autoFocus aria-label="Localizar texto" value={find} onChange={e => { setFind(e.target.value); setIndex(0); }} /></label><label>Substituir por<input aria-label="Substituir por" value={replace} onChange={e => setReplace(e.target.value)} /></label><label><input type="checkbox" checked={matchCase} onChange={e => setMatchCase(e.target.checked)} />Diferenciar maiúsculas e minúsculas</label><p role="status">{status}</p><footer className="word-tool-row"><button onMouseDown={e => e.preventDefault()} onClick={findNext}>Localizar próxima</button><button onMouseDown={e => e.preventDefault()} onClick={replaceOne}>Substituir ocorrência</button><button onMouseDown={e => e.preventDefault()} onClick={replaceAll}>Substituir todas</button></footer></section></div>;
};
