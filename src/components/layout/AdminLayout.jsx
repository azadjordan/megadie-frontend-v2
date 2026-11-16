// src/components/layout/AdminLayout.jsx
import { Suspense, createElement, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector, useStore } from "react-redux";
import {
  FiMenu, FiX, FiHome, FiFileText, FiPackage, FiCreditCard,
  FiDollarSign, FiTrendingUp, FiUsers, FiBox, FiTag, FiFilter,
  FiGrid, FiArrowLeft, FiBarChart2, FiLogOut, FiUser,
} from "react-icons/fi";
import { toast } from "react-toastify";
import { apiSlice } from "../../app/apiSlice";
import { logout as logoutAction } from "../../features/auth/authSlice";
import { useLogoutMutation } from "../../features/auth/usersApiSlice";
import useMediaQuery from "../../hooks/useMediaQuery";

const navigationGroups = [
  { label: 'Work', items: [
    { to: '/admin', label: 'Dashboard', icon: FiHome, end: true },
    { to: '/admin/analytics', label: 'Analytics', icon: FiBarChart2 },
    { to: '/admin/requests', label: 'Requests', icon: FiFileText },
    { to: '/admin/orders', label: 'Orders', icon: FiPackage },
    { to: '/admin/inventory', label: 'Inventory', icon: FiBox },
  ] },
  { label: 'Billing', items: [
    { to: '/admin/finance', label: 'Finance', icon: FiTrendingUp },
    { to: '/admin/invoices', label: 'Invoices', icon: FiCreditCard },
    { to: '/admin/payments', label: 'Payments', icon: FiDollarSign },
  ] },
  { label: 'Management', items: [
    { to: '/admin/users', label: 'Users', icon: FiUsers },
    { to: '/admin/categories', label: 'Categories', icon: FiGrid },
    { to: '/admin/price-rules', label: 'Pricing Rules', icon: FiTag },
    { to: '/admin/filter-configs', label: 'Filter Configs', icon: FiFilter },
  ] },
];
const focusStyle = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600';

function NavItem({ to, icon: Icon, label, onClick, end = false }) {
  return (
    <NavLink to={to} end={end} onClick={onClick} className={({ isActive }) =>
      'flex min-h-11 items-center gap-3 rounded-lg border-l-[3px] px-3 py-2 text-sm transition ' + focusStyle + ' ' +
      (isActive ? 'border-blue-600 bg-blue-50 font-semibold text-blue-800' : 'border-transparent font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900')
    }>
      {createElement(Icon, { className: 'h-4 w-4 shrink-0', 'aria-hidden': true })}
      <span>{label}</span>
    </NavLink>
  );
}

function AdminNavigation({ adminName, onNavigate, onLogout, isLoggingOut }) {
  return <div className="flex min-h-full flex-col">
    <div className="border-b border-slate-100 px-3 pb-3 pt-1">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><FiUser aria-hidden="true" className="h-4 w-4 shrink-0 text-blue-700" /><span>Admin</span></div>
      <p className="mt-1 break-words text-xs text-slate-600">{adminName}</p>
      <Link to="/" onClick={onNavigate} className={'mt-2 inline-flex min-h-11 items-center gap-2 rounded-lg text-[13px] font-medium text-slate-600 hover:text-blue-800 ' + focusStyle}><FiArrowLeft aria-hidden="true" className="h-4 w-4" />Back to site</Link>
    </div>
    <nav aria-label="Admin navigation" className="space-y-4 py-4">
      {navigationGroups.map(group => <div key={group.label}>
        <h2 className="mb-1 px-3 text-xs font-semibold text-slate-500">{group.label}</h2>
        <div className="space-y-1">{group.items.map(item => <NavItem key={item.to} {...item} onClick={onNavigate} />)}</div>
      </div>)}
    </nav>
    <div className="mt-auto border-t border-slate-100 pt-2">
      <button type="button" onClick={onLogout} disabled={isLoggingOut} className={'inline-flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-rose-50 hover:text-rose-700 disabled:cursor-wait disabled:opacity-50 ' + focusStyle}>
        <FiLogOut aria-hidden="true" className="h-4 w-4 shrink-0" />{isLoggingOut ? 'Logging out...' : 'Logout'}
      </button>
    </div>
  </div>;
}

