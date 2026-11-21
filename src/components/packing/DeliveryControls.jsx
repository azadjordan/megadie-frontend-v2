import { useRef, useState, useSyncExternalStore } from 'react';
import { useSelector } from 'react-redux';
import { FiCheckCircle, FiEdit3, FiMapPin, FiMoreHorizontal, FiPhone, FiRefreshCw, FiRotateCcw, FiTruck, FiUserCheck } from 'react-icons/fi';
import { toast } from 'react-toastify';
import PackingDialog from './PackingDialog';
import DeliveryAssignmentDialog from './DeliveryAssignmentDialog';
import { useGetDeliveryTaskQuery, useMoveDeliveryMutation } from '../../features/packing/deliveryApiSlice';
import { packingPrimary as adminPrimary, workerPrimary, packingSecondary, packingPhoneLink, packingError, subscribePackingNetwork } from '../../utils/packing';
import { deliveryMapAction } from '../../utils/delivery';

export function DeliveryContactActions({ delivery }) {
  const map = deliveryMapAction(delivery);
  const phones = [...new Set([delivery?.phoneNumber, delivery?.secondaryPhoneNumber].filter(Boolean))];
  return <div className="flex flex-wrap gap-2">
    {map && <a href={map.href} target="_blank" rel="noopener noreferrer" className={packingSecondary}><FiMapPin aria-hidden="true" />{map.label}</a>}
    {phones.map((phone, index) => packingPhoneLink(phone) ? <a key={phone} href={packingPhoneLink(phone)} className={packingSecondary}><FiPhone aria-hidden="true" />{index ? 'Call backup' : 'Call recipient'}</a> : <span key={phone} className="break-all text-sm">{phone}</span>)}
  </div>;
}

export default function DeliveryControls({ task, onChanged, showStatus = true }) {
  const isAdmin = useSelector(state => Boolean(state.auth.userInfo?.isAdmin));
  const packingPrimary = isAdmin ? adminPrimary : workerPrimary;
  const [action, setAction] = useState(null);
  const [assigning, setAssigning] = useState(false);
  const online = useSyncExternalStore(subscribePackingNetwork, () => navigator.onLine, () => true);
  const next = task.canDepart ? 'departed' : task.canDeliver ? 'delivered' : null;
  const changed = () => { setAction(null); setAssigning(false); onChanged?.(); };
  return <div className="space-y-3">
    <div className="flex flex-wrap items-center gap-2">
      {next && <button type="button" className={packingPrimary} disabled={!online} onClick={() => setAction(next)}>{next === 'departed' ? <FiTruck aria-hidden="true" /> : <FiCheckCircle aria-hidden="true" />}{next === 'departed' ? 'Mark out for delivery' : 'Mark delivered'}</button>}
      {isAdmin && task.canAssign && <button type="button" className={packingSecondary} disabled={!online} onClick={() => setAssigning(true)}><FiUserCheck aria-hidden="true" />{task.worker ? 'Change delivery worker' : 'Assign delivery'}</button>}
      {(task.canReturn || task.canCorrect) && <details className="relative"><summary className={packingSecondary + ' cursor-pointer list-none'}><FiMoreHorizontal aria-hidden="true" />More</summary><div className="absolute bottom-full right-0 z-30 mb-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">{task.canReturn && <button type="button" className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm hover:bg-slate-50" disabled={!online} onClick={() => setAction('returned')}><FiRotateCcw aria-hidden="true" />Returned to store</button>}{task.canCorrect && <button type="button" className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm hover:bg-slate-50" disabled={!online} onClick={() => setAction('corrected')}><FiEdit3 aria-hidden="true" />Correct recorded status</button>}</div></details>}
    </div>
    {showStatus && task.readyReason && (isAdmin || task.worker) && <p role="status" className="text-sm text-amber-800">{task.readyReason}</p>}
    {showStatus && !online && <p role="status" className="text-sm text-amber-800">Offline. Reconnect before updating delivery.</p>}
    {isAdmin && assigning && <DeliveryAssignmentDialog orderId={task.orderId} onClose={saved => saved ? changed() : setAssigning(false)} />}
    {action && <DeliveryEventDialog orderId={task.orderId} action={action} onClose={() => setAction(null)} onSaved={changed} />}
  </div>;
}

