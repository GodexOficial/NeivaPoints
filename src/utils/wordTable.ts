/** Logical table coordinates include cells covered by rowSpan/colSpan. */
export type TableCell = HTMLTableCellElement;
export type CellPosition = { cell: TableCell; row: number; col: number; rows: number; cols: number };
export function tableMap(table: HTMLTableElement) {
  const grid: TableCell[][] = [], positions: CellPosition[] = [];
  Array.from(table.rows).forEach((row, r) => {
    grid[r] ||= [];
    let c = 0;
    Array.from(row.cells).forEach(cell => {
      while (grid[r][c]) c++;
      const rows = Math.min(cell.rowSpan || table.rows.length - r, table.rows.length - r), cols = cell.colSpan;
      positions.push({ cell, row: r, col: c, rows, cols });
      for (let y = r; y < r + rows; y++) for (let x = c; x < c + cols; x++) { grid[y] ||= []; grid[y][x] = cell; }
      c += cols;
    });
  });
  return { grid, positions, width: Math.max(0, ...grid.map(row => row.length)), height: table.rows.length };
}
function blankCell(template?: TableCell): TableCell {
  const cell = document.createElement(template?.tagName.toLowerCase() === 'th' ? 'th' : 'td');
  cell.style.cssText = template?.style.cssText || 'border:1px solid #64748b;padding:10px;vertical-align:middle;text-align:center;height:40px';
  cell.style.width = ''; cell.style.height = ''; cell.innerHTML = '<p><br></p>';
  return cell;
}
export function insertTableRow(table: HTMLTableElement, at: number) {
  const map = tableMap(table); at = Math.max(0, Math.min(map.height, at));
  const crosses = map.positions.filter(p => p.row < at && p.row + p.rows > at);
  crosses.forEach(p => { p.cell.rowSpan = p.rows + 1; });
  const row = table.insertRow(at);
  row.style.height = '40px';
  for (let c = 0; c < map.width; c++) if (!crosses.some(p => p.col <= c && p.col + p.cols > c)) {
    const cell = blankCell(map.grid[Math.min(at, map.height - 1)]?.[c]);
    // A body row inserted next to a heading remains a body row.
    if (row.parentElement?.tagName !== 'THEAD' && cell.tagName === 'TH') { const td = document.createElement('td'); td.style.cssText = cell.style.cssText; td.innerHTML = cell.innerHTML; row.append(td); }
    else row.append(cell);
  }
}
export function insertTableColumn(table: HTMLTableElement, at: number) {
  const map = tableMap(table); at = Math.max(0, Math.min(map.width, at));
  const crosses = map.positions.filter(p => p.col < at && p.col + p.cols > at);
  crosses.forEach(p => { p.cell.colSpan = p.cols + 1; });
  Array.from(table.rows).forEach((row, r) => {
    if (crosses.some(p => p.row <= r && p.row + p.rows > r)) return;
    const next = map.positions.find(p => p.row === r && p.col >= at);
    row.insertBefore(blankCell(map.grid[r]?.[Math.min(at, map.width - 1)]), next?.cell || null);
  });
  table.querySelectorAll('colgroup').forEach(el => el.remove());
}
export function deleteTableRow(table: HTMLTableElement, at: number) {
  const map = tableMap(table); if (!table.rows[at]) return;
  if (map.height === 1) { table.remove(); return; }
  map.positions.filter(p => p.row < at && p.row + p.rows > at).forEach(p => { p.cell.rowSpan = p.rows - 1; });
  const nextRow = table.rows[at + 1];
  if (nextRow) map.positions.filter(p => p.row === at && p.rows > 1).forEach(p => {
    p.cell.rowSpan = p.rows - 1;
    const next = map.positions.find(q => q.row === at + 1 && q.col > p.col);
    nextRow.insertBefore(p.cell, next?.cell || null);
  });
  table.rows[at].remove();
}
export function deleteTableColumn(table: HTMLTableElement, at: number) {
  const map = tableMap(table); if (map.width === 1) { table.remove(); return; }
  map.positions.filter(p => p.col <= at && p.col + p.cols > at).forEach(p => { if (p.cols > 1) p.cell.colSpan = p.cols - 1; else p.cell.remove(); });
  table.querySelectorAll('colgroup').forEach(el => el.remove());
}
export function rectangularCells(table: HTMLTableElement, start: TableCell, end: TableCell) {
  const { positions } = tableMap(table), a = positions.find(p => p.cell === start), b = positions.find(p => p.cell === end);
  if (!a || !b) return [];
  let top = Math.min(a.row, b.row), left = Math.min(a.col, b.col), bottom = Math.max(a.row + a.rows, b.row + b.rows), right = Math.max(a.col + a.cols, b.col + b.cols);
  // Expand to cover intersecting merged cells until the rectangle is closed.
  let changed = true;
  while (changed) { changed = false; positions.forEach(p => { if (p.row < bottom && p.row + p.rows > top && p.col < right && p.col + p.cols > left) {
    const bounds = [Math.min(top, p.row), Math.min(left, p.col), Math.max(bottom, p.row + p.rows), Math.max(right, p.col + p.cols)];
    if (bounds.some((v, i) => v !== [top, left, bottom, right][i])) { [top, left, bottom, right] = bounds; changed = true; }
  } }); }
  return positions.filter(p => p.row >= top && p.row + p.rows <= bottom && p.col >= left && p.col + p.cols <= right).map(p => p.cell);
}
export function mergeTableCells(table: HTMLTableElement, cells: TableCell[]) {
  const positions = tableMap(table).positions.filter(p => cells.includes(p.cell));
  if (positions.length < 2) throw new Error('Selecione duas ou mais células com Shift + clique ou pelo painel.');
  const top = Math.min(...positions.map(p => p.row)), left = Math.min(...positions.map(p => p.col));
  const bottom = Math.max(...positions.map(p => p.row + p.rows)), right = Math.max(...positions.map(p => p.col + p.cols));
  if (positions.reduce((sum, p) => sum + p.rows * p.cols, 0) !== (bottom - top) * (right - left)) throw new Error('A seleção precisa formar um retângulo.');
  const first = positions.find(p => p.row === top && p.col === left)!.cell;
  positions.forEach(p => { if (p.cell !== first) { if (p.cell.textContent?.trim() || p.cell.querySelector('img,table')) { const holder = document.createElement('div'); holder.append(...p.cell.childNodes); first.append(holder); } p.cell.remove(); } });
  first.rowSpan = bottom - top; first.colSpan = right - left; return first;
}
export function splitTableCell(table: HTMLTableElement, cell: TableCell) {
  const map = tableMap(table), p = map.positions.find(p => p.cell === cell); if (!p) return;
  for (let r = p.row; r < p.row + p.rows; r++) {
    const row = table.rows[r], next = map.positions.find(q => q.row === r && q.col >= p.col + p.cols);
    for (let c = p.col; c < p.col + p.cols; c++) if (r !== p.row || c !== p.col) row.insertBefore(blankCell(cell), next?.cell || null);
  }
  cell.rowSpan = 1; cell.colSpan = 1;
}
/** Introduce grid boundaries without creating unwanted cells in adjacent rows. */
export function subdivideTableCell(table: HTMLTableElement, cell: TableCell, rows: number, cols: number) {
  const map = tableMap(table), target = map.positions.find(p => p.cell === cell);
  if (!target || !Number.isInteger(rows) || !Number.isInteger(cols) || rows < 1 || cols < 1 || rows > 20 || cols > 20) throw new Error('Use entre 1 e 20 divisões por direção.');
  const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a;
  const sx = cols / gcd(target.cols, cols), sy = rows / gcd(target.rows, rows);
  const x = (n: number) => n + Math.max(0, Math.min(target.cols, n - target.col)) * (sx - 1);
  const y = (n: number) => n + Math.max(0, Math.min(target.rows, n - target.row)) * (sy - 1);
  if (x(map.width) > 60 || y(map.height) > 400) throw new Error('Essa divisão produziria uma tabela muito grande. Use menos divisões.');
  const originalRows = Array.from(table.rows), newRows: HTMLTableRowElement[] = [];
  originalRows.forEach((row, index) => {
    newRows.push(row);
    let previous = row;
    for (let r = y(index) + 1; r < y(index + 1); r++) { const next = document.createElement('tr'); previous.after(next); newRows.push(next); previous = next; }
  });
  const placements = map.positions.filter(p => p.cell !== cell).map(p => ({ cell: p.cell, row: y(p.row), col: x(p.col), rows: y(p.row + p.rows) - y(p.row), cols: x(p.col + p.cols) - x(p.col) }));
  const pieceRows = target.rows * sy / rows, pieceCols = target.cols * sx / cols;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) placements.push({ cell: r === 0 && c === 0 ? cell : blankCell(cell), row: y(target.row) + r * pieceRows, col: x(target.col) + c * pieceCols, rows: pieceRows, cols: pieceCols });
  map.positions.forEach(p => p.cell.remove());
  placements.sort((a, b) => a.row - b.row || a.col - b.col).forEach(p => { p.cell.rowSpan = p.rows; p.cell.colSpan = p.cols; newRows[p.row].append(p.cell); });
  fitTable(table, 'content');
}
export type TableFit = 'content' | 'window' | 'fixed';
export function fitTable(table: HTMLTableElement, mode: TableFit) {
  table.dataset.wordFit = mode; table.style.tableLayout = mode === 'fixed' ? 'fixed' : 'auto';
  table.style.width = mode === 'content' ? 'auto' : '100%'; table.style.maxWidth = '100%';
  table.querySelectorAll('colgroup').forEach(el => el.remove());
  tableMap(table).positions.forEach(({ cell }) => { cell.style.width = ''; cell.style.minWidth = ''; cell.style.whiteSpace = 'normal'; cell.style.overflowWrap = 'anywhere'; });
}
export function sortTable(table: HTMLTableElement, col: number, descending: boolean, numeric: boolean, header: boolean) {
  const map = tableMap(table);
  if (map.positions.some(p => p.rows > 1)) throw new Error('Divida as células mescladas verticalmente antes de ordenar.');
  const rows = Array.from(table.rows).slice(header ? 1 : 0);
  const number = (s: string) => { const value = s.trim().replace(/\s/g, ''); return Number(value.includes(',') ? value.replace(/\./g, '').replace(',', '.') : value); };
  const keys = rows.map(row => ({ row, key: map.grid[row.rowIndex]?.[col]?.textContent || '' }));
  keys.sort((a, b) => (numeric ? number(a.key) - number(b.key) : a.key.localeCompare(b.key, 'pt-BR', { numeric: true })) * (descending ? -1 : 1));
  // Keep headers and row groups; never move a body row into THEAD.
  const parent = rows[0]?.parentElement; if (!parent) return;
  if (rows.some(row => row.parentElement !== parent)) throw new Error('Ordene uma tabela com um único corpo de dados.');
  keys.forEach(({ row }) => parent.append(row));
}
const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export function tableHTML(data: string[][], header = false, fit: TableFit = 'window', theme = '#ffffff') {
  const cols = Math.max(1, ...data.map(row => row.length));
  return `<table data-word-fit="${fit}" style="border-collapse:collapse;table-layout:${fit === 'fixed' ? 'fixed' : 'auto'};width:${fit === 'content' ? 'auto' : '100%'};max-width:100%;margin:12px auto;color:#111827;background:#fff"><tbody>${data.map((row, r) => `<tr style="height:40px">${Array.from({ length: cols }, (_, c) => { const tag = header && r === 0 ? 'th' : 'td'; return `<${tag} style="border:1px solid #64748b;padding:10px;vertical-align:middle;height:40px;overflow-wrap:anywhere;text-align:center;${header && r === 0 ? `background:${theme};color:${theme === '#ffffff' ? '#111827' : '#ffffff'};` : ''}"><p>${escape(row[c] || '').replace(/\n/g, '<br>') || '<br>'}</p></${tag}>`; }).join('')}</tr>`).join('')}</tbody></table><p><br></p>`;
}

