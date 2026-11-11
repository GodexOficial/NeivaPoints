import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { parseTableText, tableHTML, type TableFit } from '../../../utils/wordTable';
import { useDialogFocus } from '../../../hooks/useDialogFocus';

interface Props { isOpen: boolean; onClose: () => void; onInsertHtml: (html: string) => void; selectedText?: string }
export function InsertTableModal({ isOpen, onClose, onInsertHtml, selectedText = '' }: Props) {
  const [rows, setRows] = useState(3), [cols, setCols] = useState(3);
  const [hover, setHover] = useState<[number, number] | null>(null);
  const [header, setHeader] = useState(false), [theme, setTheme] = useState('#ffffff');
  const [fit, setFit] = useState<TableFit>('window');
  const [mode, setMode] = useState<'grid' | 'text' | 'quick' | 'draw'>('grid');
  const [vertical, setVertical] = useState<number[]>([]), [horizontal, setHorizontal] = useState<number[]>([]), [drawAxis, setDrawAxis] = useState('column');
  const [text, setText] = useState(''), [delimiter, setDelimiter] = useState('\t'), [error, setError] = useState('');
  const ref = useDialogFocus(isOpen);
  useEffect(() => { if (isOpen) { setText(selectedText); setError(''); setHover(null); } }, [isOpen, selectedText]);
  if (!isOpen) return null;
  const insert = (data: string[][], heading = header) => {
    if (!data.length || data.length > 200 || Math.max(...data.map(row => row.length)) > 20) { setError('Use até 200 linhas e 20 colunas por tabela.'); return; }
    onInsertHtml(tableHTML(data, heading, fit, theme)); onClose();
  };
  return <div className="word-dialog-backdrop"><div ref={ref} className="word-dialog word-table-insert" role="dialog" aria-modal="true" aria-labelledby="table-insert-title" onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }}>
    <header><h2 id="table-insert-title">Inserir tabela</h2><button aria-label="Fechar inserção de tabela" onClick={onClose}><X size={18} /></button></header>
    <div className="word-table-modes">{([['grid', 'Escolher grid'], ['draw', 'Desenhar tabela'], ['text', 'Converter texto em tabela'], ['quick', 'Tabelas rápidas']] as const).map(([id, label]) => <button key={id} aria-pressed={mode === id} onClick={() => setMode(id)}>{label}</button>)}</div>
    {mode === 'grid' && <>
      <p aria-live="polite">Tabela {hover?.[1] || cols} × {hover?.[0] || rows} — colunas × linhas</p>
      <div className="word-table-picker" role="group" aria-label="Selecionar dimensões da tabela" onMouseLeave={() => setHover(null)}>{Array.from({ length: 80 }, (_, index) => {
        const r = Math.floor(index / 10) + 1, c = index % 10 + 1, active = r <= (hover?.[0] || rows) && c <= (hover?.[1] || cols);
        return <button key={index} aria-label={`${c} colunas e ${r} linhas`} className={active ? 'selected' : ''} onMouseEnter={() => setHover([r, c])} onFocus={() => setHover([r, c])} onClick={() => { setRows(r); setCols(c); insert(Array.from({ length: r }, () => Array(c).fill(''))); }} />;
      })}</div>
      <div className="word-table-fields"><label>Linhas<input aria-label="Linhas" type="number" min={1} max={200} value={rows} onChange={e => setRows(Math.min(200, Math.max(1, Number(e.target.value))))} /></label><label>Colunas<input aria-label="Colunas" type="number" min={1} max={20} value={cols} onChange={e => setCols(Math.min(20, Math.max(1, Number(e.target.value))))} /></label></div>
      <p>Toque ou clique no grid para inserir. Para tabelas maiores, use os campos e “Criar tabela”.</p>
    </>}
    {mode === 'text' && <><p>Cole dados de uma planilha, CSV ou texto separado por tabulações. A seleção do documento aparece aqui automaticamente.</p><textarea aria-label="Texto para converter em tabela" value={text} onChange={e => setText(e.target.value)} /><label>Separar células por<select aria-label="Separador de células" value={delimiter} onChange={e => setDelimiter(e.target.value)}><option value={'\t'}>Tabulações</option><option value=";">Ponto e vírgula</option><option value=",">Vírgulas (CSV)</option><option value="paragraph">Parágrafos</option></select></label></>}
    {mode === 'draw' && <><p>Escolha a direção e toque na área para desenhar divisórias. {vertical.length + 1} colunas × {horizontal.length + 1} linhas.</p><label>Desenhar<select aria-label="Direção da divisória" value={drawAxis} onChange={e => setDrawAxis(e.target.value)}><option value="column">Divisória vertical (coluna)</option><option value="row">Divisória horizontal (linha)</option></select></label><svg className="word-table-drawing" viewBox="0 0 500 240" role="img" aria-label="Área para desenhar divisórias da tabela" onClick={e => { const rect = e.currentTarget.getBoundingClientRect(); const coordinate = Math.round(Math.max(.03, Math.min(.97, drawAxis === 'column' ? (e.clientX - rect.left) / rect.width : (e.clientY - rect.top) / rect.height)) * 100) / 100; const change = drawAxis === 'column' ? setVertical : setHorizontal; change(values => values.length >= 19 || values.some(v => Math.abs(v - coordinate) < .025) ? values : [...values, coordinate].sort((a, b) => a - b)); }}><rect x="1" y="1" width="498" height="238" fill="#fff" stroke="#818cf8" />{vertical.map(x => <line key={x} x1={x * 500} x2={x * 500} y1="0" y2="240" stroke="#475569" strokeWidth="2" />)}{horizontal.map(y => <line key={y} y1={y * 240} y2={y * 240} x1="0" x2="500" stroke="#475569" strokeWidth="2" />)}</svg><div className="word-table-actions"><button onClick={() => { setVertical([]); setHorizontal([]); }}>Limpar desenho</button><button onClick={() => setVertical(v => v.length < 19 ? Array.from({ length: v.length + 1 }, (_, i) => (i + 1) / (v.length + 2)) : v)}>Adicionar coluna igual</button><button onClick={() => setHorizontal(v => v.length < 19 ? Array.from({ length: v.length + 1 }, (_, i) => (i + 1) / (v.length + 2)) : v)}>Adicionar linha igual</button><button onClick={() => { const holder = document.createElement('div'); holder.innerHTML = tableHTML(Array.from({ length: horizontal.length + 1 }, () => Array(vertical.length + 1).fill('')), header, 'fixed', theme); const table = holder.querySelector('table')!, group = document.createElement('colgroup'); const xs = [0, ...vertical, 1], ys = [0, ...horizontal, 1]; xs.slice(1).forEach((x, i) => { const col = document.createElement('col'); col.style.width = `${(x - xs[i]) * 100}%`; group.append(col); }); table.prepend(group); Array.from(table.rows).forEach((row, i) => { row.style.height = `${Math.max(24, (ys[i + 1] - ys[i]) * 240)}px`; }); onInsertHtml(holder.innerHTML); onClose(); }}>Inserir tabela desenhada</button></div></>}
    {mode === 'quick' && <div className="word-table-templates"><button onClick={() => insert([['Item', 'Quantidade', 'Valor'], ['', '', ''], ['', '', ''], ['Total', '', '']], true)}>Lista de itens · 3 × 4</button><button onClick={() => insert([['Horário', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'], ...Array.from({ length: 5 }, () => Array(6).fill(''))], true)}>Agenda semanal · 6 × 6</button><button onClick={() => insert([['Nome', 'Descrição'], ['', ''], ['', '']], true)}>Ficha · 2 × 3</button></div>}
    <label>Ajuste automático<select aria-label="Ajuste automático da nova tabela" value={fit} onChange={e => setFit(e.target.value as TableFit)}><option value="content">Ao conteúdo das células</option><option value="window">À largura da página</option><option value="fixed">Colunas de mesma largura</option></select></label>
    <label><input type="checkbox" checked={header} onChange={e => setHeader(e.target.checked)} />Primeira linha como cabeçalho (incluída no total de linhas)</label>
    <label>Estilo do cabeçalho<select aria-label="Estilo do cabeçalho" value={theme} onChange={e => setTheme(e.target.value)}><option value="#ffffff">Simples</option><option value="#2563eb">Azul</option><option value="#334155">Grafite</option><option value="#047857">Verde</option></select></label>
    {error && <p role="alert">{error}</p>}
    <footer><button onClick={onClose}>Cancelar</button>{(mode === 'text' || mode === 'grid') && <button onClick={() => insert(mode === 'text' ? parseTableText(text, delimiter) : Array.from({ length: rows }, () => Array(cols).fill('')))}>Criar tabela</button>}</footer>
  </div></div>;
}