const events = {
  departed: { label: 'Mark out for delivery', text: 'The complete packed order has physically left the store.', done: 'Out for delivery recorded.', permission: 'canDepart', Icon: FiTruck },
  delivered: { label: 'Mark delivered', text: 'The customer has received the complete order.', done: 'Order delivered.', permission: 'canDeliver', Icon: FiCheckCircle },
  returned: { label: 'Returned to store', text: 'The complete order is physically back in the store. It stays packed and reserved.', done: 'Return to store recorded.', permission: 'canReturn', Icon: FiRotateCcw },
  corrected: { label: 'Correct recorded status', text: '', done: 'Delivery status corrected. Packing and stock records retained.', permission: 'canCorrect', Icon: FiEdit3 },
};
function DeliveryEventDialog({ orderId, action, onClose, onSaved }) {
  const isAdmin = useSelector(state => Boolean(state.auth.userInfo?.isAdmin));
  const packingPrimary = isAdmin ? adminPrimary : workerPrimary;
  const query = useGetDeliveryTaskQuery(orderId, { refetchOnMountOrArgChange: true });
  const [save, { isLoading }] = useMoveDeliveryMutation();
  const [error, setError] = useState('');
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [reviewedVersion, setReviewedVersion] = useState(null);
  const [note, setNote] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const writing = useRef(false);
  const online = useSyncExternalStore(subscribePackingNetwork, () => navigator.onLine, () => true);
  const task = query.currentData?.data, config = events[action];
  if (reviewedVersion === null && task && !query.isFetching && !query.isError) setReviewedVersion(task.version);
  const changed = reviewedVersion !== null && task?.version !== reviewedVersion;
  const mustRefresh = needsRefresh || changed;
  const allowed = task?.[config.permission];
  async function submit(event) {
    event.preventDefault();
    if (!allowed || reviewedVersion === null || query.isFetching || writing.current || mustRefresh || !online || (action === 'corrected' && (!confirmed || !note.trim()))) return;
    writing.current = true; setError('');
    try {
      await save({ orderId, action, expectedRevision: reviewedVersion, confirmedReady: true, confirmedReceived: true, confirmedReturn: true,
        ...(action === 'corrected' ? { confirmedCorrection: confirmed, note: note.trim() } : {}) }).unwrap();
      toast.success(config.done); onSaved();
    } catch (err) { setError(packingError(err)); setNeedsRefresh(true); setConfirmed(false); }
    finally { writing.current = false; }
  }
  async function refresh() {
    const result = await query.refetch();
    if (result.error) setError('Could not check delivery. Try again.');
    else { setReviewedVersion(result.data.data.version); setNeedsRefresh(false); setConfirmed(false); setError(''); }
  }
  const correctionText = task?.status === 'Delivered' ? 'Customer receipt was recorded by mistake. This restores the previous delivery stage; it does not return goods to shelves or change the invoice.' : 'Departure was recorded by mistake. The complete packed order is still in the store.';
  return <PackingDialog title={config.label} onClose={onClose} busy={isLoading}>
    {!task || query.isError ? <div className="space-y-3"><p role="status">{query.isError ? 'Delivery is no longer available or could not be loaded.' : 'Checking delivery…'}</p><button type="button" className={packingSecondary} onClick={refresh}>Check latest delivery</button></div> : <form onSubmit={submit} className="space-y-4">
      <div><p className="text-lg font-semibold">{task.customerName}</p><p className="mt-1 text-sm text-slate-500">{task.orderNumber}</p></div>
      {!allowed ? <><p role="status">{task.status === 'Delivered' ? 'This order is already delivered.' : action === 'departed' && task.deliveryState === 'out' ? 'This order is already out for delivery.' : task.readyReason || 'This action is no longer available. Review the latest delivery.'}</p><button type="button" className={packingSecondary} onClick={onSaved}>Back to delivery</button></> : <>
        <p className="text-sm leading-6 text-slate-600">{action === 'corrected' ? correctionText : config.text}</p>
        {action === 'delivered' && <p className="text-sm leading-6 text-amber-900">If any items were not received or the delivery was refused, contact an admin before confirming.</p>}
        {action === 'corrected' && <><label className="block text-sm font-medium">Reason<textarea maxLength={500} rows={2} value={note} disabled={isLoading || needsRefresh} onChange={e => setNote(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-base" /></label><label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={confirmed} disabled={isLoading || needsRefresh} onChange={e => setConfirmed(e.target.checked)} className="mt-1 h-5 w-5 shrink-0" />This event was recorded by mistake, and the correction matches the physical situation.</label></>}
        {!mustRefresh && <button className={packingPrimary + ' w-full'} disabled={reviewedVersion === null || isLoading || query.isFetching || !online || (action === 'corrected' && (!confirmed || !note.trim()))}><config.Icon aria-hidden="true" />{isLoading ? 'Saving…' : config.label}</button>}
      </>}
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      {!online && <p role="status" className="text-sm text-amber-800">Offline. Reconnect before confirming delivery.</p>}
      {query.isFetching && !needsRefresh && <p role="status" className="text-sm text-slate-500">Checking latest delivery…</p>}
      {changed && !needsRefresh && <p role="status" className="text-sm text-amber-800">This order changed. Check the latest delivery before confirming.</p>}
      {mustRefresh && <button type="button" className={packingSecondary} onClick={refresh} disabled={query.isFetching}><FiRefreshCw aria-hidden="true" />Check latest delivery</button>}
    </form>}
  </PackingDialog>;
}
