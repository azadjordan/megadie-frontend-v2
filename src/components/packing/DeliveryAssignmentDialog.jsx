import { useRef, useState, useSyncExternalStore } from 'react';
import { useSelector } from 'react-redux';
import { FiRefreshCw, FiUserCheck } from 'react-icons/fi';
import { toast } from 'react-toastify';
import PackingDialog from './PackingDialog';
import { useGetDeliveryTaskQuery, useGetDeliveryWorkersQuery, useAssignDeliveryMutation } from '../../features/packing/deliveryApiSlice';
import { packingPrimary, packingSecondary, packingError, subscribePackingNetwork } from '../../utils/packing';

export default function DeliveryAssignmentDialog({ orderId, onClose }) {
  const admin = useSelector(state => Boolean(state.auth.userInfo?.isAdmin));
  const taskQuery = useGetDeliveryTaskQuery(orderId, { refetchOnMountOrArgChange: true });
  const workers = useGetDeliveryWorkersQuery(orderId, { refetchOnMountOrArgChange: true, skip: !admin });
  const [save, { isLoading }] = useAssignDeliveryMutation();
  const [selected, setSelected] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [reviewedVersion, setReviewedVersion] = useState(null);
  const writing = useRef(false);
  const online = useSyncExternalStore(subscribePackingNetwork, () => navigator.onLine, () => true);
  const task = taskQuery.currentData?.data;
  const lost = [403, 404].includes(taskQuery.error?.status);
  if (reviewedVersion === null && task && !taskQuery.isFetching && !lost) setReviewedVersion(task.version);
  const changed = reviewedVersion !== null && task?.version !== reviewedVersion;
  const mustRefresh = needsRefresh || changed;
  const out = task?.deliveryState === 'out';
  async function reload() {
    setSelected(''); setConfirmed(false);
    const results = await Promise.all([taskQuery.refetch(), workers.refetch()]);
    if (results.some(result => result.error)) setError('Could not refresh. Try again.');
    else { setReviewedVersion(results[0].data.data.version); setNeedsRefresh(false); setError(''); }
  }
  async function submit(event) {
    event.preventDefault();
    if (!admin || writing.current || mustRefresh || reviewedVersion === null || !task?.canAssign || !selected || !navigator.onLine) return;
    writing.current = true; setError('');
    try {
      await save({ orderId, workerId: selected === 'none' ? null : selected, expectedRevision: reviewedVersion, ...(out ? { confirmedHandover: confirmed } : {}) }).unwrap();
      toast.success(selected === 'none' ? 'Delivery assignment removed.' : 'Delivery assigned to ' + (workers.data?.data?.find(worker => worker._id === selected)?.name || 'the selected worker') + '.');
      onClose(true);
    } catch (err) { setNeedsRefresh(true); setConfirmed(false); setError(packingError(err)); }
    finally { writing.current = false; }
  }
  return <PackingDialog title={task?.worker ? 'Change delivery worker' : 'Assign delivery'} onClose={() => onClose(false)} busy={isLoading}>
    {!admin ? <p role="status">Delivery assignments are managed by an admin.</p> : !task || workers.isLoading || lost ? <p role="status">{taskQuery.isError ? 'Delivery is no longer available. Close and refresh your work.' : 'Loading delivery assignment…'}</p> : <form onSubmit={submit} className="space-y-4">
      <div><p className="text-lg font-semibold">{task.customerName}</p><p className="mt-1 text-sm text-slate-500">Current delivery worker: {task.worker?.name || 'Not assigned'}{task.worker?.enabled === false ? ' · access disabled' : ''}</p></div>
      {!task.canAssign ? <p role="status">{out ? 'An admin must handle a change while goods are out.' : 'This delivery assignment is read-only.'}</p> : <>
        <label className="block text-sm font-medium">Delivery worker<select aria-label="Delivery worker" value={selected} onChange={e => setSelected(e.target.value)} disabled={isLoading || needsRefresh || workers.isError} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base"><option value="">Choose a worker</option>{workers.data?.data?.map(worker => <option key={worker._id} value={worker._id}>{worker.name}</option>)}{admin && !out && task.worker && <option value="none">Remove delivery assignment</option>}</select></label>
        {workers.isError && <p role="alert">Could not load workers. Use Check latest assignment to retry.</p>}
        {workers.data?.data?.length === 0 && <p className="text-sm text-amber-900">No worker accounts are enabled. Ask an admin to enable Worker access in Users.</p>}
        <p className="text-sm leading-6 text-slate-500">This changes who is responsible for delivery. Packing and reservations stay saved. The order stays in its current delivery stage.</p>
        {out && <label className="flex items-start gap-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="mt-1 h-5 w-5 shrink-0" />Delivery responsibility has physically transferred to the selected worker.</label>}
        {!mustRefresh && <button className={packingPrimary + ' w-full'} disabled={reviewedVersion === null || !online || isLoading || taskQuery.isFetching || !selected || selected === task.worker?.id || (out && !confirmed)}><FiUserCheck aria-hidden="true" />{isLoading ? 'Saving…' : 'Save delivery assignment'}</button>}
      </>}
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      {!online && <p role="status" className="text-sm text-amber-800">Offline. Reconnect before assigning delivery.</p>}
      {changed && !needsRefresh && <p role="status" className="text-sm text-amber-800">This order changed. Review the latest assignment before saving.</p>}
      {(mustRefresh || workers.isError) && <button type="button" onClick={reload} disabled={isLoading || taskQuery.isFetching} className={packingSecondary}><FiRefreshCw aria-hidden="true" />Check latest assignment</button>}
    </form>}
  </PackingDialog>;
}
