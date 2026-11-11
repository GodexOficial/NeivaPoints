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

/** Dock to the viewport, but measure from the actual sheet at the current zoom/scroll. */
export function WordViewportRulers(p: Props) {
  const [geometry, setGeometry] = useState({ x: 0, y: 0, scale: 37.795, width: window.innerWidth, height: window.innerHeight });
  const dragging = useRef<Marker | null>(null);
  useEffect(() => {
    let canvas: HTMLElement | null = null, sheet: HTMLElement | undefined;
    let frame = 0;
    const measure = () => {
      frame = 0; if (!sheet) return; const rect = sheet.getBoundingClientRect();
      const next = { x: rect.left, y: rect.top, scale: rect.width / p.pageWidthCm, width: window.innerWidth, height: window.innerHeight };
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
    const position = (vertical ? geometry.y : geometry.x) + cm * geometry.scale;
    return <button key={type} type="button" role="slider" className={`word-viewport-marker word-marker-${type}`} style={vertical ? { top: position } : { left: position }} aria-label={labels[type]} aria-valuenow={values[type]} aria-valuemin={vertical ? .5 : 0} aria-valuemax={vertical ? p.pageHeightCm - 2 : p.pageWidthCm - 1} aria-valuetext={`${values[type].toFixed(1)} cm`} aria-orientation={vertical ? 'vertical' : 'horizontal'} title={`${labels[type]}: ${values[type].toFixed(1)} cm`} disabled={p.readOnly}
      onPointerDown={event => { event.preventDefault(); dragging.current = type; event.currentTarget.setPointerCapture(event.pointerId); }}
      onPointerMove={event => { if (dragging.current !== type) return; const cm = ((vertical ? event.clientY - geometry.y : event.clientX - geometry.x)) / geometry.scale; change(type, type === 'right' ? p.pageWidthCm - cm : type === 'bottom' ? p.pageHeightCm - cm : type === 'indent' ? cm - p.left : cm); }}
      onPointerUp={event => { dragging.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
      onPointerCancel={() => { dragging.current = null; }}
      onKeyDown={event => { if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) { event.preventDefault(); event.stopPropagation(); change(type, values[type] + (['ArrowLeft', 'ArrowUp'].includes(event.key) ? -.1 : .1)); } }} />;
  };
  const ticks = (vertical: boolean) => {
    const origin = vertical ? geometry.y : geometry.x, extent = vertical ? geometry.height : geometry.width, pageSize = vertical ? p.pageHeightCm : p.pageWidthCm;
    const from = Math.ceil(-origin / geometry.scale * 2), to = Math.floor((extent - origin) / geometry.scale * 2);
    return Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => {
      const half = from + i, cm = half / 2, position = origin + cm * geometry.scale;
      return <span key={half} className={`word-viewport-tick ${half % 2 ? 'half' : 'whole'} ${cm < 0 || cm > pageSize ? 'outside' : ''}`} style={vertical ? { top: position } : { left: position }}>{half % 2 === 0 && <span>{cm}</span>}</span>;
    });
  };
  return <div className="word-viewport-rulers" data-motion="off">
    <div className="word-viewport-ruler-horizontal" aria-label="Régua horizontal" data-page-origin={geometry.x} data-pixels-per-cm={geometry.scale}>
      <div className="word-viewport-paper-band" style={{ left: geometry.x + p.left * geometry.scale, width: Math.max(0, p.pageWidthCm - p.left - p.right) * geometry.scale }} />
      {ticks(false)}{marker('left')}{marker('right')}{marker('indent')}
    </div>
    <div className="word-viewport-ruler-vertical" aria-label="Régua vertical" data-page-origin={geometry.y}>
      <div className="word-viewport-paper-band" style={{ top: geometry.y + p.top * geometry.scale, height: Math.max(0, p.pageHeightCm - p.top - p.bottom) * geometry.scale }} />
      {ticks(true)}{marker('top')}{marker('bottom')}
    </div>
    <div className="word-viewport-ruler-corner" aria-hidden="true" />
  </div>;
}
