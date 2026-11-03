import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { apiSlice } from "../../app/apiSlice";
import { logout } from "../../features/auth/authSlice";
import { ADMIN_SESSION_WARNING_MS } from "../../utils/adminSession";

const WARNING_ID = "admin-session-warning";

export default function AdminSessionGuard() {
  const dispatch = useDispatch();
  const isAdmin = useSelector((state) => Boolean(state.auth.userInfo?.isAdmin));
  const deadline = useSelector((state) => state.auth.adminSessionDeadline);

  useEffect(() => {
    if (!isAdmin || !Number.isFinite(deadline)) return;
    let warningTimer;
    let expiryTimer;
    let expired = false;
    const check = () => {
      clearTimeout(warningTimer);
      clearTimeout(expiryTimer);
      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        if (expired) return;
        expired = true;
        toast.dismiss(WARNING_ID);
        dispatch(logout());
        dispatch(apiSlice.util.resetApiState());
        toast.info("Your admin session expired. Please sign in again.", { toastId: "admin-session-expired" });
        return;
      }
      if (remaining <= ADMIN_SESSION_WARNING_MS) {
        toast.warn("Your admin session expires soon. Save your work before signing in again.", {
          toastId: WARNING_ID, autoClose: false, closeOnClick: false,
        });
      } else {
        warningTimer = setTimeout(check, remaining - ADMIN_SESSION_WARNING_MS);
      }
      expiryTimer = setTimeout(check, remaining);
    };
    check();
    // Background tabs and sleeping devices can throttle timers; check on return.
    window.addEventListener("focus", check);
    window.addEventListener("pageshow", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearTimeout(warningTimer);
      clearTimeout(expiryTimer);
      window.removeEventListener("focus", check);
      window.removeEventListener("pageshow", check);
      document.removeEventListener("visibilitychange", check);
      toast.dismiss(WARNING_ID);
    };
  }, [dispatch, isAdmin, deadline]);

  return null;
}
