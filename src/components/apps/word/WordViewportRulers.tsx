import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

interface Props {
  canvasRef: RefObject<HTMLDivElement | HTMLElement | null>;
  pageIndex: number; zoom: number; pageWidthCm: number; pageHeightCm: number;
  left: number; right: number; indent: number; top: number; bottom: number;
  changeLeft: (value: number) => void; changeRight: (value: number) => void;
  changeIndent: (value: number) => void; changeTop: (value: number) => void; changeBottom: (value: number) => void;
  readOnly: boolean;
}
type Marker = 'left' | 'right' | 'indent' | 'top' | 'bottom';

/** Keep the horizontal scale above the sheet and the vertical scale beside the canvas. */
export function WordViewportRulers(p: Props) {
  const [geometry, setGeometry] = useState({ x: 0, y: 0, scale: 37.795, width: 0, height: 0, canvasLeft: 0, canvasTop: 0, canvasRight: 0, canvasBottom: 0 });
  const dragging = useRef<Marker | null>(null);
  useEffect(() => {
    let canvas: HTMLElement | null = null, sheet: HTMLElement | undefined;
    let frame = 0;
    const measure = () => {
      frame = 0; if (!sheet || !canvas) return; const rect = sheet.getBoundingClientRect(), area = canvas.getBoundingClientRect();
      const next = { x: rect.left, y: rect.top, scale: rect.width / p.pageWidthCm, width: rect.width, height: rect.height, canvasLeft: area.left, canvasTop: area.top, canvasRight: area.left + canvas.clientWidth, canvasBottom: area.top + canvas.clientHeight };
      setGeometry(old => Object.keys(next).every(key => Math.abs(next[key as keyof typeof next] - old[key as keyof typeof next]) < .1) ? old : next);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    const observer = new ResizeObserver(schedule);
    // Wait until the canvas sibling and its page refs have been committed.
    const connect = () => {
      frame = 0; canvas = p.canvasRef.current;
      sheet = canvas?.querySelectorAll<HTMLElement>('.a4-page-sheet')[p.pageIndex];
      if (!canvas || !sheet) { frame = requestAnimationFrame(connect); return; }
      observer.observe(canvas); observer.observe(sheet);
      canvas.addEventListener('scroll', schedule, { passive: true }); window.addEventListener('resize', schedule); measure();
    };
    frame = requestAnimationFrame(connect);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); canvas?.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); };
  }, [p.canvasRef, p.pageIndex, p.zoom, p.pageWidthCm, p.pageHeightCm]);

  const horizontalLeft = Math.max(geometry.canvasLeft + 24, geometry.x);
  const horizontalWidth = Math.max(0, Math.min(geometry.canvasRight, geometry.x + geometry.width) - horizontalLeft);
  const verticalTop = Math.max(geometry.canvasTop + 36, geometry.y);
  const verticalHeight = Math.max(0, Math.min(geometry.canvasBottom, geometry.y + geometry.height) - verticalTop);

  const change = (type: Marker, raw: number) => {
    const value = Math.round(raw * 10) / 10;
    if (type === 'left') p.changeLeft(Math.max(0, Math.min(p.pageWidthCm - p.right - 1, value)));
    if (type === 'right') p.changeRight(Math.max(0, Math.min(p.pageWidthCm - p.left - 1, value)));
    if (type === 'indent') p.changeIndent(Math.max(0, Math.min(p.pageWidthCm - p.left - p.right - 1, value)));
    if (type === 'top') p.changeTop(Math.max(.5, Math.min(p.pageHeightCm - p.bottom - 2, value)));
    if (type === 'bottom') p.changeBottom(Math.max(.5, Math.min(p.pageHeightCm - p.top - 2, value)));
  };
  const values = { left: p.left, right: p.right, indent: p.indent, top: p.top, bottom: p.bottom };
  const labels = { left: 'Margem esquerda', right: 'Margem direita', indent: 'Recuo da primeira linha', top: 'Margem superior', bottom: 'Margem inferior' };
  const marker = (type: Marker) => {
    const vertical = type === 'top' || type === 'bottom';
    const cm = type === 'right' ? p.pageWidthCm - p.right : type === 'bottom' ? p.pageHeightCm - p.bottom : type === 'indent' ? p.left + p.indent : values[type];
    const position = (vertical ? geometry.y - verticalTop : geometry.x - horizontalLeft) + cm * geometry.scale;
    return <button key={type} type="button" role="slider" className={`word-viewport-marker word-marker-${type}`} style={vertical ? { top: position } : { left: position }} aria-label={labels[type]} aria-valuenow={values[type]} aria-valuemin={vertical ? .5 : 0} aria-valuemax={vertical ? p.pageHeightCm - 2 : p.pageWidthCm - 1} aria-valuetext={`${values[type].toFixed(1)} cm`} aria-orientation={vertical ? 'vertical' : 'horizontal'} title={`${labels[type]}: ${values[type].toFixed(1)} cm`} disabled={p.readOnly}
      onPointerDown={event => { event.preventDefault(); dragging.current = type; event.currentTarget.setPointerCapture(event.pointerId); }}
      onPointerMove={event => { if (dragging.current !== type) return; const cm = ((vertical ? event.clientY - geometry.y : event.clientX - geometry.x)) / geometry.scale; change(type, type === 'right' ? p.pageWidthCm - cm : type === 'bottom' ? p.pageHeightCm - cm : type === 'indent' ? cm - p.left : cm); }}
      onPointerUp={event => { dragging.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
      onPointerCancel={() => { dragging.current = null; }}
      onKeyDown={event => { if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) { event.preventDefault(); event.stopPropagation(); change(type, values[type] + (['ArrowLeft', 'ArrowUp'].includes(event.key) ? -.1 : .1)); } }} />;
  };
  const ticks = (vertical: boolean) => {
    const offset = vertical ? geometry.y - verticalTop : geometry.x - horizontalLeft, extent = vertical ? verticalHeight : horizontalWidth, pageSize = vertical ? p.pageHeightCm : p.pageWidthCm, margin = vertical ? p.top : p.left;
    const from = Math.ceil((Math.max(0,-offset/geometry.scale)-margin)*4), to = Math.floor((Math.min(pageSize,(extent-offset)/geometry.scale)-margin)*4);
    return Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => {
      const tick = from + i, number = tick / 4, cm = margin + number, position = offset + cm * geometry.scale;
      const inBody = number > 0 && cm < pageSize - (vertical ? p.bottom : p.right);
      return <span key={tick} className={`word-viewport-tick ${tick % 4 ? tick % 2 ? 'quarter' : 'half' : 'whole'}`} style={vertical ? { top: position } : { left: position }}>{tick % 4 === 0 && inBody && <span>{number}</span>}</span>;
    });
  };
  return <div className="word-viewport-rulers" data-motion="off">
    <div className="word-viewport-ruler-horizontal" aria-label="Régua horizontal" data-page-origin={geometry.x} data-pixels-per-cm={geometry.scale} style={{ left: horizontalLeft, top: geometry.canvasTop + 7, width: horizontalWidth }}>
      <div className="word-viewport-paper-band" style={{ left: geometry.x - horizontalLeft + p.left * geometry.scale, width: Math.max(0, p.pageWidthCm - p.left - p.right) * geometry.scale }} />
      {ticks(false)}{marker('left')}{marker('right')}{marker('indent')}
    </div>
    <div className="word-viewport-ruler-vertical" aria-label="Régua vertical" data-page-origin={geometry.y} style={{ left: geometry.canvasLeft + 6, top: verticalTop, height: verticalHeight }}>
      <div className="word-viewport-paper-band" style={{ top: geometry.y - verticalTop + p.top * geometry.scale, height: Math.max(0, p.pageHeightCm - p.top - p.bottom) * geometry.scale }} />
      {ticks(true)}{marker('top')}{marker('bottom')}
    </div>
    <div className="word-viewport-ruler-corner" style={{ left: geometry.canvasLeft + 6, top: geometry.canvasTop + 7 }} aria-hidden="true">⌞</div>
  </div>;
}
