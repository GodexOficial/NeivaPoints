import { deleteTableColumn, deleteTableRow, fitTable, insertTableColumn, insertTableRow, mergeTableCells, sortTable, subdivideTableCell, tableMap, type TableCell, type TableFit } from './wordTable';

export type TableCommand = { action: string; value?: string | number; extra?: string | number };
export function runTableCommand(table: HTMLTableElement, cells: TableCell[], command: TableCommand): TableCell[] {
  const map = tableMap(table), selected = map.positions.filter(p => cells.includes(p.cell)), p = selected[0];
  const value = String(command.value ?? ''), number = Number(value);
  if (!p && command.action !== 'fit') throw new Error('Selecione uma célula da tabela.');
  const indices = (axis: 'row' | 'col') => [...new Set(selected.flatMap(p => Array.from({ length: axis === 'row' ? p.rows : p.cols }, (_, i) => p[axis] + i)))];
  switch (command.action) {
    case 'clear': cells.forEach(c => { c.innerHTML = '<p><br></p>'; }); break;
    case 'row-above': if (map.height >= 200) throw new Error('Limite de 200 linhas.'); insertTableRow(table, p.row); break;
    case 'row-below': if (map.height >= 200) throw new Error('Limite de 200 linhas.'); insertTableRow(table, p.row + p.rows); break;
    case 'col-left': if (map.width >= 60) throw new Error('Limite de 60 colunas.'); insertTableColumn(table, p.col); break;
    case 'col-right': if (map.width >= 60) throw new Error('Limite de 60 colunas.'); insertTableColumn(table, p.col + p.cols); break;
    case 'delete-row': indices('row').sort((a,b) => b-a).forEach(r => { if (table.rows.length) deleteTableRow(table, r); }); break;
    case 'delete-col': indices('col').sort((a,b) => b-a).forEach(c => { if (table.rows.length) deleteTableColumn(table, c); }); break;
    case 'delete-table': table.remove(); return [];
    case 'merge': return [mergeTableCells(table, cells)];
    case 'split': if (cells.length !== 1) throw new Error('Selecione apenas uma célula para dividir.'); subdivideTableCell(table, p.cell, number, Number(command.extra)); return [p.cell];
    case 'split-table': {
      if (!p.row) throw new Error('Selecione uma linha depois da primeira.');
      if (map.positions.some(q => q.row < p.row && q.row + q.rows > p.row)) throw new Error('Divida primeiro as células que atravessam essa linha.');
      const next = table.cloneNode(false) as HTMLTableElement, body = document.createElement('tbody'); next.append(body);
      const columns = table.querySelector(':scope > colgroup'); if (columns) next.prepend(columns.cloneNode(true));
      Array.from(table.rows).slice(p.row).forEach(row => body.append(row)); const paragraph = document.createElement('p'); paragraph.innerHTML = '<br>'; table.after(paragraph, next); return [];
    }
    case 'fit': fitTable(table, value as TableFit); break;
    case 'height': if (!Number.isFinite(number) || number < .2 || number > 30) throw new Error('Use uma altura de 0,2 a 30 cm.'); cells.forEach(c => { c.style.height = `${number}cm`; c.parentElement!.style.height = `${number}cm`; }); break;
    case 'width': {
      if (!Number.isFinite(number) || number < .2 || number > 50) throw new Error('Use uma largura de 0,2 a 50 cm.');
      const colIndices = new Set(indices('col')), zoom = table.getBoundingClientRect().width / table.offsetWidth || 1;
      const widths = Array.from({ length: map.width }, (_, col) => {
        if (colIndices.has(col)) return number * 37.795;
        const owner = map.positions.filter(q => q.col <= col && q.col + q.cols > col).sort((a,b) => a.cols - b.cols)[0];
        return owner.cell.getBoundingClientRect().width / zoom / owner.cols;
      });
      const group = document.createElement('colgroup'); widths.forEach(width => { const col = document.createElement('col'); col.style.width = `${width}px`; group.append(col); });
      table.querySelectorAll(':scope > colgroup').forEach(g => g.remove()); table.prepend(group); table.style.tableLayout = 'fixed'; table.dataset.wordFit = 'fixed'; table.style.width = `${widths.reduce((a,b) => a+b, 0)}px`; break;
    }
    case 'distribute-cols': fitTable(table, 'fixed'); break;
    case 'distribute-rows': { const rows = indices('row').map(r => table.rows[r]), scale = table.getBoundingClientRect().width / table.offsetWidth || 1; const height = Math.max(...rows.map(r => r.getBoundingClientRect().height / scale)); rows.forEach(r => { r.style.height = `${height}px`; Array.from(r.cells).forEach(c => { c.style.height = `${height}px`; }); }); break; }
    case 'align': { const [vertical, horizontal] = value.split(':'); cells.forEach(c => { c.style.verticalAlign = vertical; c.style.textAlign = horizontal; c.querySelectorAll<HTMLElement>('p,div,h1,h2,h3').forEach(el => { el.style.textAlign = horizontal; }); }); break; }
    case 'direction': cells.forEach(c => { c.style.writingMode = c.style.writingMode === 'vertical-rl' ? 'horizontal-tb' : 'vertical-rl'; }); break;
    case 'padding': if (!Number.isFinite(number) || number < 0 || number > 2) throw new Error('Use margens internas de 0 a 2 cm.'); cells.forEach(c => { c.style.padding = `${number}cm`; }); break;
    case 'table-align': table.style.marginLeft = value === 'left' ? '0' : 'auto'; table.style.marginRight = value === 'right' ? '0' : 'auto'; break;
    case 'table-width': if (!Number.isFinite(number) || number < 10 || number > 100) throw new Error('Use largura de 10% a 100%.'); table.style.width = `${number}%`; table.style.maxWidth = '100%'; break;
    case 'repeat-header': {
      if (table.tHead?.rows.length) { const rows = Array.from(table.tHead.rows); const body = table.tBodies[0] || table.createTBody(); rows.reverse().forEach(row => body.prepend(row)); table.tHead.remove(); }
      else { const row = table.rows[0], head = table.tHead || table.createTHead(); if (row) head.append(row); } break;
    }
    case 'row-break': indices('row').forEach(r => { table.rows[r].dataset.wordCantSplit = value === 'avoid' ? 'true' : 'false'; table.rows[r].style.breakInside = value; }); break;
    case 'sort': sortTable(table, number, String(command.extra).includes('desc'), String(command.extra).includes('number'), !String(command.extra).includes('noheader')); break;
    case 'formula': {
      const source = command.extra === 'LEFT' ? map.grid[p.row].slice(0, p.col) : map.grid.slice(0,p.row).map(row => row[p.col]);
      const values = [...new Set(source)].filter(c => c && c !== p.cell).map(c => c.textContent?.trim() || '').filter(Boolean).map(v => Number(v.includes(',') ? v.replace(/\./g,'').replace(',','.') : v)).filter(Number.isFinite);
      if (!values.length) throw new Error('Não há números na direção escolhida.');
      const sum = values.reduce((a,b) => a+b,0), result = value === 'SUM' ? sum : value === 'AVERAGE' ? sum/values.length : value === 'COUNT' ? values.length : value === 'MIN' ? Math.min(...values) : Math.max(...values);
      p.cell.textContent = result.toLocaleString('pt-BR',{ maximumFractionDigits: 8 }); break;
    }
    case 'to-text': { const holder = document.createElement('div'); map.grid.forEach((row,r) => { const paragraph = document.createElement('p'); paragraph.style.whiteSpace = 'pre-wrap'; paragraph.textContent = row.map((c,col) => map.positions.some(q => q.cell === c && q.row === r && q.col === col) ? c.textContent : '').join('\t'); holder.append(paragraph); }); table.replaceWith(...holder.childNodes); return []; }
    case 'background': cells.forEach(c => { c.style.backgroundColor = value === 'none' ? '' : value; }); break;
    case 'border': {
      const top = Math.min(...selected.map(q => q.row)), left = Math.min(...selected.map(q => q.col)), bottom = Math.max(...selected.map(q => q.row+q.rows)), right = Math.max(...selected.map(q => q.col+q.cols));
      selected.forEach(q => { const edges = [q.row === top,q.row+q.rows === bottom,q.col === left,q.col+q.cols === right]; (['borderTop','borderBottom','borderLeft','borderRight'] as const).forEach((side,i) => { if (value === 'all' || value === 'none' || value === 'outside' && edges[i] || value === 'inside' && !edges[i] || value === side) q.cell.style[side] = value === 'none' ? 'none' : String(command.extra); }); }); break;
    }
    case 'style': {
      const theme = value === 'green' ? '#047857' : value === 'slate' ? '#334155' : '#2563eb';
      map.positions.forEach(q => { q.cell.style.backgroundColor = value === 'plain' ? '#ffffff' : q.row === 0 ? theme : q.row % 2 ? '#eff6ff' : '#ffffff'; q.cell.style.color = value !== 'plain' && q.row === 0 ? '#ffffff' : '#111827'; q.cell.style.fontWeight = q.row === 0 ? 'bold' : 'normal'; }); break;
    }
    default: throw new Error('Comando de tabela desconhecido.');
  }
  return cells.filter(c => c.isConnected && c.closest('table') === table);
}
