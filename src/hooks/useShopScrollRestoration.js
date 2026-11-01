import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

export default function useShopScrollRestoration(ready = true) {
  const location = useLocation();
  const navigationType = useNavigationType();
  const restored = useRef(null);
  const storageKey = `shop-scroll:${location.pathname}${location.search}`;

  useEffect(() => {
    let active = false;
    // Capture while the grid is mounted; removing a tall grid can clamp the
    // document's scroll position before effect cleanup reads window.scrollY.
    let position = window.scrollY;
    const track = () => { position = window.scrollY; };
    const frame = requestAnimationFrame(() => { active = true; });
    const save = () => {
      try { sessionStorage.setItem(storageKey, String(position)); }
      catch { /* Browsing also works when storage is unavailable. */ }
    };
    window.addEventListener('pagehide', save);
    window.addEventListener('scroll', track, {passive:true});
    return () => {
      cancelAnimationFrame(frame);
      if (active) save();
      window.removeEventListener('pagehide', save);
      window.removeEventListener('scroll', track);
    };
  }, [storageKey]);

  useEffect(() => {
    if (!ready || restored.current === location.key) return;
    const initial = restored.current === null;
    if (navigationType !== 'POP' && !location.state?.restoreShopScroll && !initial) {
      restored.current = location.key;
      return;
    }
    let top = 0;
    if (navigationType === 'POP' || location.state?.restoreShopScroll) {
      try { top = Math.max(0, Number(sessionStorage.getItem(storageKey)) || 0); }
      catch { /* Fall back to the top of the page. */ }
    }
    const frame = requestAnimationFrame(() => {
      restored.current = location.key;
      window.scrollTo({top, behavior:'instant'});
    });
    return () => cancelAnimationFrame(frame);
  }, [ready, location.key, location.state, navigationType, storageKey]);
}
