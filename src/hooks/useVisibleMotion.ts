import { useEffect } from 'react';

/** Infinite effects run only while visible, and stop in a background tab. */
export function useVisibleMotion() {
  useEffect(() => {
    const root = document.querySelector('.glass-theme');
    if (!root) return;
    const tracked = new Set<Element>();
    const intersection = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        (entry.target as HTMLElement).toggleAttribute('data-in-view', entry.isIntersecting);
      });
    });
    const scan = (node: Element) => {
      const items = node.matches('[data-xp-active]') ? [node] : node.querySelectorAll('[data-xp-active]');
      for (const item of items) {
        if (!tracked.has(item)) { tracked.add(item); intersection.observe(item); }
      }
    };
    const mutations = new MutationObserver(records => {
      for (const record of records) record.addedNodes.forEach(node => { if (node instanceof Element && !node.closest('.motion-outline')) scan(node); });
      if (records.some(record => [...record.removedNodes].some(node => node instanceof Element && !node.matches('.motion-outline, .motion-outline *')))) {
        for (const item of tracked) if (!item.isConnected) { intersection.unobserve(item); tracked.delete(item); }
      }
    });
    const visibility = () => { document.documentElement.dataset.pageVisible = String(!document.hidden); };
    visibility(); scan(root); mutations.observe(root, { childList: true, subtree: true });
    document.addEventListener('visibilitychange', visibility);
    return () => {
      mutations.disconnect(); intersection.disconnect();
      tracked.forEach(item => item.removeAttribute('data-in-view'));
      document.removeEventListener('visibilitychange', visibility);
      delete document.documentElement.dataset.pageVisible;
    };
  }, []);
}
