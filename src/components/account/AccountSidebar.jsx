import { NavLink } from "react-router-dom";
import { useSelector } from "react-redux";

const navItem = ({ isActive }) =>
  [
    "flex items-center justify-between rounded-xl px-3 py-2.5 text-[13px] font-semibold transition",
    isActive
      ? "bg-violet-600 text-white shadow-sm shadow-violet-200/60"
      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
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

  const name = userInfo?.name || "My Account";
  const email = userInfo?.email || "";
  const initials = initialsFrom(userInfo);

  return (
    <aside className="flex h-full flex-col">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/40">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-600 text-sm font-semibold text-white">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-900">
              {name}
            </div>
            {email ? (
              <div className="truncate text-xs text-slate-500">{email}</div>
            ) : (
              <div className="text-xs text-slate-500">
                Manage your activity
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 text-xs text-slate-500">
          Your account shortcuts.
        </div>

        <div className="mt-6 space-y-5">
          <div>
            <div className="text-xs font-semibold text-slate-500">
              Overview
            </div>
            <div className="mt-2 space-y-1">
              <NavLink to="/account/overview" className={navItem} end>
                Overview
              </NavLink>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-500">
              Activity
            </div>
            <div className="mt-2 space-y-1">
              <NavLink to="/account/requests" className={navItem}>
                Requests
              </NavLink>
              <NavLink to="/account/orders" className={navItem}>
                Orders
              </NavLink>
              <NavLink to="/account/invoices" className={navItem}>
                Invoices
              </NavLink>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-500">
              Account
            </div>
            <div className="mt-2 space-y-1">
              <NavLink to="/account/profile" className={navItem}>
                Profile
              </NavLink>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-violet-100 bg-violet-50/70 p-4 text-xs text-slate-600">
          Need help?{" "}
          <a
            href="/contact"
            className="font-semibold text-violet-700 hover:text-violet-800 hover:underline"
          >
            Contact Us
          </a>
        </div>
      </div>
    </aside>
  );
}
