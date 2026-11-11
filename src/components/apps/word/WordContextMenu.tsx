import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Clipboard, Copy, Highlighter, Italic, Link, MessageSquare, Scissors, Table, Trash2, Type, Underline } from 'lucide-react';
import type { ActiveFormatting } from '../../../types/doc';
import type { LucideIcon } from 'lucide-react';

interface Props {
  x: number; y: number; onClose: () => void;
  onExecCommand: (command: string, value?: string) => void;
  onAction: (action: string, value?: string) => void;
  onOpenTableModal: () => void;
  onModifyTable: (action: 'addRowAbove' | 'addRowBelow' | 'addColLeft' | 'addColRight' | 'deleteRow' | 'deleteCol' | 'deleteTable') => void;
  onClearCells: () => void;
  targetElement: HTMLElement | null; activeFormat: ActiveFormatting; readOnly: boolean;
}
export function WordContextMenu(p: Props) {
  const { onClose } = p;
  const ref = useRef<HTMLDivElement>(null);
  const [position,setPosition] = useState({ left: p.x,top: p.y }), [size,setSize] = useState(String(Math.round(p.activeFormat.fontSizePt || 12)));
  useLayoutEffect(() => {
    const place = () => {
      if (!ref.current) return;
      const v = window.visualViewport, x = v?.offsetLeft || 0, y = v?.offsetTop || 0, width = v?.width || innerWidth, height = v?.height || innerHeight;
      ref.current.style.maxHeight = `${Math.max(80,height-16)}px`; ref.current.style.maxWidth = `${Math.max(80,width-16)}px`;
      const rect = ref.current.getBoundingClientRect();
      setPosition({ left: Math.max(x+8,Math.min(p.x,x+width-rect.width-8)), top: Math.max(y+8,Math.min(p.y,y+height-rect.height-8)) });
    };
    place(); const observer = new ResizeObserver(place); if (ref.current) observer.observe(ref.current);
    window.addEventListener('resize',place); window.visualViewport?.addEventListener('resize',place);
    return () => { observer.disconnect(); window.removeEventListener('resize',place); window.visualViewport?.removeEventListener('resize',place); };
  }, [p.x,p.y]);
  useEffect(() => { const outside = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) onClose(); }; document.addEventListener('pointerdown',outside); return () => document.removeEventListener('pointerdown',outside); }, [onClose]);
  const command = (cmd: string,value?: string) => p.onExecCommand(cmd,value);
  const item = (label: string,icon: LucideIcon, action: () => void,shortcut?: string,editing = true) => { const Icon = icon; return <button type="button" disabled={editing && p.readOnly} className="word-context-item" onMouseDown={e => e.preventDefault()} onClick={() => { action(); p.onClose(); }}><Icon size={16} /><span>{label}</span>{shortcut && <kbd>{shortcut}</kbd>}</button>; };
  const tool = (label: string,icon: LucideIcon,cmd: string, active?: boolean) => { const Icon = icon; return <button type="button" aria-label={label} title={label} aria-pressed={active} disabled={p.readOnly} onMouseDown={e => e.preventDefault()} onClick={() => command(cmd)}><Icon size={16} /></button>; };
  const inTable = Boolean(p.targetElement?.closest('table'));
  return <div ref={ref} className="word-context-menu" style={position} role="dialog" aria-label="Menu de edição" data-motion="off" onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); p.onClose(); } }}>
    <div className="word-context-format" role="toolbar" aria-label="Formatação rápida"><div className="word-context-font-row"><select aria-label="Fonte no menu" value={['Aptos','Calibri','Arial','Times New Roman','Georgia','Verdana','Courier New'].find(f => p.activeFormat.fontFamily.includes(f)) || 'Calibri'} disabled={p.readOnly} onChange={e => command('fontName',e.target.value)}>{['Aptos','Calibri','Arial','Times New Roman','Georgia','Verdana','Courier New'].map(font => <option key={font}>{font}</option>)}</select><input aria-label="Tamanho da fonte no menu" type="number" min={6} max={96} value={size} disabled={p.readOnly} onChange={e => setSize(e.target.value)} onBlur={() => p.onAction('font-size',size)} onKeyDown={e => { if (e.key === 'Enter') { p.onAction('font-size',size); e.currentTarget.blur(); } }} /></div><div className="word-context-tools">{tool('Negrito',Bold,'bold',p.activeFormat.bold)}{tool('Itálico',Italic,'italic',p.activeFormat.italic)}{tool('Sublinhado',Underline,'underline',p.activeFormat.underline)}<label title="Realce"><Highlighter size={16} /><input type="color" aria-label="Realce no menu" defaultValue="#fef08a" disabled={p.readOnly} onChange={e => command('hiliteColor',e.target.value)} /></label><label title="Cor do texto"><Type size={16} /><input type="color" aria-label="Cor do texto no menu" defaultValue="#111827" disabled={p.readOnly} onChange={e => command('foreColor',e.target.value)} /></label>{tool('Alinhar à esquerda',AlignLeft,'justifyLeft')}{tool('Centralizar',AlignCenter,'justifyCenter')}{tool('Alinhar à direita',AlignRight,'justifyRight')}{tool('Justificar',AlignJustify,'justifyFull')}</div></div>
    <div className="word-context-list">{item('Recortar',Scissors,() => p.onAction('cut'),'Ctrl+X')}{item('Copiar',Copy,() => p.onAction('copy'),'Ctrl+C',false)}{item('Colar',Clipboard,() => p.onAction('paste'),'Ctrl+V')}{item('Colar somente o texto',Clipboard,() => p.onAction('paste'),'Ctrl+Shift+V')}{item('Copiar formatação',Type,() => p.onAction('paint-format'))}<hr />{item('Link…',Link,() => p.onAction('link'))}{item('Novo comentário',MessageSquare,() => p.onAction('comment'),'Ctrl+Alt+M')}
      {inTable && <><hr />{item('Layout da tabela',Table,p.onOpenTableModal,undefined,false)}{item('Limpar conteúdo das células',Trash2,p.onClearCells)}{item('Inserir linha acima',Table,() => p.onModifyTable('addRowAbove'))}{item('Inserir linha abaixo',Table,() => p.onModifyTable('addRowBelow'))}{item('Inserir coluna à esquerda',Table,() => p.onModifyTable('addColLeft'))}{item('Inserir coluna à direita',Table,() => p.onModifyTable('addColRight'))}{item('Excluir linha',Trash2,() => p.onModifyTable('deleteRow'))}{item('Excluir coluna',Trash2,() => p.onModifyTable('deleteCol'))}{item('Excluir tabela',Trash2,() => p.onModifyTable('deleteTable'))}</>}
    </div>
  </div>;
}
