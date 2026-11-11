import { useEffect, useRef, useState } from 'react';
import { FolderOpen, X } from 'lucide-react';
import type { BitmapImage, WordDocument } from '../../../types/doc';
import { getLocalDocuments } from '../../../services/docService';

export type WordPanel = 'open' | 'source' | 'comments' | 'review' | 'help' | 'merge' | null;
export function WordPanels({ panel, close, current, open, source, applySource, merge, removeComment }: {
  panel: WordPanel; close: () => void; current: WordDocument; open: (doc: WordDocument) => void;
  source: string; applySource: (html: string) => void; merge: (rows: Record<string, string>[]) => void;
  removeComment: (id: string) => void;
}) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { setText(panel === 'source' ? source : '[{"nome":"Maria","turma":"6º Ano"},{"nome":"João","turma":"7º Ano"}]'); setError(''); }, [panel, source]);
  if (!panel) return null;
  const titles = { open: 'Abrir documentos', source: 'Código HTML da página', comments: 'Comentários', review: 'Editor e revisão', help: 'Ajuda e atalhos', merge: 'Gerar correspondências' };
  return <div className="word-dialog-backdrop" role="dialog" aria-modal="true" aria-label={titles[panel]}>
    <section className="word-dialog"><header><h2>{titles[panel]}</h2><button onClick={close} aria-label="Fechar painel"><X size={20} /></button></header>
      {panel === 'open' && <div className="word-document-list">{getLocalDocuments().map(doc => <button key={doc.id} onClick={() => { open(doc); close(); }}><FolderOpen size={21} /><span><strong>{doc.title}</strong><small>{new Date(doc.updatedAt).toLocaleString('pt-BR')}</small></span></button>)}</div>}
      {panel === 'source' && <><p>Edite a página atual. Scripts e atributos inseguros serão removidos.</p><textarea aria-label="Código HTML" value={text} onChange={e => setText(e.target.value)} spellCheck={false} /><footer><button onClick={() => { applySource(text); close(); }}>Aplicar HTML</button></footer></>}
      {panel === 'merge' && <><p>Use campos como {'{{nome}}'} no texto. Informe uma lista JSON de destinatários; cada registro gera uma cópia do documento.</p><textarea aria-label="Destinatários JSON" value={text} onChange={e => setText(e.target.value)} spellCheck={false} />{error && <p role="alert">{error}</p>}<footer><button onClick={() => { try { const rows = JSON.parse(text); if (!Array.isArray(rows) || !rows.length || rows.length > 100 || rows.some(row => !row || typeof row !== 'object' || Array.isArray(row))) throw new Error(); merge(rows); close(); } catch { setError('Informe uma lista JSON válida com 1 a 100 destinatários.'); } }}>Gerar documentos</button></footer></>}
      {panel === 'comments' && <div className="word-comment-list">{!current.comments?.length && <p>Selecione um trecho e use “Novo comentário”.</p>}{current.comments?.map(comment => <article key={comment.id}><blockquote>{comment.quote}</blockquote><p>{comment.text}</p><small>{new Date(comment.createdAt).toLocaleString('pt-BR')}</small><button onClick={() => removeComment(comment.id)}>Excluir comentário</button></article>)}</div>}
      {panel === 'review' && <><p>A revisão ortográfica do navegador está ativada. Palavras desconhecidas podem receber um sublinhado vermelho; clique com o botão direito sobre elas para ver sugestões.</p><p>A disponibilidade do dicionário depende dos idiomas instalados no navegador. Este editor não utiliza um serviço de revisão gramatical na nuvem.</p><p><strong>{new DOMParser().parseFromString(current.content, 'text/html').body.textContent?.trim().split(/\s+/).filter(Boolean).length || 0}</strong> palavras no documento.</p></>}
      {panel === 'help' && <><p>Selecione texto para formatar. A faixa de opções mantém a seleção ao clicar em comandos.</p><ul><li>Ctrl+S: salvar neste navegador</li><li>Ctrl+B / I / U: negrito, itálico e sublinhado</li><li>Ctrl+Z / Y: desfazer e refazer texto</li><li>Ctrl+F / H: localizar e substituir</li><li>Ctrl+Enter: nova página</li><li>Esc: sair do modo foco</li></ul><p>Use Arquivo para importar DOCX/HTML/TXT, reabrir documentos salvos ou exportar. A impressão permite salvar em PDF. O ditado exige suporte e permissão de microfone do navegador.</p></>}
    </section>
  </div>;
}

type Stroke = { points: { x: number; y: number }[]; color: string; width: number };
export function WordInkPad({ close, insert }: { close: () => void; insert: (image: BitmapImage) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Stroke[]>([]);
  const drawing = useRef(false);
  const [color, setColor] = useState('#2563eb');
  const [width, setWidth] = useState(3);
  const redraw = () => {
    const context = canvas.current?.getContext('2d'); if (!context) return;
    context.clearRect(0, 0, 720, 420); context.lineCap = 'round'; context.lineJoin = 'round';
    for (const stroke of strokes.current) { context.beginPath(); context.strokeStyle = stroke.color; context.lineWidth = stroke.width; stroke.points.forEach((point, i) => i ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y)); context.stroke(); }
  };
  return <div className="word-dialog-backdrop" role="dialog" aria-modal="true" aria-label="Desenho livre"><section className="word-dialog word-ink-dialog"><header><h2>Desenho livre</h2><button aria-label="Fechar desenho" onClick={close}><X size={20} /></button></header><div className="word-tool-row"><label>Cor<input aria-label="Cor da caneta" type="color" value={color} onChange={e => setColor(e.target.value)} /></label><label>Espessura<input aria-label="Espessura da caneta" type="range" min={1} max={20} value={width} onChange={e => setWidth(Number(e.target.value))} /></label><button onClick={() => { strokes.current.pop(); redraw(); }}>Desfazer traço</button><button onClick={() => { strokes.current = []; redraw(); }}>Limpar</button></div>
    <canvas ref={canvas} width={720} height={420} aria-label="Área de desenho" onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); drawing.current = true; const bounds = event.currentTarget.getBoundingClientRect(); strokes.current.push({ color, width, points: [{ x: (event.clientX - bounds.left) * 720 / bounds.width, y: (event.clientY - bounds.top) * 420 / bounds.height }] }); }} onPointerMove={event => { if (!drawing.current) return; const bounds = event.currentTarget.getBoundingClientRect(); strokes.current.at(-1)?.points.push({ x: (event.clientX - bounds.left) * 720 / bounds.width, y: (event.clientY - bounds.top) * 420 / bounds.height }); redraw(); }} onPointerUp={() => { drawing.current = false; }} onPointerCancel={() => { drawing.current = false; }} />
    <footer><button onClick={() => { if (!canvas.current || !strokes.current.length) return; insert({ id: `ink-${Date.now()}`, src: canvas.current.toDataURL('image/png'), alt: 'Desenho livre', width: 600, height: 350, align: 'center' }); close(); }}>Inserir desenho</button></footer></section></div>;
}
