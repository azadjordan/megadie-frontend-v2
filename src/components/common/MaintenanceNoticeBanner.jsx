import { useLayoutEffect, useRef, useState } from "react";
import { FiAlertCircle, FiPause, FiPlay } from "react-icons/fi";
import useMediaQuery from "../../hooks/useMediaQuery";
import { noticeQueryOptions, useGetMaintenanceNoticeQuery } from "../../features/siteSettings/siteSettingsApiSlice";

export default function MaintenanceNoticeBanner() {
  const { data } = useGetMaintenanceNoticeQuery(undefined, noticeQueryOptions);
  return data?.enabled ? <Notice message={data.message} /> : null;
}

function Notice({ message }) {
  const viewport = useRef(null);
  const text = useRef(null);
  const [overflow, setOverflow] = useState(false);
  const [paused, setPaused] = useState(false);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  useLayoutEffect(() => {
    const measure = () => setOverflow(text.current.scrollWidth > viewport.current.clientWidth);
    measure();
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null;
    observer?.observe(viewport.current);
    observer?.observe(text.current);
    window.addEventListener("resize", measure);
    return () => { observer?.disconnect(); window.removeEventListener("resize", measure); };
  }, [message, reducedMotion]);
  const moving = overflow && !reducedMotion;
  return (
    <aside aria-label="Maintenance notice" className="border-t border-amber-200 bg-amber-50 text-amber-950">
      <div className="mx-auto flex min-h-10 max-w-[1360px] items-center gap-2 px-4 py-1">
        <FiAlertCircle aria-hidden="true" className="h-4 w-4 shrink-0" />
        <span className="sr-only">{message}</span>
        <div ref={viewport} className="min-w-0 flex-1 overflow-hidden" aria-hidden="true">
          <div className={`maintenance-notice-track ${moving ? "maintenance-notice-moving" : ""}`} style={{ animationPlayState: paused ? "paused" : "running" }}>
            <span ref={text} className="maintenance-notice-text text-xs font-medium sm:text-sm">{message}</span>
            {moving && <span className="maintenance-notice-copy text-xs font-medium sm:text-sm">{message}</span>}
          </div>
        </div>
        {moving && <button type="button" onClick={() => setPaused(value => !value)} aria-label={paused ? "Play maintenance notice" : "Pause maintenance notice"}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800">
          {paused ? <FiPlay aria-hidden="true" /> : <FiPause aria-hidden="true" />}
        </button>}
      </div>
    </aside>
  );
}
