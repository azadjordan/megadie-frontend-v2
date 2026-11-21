import OrderCreatedAt from './OrderCreatedAt';
import { Link, useLocation } from 'react-router-dom';
import { FiArrowRight, FiBox, FiCheckCircle, FiRefreshCw } from 'react-icons/fi';
import { useGetDeliveryTaskQuery } from '../../features/packing/deliveryApiSlice';
import { packingCartonReference, packingQuantity, packingSecondary, workerPrimary, workerReturnTo } from '../../utils/packing';
import { CompletedWorkSummary } from './RecentWork';
import WorkerBackLink from './WorkerBackLink';

export default function PackingHandoff({ task, refetch }) {
  const location = useLocation();
  const query = useGetDeliveryTaskQuery(task.orderId, { pollingInterval: 15000, skipPollingIfUnfocused: true, refetchOnFocus: true, refetchOnReconnect: true, refetchOnMountOrArgChange: true });
  const denied = [403, 404].includes(query.error?.status);
  const delivery = !denied && query.currentData?.data;
  if (delivery?.scope === 'recent-work') return <CompletedWorkSummary task={delivery} refetch={query.refetch} packingFinished={Boolean(delivery.packedAt && !delivery.deliveredAt)} />;
  const message = delivery?.deliveryState === 'out' ? 'The carton is out for delivery.' : delivery?.delivery
    ? delivery.readyReason || 'Your next job is to deliver this order.' : delivery?.worker?.enabled === false
      ? 'Ask an admin to review collection.' : delivery?.worker ? `Waiting for ${delivery.worker.name} to collect.` : 'Keep the carton ready for collection.';
  return <div className="space-y-5">
    <WorkerBackLink />
    {denied ? <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">This assignment changed. Return to active work for your current jobs.</p> : <>
      <header><p className="flex items-center gap-2 text-sm font-semibold text-emerald-700"><FiCheckCircle aria-hidden="true" />Packing complete</p><h1 className="mt-3 break-words text-2xl font-semibold">{task.customerName}</h1><p className="mt-2 text-sm text-slate-500">Carton {packingCartonReference(task)}</p><OrderCreatedAt value={task.createdAt} /></header>
      <section aria-label="Next step" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"><p className="text-base leading-7 text-slate-700">{delivery ? message : query.isError ? 'Could not check the collection arrangements. Try Refresh.' : 'Checking the next step…'}</p>{delivery?.delivery && <Link to={'/packing/deliveries/' + task.orderId} state={{ workReturnTo: workerReturnTo(location) }} className={delivery.canDepart || delivery.canDeliver ? workerPrimary : packingSecondary}>{delivery.canDepart || delivery.canDeliver ? 'Continue to delivery' : 'View delivery details'}<FiArrowRight aria-hidden="true" /></Link>}</section>
      <details className="rounded-2xl border border-slate-200 bg-white p-4"><summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700"><FiBox aria-hidden="true" />Packed contents · {task.totalItems} {task.totalItems === 1 ? 'product' : 'products'} · {task.totalUnits} {task.totalUnits === 1 ? 'unit' : 'units'}</summary><ul className="mt-2 divide-y divide-slate-100">{task.items.map((item, index) => <li key={item.sku + index} className="flex items-start justify-between gap-3 py-3 text-sm"><div className="min-w-0 break-words"><p className="font-medium">{item.name || item.sku}</p><p className="mt-1 text-xs text-slate-500">{item.sku}</p></div><span className="max-w-[45%] text-right font-semibold">{packingQuantity(item.qty, item.unit)}</span></li>)}</ul></details>
    </>}
    <button type="button" onClick={() => { query.refetch(); refetch?.(); }} disabled={query.isFetching} className={packingSecondary}><FiRefreshCw aria-hidden="true" />Refresh</button>
  </div>;
}
