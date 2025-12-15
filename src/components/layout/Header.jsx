// src/components/layout/Header.jsx
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  FaStore,
  FaShoppingCart,
  FaUser,
  FaBars,
  FaTimes,
  FaSignOutAlt,
} from 'react-icons/fa'

const desktopLink = ({ isActive }) =>
  `inline-flex items-center gap-2 text-sm font-medium transition ${
    isActive ? 'text-slate-900' : 'text-slate-700 hover:text-slate-900'
  }`

const drawerLink = ({ isActive }) =>
  `flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive
      ? 'bg-slate-100 text-slate-900'
      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
  }`

export default function Header() {
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const drawerRef = useRef(null)

  // Cart count (your current cart shape)
  const count = useSelector((state) =>
    (state.cart.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0),
  )

  // Placeholder auth (wire later)
  const isAuthed = false
  const firstName = 'Account'

  const [bounce, setBounce] = useState(false)
  useEffect(() => {
    if (count > 0) {
      setBounce(true)
      const t = setTimeout(() => setBounce(false), 400)
      return () => clearTimeout(t)
    }
  }, [count])

  // Close drawer on route change
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  // Outside click
  useEffect(() => {
    if (!menuOpen) return
    const handle = (e) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [menuOpen])

  // ESC + body lock
  useEffect(() => {
    if (!menuOpen) return
    const esc = (e) => e.key === 'Escape' && setMenuOpen(false)
    window.addEventListener('keydown', esc)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', esc)
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const logoutPlaceholder = () => {
    setMenuOpen(false)
    // eslint-disable-next-line no-alert
    alert('Logout (placeholder)')
  }

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link to="/" className="text-lg font-semibold tracking-tight text-slate-900">
          Megadie
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-8 md:flex">
          <NavLink to="/shop" className={desktopLink}>
            <FaStore size={16} />
            Shop
          </NavLink>

          <NavLink to="/cart" className={desktopLink}>
            <span className="relative flex items-center">
              <FaShoppingCart size={16} />
              {count > 0 && (
                <span
                  className={[
                    'absolute -right-2 -top-2 rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white',
                    bounce ? 'animate-bounce' : '',
                  ].join(' ')}
                >
                  {count}
                </span>
              )}
            </span>
            Cart
          </NavLink>

          {isAuthed ? (
            <>
              <NavLink to="/account" className={desktopLink}>
                <FaUser size={16} />
                {firstName}
              </NavLink>

              <button
                onClick={logoutPlaceholder}
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900"
                type="button"
              >
                <FaSignOutAlt size={16} />
                Logout
              </button>
            </>
          ) : (
            <NavLink to="/login" className={desktopLink}>
              <FaUser size={16} />
              Sign in
            </NavLink>
          )}
        </div>

        {/* Mobile hamburger (old style) */}
        <div className="relative md:hidden">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
            className="text-slate-700 hover:text-slate-900 transition"
            type="button"
          >
            {menuOpen ? <FaTimes size={26} /> : <FaBars size={26} />}
          </button>

          {count > 0 && (
            <span
              className={[
                'absolute -right-3 -top-3 rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white',
                bounce ? 'animate-bounce' : '',
              ].join(' ')}
            >
              {count}
            </span>
          )}
        </div>
      </nav>

      {/* Mobile drawer */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/25" />

          <aside
            ref={drawerRef}
            className="fixed inset-y-0 right-0 z-50 w-72 max-w-[85vw] bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <span className="text-sm font-semibold text-slate-900">Menu</span>
              <button
                onClick={() => setMenuOpen(false)}
                className="text-slate-700 hover:text-slate-900"
                type="button"
                aria-label="Close menu"
              >
                <FaTimes size={22} />
              </button>
            </div>

            <div className="p-4 space-y-2">
              <NavLink to="/shop" className={drawerLink} onClick={() => setMenuOpen(false)}>
                <span className="flex items-center gap-3">
                  <FaStore size={18} />
                  Shop
                </span>
              </NavLink>

              <NavLink to="/cart" className={drawerLink} onClick={() => setMenuOpen(false)}>
                <span className="flex items-center gap-3">
                  <span className="relative">
                    <FaShoppingCart size={18} />
                    {count > 0 && (
                      <span className="absolute -right-2 -top-2 rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white">
                        {count}
                      </span>
                    )}
                  </span>
                  Cart
                </span>
              </NavLink>

              <div className="pt-2 border-t border-slate-200">
                {isAuthed ? (
                  <>
                    <NavLink to="/account" className={drawerLink} onClick={() => setMenuOpen(false)}>
                      <span className="flex items-center gap-3">
                        <FaUser size={18} />
                        {firstName}
                      </span>
                    </NavLink>

                    <button
                      onClick={logoutPlaceholder}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                      type="button"
                    >
                      <FaSignOutAlt size={18} />
                      Logout
                    </button>
                  </>
                ) : (
                  <NavLink to="/login" className={drawerLink} onClick={() => setMenuOpen(false)}>
                    <span className="flex items-center gap-3">
                      <FaUser size={18} />
                      Sign in
                    </span>
                  </NavLink>
                )}
              </div>
            </div>
          </aside>
        </>
      )}
    </header>
  )
}
