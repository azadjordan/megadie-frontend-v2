import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { FiMoreHorizontal } from 'react-icons/fi';
import AdminOrderActionIcon from './AdminOrderActionIcon';

export default function AdminOrderMoreMenu({ label, items, onAction }) {
  const [position, setPosition] = useState(null);
  const trigger = useRef(null), menu = useRef(null);
  function close(restore = true) {
    setPosition(null);
    if (restore) trigger.current?.focus({ preventScroll: true });
  }
  function open() {
    const rect = trigger.current.getBoundingClientRect();
    const height = Math.min(items.length * 44 + 18, window.innerHeight - 24);
    setPosition({ left: Math.max(12, Math.min(rect.right - 240, window.innerWidth - 252)), top: Math.max(12, Math.min(rect.bottom + 6, window.innerHeight - height - 12)) });
  }
  useEffect(() => {
    if (!position) return;
    const anchor = trigger.current.getBoundingClientRect();
    menu.current?.querySelector('[role="menuitem"]:not(:disabled)')?.focus({ preventScroll: true });
    const outside = event => { if (!menu.current?.contains(event.target) && !trigger.current?.contains(event.target)) setPosition(null); };
    const moved = event => {
      if (event.target instanceof Node && menu.current?.contains(event.target)) return;
      const rect = trigger.current.getBoundingClientRect();
      // A click can finish scrolling its trigger into view after the menu opens.
      // Close only when the anchor actually moves, or the viewport is resized.
      if (event.type === 'resize' || rect.top !== anchor.top || rect.left !== anchor.left) setPosition(null);
    };
    document.addEventListener('pointerdown', outside);
    window.addEventListener('resize', moved);
    window.addEventListener('scroll', moved, true);
    return () => { document.removeEventListener('pointerdown', outside); window.removeEventListener('resize', moved); window.removeEventListener('scroll', moved, true); };
  }, [position]);
  function keyboard(event) {
    if (event.key === 'Escape') { event.preventDefault(); close(); return; }
    if (event.key === 'Tab') { close(false); return; }
    const buttons = [...menu.current.querySelectorAll('[role="menuitem"]:not(:disabled)')];
    let index = buttons.indexOf(document.activeElement);
    if (event.key === 'ArrowDown') index = (index + 1) % buttons.length;
    else if (event.key === 'ArrowUp') index = (index - 1 + buttons.length) % buttons.length;
    else if (event.key === 'Home') index = 0;
    else if (event.key === 'End') index = buttons.length - 1;
    else return;
    event.preventDefault(); buttons[index]?.focus();
  }
  return <>
    <button ref={trigger} type="button" aria-label={'More actions for ' + label} aria-haspopup="menu" aria-expanded={Boolean(position)} onClick={() => position ? close() : open()} onKeyDown={event => { if (['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); open(); } }} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-[13px] font-medium text-slate-600 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"><FiMoreHorizontal aria-hidden="true" className="h-4 w-4" /><span>More</span></button>
    {position && createPortal(<div ref={menu} role="menu" aria-label={'Actions for ' + label} onKeyDown={keyboard} style={position} className="fixed z-[90] max-h-[calc(100dvh-24px)] w-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
      {items.map(item => {
        const classes = 'flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-600 ' + (item.danger ? 'mt-1 border-t border-slate-100 text-rose-700' : 'text-slate-700') + (item.disabled ? ' cursor-not-allowed opacity-50' : '');
        const choose = () => { close(); if (!item.href) onAction(item); };
        const content = <><AdminOrderActionIcon id={item.id} /><span>{item.label}</span></>;
        return item.href && !item.disabled ? <Link key={item.id} role="menuitem" to={item.href} className={classes} onClick={choose}>{content}</Link> : <button key={item.id} type="button" role="menuitem" disabled={item.disabled} title={item.reason || undefined} onClick={choose} className={classes}>{content}</button>;
      })}
    </div>, document.body)}
  </>;
}
