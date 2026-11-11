import { useSyncExternalStore } from 'react';

export type MotionMode = 'always' | 'system';
const KEY = 'sistema_pontos_motion_v1';
const EVENT = 'neiva-motion-change';
const query = '(prefers-reduced-motion: reduce)';

function readMode(): MotionMode {
  try { return localStorage.getItem(KEY) === 'system' ? 'system' : 'always'; }
  catch { return 'always'; }
}
function subscribe(callback: () => void) {
  const media = window.matchMedia(query);
  window.addEventListener(EVENT, callback);
  window.addEventListener('storage', callback);
  media.addEventListener('change', callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener('storage', callback);
    media.removeEventListener('change', callback);
  };
}
function snapshot() { return `${readMode()}:${window.matchMedia(query).matches}`; }

export function applyMotionSettings() {
  const reduced = readMode() === 'system' && window.matchMedia(query).matches;
  document.documentElement.dataset.motion = reduced ? 'reduced' : 'full';
}
export function useMotionSettings() {
  const state = useSyncExternalStore(subscribe, snapshot, () => 'always:false');
  const mode: MotionMode = state.startsWith('system:') ? 'system' : 'always';
  const reduced = mode === 'system' && state.endsWith(':true');
  const setMode = (next: MotionMode) => {
    try { localStorage.setItem(KEY, next); } catch { /* Storage may be unavailable. */ }
    applyMotionSettings();
    window.dispatchEvent(new Event(EVENT));
  };
  return { mode, reduced, setMode };
}
