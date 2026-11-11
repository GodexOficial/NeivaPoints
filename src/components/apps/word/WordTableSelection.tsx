import { useEffect, useState } from 'react';
import type { RefObject } from 'react';
import type { TableCell } from '../../../utils/wordTable';

/** Paint selection outside the document so it cannot leak into saved/exported HTML. */
export function WordTableSelection({ cells, canvasRef }: { cells: TableCell[]; canvasRef: RefObject<HTMLElement | null> }) {
  const [boxes, setBoxes] = useState<{ left: number; top: number; width: number; height: number }[]>([]);
  useEffect(() => {
    if (cells.length < 2) { setBoxes([]); return; }
    let frame = 0;
    const measure = () => {
      frame = 0; const canvas = canvasRef.current?.getBoundingClientRect(); if (!canvas) return;
      setBoxes(cells.filter(c => c.isConnected).map(cell => { const rect = cell.getBoundingClientRect(); const left = Math.max(canvas.left,rect.left), top = Math.max(canvas.top,rect.top); return { left,top,width:Math.max(0,Math.min(canvas.right,rect.right)-left),height:Math.max(0,Math.min(canvas.bottom,rect.bottom)-top) }; }).filter(r => r.width > 0 && r.height > 0));
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    const observer = new ResizeObserver(schedule); if (canvasRef.current) observer.observe(canvasRef.current); cells.forEach(c => observer.observe(c));
    window.addEventListener('scroll',schedule,true); window.addEventListener('resize',schedule); schedule();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener('scroll',schedule,true); window.removeEventListener('resize',schedule); };
  }, [cells,canvasRef]);
  return <div className="word-table-selection-overlay" aria-hidden="true">{boxes.map((rect,i) => <i key={i} style={rect} />)}</div>;
}
