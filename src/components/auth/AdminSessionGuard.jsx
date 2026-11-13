import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDispatch, useSelector, useStore } from "react-redux";
import { toast } from "react-toastify";
import { apiSlice } from "../../app/apiSlice";
import { usersApiSlice } from "../../features/auth/usersApiSlice";
import { logout, restartSessionCheck, updateAdminSession } from "../../features/auth/authSlice";
import { ADMIN_ACTIVITY_INTERVAL_MS, ADMIN_SESSION_WARNING_MS } from "../../utils/adminSession";
import { publishSessionEvent, subscribeSessionEvents } from "../../utils/adminSessionSync";

export default function AdminSessionGuard() {
  const dispatch = useDispatch();
  const store = useStore();
  const user = useSelector((state) => state.auth.userInfo);
  const sessionId = user?.sessionId;
  const isAdmin = Boolean(user?.isAdmin || user?.isWorker);
  const [notice, setNotice] = useState(null);
  const [dialogHost, setDialogHost] = useState(null);
  const actions = useRef({});

  useEffect(() => {
    const changed = event => setDialogHost(event.detail);
    document.addEventListener("packing-dialog-host", changed);
    return () => document.removeEventListener("packing-dialog-host", changed);
  }, []);

  useEffect(() => subscribeSessionEvents((event) => {
    const current = store.getState().auth.userInfo;
    if (event.type === "login") {
      if (current?.sessionId !== event.sessionId) {
        dispatch(apiSlice.util.resetApiState());
        dispatch(restartSessionCheck());
      }
    } else if (current?.sessionId === event.sessionId) {
      if (event.type === "logout") {
        dispatch(logout({ expectedSessionId: event.sessionId, remote: true }));
        dispatch(apiSlice.util.resetApiState());
      } else {
        // Cross-tab messages are hints. Fetch authoritative deadlines rather
        // than trusting timestamps from localStorage or another tab.
        actions.current.refresh?.();
      }
    }
  }), [dispatch, store]);

  useEffect(() => {
    if (!isAdmin) return;
    let disposed = false;
    let timer;
    let lastSent = 0;
    let renewal;
    let statusCheck;
    let connectionError = "";
    const generation = store.getState().auth.sessionGeneration;
    const read = () => store.getState().auth;
    const valid = () => !disposed && read().sessionGeneration === generation && read().userInfo?.sessionId === sessionId;
    const expire = () => {
      if (!valid()) return;
      dispatch(logout({ expectedSessionId: sessionId, reason: "expired" }));
      dispatch(apiSlice.util.resetApiState());
      toast.info("Your work session expired. Please sign in again.", { toastId: "admin-session-expired" });
    };
    const changeSession = () => {
      if (!valid()) return;
      dispatch(apiSlice.util.resetApiState());
      dispatch(restartSessionCheck());
    };

    async function refresh() {
      if (!valid()) return;
      if (statusCheck) return statusCheck;
      statusCheck = (async () => {
        try {
          const response = await dispatch(usersApiSlice.endpoints.getMyProfile.initiate(`session-${sessionId}`, { forceRefetch: true, subscribe: false })).unwrap();
          if (!valid()) return;
          if (!(response.data.isAdmin || response.data.isWorker) || response.data.sessionId !== sessionId) return changeSession();
          dispatch(updateAdminSession({ expectedSessionId: sessionId, metadata: response.data }));
          connectionError = "";
          if (read().adminSessionDeadline <= Date.now()) expire();
        } catch {
          if (!valid()) return;
          connectionError = "Couldn't confirm your session. Check your connection and try again.";
          if (read().adminSessionDeadline <= Date.now()) expire();
        } finally {
          statusCheck = null;
          if (valid()) tick();
        }
      })();
      return statusCheck;
    }

    async function renew(force = false) {
      if (!valid()) return;
      if (renewal) return renewal;
      if (Date.now() >= read().adminSessionDeadline) return refresh();
      if (!force && Date.now() - lastSent < ADMIN_ACTIVITY_INTERVAL_MS) return;
      lastSent = Date.now();
      renewal = (async () => {
        const request = dispatch(usersApiSlice.endpoints.reportAdminActivity.initiate(sessionId));
        try {
          const response = await request.unwrap();
          if (!valid()) return;
          dispatch(updateAdminSession({ expectedSessionId: sessionId, metadata: response.data }));
          connectionError = "";
          publishSessionEvent({ type: "renewed", sessionId });
        } catch (error) {
          if (!valid()) return;
          if (error?.status === 409 && error?.data?.code === "SESSION_CHANGED") await refresh();
          else connectionError = "Couldn't extend your session. Check your connection and try again.";
        } finally {
          request.reset();
          renewal = null;
          if (valid()) tick();
        }
      })();
      tick();
      return renewal;
    }

    function tick() {
      clearTimeout(timer);
      if (!valid()) return;
      const state = read();
      const remaining = state.adminSessionDeadline - Date.now();
      const absolute = state.adminAbsoluteDeadline - Date.now();
      if (!Number.isFinite(remaining) || !sessionId) return expire();
      if (remaining <= 0) {
        setNotice({ sessionId, kind: "checking", seconds: 0, busy: true });
        void refresh();
        return;
      }
      const warning = remaining <= ADMIN_SESSION_WARNING_MS;
      setNotice(warning || connectionError ? {
        sessionId, kind: absolute <= ADMIN_SESSION_WARNING_MS ? "absolute" : "idle",
        seconds: Math.ceil(remaining / 1000), busy: Boolean(renewal || statusCheck), error: connectionError,
      } : null);
      timer = setTimeout(tick, warning || connectionError ? Math.min(1000, remaining) : remaining - ADMIN_SESSION_WARNING_MS);
    }

    const activity = (event) => {
      if (!event.isTrusted || document.visibilityState !== "visible") return;
      if (event.target instanceof Element && event.target.closest('[aria-label="Admin session warning"], [aria-label="Work session warning"]')) return;
      void renew();
    };
    const returned = () => { if (document.visibilityState === "visible") void refresh(); };
    const events = ["pointerdown", "keydown", "input", "wheel", "touchstart"];
    for (const name of events) document.addEventListener(name, activity, { passive: true, capture: true });
    window.addEventListener("focus", returned);
    window.addEventListener("pageshow", returned);
    document.addEventListener("visibilitychange", returned);
    actions.current = { renew, refresh };
    queueMicrotask(tick);
    return () => {
      disposed = true;
      clearTimeout(timer);
      for (const name of events) document.removeEventListener(name, activity, { capture: true });
      window.removeEventListener("focus", returned);
      window.removeEventListener("pageshow", returned);
      document.removeEventListener("visibilitychange", returned);
      actions.current = {};
    };
  }, [dispatch, store, isAdmin, sessionId]);

  if (!isAdmin || !notice || notice.sessionId !== sessionId) return null;
  const clock = `${Math.floor(notice.seconds / 60)}:${String(notice.seconds % 60).padStart(2, "0")}`;
  const warning = (
    <section aria-label={user.isAdmin ? "Admin session warning" : "Work session warning"} className={"rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950 " + (dialogHost ? "mb-5" : "fixed inset-x-3 top-3 z-[110] mx-auto max-w-xl shadow-lg sm:inset-x-auto sm:top-5 sm:right-5")}>
      <div role="status" className="text-sm font-semibold">{notice.kind === "checking" ? "Checking your session…" : notice.kind === "absolute" ? "Your work session is ending soon" : notice.error ? "Session connection problem" : "Are you still working?"}</div>
      <p className="mt-1 text-xs">{notice.kind === "absolute" ? "The eight-hour limit is approaching. Save your work before signing in again." : notice.kind === "checking" ? "Confirming the current session with the server." : notice.error || "Your session will end due to inactivity. Stay signed in to continue without leaving this page."}</p>
      {notice.kind !== "checking" && <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm tabular-nums" aria-label="Time remaining">{clock} remaining</span>
        {notice.kind !== "absolute" && <button type="button" disabled={notice.busy} onClick={() => void actions.current.renew?.(true)} className="min-h-10 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60">{notice.busy ? "Checking…" : "Stay signed in"}</button>}
      </div>}
    </section>
  );
  return dialogHost ? createPortal(warning, dialogHost) : warning;
}
