// src/components/account/AccountSidebar.jsx
import { NavLink } from 'react-router-dom'

const itemClass = ({ isActive }) =>
  [
    'flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition',
    isActive
      ? 'bg-slate-900 text-white'
      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900',
  ].join(' ')

export default function AccountSidebar() {
  return (
    <aside className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="mb-3">
        <div className="text-sm font-semibold text-slate-900">My Account</div>
        <div className="text-xs text-slate-600">Manage your activity</div>
      </div>

      <nav className="space-y-1">
        <NavLink to="/account/profile" className={itemClass}>
          Profile
        </NavLink>

        <NavLink to="/account/requests" className={itemClass}>
          Requests
        </NavLink>

        <NavLink to="/account/orders" className={itemClass}>
          Orders
        </NavLink>

        <NavLink to="/account/invoices" className={itemClass}>
          Invoices
        </NavLink>
      </nav>

      <div className="mt-4 border-t border-slate-200 pt-3">
        <p className="text-xs text-slate-500">
          Payments appear inside invoices.
        </p>
      </div>
    </aside>
  )
}
