import { useEffect, useLayoutEffect } from 'react';
import { useMotionSurfaces } from '../../hooks/useMotionSurfaces';
import { applyMotionSettings, useMotionSettings } from '../../hooks/useMotionSettings';
import { useVisibleMotion } from '../../hooks/useVisibleMotion';

/** Native, interruptible animations; feedback never waits before running an action. */
export function InteractionMotion() {
  useMotionSurfaces();
  useVisibleMotion();
  const { reduced } = useMotionSettings();
  useLayoutEffect(applyMotionSettings, [reduced]);
  useEffect(() => {
    const running = new Map<Element, Animation>();
    let activeCard: HTMLElement | null = null;
    let frame = 0;
    let bounds: DOMRect | null = null;
    let pointerX = 0, pointerY = 0;
    const resetCard = () => {
      window.cancelAnimationFrame(frame);
      activeCard?.style.removeProperty('--card-rx');
      activeCard?.style.removeProperty('--card-ry');
      activeCard?.style.removeProperty('--card-rz');
      activeCard = null;
      bounds = null; frame = 0;
    };
    const handlePointerMove = (event: PointerEvent) => {
      if (document.documentElement.dataset.pointer !== event.pointerType) document.documentElement.dataset.pointer = event.pointerType;
      if (event.pointerType !== 'mouse') { resetCard(); return; }
      if (reduced || !(event.target instanceof Element)) return;
      const card = event.target.closest<HTMLElement>('.student-card');
      if (card !== activeCard) { resetCard(); activeCard = card; bounds = card?.getBoundingClientRect() ?? null; }
      if (!card || !bounds) return;
      pointerX = event.clientX; pointerY = event.clientY;
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        if (!bounds) return;
        const x = Math.max(-.5, Math.min(.5, (pointerX - bounds.left) / bounds.width - .5));
        const y = Math.max(-.5, Math.min(.5, (pointerY - bounds.top) / bounds.height - .5));
        card.style.setProperty('--card-rx', `${-y * 4}deg`);
        card.style.setProperty('--card-ry', `${x * 4}deg`);
        card.style.setProperty('--card-rz', `${x * .6}deg`);
      });
    };
    const handlePointerOut = (event: PointerEvent) => {
      if (!event.relatedTarget) { resetCard(); return; }
      const target = activeCard;
      if (target && (!(event.relatedTarget instanceof Node) || !target.contains(event.relatedTarget))) resetCard();
    };
    const play = (element: Element, frames: Keyframe[]) => {
      if (typeof element.animate !== 'function') return;
      running.get(element)?.cancel();
      const animation = element.animate(frames, { duration: 280, easing: 'cubic-bezier(.22, 1, .36, 1)' });
      running.set(element, animation);
      animation.onfinish = () => { if (running.get(element) === animation) running.delete(element); };
      animation.oncancel = animation.onfinish;
    };
    const handleClick = (event: MouseEvent) => {
      if (reduced || !(event.target instanceof Element)) return;
      const control = event.target.closest<HTMLElement>('button, a[href], [role="button"]');
      if (!control || control.matches(':disabled, [aria-disabled="true"], [draggable="true"]') || control.closest('[contenteditable="true"], [data-motion="off"]')) return;
      // Individual scale leaves layout, drag positions and existing transforms intact.
      const bounds = control.getBoundingClientRect();
      const large = bounds.width > 220 || bounds.height > 100;
      play(control, [{ scale: large ? '.99' : '.965' }, { scale: large ? '1' : '1.015', offset: .65 }, { scale: '1' }]);
      const icon = control.querySelector('svg.lucide:not(.animate-spin)');
      if (!icon) return;
      if (icon.matches('.lucide-arrow-right, .lucide-external-link, .lucide-chevron-right')) {
        play(icon, [{ translate: '0' }, { translate: '5px 0', offset: .45 }, { translate: '0' }]);
      } else if (icon.matches('.lucide-arrow-left, .lucide-chevron-left')) {
        play(icon, [{ translate: '0' }, { translate: '-5px 0', offset: .45 }, { translate: '0' }]);
      } else if (icon.matches('.lucide-plus, .lucide-user-plus, .lucide-sparkles')) {
        play(icon, [{ rotate: '-20deg', scale: '.8' }, { rotate: '8deg', scale: '1.2', offset: .55 }, { rotate: '0deg', scale: '1' }]);
      } else if (icon.matches('.lucide-pencil, .lucide-pen, .lucide-square-pen')) {
        play(icon, [{ rotate: '0deg' }, { rotate: '-15deg', translate: '2px -2px', offset: .4 }, { rotate: '0deg', translate: '0' }]);
      } else if (icon.matches('.lucide-trash-2, .lucide-archive, .lucide-x')) {
        play(icon, [{ scale: '1' }, { scale: '.75', offset: .4 }, { scale: '1' }]);
      } else if (icon.matches('.lucide-sun, .lucide-moon, .lucide-settings, .lucide-rotate-ccw')) {
        play(icon, [{ rotate: '-45deg', scale: '.8' }, { rotate: '0deg', scale: '1' }]);
      } else {
        play(icon, [{ translate: '0 2px', scale: '.85' }, { translate: '0', scale: '1' }]);
      }
    };
    document.addEventListener('click', handleClick, true);
    document.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.addEventListener('pointerout', handlePointerOut, { passive: true });
    window.addEventListener('blur', resetCard);
    window.addEventListener('scroll', resetCard, { passive: true });
    window.addEventListener('resize', resetCard, { passive: true });
    return () => {
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerout', handlePointerOut);
      window.removeEventListener('blur', resetCard);
      window.removeEventListener('scroll', resetCard);
      window.removeEventListener('resize', resetCard);
      resetCard();
      running.forEach(animation => animation.cancel());
    };
  }, [reduced]);
  return null;
}
