import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

/** A menu is measured at its rendered size, including when its fields change. */
export function WordPopover({ label, icon, children, large = false }: { label: string; icon?: ReactNode; large?: boolean; children: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false), [position, setPosition] = useState({ left: 8, top: 8 });
  const trigger = useRef<HTMLButtonElement>(null), menu = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!open || !trigger.current || !menu.current) return;
    const place = () => {
      const a = trigger.current!.getBoundingClientRect();
      const viewport = window.visualViewport, left = viewport?.offsetLeft || 0, top = viewport?.offsetTop || 0, width = viewport?.width || innerWidth, height = viewport?.height || innerHeight;
      menu.current!.style.maxHeight = `${Math.max(80,height-16)}px`; menu.current!.style.maxWidth = `${Math.max(80,width-16)}px`;
      const b = menu.current!.getBoundingClientRect();
      const x = Math.max(left + 8, Math.min(a.left, left + width - b.width - 8));
      const preferred = a.bottom + 5 + b.height <= top + height - 8 ? a.bottom + 5 : a.top - b.height - 5;
      setPosition({ left: x, top: Math.max(top + 8, Math.min(preferred, top + height - b.height - 8)) });
    };
    menu.current.tabIndex = -1; place(); menu.current.focus({ preventScroll: true }); const observer = new ResizeObserver(place); observer.observe(menu.current);
    window.addEventListener('resize', place); window.addEventListener('scroll', place, true); window.visualViewport?.addEventListener('resize', place);
    return () => { observer.disconnect(); window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); window.visualViewport?.removeEventListener('resize', place); };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!menu.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  return <><button type="button" ref={trigger} className={`word-tool ${large ? 'word-tool-large' : ''} word-popover-trigger`} aria-label={label} aria-haspopup="dialog" aria-expanded={open} onMouseDown={e => e.preventDefault()} onClick={() => setOpen(v => !v)}>{icon}<span>{label}</span><ChevronDown size={12} /></button>
    {open && createPortal(<div ref={menu} className="word-popover" role="dialog" aria-label={label} data-motion="off" style={position} onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setOpen(false); trigger.current?.focus(); } }}>{children(() => { setOpen(false); })}</div>, trigger.current?.closest('.word-workspace') || document.body)}
  </>;
}