function AdminPageLoading() {
  return <div role="status" aria-live="polite" className="flex min-h-[280px] items-center justify-center"><div className="text-center"><div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" /><div className="mt-3 text-sm font-semibold text-slate-800">Loading page...</div></div></div>;
}

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const store = useStore();
  const { userInfo } = useSelector(state => state.auth);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobilePath, setMobilePath] = useState(location.pathname);
  const desktop = useMediaQuery('(min-width: 768px)');
  const toggle = useRef(null), drawer = useRef(null);
  const [logoutApi, { isLoading: isLoggingOut }] = useLogoutMutation();
  const adminName = String(userInfo?.name || userInfo?.email || 'Admin').trim() || 'Admin';

  if (mobilePath !== location.pathname || (desktop && mobileOpen)) {
    setMobilePath(location.pathname);
    setMobileOpen(false);
  }
  const drawerOpen = mobileOpen && !desktop;

  useEffect(() => {
    if (!drawerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    drawer.current.querySelector('button').focus();
    // Keep the existing staff-session warning accessible inside the active dialog.
    document.dispatchEvent(new CustomEvent('packing-dialog-host', { detail: drawer.current.querySelector('[data-session-warning-slot]') }));
    const keyboard = event => {
      if (event.key === 'Escape') { event.preventDefault(); setMobileOpen(false); return; }
      if (event.key !== 'Tab') return;
      const elements = [...drawer.current.querySelectorAll('button:not(:disabled),a[href]')].filter(node => node.getClientRects().length);
      const first = elements[0], last = elements.at(-1);
      if (!drawer.current.contains(document.activeElement)) { event.preventDefault(); (event.shiftKey ? last : first)?.focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keyboard);
    const opener = toggle.current;
    return () => {
      document.removeEventListener('keydown', keyboard);
      document.dispatchEvent(new CustomEvent('packing-dialog-host', { detail: null }));
      document.body.style.overflow = previousOverflow;
      if (opener?.getClientRects().length) opener.focus();
    };
  }, [drawerOpen]);

  const handleLogout = async () => {
    const generation = store.getState().auth.sessionGeneration;
    try {
      await logoutApi({ sessionId: userInfo?.sessionId }).unwrap();
    } catch {
      if (store.getState().auth.sessionGeneration !== generation) return;
      if (userInfo?.isAdmin) {
        toast.error('Could not sign out. Check your connection and try again.');
        return;
      }
    }
    if (store.getState().auth.sessionGeneration !== generation) return;
    dispatch(logoutAction({ expectedSessionId: userInfo?.sessionId }));
    dispatch(apiSlice.util.resetApiState());
    navigate('/', { replace: true });
  };

  const navigation = <AdminNavigation adminName={adminName} isLoggingOut={isLoggingOut} onLogout={handleLogout} onNavigate={() => setMobileOpen(false)} />;
  return <>
    <div inert={drawerOpen} className="min-h-[calc(100vh-var(--app-header-h,64px))] bg-slate-50">
      <div className="sticky top-0 z-[70] flex items-center justify-between border-b border-slate-200 bg-white px-3 py-2 md:hidden">
        <span className="text-sm font-semibold text-slate-900">Admin</span>
        <button ref={toggle} type="button" onClick={() => setMobileOpen(true)} aria-label="Toggle admin navigation" aria-haspopup="dialog" aria-expanded={drawerOpen} aria-controls="admin-navigation-drawer" className={'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-800 ' + focusStyle}><FiMenu aria-hidden="true" className="h-4 w-4" />Menu</button>
      </div>
      <div className="mx-auto w-full max-w-[1800px] px-0 py-0 md:px-4 md:py-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="sticky top-4 hidden min-w-0 self-start md:block"><div className="max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-3">{navigation}</div></aside>
          <main className="min-w-0 max-w-full"><div className="w-full max-w-full rounded-none bg-white p-3 shadow-sm ring-0 sm:rounded-2xl sm:p-4 sm:ring-1 sm:ring-slate-200"><Suspense fallback={<AdminPageLoading />}><Outlet /></Suspense></div></main>
        </div>
      </div>
    </div>
    {drawerOpen && createPortal(<div className="fixed inset-0 z-[100]">
      <div aria-hidden="true" className="absolute inset-0 bg-slate-950/40" onClick={() => setMobileOpen(false)} />
      <section ref={drawer} id="admin-navigation-drawer" role="dialog" aria-modal="true" aria-label="Admin navigation" className="absolute inset-y-0 right-0 flex w-[calc(100%_-_1rem)] max-w-80 flex-col bg-white shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-2"><h2 className="text-sm font-semibold text-slate-900">Navigation</h2><button type="button" aria-label="Close admin navigation" onClick={() => setMobileOpen(false)} className={'inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 ' + focusStyle}><FiX aria-hidden="true" className="h-5 w-5" /></button></div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"><div data-session-warning-slot />{navigation}</div>
      </section>
    </div>, document.body)}
  </>;
}
