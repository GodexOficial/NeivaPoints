import { useEffect, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { tableMap } from '../utils/wordTable';

/** Resize only on a cell's outer edge. Pointer events work with mouse, pen and touch. */
export function useWordTableResize(readOnly: boolean, changed: () => void) {
  const cleanup = useRef<(() => void) | null>(null);
  useEffect(() => () => cleanup.current?.(), []);
  const edge = (e: ReactPointerEvent<HTMLElement>) => {
    const cell = (e.target as HTMLElement).closest<HTMLTableCellElement>('td,th');
    if (readOnly || !cell) return null;
    const box = cell.getBoundingClientRect(), distance = e.pointerType === 'touch' ? 8 : 5;
    const axis = Math.abs(e.clientX - box.right) < distance ? 'x' : Math.abs(e.clientY - box.bottom) < distance ? 'y' : null;
    return axis ? { cell, axis } : null;
  };
  return {
    onPointerMove: (e: ReactPointerEvent<HTMLElement>) => { if (!cleanup.current) e.currentTarget.style.cursor = edge(e)?.axis === 'x' ? 'col-resize' : edge(e)?.axis === 'y' ? 'row-resize' : ''; },
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
      const hit = edge(e); if (!hit || e.button !== 0) return;
      const table = hit.cell.closest('table')!;
      const map = tableMap(table), position = map.positions.find(p => p.cell === hit.cell)!;
      const scale = table.getBoundingClientRect().width / table.offsetWidth || 1;
      const start = hit.axis === 'x' ? e.clientX : e.clientY;
      const row = table.rows[position.row + position.rows - 1];
      const oldHeight = row.getBoundingClientRect().height / scale;
      let columns: HTMLTableColElement[] = [], sizes: number[] = [];
      if (hit.axis === 'x') {
        sizes = Array.from({ length: map.width }, (_, col) => {
          const owner = map.positions.filter(p => p.col <= col && p.col + p.cols > col).sort((a, b) => a.cols - b.cols)[0];
          return owner.cell.getBoundingClientRect().width / scale / owner.cols;
        });
        const group = document.createElement('colgroup');
        columns = sizes.map(size => { const col = document.createElement('col'); col.style.width = `${size}px`; group.append(col); return col; });
        table.querySelectorAll('colgroup').forEach(el => el.remove()); table.prepend(group);
        table.style.tableLayout = 'fixed'; table.style.width = `${sizes.reduce((a, b) => a + b, 0)}px`; table.dataset.wordFit = 'fixed';
      }
      e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId);
      const pointerId = e.pointerId, container = e.currentTarget, oldSelect = document.body.style.userSelect;
      document.body.style.userSelect = 'none';
      let frame = 0, latest = start;
      const paint = () => {
        frame = 0; const delta = (latest - start) / scale;
        if (hit.axis === 'x') {
          const col = position.col + position.cols - 1, total = sizes.reduce((a, b) => a + b, 0);
          const available = (table.parentElement?.getBoundingClientRect().width || total * scale) / scale;
          const width = Math.max(24, Math.min(sizes[col] + delta, Math.max(24, available - total + sizes[col])));
          columns[col].style.width = `${width}px`; table.style.width = `${total - sizes[col] + width}px`;
        } else row.style.height = `${Math.max(20, oldHeight + delta)}px`;
      };
      const move = (event: PointerEvent) => { if (event.pointerId !== pointerId) return; latest = hit.axis === 'x' ? event.clientX : event.clientY; if (!frame) frame = requestAnimationFrame(paint); };
      const end = (event: PointerEvent) => { if (event.pointerId !== pointerId) return; if (frame) { cancelAnimationFrame(frame); paint(); } cleanup.current?.(); changed(); };
      const release = () => { document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', end); document.removeEventListener('pointercancel', end); if (frame) cancelAnimationFrame(frame); if (container.hasPointerCapture(pointerId)) container.releasePointerCapture(pointerId); document.body.style.userSelect = oldSelect; container.style.cursor = ''; cleanup.current = null; };
      cleanup.current?.(); cleanup.current = release;
      document.addEventListener('pointermove', move); document.addEventListener('pointerup', end); document.addEventListener('pointercancel', end);
    },
  };
}
