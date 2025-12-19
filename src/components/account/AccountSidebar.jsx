// src/components/account/AccountSidebar.jsx
import { NavLink, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

const itemClass = ({ isActive }) =>
  [
    "flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition",
    isActive
      ? "bg-slate-900 text-white"
      : "text-slate-700 hover:bg-slate-50 hover:text-slate-900",
  ].join(" ");

function initialsFrom(userInfo) {
  const label = userInfo?.name || userInfo?.email || "Account";
  const parts = String(label).trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "A";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();

  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
}

export default function AccountSidebar() {
  const { userInfo } = useSelector((state) => state.auth);
  const location = useLocation();

  const name = userInfo?.name || "My Account";
  const email = userInfo?.email || "";
  const initials = initialsFrom(userInfo);

  // ✅ Keep this sidebar item active for ALL billing routes
  const billingActive = location.pathname.startsWith("/account/billing");

  return (
    <aside className="h-full min-h-0 flex flex-col gap-4">
      {/* Top: identity */}
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-sm font-semibold">
            {initials}
          </div>

          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-900">
              {name}
            </div>
            {email ? (
              <div className="truncate text-xs text-slate-600">{email}</div>
            ) : (
              <div className="text-xs text-slate-600">Manage your activity</div>
            )}
          </div>
        </div>

        <div className="mt-3 text-xs text-slate-500">
          View requests and billing documents.
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 min-h-0 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 flex flex-col">
        <nav className="space-y-1">
          <NavLink to="/account/profile" className={itemClass}>
            Profile
          </NavLink>

          <NavLink to="/account/requests" className={itemClass}>
            Requests
          </NavLink>

          {/* ✅ One item that stays active on:
              /account/billing/invoices
              /account/billing/invoices/:id
              /account/billing/orders/:id
          */}
          <NavLink
            to="/account/billing"
            className={() => itemClass({ isActive: billingActive })}
          >
            Invoices &amp; Orders
          </NavLink>
        </nav>

        <div className="mt-auto pt-4 border-t border-slate-200">
          <p className="text-xs text-slate-500">
            Orders are accessible from inside invoices.
          </p>
        </div>
      </div>
    </aside>
  );
}
