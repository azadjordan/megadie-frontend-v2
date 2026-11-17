import { orderListParams, orderDestination } from '../../utils/adminOrderListState';
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Link, useLocation } from "react-router-dom";
import { FiAlertCircle, FiArrowLeft, FiArrowRight, FiCheck, FiEdit3, FiCheckCircle, FiRefreshCw } from "react-icons/fi";
import { useGetPackingOrderQuery, useSavePackingMutation } from "../../features/packing/packingApiSlice";
import { packingQuantity, packingError, needsPackingRefresh, packingTaskLabel, packingProgressLabel, packingUnitProgressLabel, packingCartonReference, packingDate, packingPrimary, packingSecondary } from "../../utils/packing";
import PackingDialog from "./PackingDialog";
import DeliveryAssignmentPanel from './DeliveryAssignmentPanel';
import AdminPackingStockReports from '../admin/AdminPackingStockReports';

const textButton = "inline-flex min-h-11 items-center text-sm font-medium text-slate-600 underline underline-offset-4 disabled:opacity-50";
const isReadyToPick = row => row.qty > row.pickedQty && !row.problemQty && row.canPick !== false && Boolean(row.slotId && row.slot !== 'Unknown slot');
const subscribeNetwork = callback => {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => { window.removeEventListener("online", callback); window.removeEventListener("offline", callback); };
};

