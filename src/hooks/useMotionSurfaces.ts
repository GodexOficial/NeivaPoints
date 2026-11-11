import { useEffect } from 'react';

/** Share one outline instead of mounting hundreds of SVGs and observers. */
export function useMotionSurfaces() {
  useEffect(() => {
    const root = document.querySelector('.glass-theme');
    if (!root) return;
    const selector = 'button, a[href], [role="button"], [role="tab"], .student-card';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('motion-outline');
    svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
    const rect = document.createElementNS(svg.namespaceURI, 'rect') as SVGRectElement;
    rect.setAttribute('x', '1'); rect.setAttribute('y', '1'); rect.setAttribute('pathLength', '100');
    svg.append(rect);
    let active: HTMLElement | null = null;
    let previousPosition = '';
    let frame = 0;
    const measure = () => {
      if (!active) return;
      const width = active.offsetWidth, height = active.offsetHeight;
      const radius = Math.min(parseFloat(getComputedStyle(active).borderTopLeftRadius) || 0, width / 2, height / 2);
      rect.setAttribute('width', String(Math.max(0, width - 2)));
      rect.setAttribute('height', String(Math.max(0, height - 2)));
      rect.setAttribute('rx', String(Math.max(0, radius - 1)));
    };
    const resize = new ResizeObserver(measure);
    const clear = () => {
      cancelAnimationFrame(frame); resize.disconnect(); svg.remove();
      if (active) { delete active.dataset.motionSurface; active.style.position = previousPosition; }
      active = null;
    };
    const show = (target: Element) => {
      let candidate = target.closest<HTMLElement>(selector);
      while (candidate && !(parseFloat(getComputedStyle(candidate).borderTopLeftRadius) > 0)) candidate = candidate.parentElement?.closest<HTMLElement>(selector) ?? null;
      if (candidate === active && svg.isConnected) return;
      clear();
      if (!candidate || !root.contains(candidate) || candidate.closest('.a4-page-content, [contenteditable="true"], [data-motion="off"]') || candidate.matches('.skip-link, :disabled, [aria-disabled="true"]')) return;
      active = candidate; previousPosition = active.style.position;
      if (getComputedStyle(active).position === 'static') active.style.position = 'relative';
      active.dataset.motionSurface = '';
      svg.dataset.ready = 'false';
      active.append(svg); measure(); resize.observe(active);
      frame = requestAnimationFrame(() => { svg.dataset.ready = 'true'; });
    };
    const onOver = (event: Event) => { if (event.target instanceof Element) show(event.target); };
    const onOut = (event: FocusEvent | PointerEvent) => {
      if (!(event.relatedTarget instanceof Element) || !root.contains(event.relatedTarget)) clear();
    };
    root.addEventListener('pointerover', onOver); root.addEventListener('focusin', onOver);
    root.addEventListener('pointerout', onOut as EventListener); root.addEventListener('focusout', onOut as EventListener);
    window.addEventListener('blur', clear);
    return () => {
      root.removeEventListener('pointerover', onOver); root.removeEventListener('focusin', onOver);
      root.removeEventListener('pointerout', onOut as EventListener); root.removeEventListener('focusout', onOut as EventListener);
      window.removeEventListener('blur', clear); clear();
    };
  }, []);
}
