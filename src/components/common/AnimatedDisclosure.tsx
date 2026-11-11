import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

export function AnimatedDisclosure({ open, children }: { open: boolean; children: ReactNode }) {
  const [mounted, setMounted] = useState(open);
  useEffect(() => {
    if (open) { setMounted(true); return; }
    const timer = window.setTimeout(() => setMounted(false), 300);
    return () => window.clearTimeout(timer);
  }, [open]);
  if (!open && !mounted) return null;
  return <div className="motion-disclosure" data-open={open} inert={!open} aria-hidden={!open}>
    <div className="motion-disclosure-inner">{children}</div>
  </div>;
}
