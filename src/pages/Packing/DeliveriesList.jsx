import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiRefreshCw } from 'react-icons/fi';
import { useGetDeliveriesQuery } from '../../features/packing/deliveryApiSlice';
import DeliveryControls, { DeliveryContactActions } from '../../components/packing/DeliveryControls';
import { packingCartonReference, packingSecondary } from '../../utils/packing';
import { deliveryLabel, deliveryTone } from '../../utils/delivery';

export default function DeliveriesList() {
  const [page, setPage] = useState(1);
  const query = useGetDeliveriesQuery(page, { pollingInterval: 15000, skipPollingIfUnfocused: true, refetchOnFocus: true, refetchOnReconnect: true, refetchOnMountOrArgChange: true });
  const result = query.currentData;
  const lost = [403, 404].includes(query.error?.status);
  return <section aria-label="My deliveries" className="space-y-4">
    <div className="flex items-center justify-between gap-3"><p className="text-sm text-slate-500">{result ? result.pagination.total + ' active deliveries assigned to you' : 'Your assigned deliveries'}</p><button type="button" className={packingSecondary} disabled={query.isFetching} onClick={query.refetch}><FiRefreshCw aria-hidden="true" />Refresh</button></div>
    {query.isError && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{lost ? 'Your worker access changed. Check with an admin.' : 'Could not refresh deliveries. Try again.'}</p>}
    {!result ? !query.isError && <p role="status">Loading deliveries…</p> : !lost && <>
      {!result.data.length ? <p className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">{result.pagination.total ? 'Assignments changed. Refresh to see your current deliveries.' : 'No deliveries assigned to you. Nothing to deliver right now.'}</p> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{result.data.map(task => <article key={task.orderId} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div><span className={'inline-flex rounded-md px-2 py-1 text-xs font-semibold ring-1 ring-inset ' + deliveryTone(task)}>{deliveryLabel(task)}</span><h2 className="mt-3 break-words text-xl font-semibold">{task.customerName}</h2><p className="mt-1 text-xs text-slate-500">Carton {packingCartonReference(task)}</p></div>
        {task.delivery && <div className="grow"><p className="text-sm font-medium">{task.delivery.contactName}</p><p className="mt-1 line-clamp-2 break-words text-sm leading-6 text-slate-600">{task.delivery.address || (task.delivery.googleMapsUrl ? 'Saved map location' : 'Location missing — ask an admin')}</p><div className="mt-3"><DeliveryContactActions delivery={task.delivery} /></div></div>}
        <div className="border-t border-slate-100 pt-4"><DeliveryControls task={task} onChanged={() => query.refetch()} /><Link to={'/packing/deliveries/' + task.orderId} className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-indigo-700">View delivery<FiArrowRight aria-hidden="true" /></Link></div>
      </article>)}</div>}
      {(result.pagination.page > 1 || result.pagination.hasNext) && <nav aria-label="Delivery pages" className="flex items-center justify-between gap-3"><button type="button" className={packingSecondary} disabled={query.isFetching || result.pagination.page <= 1} onClick={() => setPage(result.pagination.page - 1)}>Previous</button><span className="text-sm">Page {result.pagination.page}</span><button type="button" className={packingSecondary} disabled={query.isFetching || !result.pagination.hasNext} onClick={() => setPage(result.pagination.page + 1)}>Next</button></nav>}
    </>}
  </section>;
}
