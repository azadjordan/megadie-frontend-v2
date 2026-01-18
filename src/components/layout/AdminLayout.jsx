// src/components/layout/AdminLayout.jsx
import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  FiMenu,
  FiX,
  FiHome,
  FiFileText,
  FiPackage,
  FiCreditCard,
  FiDollarSign,
  FiUsers,
  FiBox,
  FiTag,
  FiFilter,
  FiGrid,
  FiArrowLeft,
  FiLogOut,
  FiUser,
} from "react-icons/fi";

import { apiSlice } from "../../app/apiSlice";
import { logout as logoutAction } from "../../features/auth/authSlice";
import { useLogoutMutation } from "../../features/auth/usersApiSlice";

function NavItem({ to, icon: Icon, label, onClick, end = false, className = "" }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        [
          "group flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium",
          "transition",
          isActive
            ? "bg-slate-900 text-white"
            : "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
          className,
        ].join(" ")
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
    </NavLink>
  );
}

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { userInfo } = useSelector((state) => state.auth);
  const [mobileOpen, setMobileOpen] = useState(false);

  const [logoutApi, { isLoading: isLoggingOut }] = useLogoutMutation();

  const adminLabel = userInfo?.name || userInfo?.email || "Admin";
  const adminName = String(adminLabel).trim() || "Admin";

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

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

  const items = useMemo(
    () => [
      { to: "/admin", label: "Dashboard", icon: FiHome, end: true },
      { to: "/admin/requests", label: "Requests", icon: FiFileText },
      { to: "/admin/orders", label: "Orders", icon: FiPackage },
      { to: "/admin/invoices", label: "Invoices", icon: FiCreditCard },
      { to: "/admin/payments", label: "Payments", icon: FiDollarSign },
      { to: "/admin/users", label: "Users", icon: FiUsers },
      { to: "/admin/inventory", label: "Inventory", icon: FiBox },
      { to: "/admin/categories", label: "Categories", icon: FiGrid },
      { to: "/admin/price-rules", label: "Pricing Rules", icon: FiTag },
      { to: "/admin/filter-configs", label: "Filter Configs", icon: FiFilter },
    ],
    []
  );

  return (
    <div className="min-h-[calc(100vh-var(--app-header-h,64px))] bg-slate-50">
      <div className="mx-auto w-[90%] max-w-screen-2xl px-4 py-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[240px_1fr]">
          {/* Desktop sidebar */}
          <aside className="hidden md:block">
            <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
              <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <FiUser className="h-4 w-4 text-slate-500" />
                  {adminName}
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => navigate("/")}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-violet-200/40 transition hover:bg-violet-700"
                  >
                    <FiArrowLeft className="h-4 w-4" />
                    Back to site
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className={[
                      "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold",
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

              <div className="mb-2 mt-4 px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Navigation
              </div>

              <nav className="flex flex-col gap-1">
                {items.map((it) => (
                  <NavItem
                    key={it.to}
                    to={it.to}
                    icon={it.icon}
                    label={it.label}
                    end={it.end}
                  />
                ))}
              </nav>
            </div>

            {/* Helper block */}
            <div className="mt-3 rounded-2xl bg-white p-3 text-sm shadow-sm ring-1 ring-slate-200">
              <div className="text-xs font-semibold text-slate-900">Tip</div>
              <div className="mt-1 text-xs text-slate-500">
                Keep everything linked: Request -> Order -> Invoice -> Payments.
              </div>
            </div>
          </aside>

          {/* Main content */}
          <main className="min-w-0">
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      {/* Mobile floating menu toggle */}
      <button
        type="button"
        onClick={() => setMobileOpen((open) => !open)}
        className="fixed right-4 top-4 z-[90] inline-flex items-center justify-center rounded-full bg-slate-900 p-3 text-white shadow-lg shadow-slate-900/30 md:hidden"
        aria-label="Toggle admin navigation"
      >
        {mobileOpen ? <FiX className="h-5 w-5" /> : <FiMenu className="h-5 w-5" />}
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[80] md:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute right-4 top-16 w-[85%] max-w-[320px] rounded-2xl bg-white p-4 shadow-2xl ring-1 ring-slate-200">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <FiUser className="h-4 w-4 text-slate-500" />
              {adminName}
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  navigate("/");
                  setMobileOpen(false);
                }}
                className="inline-flex h-11 basis-2/3 items-center justify-center gap-2 rounded-xl bg-violet-600 px-3 text-sm font-semibold text-white shadow-sm shadow-violet-200/40 transition hover:bg-violet-700"
              >
                <FiArrowLeft className="h-4 w-4" />
                Back to site
              </button>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className={[
                  "inline-flex h-11 basis-1/3 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold",
                  "bg-rose-50 text-rose-600 ring-1 ring-rose-200",
                  "hover:bg-rose-100 transition",
                  isLoggingOut ? "cursor-not-allowed opacity-70" : "",
                ].join(" ")}
              >
                <FiLogOut className="h-4 w-4" />
                {isLoggingOut ? "Logging out..." : "Logout"}
              </button>
            </div>

            <div className="mt-4 border-t border-slate-200 pt-3">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Navigation
              </div>
              <nav className="flex flex-col gap-1">
                {items.map((it) => (
                  <NavItem
                    key={it.to}
                    to={it.to}
                    icon={it.icon}
                    label={it.label}
                    end={it.end}
                    onClick={() => setMobileOpen(false)}
                    className="py-3 text-sm"
                  />
                ))}
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
