import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

export default function PackingDialog({ title, onClose, busy = false, children, wide = false, footer }) {
  const element = useRef(null);
  const titleId = useId();
  const latest = useRef({ onClose, busy });
  useEffect(() => { latest.current = { onClose, busy }; }, [onClose, busy]);
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.dispatchEvent(new CustomEvent("packing-dialog-host", { detail: element.current?.querySelector('[data-session-warning-slot]') }));
    element.current?.querySelector("input,button,select,textarea")?.focus();
    const keydown = event => {
      if (event.key === "Escape" && !latest.current.busy) { event.stopPropagation(); latest.current.onClose(); }
      if (event.key !== "Tab") return;
      const nodes = [...element.current.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],summary')].filter(node => node.getClientRects().length);
      const first = nodes[0], last = nodes.at(-1);
      if (!first) return;
      if (!element.current.contains(document.activeElement)) { event.preventDefault(); (event.shiftKey ? last : first).focus(); return; }
      if (event.shiftKey && event.target === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && event.target === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", keydown);
    return () => { document.dispatchEvent(new CustomEvent("packing-dialog-host", { detail: null })); document.body.style.overflow = overflow; document.removeEventListener("keydown", keydown); if (previous?.isConnected) previous.focus(); };
  }, []);
  return createPortal(<div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/40 sm:items-center sm:p-5" onClick={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <section ref={element} role="dialog" aria-modal="true" aria-labelledby={titleId} className={'flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl ' + (wide ? 'max-w-3xl' : 'max-w-lg')}>
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-3"><h2 id={titleId} className="text-lg font-semibold text-slate-900">{title}</h2><button type="button" onClick={onClose} disabled={busy} className="min-h-11 rounded-xl px-3 text-sm text-slate-500 hover:bg-slate-50 disabled:opacity-50">Close</button></div>
      <div className="min-h-0 overflow-y-auto overscroll-contain p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"><div data-session-warning-slot />{children}</div>
      {footer && <div className="shrink-0 border-t border-slate-200 bg-white px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>}
    </section>
  </div>, document.body);
}
