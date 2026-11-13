import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Link } from "react-router-dom";
import { FiArrowLeft, FiCheck, FiCheckCircle, FiMapPin, FiPhone, FiRefreshCw, FiTruck } from "react-icons/fi";
import { useGetPackingOrderQuery, useSavePackingMutation } from "../../features/packing/packingApiSlice";
import { packingQuantity, packingError, needsPackingRefresh, packingTaskLabel, packingProgressLabel, packingDate, packingPrimary, packingSecondary, packingPhoneLink } from "../../utils/packing";
import PackingDialog from "./PackingDialog";
import AdminPackingStockReports from '../admin/AdminPackingStockReports';

const textButton = "inline-flex min-h-11 items-center text-sm font-medium text-slate-600 underline underline-offset-4 disabled:opacity-50";
const isReadyToPick = row => row.qty > row.pickedQty && !row.problemQty && row.canPick !== false && Boolean(row.slotId && row.slot !== 'Unknown slot');
const subscribeNetwork = callback => {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => { window.removeEventListener("online", callback); window.removeEventListener("offline", callback); };
};

function DeliveryContact({ delivery }) {
  const phones = [
    { number: delivery.phoneNumber, backup: false },
    { number: delivery.secondaryPhoneNumber, backup: true },
  ].filter(({ number }, index, all) => number && all.findIndex(phone => phone.number === number) === index);
  return <div className="space-y-2">
    <p className="text-xs font-medium text-slate-500">Delivery contact</p>
    {delivery.contactName && <p className="break-words font-semibold text-slate-900">{delivery.contactName}</p>}
    {phones.length > 0 ? <div className="flex flex-wrap gap-2">{phones.map(({ number, backup }) => packingPhoneLink(number)
      ? <a key={number} href={packingPhoneLink(number)} className={packingSecondary}><FiPhone className="shrink-0" aria-hidden="true" /><span className="break-all">{backup ? 'Call backup: ' : 'Call '}{number}</span></a>
      : <p key={number} className="break-all text-slate-700">{backup ? 'Backup: ' : ''}{number}</p>)}</div>
      : <p className="text-xs text-slate-500">No contact number saved. Ask an admin if you need help reaching the recipient.</p>}
  </div>;
}

function OrderUpdateNotice({ task }) {
  const changes = task.itemsChanges || [];
  return <div role="status" className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-950">
    <p className="font-semibold">Order updated by {task.itemsChangedBy || 'an admin'} · {packingDate(task.itemsChangedAt)}</p>
    {changes.length > 0 && <ul className="mt-2 space-y-2">{changes.slice(0, 6).map(change => {
      const complete = task.items.find(item => item.productId === change.productId)?.pickedQty === change.toQty;
      return <li key={change.productId} className="break-words"><strong>{change.sku}</strong>: {change.toQty === 0 ? 'Item removed from this order.' : change.fromQty === 0 ? 'Item added · ' + packingQuantity(change.toQty, change.unit) + '.' : 'Order quantity changed from ' + change.fromQty + ' to ' + packingQuantity(change.toQty, change.unit) + '.'}{change.toQty > 0 && complete ? ' This item is complete.' : ''}</li>;
    })}</ul>}
    {changes.length > 6 && <p className="mt-2">{changes.length - 6} other items changed.</p>}
    <p className="mt-2">Review the revised items and quantities before continuing.</p>
  </div>;
}

