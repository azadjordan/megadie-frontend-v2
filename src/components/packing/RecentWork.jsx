import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowLeft, FiArrowRight, FiBox, FiCheckCircle, FiClock, FiRefreshCw, FiTruck } from 'react-icons/fi';
import WorkerBackLink from './WorkerBackLink';
import { useGetWorkerWorkQuery } from '../../features/packing/workApiSlice';
import { packingCartonReference, packingQuantity, packingSecondary } from '../../utils/packing';

const workerPeriods = [['today', 'Today'], ['yesterday', 'Yesterday'], ['dayBeforeYesterday', 'Day before yesterday']];
const adminPeriods = [['today', 'Today'], ['yesterday', 'Yesterday'], ['last7', 'Last 7 days']];
const formatDate = value => new Date(value).toLocaleString(undefined, { timeZone: 'Asia/Dubai', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

// Clear expired information even if the tab sleeps, loses its connection or a
// midnight refresh fails. Server authorization remains the source of truth.
function useWorkClock(deadline) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const timer = deadline ? setTimeout(tick, Math.max(0, Math.min(2147483647, +new Date(deadline) - Date.now() + 5))) : null;
    window.addEventListener('focus', tick);
    document.addEventListener('visibilitychange', tick);
    return () => { clearTimeout(timer); window.removeEventListener('focus', tick); document.removeEventListener('visibilitychange', tick); };
  }, [deadline]);
  return now;
}

export function WorkCard({ card }) {
  const latest = card.work[0];
  const units = card.totalUnits ?? card.items.reduce((sum, item) => sum + item.qty, 0);
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap gap-2">{card.work.map((work, i) => <span key={work.type + i} className={'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold ' + (!work.active ? 'bg-slate-100 text-slate-500' : work.type === 'delivered' ? 'bg-emerald-50 text-emerald-800' : 'bg-blue-50 text-blue-800')}>{work.type === 'delivered' ? <FiTruck aria-hidden="true" /> : <FiBox aria-hidden="true" />}{work.type === 'delivered' ? 'Delivered' : 'Packed'}{!work.active && (work.voidReason === 'delivery_corrected' ? ' · corrected, not counted' : ' · reopened, not counted')}</span>)}</div>
    <h3 className="mt-3 break-words text-xl font-semibold text-slate-900">{card.customerName || 'Carton ' + packingCartonReference(card)}</h3>
    {card.customerName && <p className="mt-1 break-words text-xs text-slate-500">Carton {packingCartonReference(card)}</p>}
    <ul className="mt-3 space-y-1 text-sm text-slate-600">{card.work.map((work, i) => <li key={i}>{work.type === 'delivered' ? 'Delivered' : 'Packed'} · {formatDate(work.completedAt)}</li>)}</ul>
    <details className="mt-4 border-t border-slate-100 pt-2"><summary className="min-h-11 cursor-pointer content-center text-sm font-semibold text-indigo-700">View items · {card.totalItems ?? card.items.length} {(card.totalItems ?? card.items.length) === 1 ? 'item' : 'items'} · {units} {units === 1 ? 'unit' : 'units'}</summary>
      {card.work.length > 1 && <p className="mb-2 text-xs text-slate-500">Contents recorded when last {latest.type}.</p>}
      <ul className="divide-y divide-slate-100">{card.items.map((item, i) => <li key={item.sku + i} className="flex items-start justify-between gap-3 py-3 text-sm"><div className="min-w-0 break-words"><p className="font-medium text-slate-900">{item.name || item.sku}</p><p className="mt-1 break-all text-xs text-slate-500">{item.sku}</p></div><span className="max-w-[45%] break-words text-right font-semibold tabular-nums">{packingQuantity(item.qty, item.unit)}</span></li>)}</ul>
    </details>
  </article>;
}

