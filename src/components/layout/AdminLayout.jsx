import { Outlet, NavLink, Link } from 'react-router-dom'

export default function AdminLayout() {
  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100">
      <aside className="w-64 border-r border-slate-800 p-4 space-y-4">
        <Link to="/" className="text-slate-400 text-sm">← Back to site</Link>

        <h2 className="font-bold text-xl">Admin Panel</h2>

        <nav className="flex flex-col gap-2 text-sm">
          <NavLink to="/admin" end>Dashboard</NavLink>
          <NavLink to="/admin/products">Products</NavLink>
          <NavLink to="/admin/orders">Orders</NavLink>
          <NavLink to="/admin/invoices">Invoices</NavLink>
        </nav>
      </aside>

      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  )
}
