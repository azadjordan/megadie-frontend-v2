import { Link } from 'react-router-dom';
import { useGetDeliveryTaskQuery } from '../../features/packing/deliveryApiSlice';
import DeliveryControls from './DeliveryControls';
import { deliveryLabel } from '../../utils/delivery';

export default function DeliveryAssignmentPanel({ orderId }) {
  const query = useGetDeliveryTaskQuery(orderId, { pollingInterval: 15000, skipPollingIfUnfocused: true, refetchOnMountOrArgChange: true });
  const task = query.currentData?.data;
  if ([403, 404].includes(query.error?.status)) return null;
  if (task?.scope === 'recent-work') return <Link to="/packing?tab=recent" className="inline-flex min-h-11 items-center text-sm font-medium text-indigo-700 underline">View your recent work</Link>;
  return <section aria-label="Delivery assignment" className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
    {!task ? <p role="status" className="text-sm text-slate-500">{query.isError ? 'Could not load delivery assignment.' : 'Loading delivery assignment…'}</p> : <>
      <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-sm font-semibold">Delivery · {task.worker?.name || 'Not assigned'}</h2><p className="mt-1 text-xs text-slate-500">{deliveryLabel(task)}{task.worker?.enabled === false ? ' · worker access disabled' : ''}</p></div>{task.delivery && <Link to={'/packing/deliveries/' + orderId} className="inline-flex min-h-11 items-center text-sm font-semibold text-indigo-700 underline">View delivery</Link>}</div>
      <DeliveryControls task={task} onChanged={() => query.refetch()} />
    </>}
    {query.isError && <button type="button" onClick={query.refetch} className="min-h-11 text-sm underline">Refresh delivery assignment</button>}
  </section>;
}
