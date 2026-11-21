import OrderCreatedAt from './OrderCreatedAt';
import { useRef, useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiBox, FiCheckCircle, FiClock, FiRefreshCw, FiTruck } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { useSavePackingMutation } from '../../features/packing/packingApiSlice';
import { packingCartonReference, packingError, packingSecondary, subscribePackingNetwork, workerPrimary } from '../../utils/packing';
import DeliveryControls, { DeliveryContactActions } from './DeliveryControls';

export default function ActiveWorkCard({ card, refresh, returnTo, onNavigate }) {
  const [save, { isLoading }] = useSavePackingMutation();
  const [error, setError] = useState('');
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const writing = useRef(false);
  const online = useSyncExternalStore(subscribePackingNetwork, () => navigator.onLine, () => true);
  const waiting = card.group === 'waiting';
  const packing = card.kind === 'packing';
  const href = '/packing/' + (card.kind === 'delivery' ? 'deliveries/' : 'orders/') + card.orderId;
  const linkProps = { to: href, state: { workReturnTo: returnTo }, onClick: onNavigate };
  const Icon = waiting ? FiClock : packing ? FiBox : FiTruck;
  const label = packing ? 'Packing' : card.kind === 'handoff' ? 'Collection' : card.deliveryState === 'out' ? 'Out for delivery' : 'Delivery';
  async function markPacked() {
    if (writing.current || !online || needsRefresh || card.nextAction !== 'packed') return;
    writing.current = true; setError('');
    try {
      await save({ orderId: card.orderId, action: 'packed', expectedRevision: card.version }).unwrap();
      toast.success('Packing complete.');
    } catch (err) { setError(packingError(err)); setNeedsRefresh(true); }
    finally { writing.current = false; }
  }
  async function checkLatest() {
    const result = await refresh();
    if (result.error) setError('Could not refresh. Check your connection and try again.');
    else { setNeedsRefresh(false); setError(''); }
  }
  return <article aria-label={card.customerName + ', carton ' + packingCartonReference(card)} className={'flex flex-col rounded-2xl border border-slate-200 bg-white ' + (waiting ? 'p-4' : 'p-5 shadow-sm')}>
    <p className={'flex items-center gap-2 text-xs font-semibold ' + (waiting ? 'text-slate-500' : 'text-indigo-700')}><Icon aria-hidden="true" className="h-4 w-4" />{label}</p>
    <h3 className={'mt-3 break-words font-semibold leading-snug text-slate-950 ' + (waiting ? 'text-lg' : 'text-xl')}>{card.customerName}</h3>
    <p className="mt-1 break-words text-xs text-slate-500">Carton {packingCartonReference(card)}</p><OrderCreatedAt value={card.createdAt} />
    {!waiting && <div className="mt-4">
      {packing && card.summary ? <><p className="text-lg font-semibold tabular-nums">{card.summary.pickedUnits} of {card.summary.totalUnits} units collected</p><div role="progressbar" aria-label="Units collected" aria-valuemin={0} aria-valuemax={card.summary.totalUnits} aria-valuenow={card.summary.pickedUnits} className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${card.summary.totalUnits ? Math.min(100, 100 * card.summary.pickedUnits / card.summary.totalUnits) : 0}%` }} /></div><p className="mt-2 text-xs text-slate-500">{card.summary.totalItems} {card.summary.totalItems === 1 ? 'product' : 'products'}</p></>
        : <p className="text-sm text-slate-500">{card.totalItems} {card.totalItems === 1 ? 'product' : 'products'} · {card.totalUnits} units</p>}
    </div>}
    <p className={'mt-3 text-sm leading-6 ' + (card.needsHelp ? 'text-amber-800' : 'text-slate-600')}>{card.message}</p>
    {!waiting && card.kind === 'delivery' && card.delivery && <div className="mt-3"><p className="line-clamp-2 break-words text-sm leading-6 text-slate-600">{card.delivery.address || 'Saved map location'}</p><div className="mt-3"><DeliveryContactActions delivery={card.delivery} /></div></div>}
    <div className={waiting ? 'mt-2' : 'mt-auto pt-5'}>
      {waiting ? <Link {...linkProps} className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-indigo-700">View details<FiArrowRight aria-hidden="true" /></Link>
        : packing ? <div className="flex flex-wrap items-center gap-x-4 gap-y-2">{card.nextAction === 'packed' ? <><button type="button" className={workerPrimary} disabled={isLoading || !online || needsRefresh} onClick={markPacked}><FiCheckCircle aria-hidden="true" />{isLoading ? 'Saving…' : 'Mark packed'}</button><Link {...linkProps} className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-indigo-700">Review items<FiArrowRight aria-hidden="true" /></Link></>
          : <Link {...linkProps} className={workerPrimary + ' w-full'}>{card.nextAction === 'start_packing' ? 'Start packing' : 'Continue packing'}<FiArrowRight aria-hidden="true" /></Link>}</div>
          : <><DeliveryControls task={card} onChanged={refresh} showStatus={false} /><Link {...linkProps} className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-indigo-700">View delivery<FiArrowRight aria-hidden="true" /></Link></>}
    </div>
    {error && <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}
    {needsRefresh && <button type="button" className={packingSecondary + ' mt-3'} disabled={isLoading || !online} onClick={checkLatest}><FiRefreshCw aria-hidden="true" />Check latest progress</button>}
  </article>;
}
