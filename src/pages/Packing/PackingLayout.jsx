import { useSelector, useDispatch, useStore } from "react-redux";
import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { useLogoutMutation } from "../../features/auth/usersApiSlice";
import { logout } from "../../features/auth/authSlice";
import { apiSlice } from "../../app/apiSlice";
import SessionCheckFailed from "../../components/auth/SessionCheckFailed";
import { FiBox, FiLogOut } from "react-icons/fi";

export default function PackingLayout() {
  const { userInfo, isInitialized, sessionCheckError } = useSelector(state => state.auth);
  const location = useLocation();
  const dispatch = useDispatch();
  const store = useStore();
  const [signOut, { isLoading }] = useLogoutMutation();
  if (!isInitialized) return <p role="status" className="p-6">Checking session…</p>;
  if (!userInfo && sessionCheckError) return <SessionCheckFailed />;
  if (!userInfo) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!userInfo.isWorker && !userInfo.isAdmin) return <Navigate to="/" replace />;
  async function leave() {
    const generation = store.getState().auth.sessionGeneration;
    try { await signOut({ sessionId: userInfo.sessionId }).unwrap(); }
    catch { toast.error("Could not sign out. Check your connection and try again."); return; }
    if (store.getState().auth.sessionGeneration !== generation) return;
    dispatch(logout({ expectedSessionId: userInfo.sessionId })); dispatch(apiSlice.util.resetApiState());
  }
  return <div className="min-h-screen bg-slate-50 text-slate-900"><div className="border-b border-slate-200 bg-white"><header className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:px-6"><Link to="/packing" className="inline-flex min-h-11 items-center gap-3 text-sm font-bold tracking-wide"><span className="rounded-xl bg-slate-900 p-2 text-white"><FiBox className="h-5 w-5" aria-hidden="true" /></span><span>MEGADIE<span className="block text-[11px] font-medium tracking-normal text-slate-500">Packing</span></span></Link><div className="flex items-center gap-2"><span className="max-w-16 truncate text-xs text-slate-500 sm:max-w-40 sm:text-sm">{userInfo.name}</span><button type="button" onClick={leave} disabled={isLoading} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-xs font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50"><FiLogOut aria-hidden="true" /><span>Sign out</span></button></div></header></div><div className={'mx-auto px-4 pb-12 sm:px-6 ' + (location.pathname.replace(/\/$/, '') === '/packing' ? 'max-w-6xl' : 'max-w-3xl')}>
    {userInfo.isAdmin && <Link to="/admin/orders" className="mt-3 inline-flex min-h-11 items-center text-sm underline">Back to admin orders</Link>}
    <main className="pt-6 sm:pt-8"><Outlet /></main>
  </div></div>;
}