export default function PackingTask({ orderId, admin = false, onAssignment }) {
  const [panel, setPanel] = useState(null);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [pending, setPending] = useState(null);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [lostAccess, setLostAccess] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [assist, setAssist] = useState(false);
  const [nextLocation, setNextLocation] = useState(null);
  const locationElements = useRef(new Map());
  const navigationDone = useRef(null);
  const nextStepElement = useRef(null);
  const finishButton = useRef(null);
  const writing = useRef(false);
  const [save, { isLoading: saving }] = useSavePackingMutation();
  const editingPanel = panel && !panel.saved;
  const query = useGetPackingOrderQuery(orderId, { refetchOnMountOrArgChange: true, refetchOnReconnect: true, refetchOnFocus: !editingPanel, pollingInterval: editingPanel ? 0 : 15000, skipPollingIfUnfocused: true });
  const task = query.currentData?.data;
  const accessError = [403, 404].includes(query.error?.status);
  const online = useSyncExternalStore(subscribeNetwork, () => navigator.onLine, () => true);
  const offline = !online;
  const blocked = saving || needsRefresh || lostAccess || offline;

  useEffect(() => {
    if (panel || !nextLocation || navigationDone.current === nextLocation) return;
    const frame = requestAnimationFrame(() => {
      const target = nextLocation.allocationId ? locationElements.current.get(nextLocation.allocationId) : nextLocation.finish ? finishButton.current : nextStepElement.current;
      if (!target) return;
      target.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
      target.focus({ preventScroll: true });
      navigationDone.current = nextLocation;
    });
    return () => cancelAnimationFrame(frame);
  }, [panel, nextLocation, task?.version]);

  function continuePicking(snapshot = task, preferredId = null) {
    if (!snapshot) return;
    const rows = snapshot.items.flatMap(product => product.allocations.map(row => ({ ...row, sku: product.sku, unit: product.unit })));
    const sourceIndex = rows.findIndex(row => row.allocationId === panel?.allocationId);
    const ordered = [...rows.slice(sourceIndex + 1), ...rows.slice(0, sourceIndex + 1)];
    const target = ordered.find(row => row.allocationId === preferredId && isReadyToPick(row)) || ordered.find(isReadyToPick);
    setPanel(null); setDiscard(false);
    setNextLocation(target
      ? { allocationId: target.allocationId, message: 'Next: ' + target.sku + '. Take ' + packingQuantity(target.qty - target.pickedQty, target.unit) + ' from ' + target.slot + '.' }
      : { allocationId: null, finish: snapshot.canPack });
  }

  async function refresh() {
    if (writing.current) return;
    try { await query.refetch().unwrap(); setNeedsRefresh(false); setError(""); }
    catch (err) { setFeedback(null); setError(packingError(err)); if ([403, 404].includes(err.status)) setLostAccess(true); }
  }
  async function write(action, body = {}) {
    if (blocked || writing.current || !task) return null;
    writing.current = true;
    setNextLocation(null);
    setPending({ action, allocationId: body.allocationId, slotId: body.slotId });
    setError(""); setFeedback(null);
    try {
      const result = await save({ orderId, action, expectedRevision: task.version, ...body }).unwrap();
      setFeedback({ allocationId: body.allocationId, message: result.message });
      return result.data;
    } catch (err) {
      setError(packingError(err));
      setFeedback({ allocationId: body.allocationId });
      if (needsPackingRefresh(err)) setNeedsRefresh(true);
      if ([403, 404].includes(err.status)) setLostAccess(true);
      return null;
    } finally { writing.current = false; setPending(null); }
  }
  function openPanel(item, allocation, mode) {
    setError(""); setFeedback(null); setDiscard(false); setNextLocation(null);
    setPanel({ productId: item.productId, allocationId: allocation.allocationId, mode, picked: String(allocation.pickedQty), note: "", returned: false, saved: mode === "problem" && allocation.problemQty > 0 });
  }
  const item = task?.items.find(item => item.productId === panel?.productId);
  const allocation = item?.allocations.find(row => row.allocationId === panel?.allocationId);
  const entered = Number(panel?.picked);
  const reducing = panel?.mode === "edit" && allocation && panel.picked !== "" && Number.isSafeInteger(entered) && entered >= 0 && entered < allocation.pickedQty;
  const panelPicked = panel?.picked !== "" && Number.isSafeInteger(entered) && entered >= 0 && entered <= (allocation?.qty || 0) && !panel?.saved ? entered : allocation?.pickedQty;
  function closePanel() {
    if (saving || writing.current) return;
    if (panel && !panel.saved && (panel.picked !== String(allocation?.pickedQty ?? 0) || panel.note.trim())) { setDiscard(true); return; }
    setPanel(null); setDiscard(false);
  }
  async function savePanel() {
    const pickedQty = Number(panel.picked);
    const min = panel.mode === "problem" ? allocation.pickedQty : 0;
    if (panel.picked === "" || !Number.isSafeInteger(pickedQty) || pickedQty < min || pickedQty > allocation.qty) { setError('Enter a whole-number total between ' + min + ' and ' + allocation.qty + '.'); return; }
    if (reducing && !panel.returned) { setError("Confirm that you put the items back or corrected an earlier wrong count."); return; }
    const action = reducing ? "correct" : panel.mode === "problem" || allocation.problemQty > 0 ? "problem" : "pick";
    const next = await write(action, { allocationId: allocation.allocationId, pickedQty, note: panel.note, ...(reducing ? { confirmedReturn: true } : {}) });
    if (!next) return;
    const row = next.items.find(p => p.productId === panel.productId)?.allocations.find(a => a.allocationId === panel.allocationId);
    if (panel.mode === "problem" && row?.problemQty > 0) setPanel({ ...panel, picked: String(row.pickedQty), note: "", returned: false, saved: true });
    else setPanel(null);
  }
  async function replace(candidate) {
    const qty = Math.min(allocation.problemQty, candidate.availableQty);
    const next = await write("replace", { allocationId: allocation.allocationId, slotId: candidate.slotId, qty });
    if (!next) return;
    const product = next.items.find(p => p.productId === panel.productId);
    const row = product?.allocations.find(a => a.allocationId === panel.allocationId);
    const target = product?.allocations.find(a => a.slotId === candidate.slotId);
    setFeedback({ allocationId: target?.allocationId, message: 'Take ' + packingQuantity(qty, item.unit) + ' from ' + candidate.slot + ', then record them as picked.' });
    if (!row?.problemQty) continuePicking(next, target?.allocationId);
  }
  const refreshBlock = needsRefresh && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><p>Check the latest saved progress before another change.</p><button type="button" onClick={refresh} disabled={saving || query.isFetching} className={packingSecondary + ' mt-2'}>{query.isFetching ? "Checking…" : "Check latest progress"}</button></div>;
  const errorBlock = error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>;

  if (lostAccess || accessError) return <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">This task is no longer available to this account. <Link to={admin ? "/admin/orders" : "/packing"} className="underline">Back to orders</Link></div>;
  if (!task) return <div role="status" className="rounded-2xl border border-slate-200 bg-white p-5 text-sm">{query.isError ? <><p>Could not load packing progress.</p><button type="button" className={packingSecondary + ' mt-3'} onClick={refresh}>Retry</button></> : "Loading packing progress…"}</div>;
  const openTask = task.status === "Shipping" && Boolean(task.sentAt) && !task.packedAt;
  const editable = openTask && (!admin || assist);
  const candidates = item?.alternatives.filter(candidate => candidate.slotId !== allocation?.slotId && candidate.availableQty > 0) || [];
  const left = task.summary.totalItems - task.summary.collectedItems;
  const readyDelivery = task.status === "Shipping" && task.packedAt && task.preparationMode === "prepare_deliver";
  const editItemsHref = '/admin/orders/' + orderId + '?editItems=1&returnTo=packing';
  const hasReadyLocation = task.items.some(product => product.allocations.some(isReadyToPick));
  return <div className="space-y-5">
    <header className="space-y-4">
      {!admin && <Link to="/packing" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-600"><FiArrowLeft aria-hidden="true" />Back to orders</Link>}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0"><p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">{admin ? 'Packing progress' : packingTaskLabel(task.preparationMode)}</p><h1 className="break-words text-2xl font-semibold tracking-tight sm:text-3xl">{task.customerName}</h1><p className="mt-2 break-all text-sm text-slate-500">{task.orderNumber}</p></div>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {admin && (task.editItemsLockReason || blocked
              ? <button type="button" className={packingSecondary} disabled aria-describedby={task.editItemsLockReason ? 'packing-items-lock' : undefined}>Edit order items</button>
              : <Link to={editItemsHref} className={packingSecondary}>Edit order items</Link>)}
            {admin && task.status === "Shipping" && onAssignment && <button type="button" className={packingSecondary} disabled={saving || needsRefresh} onClick={onAssignment}>{task.sentAt ? "Worker assignment" : "Send to worker"}</button>}
            <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm text-slate-500 hover:bg-slate-100 disabled:opacity-50" onClick={refresh} disabled={saving || query.isFetching} aria-label="Refresh"><FiRefreshCw aria-hidden="true" className={query.isFetching ? 'animate-spin' : ''} /><span className="hidden sm:inline">Refresh</span></button>
          </div>
          {admin && task.editItemsLockReason && <p id="packing-items-lock" className="max-w-sm text-xs text-slate-500">{task.editItemsLockReason}</p>}
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3"><p className="text-xs text-slate-500">Carton tag</p><p className="mt-1 break-words text-base font-semibold text-slate-900">{task.label}</p><div className="mt-2 flex flex-wrap items-center justify-between gap-1 border-t border-slate-100 pt-2"><p className="text-sm font-semibold">{packingProgressLabel(task.summary)}</p>{admin ? <p className="text-xs text-slate-500">{(task.worker?.name || 'Unassigned') + ' · ' + packingTaskLabel(task.preparationMode)}</p> : task.summary.inProgressItems > 0 && <p className="text-xs text-slate-500">{task.summary.inProgressItems} partially picked</p>}</div></div>
    </header>
    {!admin && task.status === "Shipping" && !task.packedAt && task.itemsRevision > 0 && <OrderUpdateNotice task={task} />}
    {task.handoverAt && <p className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900">This task was reassigned. Check the existing carton and saved picked quantities before continuing.</p>}
    {task.status !== "Shipping" && <p className="rounded-xl bg-slate-100 p-4 text-sm">Order {task.status.toLowerCase()}. Packing is read-only.</p>}
    {task.problems.length > 0 && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-semibold">Reservations need attention</p>{task.problems.map(problem => <p key={problem} className="mt-1">{problem}</p>)}</div>}
    {query.isError && !accessError && <p role="status" className="text-sm text-amber-900">Could not refresh. The last saved progress is shown.</p>}
    {offline && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">You are offline. Saved progress is shown; reconnect to continue.</p>}
    {!panel && <>{!feedback?.allocationId && errorBlock}{refreshBlock}</>}
    {task.packedAt && <section aria-label="Packing complete" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><div className="flex items-start gap-3"><FiCheckCircle className="mt-0.5 h-6 w-6 shrink-0 text-emerald-700" aria-hidden="true" /><div><h2 className="text-lg font-semibold text-emerald-950">{task.status !== "Shipping" ? 'Packing complete' : readyDelivery ? 'Ready to deliver' : 'Ready for handoff'}</h2><p className="mt-1 text-sm text-emerald-900">{task.status === "Shipping" ? readyDelivery ? 'Use the delivery details below. This order stays here until delivery is confirmed by the admin.' : 'Keep the labelled carton ready for collection.' : 'Saved picking quantities are shown below.'}</p><p className="mt-3 text-xs text-emerald-800">Packed by {task.packedBy} · {packingDate(task.packedAt)}</p>{admin && task.status === "Shipping" && <button type="button" className={packingSecondary + ' mt-3'} disabled={blocked || Boolean(task.reopenLockReason)} title={task.reopenLockReason || undefined} onClick={() => write("reopen")}>{pending?.action === "reopen" ? "Reopening…" : "Reopen packing"}</button>}{admin && task.status === "Shipping" && task.reopenLockReason && <p className="mt-2 text-xs text-emerald-900">{task.reopenLockReason}</p>}</div></div></section>}
    {task.delivery && <details open={Boolean(task.packedAt)} className="rounded-xl border border-slate-200 bg-white px-4 py-2"><summary className="min-h-11 cursor-pointer content-center text-sm font-semibold"><span className="inline-flex items-center gap-2"><FiTruck aria-hidden="true" />Delivery details</span></summary><div className="space-y-4 border-t border-slate-100 py-4 text-sm"><DeliveryContact delivery={task.delivery} /><p className="whitespace-pre-wrap">{task.delivery.address}</p>{task.delivery.googleMapsUrl && <a href={task.delivery.googleMapsUrl} target="_blank" rel="noreferrer" className={packingSecondary}><FiMapPin aria-hidden="true" />Open map</a>}{task.delivery.notes && <p className="whitespace-pre-wrap text-slate-600">{task.delivery.notes}</p>}</div></details>}
    {admin && openTask && <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm text-slate-500">{assist ? 'Record only quantities physically picked or returned.' : 'Monitor progress and resolve reported shortages.'}</p><button type="button" disabled={saving} className={textButton} onClick={() => setAssist(!assist)}>{assist ? 'Done editing' : 'Edit picking progress'}</button></div>}
    {!panel && nextLocation && !nextLocation.finish && (nextLocation.allocationId || (!task.canPack && !hasReadyLocation)) && <p ref={nextStepElement} tabIndex={-1} role="status" className={nextLocation.allocationId ? 'sr-only' : 'rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 focus:outline-none'}>{nextLocation.allocationId ? nextLocation.message : 'No other slots are ready to pick. ' + (task.helpRequestedItems > 0 ? 'Admin help has been requested.' : 'Review the unresolved shortages below.')}{!nextLocation.allocationId && !admin && <> <Link to="/packing" className="font-semibold underline">Choose another order</Link></>}</p>}
    <div className="space-y-4">{task.items.map(product => {
      const complete = product.pickedQty === product.qty;
      return <article key={product.productId} aria-label={product.sku} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-start justify-between gap-3 px-4 py-4 sm:px-5"><div className="min-w-0"><h2 className="break-all text-base font-bold text-slate-900">{product.sku}</h2><p className="mt-1 break-words text-sm text-slate-600">{product.name}</p><p className="mt-2 text-sm text-slate-500">Order quantity: {packingQuantity(product.qty, product.unit)}</p></div>{complete && <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800"><FiCheck aria-hidden="true" />Complete</span>}</div>
        {product.helpRequestedAt && <p className="mx-4 mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"><strong>Admin help requested</strong><span className="mt-1 block">{admin ? 'The worker needs help with this shortage.' : hasReadyLocation ? 'You can pick from the other available slots while this shortage is reviewed.' : 'You can work on another order while this shortage is reviewed.'}</span></p>}
        {task.status === "Shipping" && product.reservedQty !== product.qty && <p className="mx-4 mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Reservations cover {product.reservedQty} of {product.qty}. {admin ? <Link to={'/admin/orders/' + orderId + '?tab=stock'} className="font-semibold underline">Review reservations</Link> : 'Ask an admin to review.'}</p>}
        {product.allocations.map(row => {
          const done = row.pickedQty === row.qty;
          const local = feedback?.allocationId === row.allocationId;
          return <div key={row.allocationId} ref={node => { if (node) locationElements.current.set(row.allocationId, node); else locationElements.current.delete(row.allocationId); }} role="group" aria-label={'Location ' + row.slot + ' for ' + product.sku} tabIndex={-1} className={'scroll-mt-24 border-t border-slate-100 px-4 py-4 focus:outline-none sm:px-5 ' + (done ? 'bg-emerald-50/30' : nextLocation?.allocationId === row.allocationId ? 'bg-indigo-50/40 ring-2 ring-inset ring-indigo-300' : '')}>
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-medium text-slate-500">Location</p><h3 className={'mt-1 text-xl font-bold ' + (done ? 'text-slate-600' : 'text-slate-950')}>{row.slot}</h3></div><div className="text-right"><p className={'text-base font-semibold ' + (done ? 'text-emerald-800' : row.problemQty > 0 ? 'text-amber-800' : 'text-slate-900')}>{done ? 'Collected' : row.problemQty > 0 ? packingQuantity(row.problemQty, product.unit) + ' missing' : (editable ? 'Take ' : 'Remaining ') + packingQuantity(row.qty - row.pickedQty, product.unit)}</p><p className="mt-1 text-sm tabular-nums text-slate-500">Picked {row.pickedQty} of {row.qty}</p></div></div>
            {row.problemQty > 0 && <p className="mt-3 text-xs font-medium text-amber-800">Shortage reported at this slot.</p>}
            {openTask && <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
              {editable && isReadyToPick(row) && <button type="button" disabled={blocked} className={packingPrimary} onClick={() => write("pick", { allocationId: row.allocationId, pickedQty: row.qty })}>{pending?.allocationId === row.allocationId && pending.action === "pick" ? 'Saving…' : row.pickedQty > 0 ? 'Picked remaining ' + (row.qty - row.pickedQty) : 'Picked all ' + row.qty}</button>}
              {!done && (editable || (admin && row.problemQty > 0)) && <button type="button" disabled={blocked} className={packingSecondary} onClick={() => openPanel(product, row, "problem")}>{row.problemQty > 0 ? "Review shortage" : "Not enough here"}</button>}
              {admin && row.problemQty > 0 && !task.editItemsLockReason && <Link to={editItemsHref + '&focusProduct=' + product.productId} className="inline-flex min-h-11 items-center text-sm font-medium text-indigo-700 underline">Edit this item</Link>}
              {admin && row.problemQty > 0 && task.editItemsLockReason && <span className="text-xs text-slate-500">{task.editItemsLockReason}</span>}
              {editable && row.pickedQty > 0 && !row.problemQty && <button type="button" disabled={blocked} className={textButton} onClick={() => openPanel(product, row, "edit")}>Correct count</button>}
            </div>}
            {local && !panel && (error ? errorBlock : feedback.message && <p role="status" className="mt-3 text-sm text-slate-600">{feedback.message}</p>)}
          </div>;
        })}
      </article>;
    })}</div>
    {editable && <footer className={'flex items-center justify-between gap-3 rounded-2xl border bg-white/95 p-4 shadow-lg backdrop-blur ' + (task.canPack ? 'sticky bottom-3 z-20 border-emerald-300' : 'border-slate-200')}><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{task.canPack ? 'All items picked' : left + (left === 1 ? ' product left' : ' products left')}</p><p className="mt-1 text-xs text-slate-500">{task.canPack ? 'Check and pack the order before finishing.' : task.summary.needsHelp ? 'Resolve shortages before finishing.' : 'Finish picking to pack this order.'}</p></div><button ref={finishButton} type="button" disabled={blocked || !task.canPack} className={packingPrimary + ' shrink-0'} onClick={() => write("packed")}>{pending?.action === "packed" ? "Saving…" : "Mark packed"}</button></footer>}
    {admin && <AdminPackingStockReports orderId={orderId} task={task} onRefresh={() => query.refetch().unwrap()} refreshing={query.isFetching} offline={offline} />}
    {panel && <PackingDialog title={panel.mode === "edit" ? allocation?.problemQty > 0 ? "Update picked total" : "Correct count" : "Shortage"} onClose={closePanel} busy={saving}>
      {discard ? <div className="space-y-4"><p>Discard unsaved changes?</p><div className="flex flex-wrap gap-2"><button type="button" className={packingPrimary} onClick={() => setDiscard(false)}>Keep editing</button><button type="button" className={packingSecondary} onClick={() => { setPanel(null); setDiscard(false); }}>Discard changes</button></div></div> : <div className="space-y-5">
        <div><p className="break-all text-sm font-bold">{item?.sku}</p><p className="mt-1 text-sm text-slate-500">{item?.name}</p><p className="mt-2 text-sm">Location <strong>{allocation?.slot || 'changed'}</strong></p></div>
        {errorBlock}{refreshBlock}
        {!allocation ? <><p>This reservation changed. Close this panel and review the latest progress.</p><button type="button" className={packingSecondary} onClick={() => setPanel(null)}>Back to checklist</button></> : <>
          <div><p className="mb-2 text-xs font-medium text-slate-500">Quantity in {item.unit === 'units' ? 'units' : item.unit}</p><dl className="grid grid-cols-3 divide-x divide-slate-200 rounded-xl bg-slate-50 py-3 text-center"><div><dt className="text-xs text-slate-500">Need</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{allocation.qty}</dd></div><div><dt className="text-xs text-slate-500">Picked</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{panelPicked}</dd></div><div><dt className="text-xs text-slate-500">{panel.mode === 'problem' || allocation.problemQty > 0 ? 'Missing' : 'Left to pick'}</dt><dd className={'mt-1 text-xl font-semibold tabular-nums ' + (panel.mode === 'problem' || allocation.problemQty > 0 ? 'text-amber-800' : 'text-slate-700')}>{allocation.qty - panelPicked}</dd></div></dl></div>
          {panel.saved && panel.mode === "problem" && allocation.problemQty === 0 ? <div className="space-y-4"><p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">This slot's shortage is resolved. Review the latest picking list.</p><button type="button" className={packingSecondary + ' w-full'} disabled={saving} onClick={() => setPanel(null)}>Back to checklist</button></div> : panel.saved && panel.mode === "problem" ? <>
            {item.helpRequestedAt
              ? <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"><strong>Admin help requested.</strong> {admin ? 'The worker needs help with this shortage.' : 'Your picked count is saved.'}</p>
              : <p role="status" className="text-sm text-slate-600">Picked quantity and shortage saved.{candidates.length > 0 ? ' Choose another location below.' : ''}</p>}
            <button type="button" className={textButton} disabled={blocked} onClick={() => setPanel({ ...panel, mode: "edit", saved: false, picked: String(allocation.pickedQty) })}>Update picked total</button>
            <div><h3 className="text-sm font-semibold">Other available locations</h3><div className="mt-2 divide-y divide-slate-100">{candidates.length ? candidates.map(candidate => {
              const qty = Math.min(candidate.availableQty, allocation.problemQty);
              return <div key={candidate.slotId} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="text-lg font-bold">{candidate.slot}</p><p className="mt-1 text-xs text-slate-500">{candidate.availableQty} available · Take {qty}</p></div><button type="button" className={packingPrimary} disabled={blocked} onClick={() => replace(candidate)}>{pending?.slotId === candidate.slotId ? 'Saving…' : 'Use ' + candidate.slot + ' for ' + packingQuantity(qty, item.unit)}</button></div>;
            }) : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No available replacement.{admin ? ' Review the shortage with the client.' : ''}</p>}</div></div>
            {!admin && !item.helpRequestedAt && <div className="space-y-2"><p className="text-sm text-slate-500">{candidates.length > 0 ? "Can't use these locations? Ask an admin to review the shortage." : 'Ask an admin to review the shortage.'}</p><button type="button" className={packingSecondary + ' w-full'} disabled={blocked} onClick={() => write('help', { allocationId: allocation.allocationId })}>{pending?.action === 'help' ? 'Requesting help…' : 'Ask admin for help'}</button></div>}
            {feedback?.allocationId && feedback.allocationId !== allocation.allocationId && feedback.message && <p role="status" className="text-sm text-slate-600">{feedback.message}</p>}
            <button type="button" className={packingSecondary + ' w-full'} disabled={blocked} onClick={() => continuePicking()}>Continue picking</button>
          </> : <>
            <div><label className="block text-sm font-semibold">How many have you picked from {allocation.slot} in total?<input type="number" inputMode="numeric" min={panel.mode === "problem" ? allocation.pickedQty : 0} max={allocation.qty} step="1" value={panel.picked} disabled={blocked} onChange={event => setPanel({ ...panel, picked: event.target.value, returned: false })} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-3 py-2 text-lg tabular-nums" /></label><p className="mt-2 text-xs text-slate-500">Already saved: {allocation.pickedQty}. Include earlier picks. Count only goods you have taken from the slot.</p></div>
            {reducing && <label className="flex min-h-11 items-start gap-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-950"><input type="checkbox" className="mt-1 h-5 w-5 shrink-0" checked={panel.returned} disabled={blocked} onChange={event => setPanel({ ...panel, returned: event.target.checked })} /><span>I put {allocation.pickedQty - entered} back in {allocation.slot}, or the earlier count was wrong.</span></label>}
            <label className="block text-sm text-slate-600">Note (optional)<textarea value={panel.note} maxLength={500} rows={2} disabled={blocked} onChange={event => setPanel({ ...panel, note: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-base" /></label>
            <button type="button" className={packingPrimary + ' w-full'} disabled={blocked || (panel.mode === "edit" && panel.picked === String(allocation.pickedQty) && !panel.note.trim())} onClick={savePanel}>{saving ? "Saving…" : panel.mode === "problem" && entered < allocation.qty ? "Save shortage" : "Save picked total"}</button>
          </>}
        </>}
      </div>}
    </PackingDialog>}
  </div>;
}
