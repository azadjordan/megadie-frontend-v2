import { Outlet, Link, NavLink, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'

export default function PublicLayout() {
  const { pathname } = useLocation()
  const isHome = pathname === '/'

  const count = useSelector((state) =>
    state.cart.items.reduce((sum, item) => sum + (item.quantity || 0), 0),
  )

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link
            to="/"
            className="text-lg font-semibold tracking-tight text-slate-900"
          >
            Megadie
          </Link>

          <nav className="flex items-center gap-4 text-sm text-slate-700">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                isActive ? 'font-medium text-slate-900' : 'hover:text-slate-900'
              }
            >
              Home
            </NavLink>

            <NavLink
              to="/shop"
              className={({ isActive }) =>
                isActive ? 'font-medium text-slate-900' : 'hover:text-slate-900'
              }
            >
              Shop
            </NavLink>

            <NavLink
              to="/cart"
              className={({ isActive }) =>
                `relative ${
                  isActive ? 'font-medium text-slate-900' : 'hover:text-slate-900'
                }`
              }
            >
              Cart
              {count > 0 && (
                <span className="absolute -right-3 -top-2 rounded-full bg-purple-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                  {count}
                </span>
              )}
            </NavLink>
          </nav>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1">
        {isHome ? (
          <Outlet />
        ) : (
          <div className="mx-auto max-w-6xl px-4 py-6">
            <Outlet />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-white">
        <div className="mx-auto max-w-6xl px-4 py-3 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Megadie
        </div>
      </footer>
    </div>
  )
}
