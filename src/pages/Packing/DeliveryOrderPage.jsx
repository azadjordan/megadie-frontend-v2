import { Link, useParams } from 'react-router-dom';
import { FiArrowLeft, FiPackage } from 'react-icons/fi';
import { useGetDeliveryTaskQuery } from '../../features/packing/deliveryApiSlice';
import DeliveryControls, { DeliveryContactActions } from '../../components/packing/DeliveryControls';
import { packingCartonReference, packingSecondary, packingDate } from '../../utils/packing';
import { deliveryLabel, deliveryTone } from '../../utils/delivery';

export default function DeliveryOrderPage() {
  const { id } = useParams();
  const query = useGetDeliveryTaskQuery(id, { pollingInterval: 15000, skipPollingIfUnfocused: true, refetchOnFocus: true, refetchOnReconnect: true, refetchOnMountOrArgChange: true });
  const task = query.currentData?.data;
  const lost = [403, 404].includes(query.error?.status);
  if (!task || lost) return <div className="space-y-4"><p role="status">{lost ? 'This delivery is no longer assigned to you.' : query.isError ? 'Could not load delivery.' : 'Loading delivery…'}</p>{query.isError && !lost && <button type="button" onClick={query.refetch} className={packingSecondary}>Try again</button>}<Link to="/packing?tab=deliveries" className={packingSecondary}><FiArrowLeft aria-hidden="true" />Back to deliveries</Link></div>;
  return <div className="space-y-5">
    <Link to="/packing?tab=deliveries" className="inline-flex min-h-11 items-center gap-2 text-sm text-slate-600"><FiArrowLeft aria-hidden="true" />My deliveries</Link>
    <header><span className={'inline-flex rounded-md px-2 py-1 text-xs font-semibold ring-1 ring-inset ' + deliveryTone(task)}>{deliveryLabel(task)}</span><h1 className="mt-3 break-words text-2xl font-semibold">{task.customerName}</h1><p className="mt-2 text-sm text-slate-500">Carton {packingCartonReference(task)} · Delivery: {task.worker?.name || 'Not assigned'}</p>{task.deliveredAt && <p className="mt-2 text-sm text-emerald-800">Received {packingDate(task.deliveredAt)}</p>}</header>
    {query.isError && <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Could not refresh. These are the last saved details.</p>}
    {task.delivery ? <section aria-label="Recipient and location" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"><div><h2 className="text-xs font-medium text-slate-500">Recipient</h2><p className="mt-1 break-words text-lg font-semibold">{task.delivery.contactName || 'Recipient name not saved'}</p><p className="mt-1 break-all text-sm text-slate-600">{[task.delivery.phoneNumber, task.delivery.secondaryPhoneNumber].filter(Boolean).join(' · ') || 'No phone saved. Contact an admin if needed.'}</p></div><div><h2 className="text-xs font-medium text-slate-500">Address</h2><p className="mt-1 whitespace-pre-wrap break-words leading-7">{task.delivery.address || (task.delivery.googleMapsUrl ? 'Use the saved map location.' : 'No location saved. Ask an admin to add the address or map.')}</p></div><DeliveryContactActions delivery={task.delivery} />{task.delivery.notes && <div className="rounded-xl bg-amber-50 p-3"><h2 className="text-xs font-semibold text-amber-900">Delivery notes</h2><p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-amber-950">{task.delivery.notes}</p></div>}</section> : <p className="text-sm text-slate-500">Recipient details are shown to the assigned delivery worker.</p>}
    {task.items.length > 0 && <details className="rounded-2xl border border-slate-200 bg-white p-4"><summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold"><FiPackage aria-hidden="true" />Order contents · {task.items.reduce((sum, item) => sum + item.qty, 0)} units</summary><ul className="mt-2 divide-y divide-slate-100">{task.items.map((item, index) => <li key={item.sku + index} className="flex justify-between gap-4 py-3 text-sm"><span className="min-w-0 break-words"><strong>{item.sku}</strong>{item.name && <span className="mt-1 block text-slate-500">{item.name}</span>}</span><strong className="shrink-0 tabular-nums">{item.qty}</strong></li>)}</ul></details>}
    <div className="sticky bottom-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur"><DeliveryControls task={task} onChanged={() => query.refetch()} /></div>
  </div>;
}
