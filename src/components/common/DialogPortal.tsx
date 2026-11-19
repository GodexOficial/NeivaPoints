import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** Keep viewport dialogs outside animated/transformed page containers. */
export function DialogPortal({ children }: { children: ReactNode }) {
  return createPortal(<div className="glass-theme dialog-portal">{children}</div>, document.body);
}
