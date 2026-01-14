// src/components/layout/AdminHeader.jsx
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiLogOut, FiUser } from "react-icons/fi";

import { apiSlice } from "../../app/apiSlice";
import { logout as logoutAction } from "../../features/auth/authSlice";
import { useLogoutMutation } from "../../features/auth/usersApiSlice";

export default function AdminHeader() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { userInfo, isInitialized } = useSelector((state) => state.auth);

  const [logoutApi, { isLoading: isLoggingOut }] = useLogoutMutation();

  const label = userInfo?.name || userInfo?.email || "Admin";
  const firstName = String(label).trim().split(" ")[0] || "Admin";

  const handleLogout = async () => {
    try {
      await logoutApi().unwrap();
    } catch {
      // silent best-effort logout
    } finally {
      dispatch(logoutAction());
      dispatch(apiSlice.util.resetApiState());
      navigate("/", { replace: true });
    }
  };

  return (
    <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/")}
            className={[
              "inline-flex items-center gap-2 rounded-xl px-3 py-2",
              "bg-violet-600 text-white",
              "text-xs font-semibold",
              "hover:bg-violet-700 transition",
              "shadow-sm shadow-violet-200/40",
            ].join(" ")}
          >
            <FiArrowLeft className="h-4 w-4" />
            Back to site
          </button>

        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
            <FiUser className="h-4 w-4 text-slate-500" />
            {isInitialized ? firstName : "Admin"}
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={[
              "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold",
              "bg-rose-50 text-rose-600 ring-1 ring-rose-200",
              "hover:bg-rose-100 transition",
              isLoggingOut ? "cursor-not-allowed opacity-70" : "",
            ].join(" ")}
          >
            <FiLogOut className="h-4 w-4" />
            {isLoggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      </div>
    </div>
  );
}
