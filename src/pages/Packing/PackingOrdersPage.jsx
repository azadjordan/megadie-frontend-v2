import { toast } from "react-toastify";
import { useRef, useState, useSyncExternalStore } from "react";
import { Link, useSearchParams } from "react-router-dom";
import DeliveriesList from './DeliveriesList';
import DeliveryAssignmentPanel from '../../components/packing/DeliveryAssignmentPanel';
import { useGetDeliveriesQuery } from '../../features/packing/deliveryApiSlice';
import { FiArrowRight, FiBox, FiCheck, FiCheckCircle, FiRefreshCw, FiTruck } from "react-icons/fi";
import { useGetPackingOrdersQuery, useSavePackingMutation } from "../../features/packing/packingApiSlice";
import { packingTaskLabel, packingProgressLabel, packingUnitProgressLabel, packingCartonReference, packingError, subscribePackingNetwork, packingPrimary, packingSecondary } from "../../utils/packing";

const queues = [
  { key: "to_pack", title: "To pack", description: "Collect the items, then check and pack the carton.", empty: "No orders waiting to pack.", Icon: FiBox },
  { key: "ready_delivery", title: "Packed for delivery", description: "Your packed orders. Delivery work is in the Deliveries tab.", empty: "No packed delivery orders waiting.", Icon: FiTruck },
  { key: "ready_handoff", title: "Ready for handoff", description: "Packing is complete. Keep these cartons ready for collection.", empty: "No packed orders waiting for handoff.", Icon: FiCheck },
];