export function CompletedWorkSummary({ task, refetch, packingFinished = false }) {
  const deadline = task.privacyRefreshAt && task.expiresAt ? new Date(Math.min(+new Date(task.privacyRefreshAt), +new Date(task.expiresAt))).toISOString() : task.expiresAt;
  const now = useWorkClock(deadline);
  const refreshPrivacy = Boolean(task.privacyRefreshAt && now >= +new Date(task.privacyRefreshAt));
  const expired = task.expiresAt && now >= +new Date(task.expiresAt);
  useEffect(() => { if (expired || refreshPrivacy) refetch?.(); }, [expired, refreshPrivacy, refetch]);
  return <section className="space-y-4">
    {packingFinished ? <WorkerBackLink /> : <Link to="/packing?tab=recent" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-600"><FiArrowLeft aria-hidden="true" />Recent work</Link>}
    {expired ? <p role="status" className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">This completed task is outside your three-day work history. Contact an admin if you need help.</p> : <>
      {packingFinished && <p role="status" className="flex items-start gap-2 text-sm font-semibold text-emerald-800"><FiCheckCircle aria-hidden="true" className="mt-0.5 shrink-0" />Packing complete. Your work on this order is finished.</p>}
      <p className="text-sm text-slate-500">Completed work · read only. Contact an admin about any corrections.</p>
      <WorkCard card={refreshPrivacy ? { ...task, customerName: undefined, label: undefined } : task} />
      {packingFinished && <Link to="/packing?tab=recent" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-indigo-700">View recent work<FiArrowRight aria-hidden="true" /></Link>}
    </>}
    {refetch && <button type="button" onClick={refetch} className={packingSecondary}><FiRefreshCw aria-hidden="true" />Refresh</button>}
  </section>;
}

export default function RecentWork({ workerId }) {
  const [period, setPeriod] = useState('today');
  const [page, setPage] = useState(1);
  const [dates, setDates] = useState({ from: '', to: '' });
  const [range, setRange] = useState(null);
  const query = useGetWorkerWorkQuery({ ...(workerId ? { workerId } : {}), ...(range || { period }), page }, { pollingInterval: 30000, skipPollingIfUnfocused: true, refetchOnFocus: true, refetchOnReconnect: true, refetchOnMountOrArgChange: true });
  const response = query.currentData;
  const now = useWorkClock(response?.refreshAt);
  const denied = [401, 403, 404].includes(query.error?.status);
  const stale = !workerId && response && now >= +new Date(response.refreshAt);
  const data = !denied && !stale ? response : null;
  useEffect(() => { if (stale) query.refetch(); }, [stale, query.refetch]);
  function choose(value) { setPeriod(value); setRange(null); setPage(1); }
  return <section className="space-y-5" aria-label={workerId ? 'Worker work report' : 'Recent work'}>
    <div><h2 className="flex items-center gap-2 text-xl font-semibold"><FiClock aria-hidden="true" />{workerId ? 'Work report' : 'Recent work'}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{workerId ? 'Company work records for this account. Corrected completions are excluded from totals. Delivery totals support review; they do not record petrol payments.' : 'Your completed packing and deliveries from today and the previous two days. Times use Dubai time. Contact an admin for older jobs or corrections.'}</p></div>
    {!workerId && data?.monthly && <div aria-label="Monthly delivery total" className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5"><div><p className="flex items-center gap-2 text-sm font-semibold text-slate-700"><FiTruck aria-hidden="true" />Orders delivered this month</p><p className="mt-1 text-xs text-slate-500">{new Date(data.monthly.month + '-01T12:00:00+04:00').toLocaleDateString(undefined, { timeZone: 'Asia/Dubai', month: 'long', year: 'numeric' })}</p></div><strong className="text-3xl font-semibold tabular-nums text-slate-900">{data.monthly.delivered}</strong></div>}
    <div className="flex flex-wrap items-center gap-2">{(workerId ? adminPeriods : workerPeriods).map(([key, text]) => <button type="button" key={key} aria-pressed={!range && period === key} onClick={() => choose(key)} className={packingSecondary + (!range && period === key ? ' border-indigo-300 bg-indigo-50 text-indigo-800' : '')}>{text}</button>)}<button type="button" onClick={query.refetch} disabled={query.isFetching} aria-label="Refresh work history" className={packingSecondary}><FiRefreshCw className={query.isFetching ? 'animate-spin' : ''} aria-hidden="true" /></button></div>
    {workerId && <form onSubmit={event => { event.preventDefault(); setRange(dates); setPage(1); }} className="flex flex-wrap items-end gap-3"><label className="text-sm">From<input type="date" required value={dates.from} onChange={e => setDates({ ...dates, from: e.target.value })} className="mt-1 block rounded-xl border border-slate-300 px-3 py-2" /></label><label className="text-sm">To<input type="date" required value={dates.to} onChange={e => setDates({ ...dates, to: e.target.value })} className="mt-1 block rounded-xl border border-slate-300 px-3 py-2" /></label><button className={packingSecondary}>Apply dates</button></form>}
    {data && <div className="grid grid-cols-2 gap-3"><div className="rounded-2xl border border-blue-100 bg-blue-50 p-4"><p className="flex items-center gap-2 text-sm text-blue-800"><FiBox aria-hidden="true" />Packed</p><p className="mt-1 text-3xl font-semibold tabular-nums text-blue-950">{data.counts.packed}</p></div><div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4"><p className="flex items-center gap-2 text-sm text-emerald-800"><FiTruck aria-hidden="true" />Delivered</p><p className="mt-1 text-3xl font-semibold tabular-nums text-emerald-950">{data.counts.delivered}</p></div></div>}
    {query.isError && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{denied ? 'Work history is no longer available to this account.' : query.error?.data?.message || 'Could not refresh work history. Reconnect and try again.'}</p>}
    {!data ? <p role="status" className="text-sm text-slate-500">{stale ? 'A new day has started. Refresh to see your current work history.' : query.isError ? 'Work history unavailable.' : 'Loading work history…'}</p>
      : !data.data.length ? <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">No completed work in this period. Nothing to see here yet.</p>
        : <><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.data.map(card => <WorkCard key={card.orderId} card={card} />)}</div>{data.pagination.total > 12 && <nav aria-label="Recent work pages" className="flex items-center justify-between gap-3"><button type="button" disabled={data.pagination.page <= 1 || query.isFetching} onClick={() => setPage(data.pagination.page - 1)} className={packingSecondary}>Previous</button><span className="text-sm text-slate-500">Page {data.pagination.page}</span><button type="button" disabled={!data.pagination.hasNext || query.isFetching} onClick={() => setPage(data.pagination.page + 1)} className={packingSecondary}>Next</button></nav>}</>}
    {workerId && data?.notice && <p className="text-xs leading-5 text-slate-500">{data.notice}</p>}
  </section>;
}
