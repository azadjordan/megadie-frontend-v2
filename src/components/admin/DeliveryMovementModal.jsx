import { useRef, useState } from 'react';
import { FiArchive, FiCheckCircle, FiRefreshCw, FiRotateCcw, FiTruck } from 'react-icons/fi';
import { toast } from 'react-toastify';
import PackingDialog from '../packing/PackingDialog';
import { useGetOrderMovementQuery, useUpdateOrderMovementMutation } from '../../features/orders/ordersApiSlice';

const button = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed';
const events = { departed: 'Out for delivery', delivered: 'Delivered', collected: 'Collected by customer', returned: 'Returned to store', reshelved: 'Returned to original slots' };
const actions = {
  departed: { title: 'Mark out for delivery', text: 'The complete order has left the store with a courier or someone from your team.', Icon: FiTruck },
  delivered: { title: 'Mark delivered', text: 'The customer has received the complete order. This also covers customer collection.', Icon: FiCheckCircle },
  returned: { title: 'Returned to store', text: 'All goods are back in the store. The order stays packed and its reservations stay held.', Icon: FiRotateCcw },
  reshelved: { title: 'Change reserved stock', text: 'Before changing stock or preparation, return every unit to its original slot. Reservations will stay in place.', label: 'Continue', Icon: FiArchive },
};
const time = value => value ? new Date(value).toLocaleString() : '';

export default function DeliveryMovementModal({ open, order, action = 'history', onClose, onSaved }) {
  if (!open || !order?._id) return null;
  return <MovementDialog key={order._id + action} order={order} action={action} onClose={onClose} onSaved={onSaved} />;
}
function MovementDialog({ order, action, onClose, onSaved }) {
  const { data, isFetching, error: readError, refetch } = useGetOrderMovementQuery(order._id, { refetchOnMountOrArgChange: true });
  const [save, { isLoading }] = useUpdateOrderMovementMutation();
  const [handler, setHandler] = useState('');
  const [confirmedReturn, setConfirmedReturn] = useState(false);
  const [error, setError] = useState('');
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const lock = useRef(false);
  const view = data?.data;
  const config = actions[action];
  const historyOnly = action === 'history';
  const closed = view && view.status !== 'Shipping';
  const alreadyReshelved = action === 'reshelved' && view?.movement?.slotsReturnedAt && !view?.holdsGoods && !closed;
  const staleAction = closed || (action === 'departed' && view?.isOut) || (action === 'returned' && !view?.isOut) || (action === 'reshelved' && (!view?.holdsGoods || view?.isOut));
  const reason = !historyOnly && !['returned', 'reshelved'].includes(action) ? view?.readyReason : '';
  async function finish() { if (onSaved) await onSaved(); else onClose(); }
  async function submit(event) {
    event.preventDefault();
    if (!view || lock.current || needsRefresh || isFetching || staleAction) return;
    if (action === 'reshelved' && !confirmedReturn) return;
    lock.current = true; setError('');
    try {
      await save({ id: order._id, expectedRevision: view.version, action,
        ...(action === 'departed' ? { handler: handler.trim() } : {}),
        confirmedReady: true, confirmedReceived: true, confirmedReturn: true }).unwrap();
      toast.success(`${events[action]}.`); await finish();
    } catch (err) {
      setNeedsRefresh(true); setConfirmedReturn(false);
      setError(err?.data?.message || 'Could not confirm the update. Check the latest delivery details before trying again.');
    } finally { lock.current = false; }
  }
  async function reload() {
    setConfirmedReturn(false);
    const result = await refetch();
    if (result.error) setError('Could not load current delivery details. Try again.');
    else { setNeedsRefresh(false); setError(''); }
  }
  return <PackingDialog title={historyOnly ? 'Delivery history' : config.title} onClose={onClose} busy={isLoading}>
    <p className="mb-3 text-sm font-semibold text-slate-700">{order.orderNumber}</p>
    {!view || readError ? <div role="status" className="space-y-3 text-sm"><p>{readError ? 'Could not load delivery details.' : 'Loading delivery details…'}</p>{readError && <button className={button + ' bg-slate-100'} onClick={reload}><FiRefreshCw aria-hidden="true" />Try again</button>}</div> : <>
      {!historyOnly && !staleAction && <form onSubmit={submit} className="space-y-4">
        <p className="text-sm leading-6 text-slate-600">{config.text}</p>
        {action === 'departed' && <label className="block text-sm font-medium">Handed to <span className="font-normal text-slate-500">(optional)</span><input className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" value={handler} onChange={e => setHandler(e.target.value)} maxLength={120} autoComplete="off" disabled={isLoading || needsRefresh} /></label>}
        {view.manualPreparation && ['departed', 'delivered'].includes(action) && <p className="text-xs leading-5 text-slate-500">The complete order must be prepared from its reserved slots.</p>}
        {action === 'reshelved' && <label className="flex min-h-11 items-start gap-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900"><input type="checkbox" className="mt-1 h-4 w-4 shrink-0" checked={confirmedReturn} onChange={e => setConfirmedReturn(e.target.checked)} disabled={isLoading || needsRefresh} />Every unit is physically back in its original slot.</label>}
        {reason && <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{reason}</p>}
        {!needsRefresh && <button type="submit" disabled={isLoading || isFetching || Boolean(reason) || (action === 'reshelved' && !confirmedReturn)} className={button + ' bg-blue-600 text-white hover:bg-blue-700'}><config.Icon aria-hidden="true" />{isLoading ? 'Saving…' : config.label || config.title}</button>}
      </form>}
      {!historyOnly && staleAction && <p role="status" className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{alreadyReshelved ? 'The goods are already recorded back in their original slots.' : view.isOut ? 'This order is already out for delivery.' : closed ? `This order is ${view.status.toLowerCase()}.` : action === 'returned' ? 'This order is already in the store.' : 'Record the return to the store before changing stock.'}</p>}
      {alreadyReshelved && <button type="button" className={button + ' mt-4 bg-blue-600 text-white'} onClick={finish}>Continue</button>}
      {error && <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}
      {needsRefresh && <button type="button" className={button + ' mt-3 bg-slate-100'} onClick={reload} disabled={isFetching}><FiRefreshCw aria-hidden="true" />Check latest delivery</button>}
      {historyOnly && <>{view.history.length ? <ol className="space-y-4">{view.history.map((event, index) => <li key={event._id || index} className="border-l-2 border-slate-200 pl-3 text-sm"><p className="font-medium">{events[event.action]}{event.handler ? ` · ${event.handler}` : ''}</p><p className="text-xs text-slate-500">{time(event.at)} · {event.actorName || 'Admin'}</p>{event.note && <p className="mt-1 whitespace-pre-wrap break-words text-slate-600">{event.note}</p>}</li>)}</ol> : <p className="text-sm text-slate-500">No delivery movements recorded.</p>}</>}
    </>}
  </PackingDialog>;
}