function PackingNote({ value, onChange, disabled }) {
  return <details><summary className="min-h-11 cursor-pointer content-center text-sm text-slate-500">Add a note</summary><label className="block text-sm text-slate-600">Note (optional)<textarea value={value} maxLength={500} rows={2} disabled={disabled} onChange={event => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-base" /></label></details>;
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
  const listSearch = orderListParams(useLocation().search).toString();
  const [panel, setPanel] = useState(null);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [pending, setPending] = useState(null);
  const [handlingShortage, setHandlingShortage] = useState(false);
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
  const shortageWork = useRef(false);
  const [save, { isLoading: saving }] = useSavePackingMutation();
  const editingPanel = panel && !panel.saved;
  const query = useGetPackingOrderQuery(orderId, { refetchOnMountOrArgChange: true, refetchOnReconnect: true, refetchOnFocus: !editingPanel, pollingInterval: editingPanel ? 0 : 15000, skipPollingIfUnfocused: true });
  const task = query.currentData?.data;
  const accessError = [403, 404].includes(query.error?.status);
  const online = useSyncExternalStore(subscribeNetwork, () => navigator.onLine, () => true);
  const offline = !online;
  const blocked = handlingShortage || saving || needsRefresh || lostAccess || offline;

  useEffect(() => {
    if (panel || !nextLocation || navigationDone.current === nextLocation) return;
    const frame = requestAnimationFrame(() => {
      const target = nextLocation.allocationId ? locationElements.current.get(nextLocation.allocationId) : nextLocation.finish ? finishButton.current : nextStepElement.current;
      if (!target) return;
      if (nextLocation.navigate) target.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
      target.focus({ preventScroll: true });
      navigationDone.current = nextLocation;
    });
    return () => cancelAnimationFrame(frame);
  }, [panel, nextLocation, task?.version]);

  function continuePicking(snapshot = task, preferredId = null, sourceId = panel?.allocationId, navigate = true) {
    if (!snapshot) return;
    const rows = snapshot.items.flatMap(product => product.allocations.map(row => ({ ...row, sku: product.sku, unit: product.unit })));
    const sourceIndex = rows.findIndex(row => row.allocationId === sourceId);
    const ordered = [...rows.slice(sourceIndex + 1), ...rows.slice(0, sourceIndex + 1)];
    const target = ordered.find(row => row.allocationId === preferredId && isReadyToPick(row)) || ordered.find(isReadyToPick);
    setPanel(null); setDiscard(false);
    setNextLocation(target
      ? { allocationId: target.allocationId, navigate, message: 'Next: ' + target.sku + '. Take ' + packingQuantity(target.qty - target.pickedQty, target.unit) + ' from ' + target.slot + '.' }
      : { allocationId: null, navigate, finish: snapshot.canPack });
  }

  async function refresh() {
    if (writing.current || shortageWork.current) return;
    try {
      const result = await query.refetch().unwrap();
      setNeedsRefresh(false); setError('');
      if (panel) {
        const row = result.data.items.find(p => p.productId === panel.productId)?.allocations.find(r => r.allocationId === panel.allocationId);
        if (row) setPanel({ ...panel, basePicked: row.pickedQty, baseQty: row.qty, version: result.data.version, picked: String(row.pickedQty), taken: '', returned: false, saved: panel.mode === 'problem' && (row.problemQty > 0 || row.pickedQty === row.qty) });
      }
    }
    catch (err) { setFeedback(null); setError(packingError(err)); if ([403, 404].includes(err.status)) setLostAccess(true); }
  }
  async function write(action, body = {}, snapshot = task) {
    if (saving || needsRefresh || lostAccess || offline || writing.current || !snapshot) return null;
    writing.current = true;
    setNextLocation(null);
    setPending({ action, allocationId: body.allocationId, slotId: body.slotId });
    setError(""); setFeedback(null);
    try {
      const result = await save({ orderId, action, expectedRevision: snapshot.version, ...body }).unwrap();
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
    setPanel({ productId: item.productId, allocationId: allocation.allocationId, mode, picked: String(allocation.pickedQty), taken: "", basePicked: allocation.pickedQty, baseQty: allocation.qty, version: task.version, note: "", returned: false, saved: mode === "problem" && allocation.problemQty > 0 });
  }
  const item = task?.items.find(item => item.productId === panel?.productId);
  const allocation = item?.allocations.find(row => row.allocationId === panel?.allocationId);
  const entered = Number(panel?.picked);
  const taken = Number(panel?.taken);
  const draftValid = panel?.taken !== '' && Number.isSafeInteger(taken) && taken >= 0 && taken <= Math.max(0, (panel?.baseQty || 0) - (panel?.basePicked || 0));
  const reducing = panel?.mode === 'edit' && allocation && panel.picked !== '' && Number.isSafeInteger(entered) && entered >= 0 && entered < allocation.pickedQty;
  const panelPicked = panel?.mode === 'problem'
    ? panel.saved ? allocation?.pickedQty : draftValid ? panel.basePicked + taken : panel.basePicked
    : panel?.picked !== '' && Number.isSafeInteger(entered) && entered >= 0 && entered <= (allocation?.qty || 0) ? entered : allocation?.pickedQty;
  const panelMissing = Math.max(0, (allocation?.qty || 0) - (panelPicked || 0));
  function closePanel() {
    if (saving || writing.current || shortageWork.current) return;
    if (panel && !panel.saved && ((panel.mode === 'problem' ? panel.taken !== '' : panel.picked !== String(allocation?.pickedQty ?? 0)) || panel.note.trim())) { setDiscard(true); return; }
    setPanel(null); setDiscard(false);
  }
  async function savePanel() {
    const pickedQty = Number(panel.picked);
    const min = panel.mode === "problem" ? allocation.pickedQty : 0;
    if (panel.picked === "" || !Number.isSafeInteger(pickedQty) || pickedQty < min || pickedQty > allocation.qty) { setError('Enter a whole-number total between ' + min + ' and ' + allocation.qty + '.'); return; }
    if (reducing && !panel.returned) { setError("Confirm that you put the items back or corrected an earlier wrong count."); return; }
    const action = reducing ? "correct" : panel.mode === "problem" || allocation.problemQty > 0 ? "problem" : "pick";
    const next = await write(action, { allocationId: allocation.allocationId, pickedQty, note: panel.note, ...(reducing ? { confirmedReturn: true } : {}) }, { ...task, version: panel.version });
    if (!next) return;
    const row = next.items.find(p => p.productId === panel.productId)?.allocations.find(a => a.allocationId === panel.allocationId);
    if (panel.mode === "problem" && row?.problemQty > 0) setPanel({ ...panel, picked: String(row.pickedQty), note: "", returned: false, saved: true });
    else setPanel(null);
  }
  // Persist the physical fact first. An unavailable replacement must never undo
  // goods already taken, and subsequent retries must use the saved absolute total.
  async function recordShortageCount() {
    if (panel.saved) return task;
    if (!draftValid) { setError('Enter how many units you took this time, including 0 if none.'); return null; }
    if (task.version !== panel.version || allocation.pickedQty !== panel.basePicked || allocation.qty !== panel.baseQty) {
      setNeedsRefresh(true); setError('The order changed. Check latest progress before recording this count.'); return null;
    }
    const next = await write('problem', { allocationId: allocation.allocationId, pickedQty: panel.basePicked + taken, note: panel.note });
    if (next) {
      const row = next.items.find(p => p.productId === panel.productId)?.allocations.find(r => r.allocationId === panel.allocationId);
      if (row) setPanel({ ...panel, saved: true, picked: String(row.pickedQty), taken: '', basePicked: row.pickedQty, baseQty: row.qty, version: next.version, note: '', returned: false });
    }
    return next;
  }
  async function resolveShortage(candidate = null, requestHelp = false, continueAfter = false) {
    if (blocked || shortageWork.current || !allocation) return;
    shortageWork.current = true; setHandlingShortage(true);
    try {
      const snapshot = await recordShortageCount();
      if (!snapshot) return;
      const product = snapshot.items.find(p => p.productId === panel.productId);
      const source = product?.allocations.find(r => r.allocationId === panel.allocationId);
      if (!source?.problemQty) { continuePicking(snapshot, null, panel.allocationId); return; }
      if (candidate) {
        const current = product.alternatives.find(c => c.slotId === candidate.slotId);
        const qty = Math.min(source.problemQty, current?.availableQty || 0);
        if (!qty) { setNeedsRefresh(true); setError('Your picked count is saved. This location is no longer available; check the latest locations.'); return; }
        const next = await write('replace', { allocationId: source.allocationId, slotId: candidate.slotId, qty }, snapshot);
        if (!next) return;
        const target = next.items.find(p => p.productId === panel.productId)?.allocations.find(r => r.slotId === candidate.slotId);
        setFeedback({ allocationId: target?.allocationId, message: 'Take ' + packingQuantity(qty, product.unit) + ' from ' + candidate.slot + ', then record them as picked.' });
        continuePicking(next, target?.allocationId, source.allocationId);
      } else {
        const next = requestHelp && !product.helpRequestedAt ? await write('help', { allocationId: source.allocationId }, snapshot) : snapshot;
        if (next && continueAfter) continuePicking(next, null, source.allocationId);
      }
    } finally { shortageWork.current = false; setHandlingShortage(false); }
  }
  async function pickAll(row) {
    const next = await write('pick', { allocationId: row.allocationId, pickedQty: row.qty });
    if (next) continuePicking(next, null, row.allocationId, false);
  }
  const refreshBlock = needsRefresh && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><p>Check the latest saved progress before another change.</p><button type="button" onClick={refresh} disabled={saving || query.isFetching} className={packingSecondary + ' mt-2'}>{query.isFetching ? "Checking…" : "Check latest progress"}</button></div>;
  const errorBlock = error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>;

  if (lostAccess || accessError) return <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">This task is no longer available to this account. <Link to={admin ? "/admin/orders" : "/packing"} className="underline">Back to orders</Link></div>;
  if (!task) return <div role="status" className="rounded-2xl border border-slate-200 bg-white p-5 text-sm">{query.isError ? <><p>Could not load packing progress.</p><button type="button" className={packingSecondary + ' mt-3'} onClick={refresh}>Retry</button></> : "Loading packing progress…"}</div>;
  const openTask = task.status === "Shipping" && Boolean(task.sentAt) && !task.packedAt;
  const editable = openTask && (!admin || assist);
  const candidates = item?.alternatives.filter(candidate => candidate.slotId !== allocation?.slotId && candidate.availableQty > 0) || [];
  const unitSummary = {
    totalUnits: task.items.reduce((sum, p) => sum + p.qty, 0),
    pickedUnits: task.items.reduce((sum, p) => sum + p.pickedQty, 0),
  };
  const unitsLeft = Math.max(0, unitSummary.totalUnits - unitSummary.pickedUnits);
  const editItemsHref = '/admin/orders/' + orderId + '?editItems=1&returnTo=packing' + (listSearch ? '&' + listSearch : '');
  const hasReadyLocation = task.items.some(product => product.allocations.some(isReadyToPick));
  return <div className="space-y-5">
    <header className="space-y-4">
      {!admin && <Link to="/packing" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-600"><FiArrowLeft aria-hidden="true" />Back to orders</Link>}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0"><p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">{admin ? 'Packing progress' : packingTaskLabel(task.preparationMode)}</p><h1 className="break-words text-2xl font-semibold tracking-tight sm:text-3xl">{task.customerName}</h1><p className="mt-2 break-all text-sm text-slate-500">Carton {packingCartonReference(task)}</p></div>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {admin && (task.editItemsLockReason || blocked
              ? <button type="button" className={packingSecondary} disabled aria-describedby={task.editItemsLockReason ? 'packing-items-lock' : undefined}>Edit order items</button>
              : <Link to={editItemsHref} className={packingSecondary}>Edit order items</Link>)}
            {admin && task.status === "Shipping" && onAssignment && <button type="button" className={packingSecondary} disabled={saving || needsRefresh} onClick={onAssignment}>{task.sentAt ? "Packing worker" : "Send to worker"}</button>}
            <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm text-slate-500 hover:bg-slate-100 disabled:opacity-50" onClick={refresh} disabled={saving || query.isFetching} aria-label="Refresh"><FiRefreshCw aria-hidden="true" className={query.isFetching ? 'animate-spin' : ''} /><span className="hidden sm:inline">Refresh</span></button>
          </div>
          {admin && task.editItemsLockReason && <p id="packing-items-lock" className="max-w-sm text-xs text-slate-500">{task.editItemsLockReason}</p>}
        </div>
      </div>
      <details className="text-sm text-slate-500"><summary className="min-h-11 cursor-pointer content-center">Full carton label</summary><p className="break-words pb-2 font-medium text-slate-700">{task.label}</p></details>
      {admin && <p className="text-sm font-medium text-slate-700">{packingUnitProgressLabel(unitSummary)} / {packingProgressLabel(task.summary)}</p>}
    </header>
    {!admin && task.status === "Shipping" && !task.packedAt && task.itemsRevision > 0 && <OrderUpdateNotice task={task} />}
    {task.handoverAt && <p className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900">This task was reassigned. Check the existing carton and saved picked quantities before continuing.</p>}
    {task.status !== "Shipping" && <p className="rounded-xl bg-slate-100 p-4 text-sm">Order {task.status.toLowerCase()}. Packing is read-only.</p>}
    {task.problems.length > 0 && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-semibold">Reservations need attention</p>{task.problems.map(problem => <p key={problem} className="mt-1">{problem}</p>)}</div>}
    {query.isError && !accessError && <p role="status" className="text-sm text-amber-900">Could not refresh. The last saved progress is shown.</p>}
    {offline && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">You are offline. Saved progress is shown; reconnect to continue.</p>}
    {!panel && <>{!feedback?.allocationId && errorBlock}{refreshBlock}</>}
    {task.packedAt && <section aria-label="Packing complete" className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-start gap-3"><FiCheckCircle className="mt-0.5 h-6 w-6 shrink-0 text-emerald-700" aria-hidden="true" /><div><h2 className="text-lg font-semibold">Packed</h2><p className="mt-2 text-sm text-slate-600">Packed by {task.packedBy} · {packingDate(task.packedAt)}</p>{admin && task.status === 'Shipping' && <button type="button" className={packingSecondary + ' mt-3'} disabled={blocked || Boolean(task.reopenLockReason)} title={task.reopenLockReason || undefined} onClick={() => write('reopen')}>{pending?.action === 'reopen' ? 'Reopening…' : 'Reopen packing'}</button>}{admin && task.reopenLockReason && <p className="mt-2 text-xs text-slate-500">{task.reopenLockReason}</p>}</div></div></section>}
    {(task.packedAt || admin) && <DeliveryAssignmentPanel orderId={orderId} />}
    {admin && openTask && <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm text-slate-500">{assist ? 'Record only quantities physically picked or returned.' : 'Monitor progress and resolve reported shortages.'}</p><button type="button" disabled={saving} className={textButton} onClick={() => setAssist(!assist)}>{assist ? 'Done editing' : 'Edit picking progress'}</button></div>}
    {!panel && nextLocation && !nextLocation.finish && (nextLocation.allocationId || (!task.canPack && !hasReadyLocation)) && <p ref={nextStepElement} tabIndex={-1} role="status" className={nextLocation.allocationId ? 'sr-only' : 'rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 focus:outline-none'}>{nextLocation.allocationId ? nextLocation.message : 'No other slots are ready to pick. ' + (task.helpRequestedItems > 0 ? 'Admin help has been requested.' : 'Review the unresolved shortages below.')}{!nextLocation.allocationId && !admin && <> <Link to="/packing" className="font-semibold underline">Choose another order</Link></>}</p>}
    <div className="space-y-4">{task.items.map(product => {
      const complete = product.pickedQty === product.qty;
      return <article key={product.productId} aria-label={product.sku} className={"overflow-hidden rounded-2xl border bg-white " + (complete ? "border-slate-100" : "border-slate-200")}>
        <div className="flex items-start justify-between gap-3 px-4 py-4 sm:px-5"><div className="min-w-0"><h2 className="break-all text-base font-bold text-slate-900">{product.sku}</h2><p className="mt-1 break-words text-sm text-slate-600">{product.name}</p><p className="mt-2 text-sm text-slate-500">Order quantity: {packingQuantity(product.qty, product.unit)}</p></div>{complete && <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800"><FiCheck aria-hidden="true" />Complete</span>}</div>
        {product.helpRequestedAt && <p className="mx-4 mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"><strong>Admin help requested</strong><span className="mt-1 block">{admin ? 'The worker needs help with this shortage.' : hasReadyLocation ? 'You can pick from the other available slots while this shortage is reviewed.' : 'You can work on another order while this shortage is reviewed.'}</span></p>}
        {task.status === "Shipping" && product.reservedQty !== product.qty && <p className="mx-4 mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Reservations cover {product.reservedQty} of {product.qty}. {admin ? <Link to={orderDestination(orderId, listSearch, { tab: 'stock' })} className="font-semibold underline">Review reservations</Link> : 'Ask an admin to review.'}</p>}
        {product.allocations.map(row => {
          const done = row.pickedQty === row.qty;
          const local = feedback?.allocationId === row.allocationId;
          return <div key={row.allocationId} ref={node => { if (node) locationElements.current.set(row.allocationId, node); else locationElements.current.delete(row.allocationId); }} role="group" aria-label={'Location ' + row.slot + ' for ' + product.sku} tabIndex={-1} className={'scroll-mt-24 border-t border-slate-100 px-4 py-4 focus:outline-none sm:px-5 ' + (done ? 'bg-emerald-50/30' : nextLocation?.allocationId === row.allocationId ? 'bg-indigo-50/40 ring-2 ring-inset ring-indigo-300' : '')}>
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-medium text-slate-500">Location</p><h3 className={'mt-1 text-xl font-bold ' + (done ? 'text-slate-600' : 'text-slate-950')}>{row.slot}</h3></div><div className="text-right"><p className={'text-lg font-semibold ' + (done ? 'text-emerald-800' : row.problemQty > 0 ? 'text-amber-800' : 'text-slate-900')}>{done ? 'Collected' : row.problemQty > 0 ? packingQuantity(row.problemQty, product.unit) + ' missing' : (editable ? 'Take ' : 'Remaining ') + packingQuantity(row.qty - row.pickedQty, product.unit)}</p><p className="mt-1 text-sm tabular-nums text-slate-500">Picked {row.pickedQty} of {row.qty}</p></div></div>
            {row.problemQty > 0 && <p className="mt-3 text-xs font-medium text-amber-800">Shortage reported at this slot.</p>}
            {openTask && <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
              {editable && isReadyToPick(row) && <button type="button" disabled={blocked} className={packingPrimary} onClick={() => pickAll(row)}><FiCheck aria-hidden="true" />{pending?.allocationId === row.allocationId && pending.action === "pick" ? 'Saving…' : row.pickedQty > 0 ? 'Picked remaining ' + (row.qty - row.pickedQty) : 'Picked all ' + row.qty}</button>}
              {!done && (editable || (admin && row.problemQty > 0)) && <button type="button" disabled={blocked} className={packingSecondary} onClick={() => openPanel(product, row, "problem")}><FiAlertCircle aria-hidden="true" />{row.problemQty > 0 ? "Review shortage" : "Not enough here"}</button>}
              {admin && row.problemQty > 0 && !task.editItemsLockReason && <Link to={editItemsHref + '&focusProduct=' + product.productId} className="inline-flex min-h-11 items-center text-sm font-medium text-indigo-700 underline">Edit this item</Link>}
              {admin && row.problemQty > 0 && task.editItemsLockReason && <span className="text-xs text-slate-500">{task.editItemsLockReason}</span>}
              {editable && row.pickedQty > 0 && !row.problemQty && <button type="button" disabled={blocked} className={textButton} onClick={() => openPanel(product, row, "edit")}><FiEdit3 className="mr-2" aria-hidden="true" />Correct count</button>}
            </div>}
            {local && !panel && (error ? errorBlock : feedback.message && <p role="status" className="mt-3 text-sm text-slate-600">{feedback.message}</p>)}
          </div>;
        })}
      </article>;
    })}</div>
    {editable && <footer className="sticky bottom-3 z-20 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1"><div className="flex flex-wrap items-baseline justify-between gap-2"><p className="text-sm font-semibold tabular-nums">{packingUnitProgressLabel(unitSummary)}</p><p className="text-xs tabular-nums text-slate-500">{unitsLeft} remaining</p></div>{task.canPack ? <p className="mt-1 text-xs text-slate-500">All units picked. Pack and label the carton, then finish.</p> : task.helpRequestedItems > 0 && !hasReadyLocation && <p className="mt-1 text-xs text-amber-800">Waiting for admin</p>}</div>
      <button ref={finishButton} type="button" disabled={blocked || !task.canPack} className={packingPrimary + ' shrink-0'} onClick={() => write('packed')}><FiCheckCircle aria-hidden="true" />{pending?.action === 'packed' ? 'Saving...' : 'Mark packed'}</button>
    </footer>}
    {admin && <AdminPackingStockReports orderId={orderId} task={task} onRefresh={() => query.refetch().unwrap()} refreshing={query.isFetching} offline={offline} />}
    {panel && <PackingDialog title={panel.mode === 'edit' ? allocation?.problemQty > 0 ? 'Update picked total' : 'Correct count' : 'Not enough here'} onClose={closePanel} busy={saving || handlingShortage}>
      {discard ? <div className="space-y-4"><p>Discard unsaved changes?</p><div className="flex flex-wrap gap-2"><button type="button" className={packingPrimary} onClick={() => setDiscard(false)}>Keep editing</button><button type="button" className={packingSecondary} onClick={() => { setPanel(null); setDiscard(false); }}>Discard changes</button></div></div> : <div className="space-y-4">
        <div><p className="break-all text-sm font-bold">{item?.sku}</p><p className="mt-1 text-sm text-slate-500">{item?.name}</p><p className="mt-3 text-lg font-semibold">{allocation?.slot || 'Location changed'}</p></div>
        {errorBlock}{refreshBlock}
        {!allocation ? <><p>This reservation changed. Review the latest picking list.</p><button type="button" className={packingSecondary} onClick={() => continuePicking()}>Continue picking</button></> : panel.mode === 'edit' ? <>
          <label className="block text-sm font-semibold">How many have you picked from {allocation.slot} in total?<input type="number" inputMode="numeric" min={0} max={allocation.qty} step="1" value={panel.picked} disabled={blocked} onChange={event => setPanel({ ...panel, picked: event.target.value, returned: false })} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-3 py-2 text-lg tabular-nums" /></label>
          <p className="text-xs text-slate-500">Already recorded: {allocation.pickedQty}. Enter the actual total, including earlier picks.</p>
          {reducing && <label className="flex min-h-11 items-start gap-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-950"><input type="checkbox" className="mt-1 h-5 w-5 shrink-0" checked={panel.returned} disabled={blocked} onChange={event => setPanel({ ...panel, returned: event.target.checked })} /><span>I put {allocation.pickedQty - entered} back in {allocation.slot}, or the earlier count was wrong.</span></label>}
          <PackingNote value={panel.note} disabled={blocked} onChange={note => setPanel({ ...panel, note })} />
          <button type="button" className={packingPrimary + ' w-full'} disabled={blocked || (panel.picked === String(allocation.pickedQty) && !panel.note.trim())} onClick={savePanel}><FiCheck aria-hidden="true" />{saving ? 'Saving…' : 'Save picked total'}</button>
        </> : <>
          {!panel.saved && <>
            <p className="text-sm text-slate-600">Still needed from this slot: <strong>{packingQuantity(allocation.qty - panel.basePicked, item.unit)}</strong></p>
            <label className="block text-sm font-semibold">How many did you take this time?<input type="number" inputMode="numeric" min={0} max={panel.baseQty - panel.basePicked} step="1" value={panel.taken} disabled={blocked} onChange={event => setPanel({ ...panel, taken: event.target.value })} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-3 py-2 text-lg tabular-nums" /></label>
            <p className="text-xs text-slate-500">Already recorded: {panel.basePicked}. Enter only what you took this time, including 0 if none.</p>
            <PackingNote value={panel.note} disabled={blocked} onChange={note => setPanel({ ...panel, note })} />
          </>}
          <p role="status" className="rounded-xl bg-slate-50 p-3 text-sm font-semibold tabular-nums">{panelPicked || 0} picked · {panelMissing} needed from another location</p>
          {panel.saved && allocation.problemQty === 0 ? <><p className="text-sm text-emerald-800">This slot's shortage is resolved. Review the latest picking list.</p><button type="button" className={packingSecondary + ' w-full'} disabled={saving || handlingShortage} onClick={() => continuePicking()}>Back to checklist<FiArrowLeft aria-hidden="true" /></button></> : <>
            {panel.saved && <button type="button" className={textButton} disabled={blocked} onClick={() => setPanel({ ...panel, mode: 'edit', picked: String(allocation.pickedQty), saved: false })}><FiEdit3 className="mr-2" aria-hidden="true" />Update picked total</button>}
            {panelMissing === 0 && !panel.saved ? <button type="button" className={packingPrimary + ' w-full'} disabled={blocked || !draftValid} onClick={() => resolveShortage()}><FiCheck aria-hidden="true" />Confirm picked</button> : <>
              {item.helpRequestedAt && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"><strong>Admin help requested.</strong> {panel.saved ? 'Your picked count is saved.' : 'Record any units you took before continuing.'} {panelMissing} {item.unit === 'units' ? 'units' : item.unit} still needed.</p>}
              <div><p className="text-sm font-semibold">Other available locations</p><div className="mt-1 divide-y divide-slate-100">{candidates.length ? candidates.map(candidate => {
                const qty = Math.min(candidate.availableQty, panelMissing);
                return <div key={candidate.slotId} className="space-y-2 py-3"><div className="flex items-baseline justify-between gap-3"><p className="text-lg font-bold">{candidate.slot}</p><p className="text-xs text-slate-500">{candidate.availableQty} available</p></div>{qty < panelMissing && <p className="text-xs text-amber-800">Take {qty} here · {panelMissing - qty} still needed elsewhere</p>}<button type="button" className={packingPrimary + ' w-full'} disabled={blocked || (!panel.saved && !draftValid)} onClick={() => resolveShortage(candidate)}><FiArrowRight aria-hidden="true" />{handlingShortage && pending?.slotId === candidate.slotId ? 'Saving…' : 'Continue at ' + candidate.slot + ' — ' + packingQuantity(qty, item.unit)}</button></div>;
              }) : <p className="py-3 text-sm text-slate-600">No available replacement.</p>}</div></div>
              {!admin && (!item.helpRequestedAt || !panel.saved) && <button type="button" className={packingSecondary + ' w-full'} disabled={blocked || (!panel.saved && !draftValid)} onClick={() => resolveShortage(null, true, Boolean(item.helpRequestedAt))}><FiAlertCircle aria-hidden="true" />{handlingShortage ? 'Saving…' : item.helpRequestedAt ? 'Continue other items' : 'Ask admin for help'}</button>}
              {admin && !panel.saved && <button type="button" className={packingPrimary + ' w-full'} disabled={blocked || !draftValid} onClick={() => resolveShortage()}>Save picked count</button>}
              {panel.saved && <button type="button" className={packingSecondary + ' w-full'} disabled={blocked} onClick={() => continuePicking()}><FiArrowRight aria-hidden="true" />Continue picking</button>}
            </>}
          </>}
        </>}
      </div>}
    </PackingDialog>}
  </div>;
}
