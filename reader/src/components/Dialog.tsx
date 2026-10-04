import { useEffect, useRef, type ReactNode } from 'react';

export function Dialog({ title, children, className = '', onClose }: { title: string; children: ReactNode; className?: string; onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const focus = panel.current?.querySelector<HTMLElement>('[autofocus], input, button, [tabindex="0"]');
    (focus ?? panel.current)?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); }
      if (event.key !== 'Tab') return;
      const items = [...(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select, a[href], [tabindex="0"]') ?? [])].filter(item => item.getClientRects().length);
      if (!items.length) { event.preventDefault(); return; }
      const first = items[0], last = items.at(-1)!;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('keydown', handleKey); previous?.focus(); };
  }, []);
  return <div className={`dialog-backdrop ${className}`} onPointerDown={event => { if (event.target === event.currentTarget) onClose(); }}><div className="dialog-panel" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={panel}>{children}</div></div>;
}
