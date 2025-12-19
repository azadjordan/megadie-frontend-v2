// src/components/layout/AdminLayout.jsx
import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
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
  FiArrowLeft,
} from "react-icons/fi";

function NavItem({ to, icon: Icon, label, onClick, end = false }) {
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
        ].join(" ")
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
    </NavLink>
  );
}

function GhostButton({ onClick, icon: Icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2",
        "text-sm font-semibold text-slate-900",
        "shadow-sm ring-1 ring-slate-200 hover:bg-slate-50",
      ].join(" ")}
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close drawer on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const items = useMemo(
    () => [
      { to: "/admin", label: "Dashboard", icon: FiHome, end: true },
      { to: "/admin/requests", label: "Requests", icon: FiFileText },
      { to: "/admin/orders", label: "Orders", icon: FiPackage },
      { to: "/admin/invoices", label: "Invoices", icon: FiCreditCard },
      { to: "/admin/payments", label: "Payments", icon: FiDollarSign },
      { to: "/admin/users", label: "Users", icon: FiUsers },
      { to: "/admin/inventory", label: "Inventory", icon: FiBox },
    ],
    []
  );

  const goBackToSite = () => {
    navigate("/", { replace: false });
  };

  return (
    <div className="min-h-[calc(100vh-var(--app-header-h,64px))] bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-4">
        {/* Top bar */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="inline-flex items-center justify-center rounded-xl bg-white p-2 shadow-sm ring-1 ring-slate-200 md:hidden"
              aria-label="Open admin menu"
            >
              <FiMenu />
            </button>

            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900">Admin</div>
              <div className="text-xs text-slate-500">
                Requests • Orders • Invoices • Payments • Users • Inventory
              </div>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <GhostButton onClick={goBackToSite} icon={FiArrowLeft}>
              Back to site
            </GhostButton>

            {/* Simple search placeholder (desktop only) */}
            <div className="hidden md:flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">
              <span className="text-xs text-slate-400">⌘K</span>
              <span className="text-sm text-slate-500">Search (coming soon)</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-[240px_1fr]">
          {/* Desktop sidebar */}
          <aside className="hidden md:block">
            <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
              <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
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

                <div className="my-2 h-px bg-slate-200" />

                <NavItem to="/" icon={FiArrowLeft} label="Back to site" />
              </nav>
            </div>

            {/* Small helper block */}
            <div className="mt-3 rounded-2xl bg-white p-3 text-sm shadow-sm ring-1 ring-slate-200">
              <div className="text-xs font-semibold text-slate-900">Tip</div>
              <div className="mt-1 text-xs text-slate-500">
                Keep everything linked: Request → Order → Invoice → Payments.
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

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-[85%] max-w-[320px] bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  Admin Menu
                </div>
                <div className="text-xs text-slate-500">Quick navigation</div>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-xl p-2 text-slate-700 hover:bg-slate-100"
                aria-label="Close admin menu"
              >
                <FiX />
              </button>
            </div>

            <div className="p-3">
              <nav className="flex flex-col gap-1">
                {items.map((it) => (
                  <NavItem
                    key={it.to}
                    to={it.to}
                    icon={it.icon}
                    label={it.label}
                    end={it.end}
                    onClick={() => setMobileOpen(false)}
                  />
                ))}

                <div className="my-2 h-px bg-slate-200" />

                <NavItem
                  to="/"
                  icon={FiArrowLeft}
                  label="Back to site"
                  onClick={() => setMobileOpen(false)}
                />
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
