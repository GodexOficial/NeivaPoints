import { useLayoutEffect, useRef } from 'react';
import { useMotionSettings } from './useMotionSettings';

/** Animate retained items from their previous position after filtering or sorting. */
export function useAnimatedList<T extends HTMLElement>(revision: string) {
  const ref = useRef<T>(null);
  const { reduced } = useMotionSettings();
  const previous = useRef(new Map<string, { left: number; top: number }>());
  useLayoutEffect(() => {
    const container = ref.current;
    if (!container) { previous.current.clear(); return; }
    const next = new Map<string, { left: number; top: number }>();
    const animations: Animation[] = [];
    // Complete layout reads before starting any animations. Avoid alternating
    // read/write work for all 98 students, and never animate offscreen entries.
    const items = [...container.querySelectorAll<HTMLElement>('[data-motion-id]')].map(item => {
      const rect = item.getBoundingClientRect();
      return { item, position: { left: item.offsetLeft, top: item.offsetTop }, visible: rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth };
    });
    let visibleIndex = 0;
    items.forEach(({ item, position, visible }) => {
      const id = item.dataset.motionId!;
      const before = previous.current.get(id);
      next.set(id, position);
      if (reduced || !visible || typeof item.animate !== 'function') return;
      const index = visibleIndex++;
      if (before) {
        const x = before.left - position.left;
        const y = before.top - position.top;
        if (x || y) animations.push(item.animate([{ translate: `${x}px ${y}px` }, { translate: '0 0' }], { duration: 300, easing: 'ease-in-out' }));
      } else {
        const card = item.classList.contains('student-card');
        animations.push(item.animate([
          { opacity: 0, translate: card ? '0 18px' : '0 10px', scale: '.98', rotate: card ? `${index % 2 ? .6 : -.6}deg` : '0deg' },
          { opacity: 1, translate: '0 0', scale: '1', rotate: '0deg' },
        ], { duration: 260, delay: Math.min(index * 20, 100), fill: 'backwards', easing: 'cubic-bezier(.16, 1, .3, 1)' }));
      }
    });
    previous.current = next;
    return () => animations.forEach(animation => animation.cancel());
  }, [revision, reduced]);
  return ref;
}
