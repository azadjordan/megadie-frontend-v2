import { NavLink } from "react-router-dom";
import {
  FiHome,
  FiClipboard,
  FiShoppingBag,
  FiFileText,
  FiUser,
} from "react-icons/fi";

const itemClass = ({ isActive }) =>
  [
    "flex flex-col items-center gap-1 text-[11px] font-semibold transition",
    isActive ? "text-violet-500" : "text-slate-500 hover:text-slate-700",
  ].join(" ");

export default function AccountBottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white shadow-[0_-8px_24px_rgba(15,23,42,0.08)] lg:hidden">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        <NavLink to="/account/overview" className={itemClass} end>
          <FiHome className="h-5 w-5" />
          Overview
        </NavLink>
        <NavLink to="/account/requests" className={itemClass}>
          <FiClipboard className="h-5 w-5" />
          Requests
        </NavLink>
        <NavLink to="/account/orders" className={itemClass}>
          <FiShoppingBag className="h-5 w-5" />
          Orders
        </NavLink>
        <NavLink to="/account/invoices" className={itemClass}>
          <FiFileText className="h-5 w-5" />
          Invoices
        </NavLink>
        <NavLink to="/account/profile" className={itemClass}>
          <FiUser className="h-5 w-5" />
          Profile
        </NavLink>
      </div>
    </nav>
  );
}
