// src/components/layout/Header.jsx
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  FaStore,
  FaShoppingCart,
  FaUser,
  FaBars,
  FaTimes,
  FaSignOutAlt,
} from "react-icons/fa";

import { apiSlice } from "../../app/apiSlice";
import { logout as logoutAction } from "../../features/auth/authSlice";
import { useLogoutMutation } from "../../features/auth/usersApiSlice";

const desktopLink = ({ isActive }) =>
  `inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold transition ${
    isActive
      ? "bg-violet-50 text-violet-700 ring-1 ring-violet-200"
      : "text-slate-600 hover:bg-violet-50/70 hover:text-violet-700"
  }`;

const drawerLink = ({ isActive }) =>
  `flex items-center justify-between rounded-xl px-3 py-2 text-base font-medium transition ${
    isActive
      ? "bg-violet-50 text-violet-700 ring-1 ring-violet-200"
      : "text-slate-700 hover:bg-violet-50 hover:text-violet-700"
  }`;

export default function Header() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [menuOpen, setMenuOpen] = useState(false);
  const drawerRef = useRef(null);

  // Focus management
  const menuButtonRef = useRef(null);
  const drawerCloseRef = useRef(null);
  const lastFocusRef = useRef(null);

  // Measure header height -> CSS var for layouts below
  const headerRef = useRef(null);
  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const apply = () => {
      const h = el.getBoundingClientRect().height;
      document.documentElement.style.setProperty("--app-header-h", `${h}px`);
    };

    apply();

    const ro = new ResizeObserver(() => apply());
    ro.observe(el);

    window.addEventListener("resize", apply);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", apply);
    };
  }, []);

  // Cart count
  const count = useSelector((state) =>
    (state.cart.items || []).reduce(
      (sum, item) => sum + (item.quantity || 0),
      0,
    ),
  );

  // Auth state
  const { userInfo, isInitialized } = useSelector((state) => state.auth);
  const isAuthed = !!userInfo;
  const isAdmin = !!userInfo?.isAdmin;
  const isPendingApproval = !isAdmin && userInfo?.approvalStatus === "Pending";

  const firstName = (() => {
    const label = userInfo?.name || userInfo?.email || "Account";
    return String(label).trim().split(" ")[0] || "Account";
  })();

  const [logoutApi, { isLoading: isLoggingOut }] = useLogoutMutation();

  // Cart bounce animation
  const [bounce, setBounce] = useState(false);
  useEffect(() => {
    if (count > 0) {
      setBounce(true);
      const t = setTimeout(() => setBounce(false), 400);
      return () => clearTimeout(t);
    }
  }, [count]);

  // Close drawer on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handle = (e) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [menuOpen]);

  // ESC + body lock + focus move/restore
  useEffect(() => {
    if (!menuOpen) return;

    // Save last focused element (best-effort)
    lastFocusRef.current = document.activeElement;

    // Move focus into the drawer
    const t = window.setTimeout(() => {
      drawerCloseRef.current?.focus?.();
    }, 0);

    const esc = (e) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";

    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", esc);
      document.body.style.overflow = "";

      // Restore focus to the menu button (or the last focused element)
      const fallback = menuButtonRef.current;
      const last = lastFocusRef.current;
      if (last && typeof last.focus === "function") last.focus();
      else fallback?.focus?.();
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    setMenuOpen(false);

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

  return (
    <>
      <header
        ref={headerRef}
        className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur"
      >
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
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
                      "absolute -right-2 -top-2 rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-semibold text-white",
                      bounce ? "animate-bounce motion-reduce:animate-none" : "",
                    ].join(" ")}
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
                  {isLoggingOut ? "Logging out..." : "Logout"}
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

          {/* Mobile controls */}
          <div className="flex items-center gap-2 md:hidden">
            {/* Shop (icon + label) */}
            <button
              type="button"
              onClick={() => navigate("/shop")}
              aria-label="Shop"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-violet-200 hover:text-violet-700"
            >
              <FaStore size={18} />
              Shop
            </button>

            {/* Cart (icon only + badge) */}
            <button
              type="button"
              onClick={() => navigate("/cart")}
              aria-label="Cart"
              className="relative rounded-xl border border-slate-200 bg-white p-2 text-slate-700 shadow-sm transition hover:border-violet-200 hover:text-violet-700"
            >
              <FaShoppingCart size={22} />
              {count > 0 && (
                <span
                  className={[
                    "absolute -right-2 -top-2 rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-semibold text-white",
                    bounce ? "animate-bounce motion-reduce:animate-none" : "",
                  ].join(" ")}
                >
                  {count}
                </span>
              )}
            </button>

            {/* Menu */}
            <button
              ref={menuButtonRef}
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
              aria-controls="mobile-drawer"
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700 shadow-sm transition hover:border-violet-200 hover:text-violet-700"
              type="button"
            >
              {menuOpen ? <FaTimes size={22} /> : <FaBars size={22} />}
            </button>
          </div>
        </nav>

        {/* Pending approval banner (more informative) */}
        {isPendingApproval ? (
          <div className="border-t border-amber-200 bg-amber-50/80">
            <div className="mx-auto max-w-7xl px-4 py-2 text-xs">
              <div className="font-semibold text-amber-800">
                Account under review
              </div>
              <div className="text-amber-800/80">
                Your account is being reviewed by our team. You’ll be notified
                once approval is complete.
              </div>
            </div>
          </div>
        ) : null}
      </header>

      {/* Mobile drawer */}
      {menuOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-[90] bg-slate-900/40 backdrop-blur-sm"
            aria-hidden="true"
            onClick={() => setMenuOpen(false)}
          />

          {/* Drawer */}
          <aside
            id="mobile-drawer"
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            className="fixed inset-y-0 right-0 z-[100] h-[100dvh] w-72 max-w-[85vw] border-l border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex h-full flex-col">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <span className="text-base font-semibold text-slate-900">
                  Navigation
                </span>
                <button
                  ref={drawerCloseRef}
                  onClick={() => setMenuOpen(false)}
                  className="text-slate-700 hover:text-slate-900"
                  type="button"
                  aria-label="Close menu"
                >
                  <FaTimes size={24} />
                </button>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 space-y-2 overflow-y-auto p-4">
                {/* Primary navigation */}
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

                <div className="border-t border-slate-200 pt-2" />

                {/* Account */}
                {!isInitialized ? null : isAuthed ? (
                  <NavLink to="/account" className={drawerLink}>
                    <span className="flex items-center gap-3">
                      <FaUser size={20} />
                      {firstName}
                    </span>
                  </NavLink>
                ) : (
                  <NavLink to="/login" className={drawerLink}>
                    <span className="flex items-center gap-3">
                      <FaUser size={20} />
                      Sign in
                    </span>
                  </NavLink>
                )}

                {/* Admin */}
                {!isInitialized ? null : isAdmin ? (
                  <>
                    <div className="border-t border-slate-200 pt-2" />
                    <NavLink to="/admin" className={drawerLink}>
                      <span className="flex items-center gap-3">
                        <FaUser size={20} />
                        Admin Panel
                      </span>

                      <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
                        Admin
                      </span>
                    </NavLink>
                  </>
                ) : null}
              </div>

              {/* Logout pinned at bottom */}
              {!isInitialized || !isAuthed ? null : (
                <div className="border-t border-slate-200 p-4">
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60"
                    type="button"
                  >
                    <FaSignOutAlt size={18} />
                    {isLoggingOut ? "Logging out..." : "Logout"}
                  </button>
                </div>
              )}
            </div>
          </aside>
        </>
      )}
    </>
  );
}