/** Delete text/media in a range without letting contenteditable remove table structure. */
export function deleteTableContent(editor: HTMLElement, backward = false): boolean {
  const selection = getSelection(); if (!selection?.rangeCount) return false;
  const range = selection.getRangeAt(0); if (!editor.contains(range.commonAncestorContainer)) return false;
  const element = range.startContainer instanceof Element ? range.startContainer : range.startContainer.parentElement;
  const cell = element?.closest<HTMLTableCellElement>('td,th');
  if (range.collapsed) {
    if (!cell) return false;
    const remainder = range.cloneRange();
    if (backward) remainder.setStart(cell, 0); else remainder.setEnd(cell, cell.childNodes.length);
    // At a cell boundary, Delete/Backspace must not join or remove cells.
    return !remainder.toString() && !remainder.cloneContents().querySelector('img,svg,table,hr');
  }
  const cells = Array.from(editor.querySelectorAll<HTMLTableCellElement>('td,th')).filter(c => range.intersectsNode(c));
  if (!cells.length) return false;
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT), edits: { text: Text; start: number; end: number }[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const text = node as Text;
    if (!range.intersectsNode(text)) continue;
    const start = text === range.startContainer ? range.startOffset : 0, end = text === range.endContainer ? range.endOffset : text.length;
    if (end > start) edits.push({ text, start, end });
  }
  const media = Array.from(editor.querySelectorAll('img,svg,hr,br')).filter(el => range.intersectsNode(el));
  edits.reverse().forEach(({ text, start, end }) => text.deleteData(start, end - start));
  media.forEach(el => el.remove());
  cells.forEach(c => { if (!c.textContent?.trim() && !c.querySelector('img,svg,table,hr')) c.innerHTML = '<p><br></p>'; });
  const caret = document.createRange();
  const caretCell = cell?.isConnected ? cell : cells[0];
  if (caretCell?.isConnected) { caret.selectNodeContents(caretCell); caret.collapse(true); }
  else { caret.setStart(range.startContainer, Math.min(range.startOffset, range.startContainer.nodeType === Node.TEXT_NODE ? range.startContainer.textContent!.length : range.startContainer.childNodes.length)); caret.collapse(true); }
  selection.removeAllRanges(); selection.addRange(caret); return true;
}
/** Quoted CSV fields, tabs and semicolons; no HTML is interpreted. */
export function parseTableText(text: string, delimiter: string): string[][] {
  if (delimiter === 'paragraph') return text.split(/\r?\n/).map(line => [line]);
  const rows: string[][] = [[]]; let field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"' && (!field || quoted)) { if (quoted && text[i + 1] === '"') { field += '"'; i++; } else quoted = !quoted; }
    else if (!quoted && (char === delimiter || char === '\n')) { rows.at(-1)!.push(field.replace(/\r$/, '')); field = ''; if (char === '\n') rows.push([]); }
    else field += char;
  }
  rows.at(-1)!.push(field.replace(/\r$/, ''));
  if (rows.length > 1 && rows.at(-1)!.length === 1 && !rows.at(-1)![0]) rows.pop();
  return rows;
}
