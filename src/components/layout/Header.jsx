// src/components/layout/Header.jsx
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  FaStore,
  FaShoppingCart,
  FaUser,
  FaBars,
  FaTimes,
  FaSignOutAlt,
} from 'react-icons/fa'

import { apiSlice } from '../../app/apiSlice'
import { logout as logoutAction } from '../../features/auth/authSlice'
import { useLogoutMutation } from '../../features/auth/usersApiSlice'

const desktopLink = ({ isActive }) =>
  `inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold transition ${
    isActive
      ? 'bg-violet-50 text-violet-700 ring-1 ring-violet-200'
      : 'text-slate-600 hover:bg-violet-50/70 hover:text-violet-700'
  }`

const drawerLink = ({ isActive }) =>
  `flex items-center justify-between rounded-xl px-3 py-2 text-base font-medium transition ${
    isActive
      ? 'bg-violet-50 text-violet-700 ring-1 ring-violet-200'
      : 'text-slate-700 hover:bg-violet-50 hover:text-violet-700'
  }`

export default function Header() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const dispatch = useDispatch()

  const [menuOpen, setMenuOpen] = useState(false)
  const drawerRef = useRef(null)

  // Measure header height -> CSS var for layouts below
  const headerRef = useRef(null)
  useLayoutEffect(() => {
    const el = headerRef.current
    if (!el) return

    const apply = () => {
      const h = el.getBoundingClientRect().height
      document.documentElement.style.setProperty('--app-header-h', `${h}px`)
    }

    apply()

    const ro = new ResizeObserver(() => apply())
    ro.observe(el)

    window.addEventListener('resize', apply)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', apply)
    }
  }, [])

  // Cart count
  const count = useSelector((state) =>
    (state.cart.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0),
  )

  // Auth state
  const { userInfo, isInitialized } = useSelector((state) => state.auth)
  const isAuthed = !!userInfo
  const isAdmin = !!userInfo?.isAdmin

  const firstName = (() => {
    const label = userInfo?.name || userInfo?.email || 'Account'
    return String(label).trim().split(' ')[0] || 'Account'
  })()

  const [logoutApi, { isLoading: isLoggingOut }] = useLogoutMutation()

  // Cart bounce animation
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

  const handleLogout = async () => {
    setMenuOpen(false)

    try {
      await logoutApi().unwrap()
    } catch {
      // silent best-effort logout
    } finally {
      dispatch(logoutAction())
      dispatch(apiSlice.util.resetApiState())
      navigate('/', { replace: true })
    }
  }

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur"
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl font-bold tracking-tight text-violet-700">
            Megadie
          </span>
          <span className="hidden rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-600 sm:inline-flex">
            Supply
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-4 md:flex">
          <NavLink to="/shop" className={desktopLink}>
            <FaStore size={18} />
            Shop
          </NavLink>

          <NavLink to="/cart" className={desktopLink}>
            <span className="relative flex items-center">
              <FaShoppingCart size={18} />
              {count > 0 && (
                <span
                  className={[
                    'absolute -right-2 -top-2 rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-semibold text-white',
                    bounce ? 'animate-bounce' : '',
                  ].join(' ')}
                >
                  {count}
                </span>
              )}
            </span>
            Cart
          </NavLink>

          {/* Auth (desktop) */}
          {!isInitialized ? null : isAuthed ? (
            <>
              <NavLink to="/account" className={desktopLink}>
                <FaUser size={18} />
                {firstName}
              </NavLink>

              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60"
                type="button"
              >
                <FaSignOutAlt size={18} />
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </button>
            </>
          ) : (
            <NavLink to="/login" className={desktopLink}>
              <FaUser size={18} />
              Sign in
            </NavLink>
          )}

          {/* Admin entry point (desktop) */}
          {!isInitialized ? null : isAdmin ? (
            <NavLink to="/admin" className={desktopLink}>
              <span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
                Admin
              </span>
            </NavLink>
          ) : null}
        </div>

        {/* Mobile hamburger */}
        <div className="relative md:hidden">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700 shadow-sm transition hover:border-violet-200 hover:text-violet-700"
            type="button"
          >
            {menuOpen ? <FaTimes size={22} /> : <FaBars size={22} />}
          </button>

          {count > 0 && (
            <span
              className={[
                'absolute -right-3 -top-3 rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-semibold text-white',
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
          <div className="fixed inset-0 z-40 bg-slate-900/30" />

          <aside
            ref={drawerRef}
            className="fixed inset-y-0 right-0 z-50 w-72 max-w-[85vw] bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <span className="text-base font-semibold text-slate-900">
                Navigation
              </span>
              <button
                onClick={() => setMenuOpen(false)}
                className="text-slate-700 hover:text-slate-900"
                type="button"
                aria-label="Close menu"
              >
                <FaTimes size={24} />
              </button>
            </div>

            <div className="space-y-2 p-4">
              <NavLink to="/shop" className={drawerLink}>
                <span className="flex items-center gap-3">
                  <FaStore size={20} />
                  Shop
                </span>
              </NavLink>

              <NavLink to="/cart" className={drawerLink}>
                <span className="flex items-center gap-3">
                  <span className="relative">
                    <FaShoppingCart size={20} />
                    {count > 0 && (
                      <span className="absolute -right-2 -top-2 rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                        {count}
                      </span>
                    )}
                  </span>
                  Cart
                </span>
              </NavLink>

              {/* Auth (mobile) */}
              <div className="border-t border-slate-200 pt-2">
                {!isInitialized ? null : isAuthed ? (
                  <>
                    <NavLink to="/account" className={drawerLink}>
                      <span className="flex items-center gap-3">
                        <FaUser size={20} />
                        {firstName}
                      </span>
                    </NavLink>

                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60"
                      type="button"
                    >
                      <FaSignOutAlt size={18} />
                      {isLoggingOut ? 'Logging out...' : 'Logout'}
                    </button>
                  </>
                ) : (
                  <NavLink to="/login" className={drawerLink}>
                    <span className="flex items-center gap-3">
                      <FaUser size={20} />
                      Sign in
                    </span>
                  </NavLink>
                )}
              </div>

              {/* Admin entry point (mobile) */}
              {!isInitialized ? null : isAdmin ? (
                <NavLink to="/admin" className={drawerLink}>
                  <span className="flex items-center gap-3">
                    <span className="rounded-lg bg-slate-900 px-2 py-1 text-xs font-semibold text-white">
                      Admin
                    </span>
                    Admin Panel
                  </span>
                </NavLink>
              ) : null}
            </div>
          </aside>
        </>
      )}
    </header>
  )
}
