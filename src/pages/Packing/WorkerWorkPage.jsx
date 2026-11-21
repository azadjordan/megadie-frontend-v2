import { useEffect, useRef, useSyncExternalStore } from 'react';
import { useSelector } from 'react-redux';
import { useLocation, useSearchParams } from 'react-router-dom';
import { FiList, FiClock, FiRefreshCw } from 'react-icons/fi';
import { useGetActiveWorkerWorkQuery } from '../../features/packing/workApiSlice';
import { packingSecondary, subscribePackingNetwork } from '../../utils/packing';
import ActiveWorkCard from '../../components/packing/ActiveWorkCard';
import RecentWork from '../../components/packing/RecentWork';

const sections = [{ key: 'todo', title: 'To do', empty: 'No orders need your action right now.', Icon: FiList }, { key: 'waiting', title: 'Waiting', empty: 'No orders waiting on someone else.', Icon: FiClock }];

export default function WorkerWorkPage() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const userId = useSelector(state => state.auth.userInfo?._id);
  const recent = params.get('tab') === 'recent';
  const pages = Object.fromEntries(['todoPage', 'waitingPage'].filter(key => /^[1-9]\d{0,4}$/.test(params.get(key) || '')).map(key => [key, params.get(key)]));
  const query = useGetActiveWorkerWorkQuery(pages, { skip: recent, pollingInterval: 15000, skipPollingIfUnfocused: true, refetchOnReconnect: true, refetchOnFocus: true, refetchOnMountOrArgChange: true });
  const denied = [401, 403, 404].includes(query.error?.status);
  const groups = !denied && query.currentData?.groups;
  const online = useSyncExternalStore(subscribePackingNetwork, () => navigator.onLine, () => true);
  const returnTo = '/packing' + (params.toString() ? '?' + params.toString() : '');
  const scrollKey = 'worker-work-scroll:' + userId + ':' + location.search;
  const restored = useRef(false);
  useEffect(() => {
    if (!groups || restored.current) return;
    restored.current = true;
    if (!location.state?.restoreWorkScroll) return;
    const frame = requestAnimationFrame(() => window.scrollTo(0, Number(sessionStorage.getItem(scrollKey)) || 0));
    return () => cancelAnimationFrame(frame);
  }, [groups, location.state, scrollKey]);
  const rememberScroll = () => sessionStorage.setItem(scrollKey, String(window.scrollY));
  function changePage(key, page) {
    const next = new URLSearchParams(params); next.delete('tab'); next.set(key + 'Page', String(page)); setParams(next);
  }
  return <div className="space-y-6">
    <header className="flex items-start justify-between gap-3"><div><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">My work</h1><p className="mt-2 text-sm text-slate-500">Your next jobs, in one place.</p></div>{!recent && <button type="button" onClick={query.refetch} disabled={query.isFetching || !online} aria-label="Refresh active work" className={packingSecondary}><FiRefreshCw aria-hidden="true" className={query.isFetching ? 'animate-spin' : ''} /><span className="hidden sm:inline">Refresh</span></button>}</header>
    <nav aria-label="Work view" className="flex gap-6 border-b border-slate-200">{[['active', 'Active work'], ['recent', 'Recent work']].map(([key, label]) => <button key={key} type="button" aria-current={(key === 'recent') === recent ? 'page' : undefined} onClick={() => setParams(key === 'recent' ? { ...pages, tab: 'recent' } : pages)} className={'inline-flex min-h-12 items-center border-b-2 px-1 text-sm font-semibold ' + ((key === 'recent') === recent ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500')}>{label}</button>)}</nav>
    {recent ? <RecentWork /> : <>
      {!online && <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Offline. Saved work is shown. Reconnect before recording progress.</p>}
      {query.isError && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{denied ? 'Your worker access changed. Check with an admin.' : groups ? 'Could not refresh. The last saved work is shown.' : 'Could not load your work. Try Refresh.'}</p>}
      {!groups ? !query.isError && <p role="status" className="text-sm text-slate-500">Loading your work…</p> : sections.map(section => {
        const { key, title, empty } = section;
        const Icon = section.Icon;
        const group = groups[key];
        return <section key={key} aria-label={title} className="space-y-3"><h2 className="flex items-center gap-2 text-lg font-semibold"><Icon aria-hidden="true" className="h-5 w-5 text-slate-500" />{title}<span className="rounded-md bg-slate-200/60 px-2 py-0.5 text-xs tabular-nums text-slate-600">{group.pagination.total}</span></h2>
          {!group.pagination.total ? <p className="text-sm text-slate-500">{empty}</p> : <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">{group.data.map(card => <ActiveWorkCard key={card.orderId} card={card} refresh={query.refetch} returnTo={returnTo} onNavigate={rememberScroll} />)}</div>}
          {(group.pagination.page > 1 || group.pagination.hasNext) && <nav aria-label={title + ' pages'} className="flex items-center justify-between gap-3"><button type="button" className={packingSecondary} disabled={query.isFetching || group.pagination.page === 1} onClick={() => changePage(key, group.pagination.page - 1)}>Previous</button><span className="text-sm text-slate-500">Page {group.pagination.page}</span><button type="button" className={packingSecondary} disabled={query.isFetching || !group.pagination.hasNext} onClick={() => changePage(key, group.pagination.page + 1)}>Next</button></nav>}
        </section>;
      })}
    </>}
  </div>;
}