function OrderCard({ order, refresh }) {
  const [save, { isLoading }] = useSavePackingMutation();
  const [error, setError] = useState('');
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const writing = useRef(false);
  const online = useSyncExternalStore(subscribePackingNetwork, () => navigator.onLine, () => true);
  const summary = order.summary || {};
  const started = summary.pickedUnits > 0 || summary.collectedItems > 0 || summary.inProgressItems > 0;
  const action = order.packedAt ? 'View packed order' : started ? 'Continue packing' : 'Start packing';
  const progress = summary.totalUnits > 0 ? Math.min(100, Math.round(100 * summary.pickedUnits / summary.totalUnits)) : 0;
  const href = '/packing/orders/' + order.orderId;
  const label = action + ' for ' + order.customerName + ', ' + order.orderNumber;
  async function markPacked() {
    if (writing.current || !online || needsRefresh || !order.canPack) return;
    writing.current = true; setError('');
    try { await save({ orderId: order.orderId, action: 'packed', expectedRevision: order.version }).unwrap(); toast.success('Order marked packed.'); }
    catch (err) { setError(packingError(err)); setNeedsRefresh(true); }
    finally { writing.current = false; }
  }
  async function checkLatest() {
    if (writing.current) return;
    const result = await refresh();
    if (result.error) setError('Could not refresh. Check your connection and try again.');
    else { setNeedsRefresh(false); setError(''); }
  }
  return <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-medium">
      <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-600">{packingTaskLabel(order.preparationMode)}</span>
      {order.packedAt ? <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-800">Packed</span> : order.canPack && <span className="rounded-md bg-blue-50 px-2 py-1 text-blue-800">Ready to pack</span>}
      {order.deliveryState && <span className="rounded-md bg-blue-50 px-2 py-1 text-blue-800">{order.deliveryState === 'returned' ? 'Back in store' : 'Out for delivery'}</span>}
    </div>
    <h3 className="break-words text-xl font-semibold leading-snug text-slate-900">{order.customerName}</h3>
    <p title={order.orderNumber} className="mt-1 break-words text-xs text-slate-500">Carton {packingCartonReference(order)}</p>
    <div className="mt-5 grow">
      <p className="text-lg font-semibold tabular-nums text-slate-900">{packingUnitProgressLabel(summary)}</p>
      <div role="progressbar" aria-label="Units picked" aria-valuemin={0} aria-valuemax={summary.totalUnits || 0} aria-valuenow={summary.pickedUnits || 0} className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={'h-full rounded-full ' + (order.packedAt ? 'bg-emerald-500' : 'bg-blue-500')} style={{ width: progress + '%' }} /></div>
      <p className="mt-2 text-xs text-slate-500">{packingProgressLabel(summary)}</p>
      {(summary.needsHelp || order.helpRequestedItems > 0) && <p className="mt-3 text-sm font-medium text-amber-800">{order.helpRequestedItems > 0 ? 'Admin help requested' : 'Shortage needs attention'}{summary.remainingUnits > 0 ? ' · ' + summary.remainingUnits + ' units remaining' : ''}</p>}
    </div>
    <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
      {order.canPack ? <><p className="w-full text-xs text-slate-500">Pack and label the carton before finishing.</p><button type="button" className={packingPrimary} disabled={isLoading || !online || needsRefresh} onClick={markPacked}><FiCheckCircle aria-hidden="true" />{isLoading ? 'Saving…' : 'Mark packed'}</button><Link to={href} aria-label={'Review items for ' + order.customerName + ', ' + order.orderNumber} className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-indigo-700">Review items<FiArrowRight aria-hidden="true" /></Link></>
        : <Link to={href} aria-label={label} className={packingSecondary + ' w-full text-indigo-700'}>{action}<FiArrowRight aria-hidden="true" /></Link>}
    </div>
    {error && <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}
    {!online && <p role="status" className="mt-3 text-sm text-amber-800">Offline. Reconnect before marking packed.</p>}
    {needsRefresh && <button type="button" onClick={checkLatest} disabled={isLoading || !online} className={packingSecondary + ' mt-3'}><FiRefreshCw aria-hidden="true" />Check latest progress</button>}
    {order.packedAt && <div className="mt-3"><DeliveryAssignmentPanel orderId={order.orderId} /></div>}
  </article>;
}

export default function PackingOrdersPage() {
  const [params, setParams] = useSearchParams();
  const [pages, setPages] = useState({});
  const query = useGetPackingOrdersQuery(pages, { pollingInterval: 15000, skipPollingIfUnfocused: true, refetchOnReconnect: true, refetchOnFocus: true });
  const groups = query.currentData?.groups;
  const deliveryQuery = useGetDeliveriesQuery(1, { pollingInterval: 15000, skipPollingIfUnfocused: true, refetchOnFocus: true });
  const packingTotal = queues.reduce((sum, queue) => sum + (groups?.[queue.key]?.pagination?.total || 0), 0);
  const deliveryTotal = deliveryQuery.currentData?.pagination?.total;
  const deliveries = params.get('tab') === 'deliveries' || (!params.has('tab') && groups && packingTotal === 0 && deliveryTotal > 0);
  if ([403, 404].includes(query.error?.status)) return <p role="alert">Packing access changed. Sign out and check with an admin.</p>;
  return <div className="space-y-8">
    <header className="flex items-start justify-between gap-3">
      <div><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">My work</h1><p className="mt-2 text-sm text-slate-500">Your assigned packing and deliveries.</p></div>
      <button type="button" onClick={query.refetch} disabled={query.isFetching} className={packingSecondary} aria-label="Refresh orders"><FiRefreshCw aria-hidden="true" className={query.isFetching ? 'animate-spin' : ''} /><span className="hidden sm:inline">Refresh</span></button>
    </header>
    <nav aria-label="Work type" className="flex gap-2 border-b border-slate-200"><button type="button" onClick={() => setParams({ tab: 'packing' })} aria-current={!deliveries ? 'page' : undefined} className={'inline-flex min-h-12 items-center gap-2 border-b-2 px-4 text-sm font-semibold ' + (!deliveries ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500')}><FiBox aria-hidden="true" />Packing{groups && <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs tabular-nums">{packingTotal}</span>}</button><button type="button" onClick={() => setParams({ tab: 'deliveries' })} aria-current={deliveries ? 'page' : undefined} className={'inline-flex min-h-12 items-center gap-2 border-b-2 px-4 text-sm font-semibold ' + (deliveries ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500')}><FiTruck aria-hidden="true" />Deliveries{deliveryTotal !== undefined && <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs tabular-nums">{deliveryTotal}</span>}</button></nav>
    {deliveries ? <DeliveriesList /> : <>
    {query.isError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><p>{groups ? "Could not refresh. Your last saved order list is shown." : "Could not load your packing orders."}</p><button type="button" onClick={query.refetch} className="mt-2 min-h-11 font-semibold underline">Retry</button></div>}
    {queues.map(queue => {
      const { key, title, description, empty } = queue;
      const group = groups?.[key];
      const pagination = group?.pagination;
      return <section key={key} aria-labelledby={'queue-' + key} className="space-y-4">
        <div className="flex items-start gap-3"><span className="mt-0.5 rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500"><queue.Icon className="h-5 w-5" aria-hidden="true" /></span><div><h2 id={'queue-' + key} className="flex items-center gap-2 text-lg font-semibold">{title}{pagination && <span className="rounded-md bg-slate-200/70 px-2 py-0.5 text-xs tabular-nums text-slate-600">{pagination.total}</span>}</h2>{(!pagination || pagination.total > 0) && <p className="mt-1 text-sm text-slate-500">{description}</p>}</div></div>
        {!groups ? <div role="status" className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">{query.isError ? "Orders unavailable." : "Loading orders…"}</div>
          : !pagination?.total ? <p className="pl-14 text-sm text-slate-500">{empty}</p>
          : <><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{group.data.map(order => <OrderCard key={order.orderId} order={order} refresh={query.refetch} />)}</div>
            {!group.data.length && <p className="text-sm text-slate-500">Assignments changed. Refresh to see the latest orders.</p>}
            {(pagination.page > 1 || pagination.hasNext) && <nav aria-label={title + ' pages'} className="flex items-center justify-between gap-3"><button type="button" disabled={query.isFetching || pagination.page === 1} onClick={() => setPages({ ...pages, [key + 'Page']: pagination.page - 1 })} className={packingSecondary}>Previous</button><span className="text-sm text-slate-500">Page {pagination.page}</span><button type="button" disabled={query.isFetching || !pagination.hasNext} onClick={() => setPages({ ...pages, [key + 'Page']: pagination.page + 1 })} className={packingSecondary}>Next</button></nav>}
          </>}
      </section>;
    })}</>}
  </div>;
}
