import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiArrowRight, FiCheckCircle, FiCopy } from "react-icons/fi";
import { copyTextToClipboard } from "../../utils/clipboard";
import { useGetPackingOrderQuery, useGetPackingWorkersQuery, useSavePackingMutation } from "../../features/packing/packingApiSlice";
import { needsPackingRefresh, packingError, packingTaskLabel, packingPrimary, packingSecondary } from "../../utils/packing";
import PackingDialog from "../packing/PackingDialog";

const fields = details => ({ contactName: details?.contactName || '', phoneNumber: details?.phoneNumber || '', secondaryPhoneNumber: details?.secondaryPhoneNumber || '', address: details?.address || "", googleMapsUrl: details?.googleMapsUrl || "", notes: details?.notes || "" });
const formFor = (sheet, workers) => ({ workerId: sheet.worker?.id || (workers.length === 1 ? workers[0]._id : ""), mode: sheet.preparationMode || "prepare_only", details: fields(sheet.deliveryDetails) });

export default function SendToWorkerModal({ orderId, onClose, onLegacy }) {
  const query = useGetPackingOrderQuery(orderId, { refetchOnMountOrArgChange: true });
  const workers = useGetPackingWorkersQuery(undefined, { refetchOnMountOrArgChange: true });
  if (!query.currentData?.data || (!query.currentData.data.sentAt && !workers.data && !workers.isError)) return <PackingDialog title="Send to worker" onClose={onClose}>
    {query.isError ? <div role="alert"><p className="text-sm text-rose-800">Could not load worker assignment.</p><button type="button" className={packingSecondary + ' mt-3'} onClick={query.refetch}>Retry</button></div> : <p role="status">Loading order and worker accounts…</p>}
  </PackingDialog>;
  return <SendPackingForm key={orderId} sheet={query.currentData.data} workers={workers.data?.data || []} workersFailed={workers.isError} retryWorkers={workers.refetch} onClose={onClose} onLegacy={onLegacy} refresh={query.refetch} />;
}

function SendPackingForm({ sheet, workers, workersFailed, retryWorkers, onClose, onLegacy, refresh }) {
  const navigate = useNavigate();
  const [form, setForm] = useState(() => formFor(sheet, workers));
  const [baseline, setBaseline] = useState(form);
  const [editing, setEditing] = useState(!sheet.sentAt);
  const [saveDefault, setSaveDefault] = useState(false);
  const [save, { isLoading: saving }] = useSavePackingMutation();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [discard, setDiscard] = useState(null);
  const sending = useRef(false);
  const dirty = saveDefault || JSON.stringify(form) !== JSON.stringify(baseline);
  const blockedItems = sheet.items.filter(item => item.reservedQty !== item.qty);
  const fullyReserved = sheet.items.length > 0 && !blockedItems.length;
  const validWorker = workers.some(worker => worker._id === form.workerId);
  const destinationMissing = form.mode === "prepare_deliver" && !form.details.address.trim() && !form.details.googleMapsUrl.trim();
  const eligible = sheet.status === "Shipping" && fullyReserved && !sheet.problems.length && !sheet.sendLockReason;
  function exit(action) { if (saving || sending.current) return; if (dirty) setDiscard({ action }); else action(); }
  function close() { exit(onClose); }
  function leaveFor(path) { return event => { event.preventDefault(); exit(() => { onClose(); navigate(path); }); }; }
  function change(field, value) { setForm({ ...form, details: { ...form.details, [field]: value } }); }
  function beginEdit() {
    const next = formFor(sheet, workers);
    setForm(next); setBaseline(next); setSaveDefault(false); setNotice(""); setEditing(true);
  }
  async function send() {
    if (sending.current || saving || needsRefresh || !eligible || !validWorker || destinationMissing || (sheet.sentAt && !dirty)) return;
    sending.current = true; setError(""); setNotice("");
    try {
      const result = await save({ orderId: sheet.orderId, action: "send", workerId: form.workerId, preparationMode: form.mode, deliveryDetails: form.details, expectedRevision: sheet.version, expectedDeliveryRevision: sheet.deliveryRevision,
        ...(saveDefault && form.mode === "prepare_deliver" ? { saveCustomerLocation: true, expectedCustomerLocation: sheet.customerLocation } : {}),
      }).unwrap();
      setNotice(sheet.sentAt ? "Assignment updated." : result.message);
      setBaseline(form); setSaveDefault(false); setEditing(false);
    } catch (err) { setError(packingError(err)); if (needsPackingRefresh(err)) setNeedsRefresh(true); }
    finally { sending.current = false; }
  }
  async function reload() {
    try { await refresh().unwrap(); setNeedsRefresh(false); setError(""); }
    catch (err) { setError(packingError(err)); }
  }
  async function copyLink() {
    try { await copyTextToClipboard(window.location.origin + '/packing/orders/' + sheet.orderId); setNotice("Worker link copied. Sign-in is required."); }
    catch { setError("Could not copy the worker link."); }
  }
  return <PackingDialog title={sheet.sentAt ? "Worker assignment" : "Send to worker"} onClose={close} busy={saving}>
    {discard ? <div className="space-y-4"><p>Discard unsaved changes?</p><div className="flex flex-wrap gap-2"><button type="button" className={packingPrimary} onClick={() => setDiscard(null)}>Keep editing</button><button type="button" className={packingSecondary} onClick={() => { const action = discard.action; setDiscard(null); action(); }}>Discard changes</button></div></div> : <div className="space-y-5">
      <div><h3 className="break-words text-xl font-semibold">{sheet.customerName}</h3><p className="mt-1 break-all text-xs text-slate-500">{sheet.orderNumber}</p></div>
      {notice && <p role="status" className="text-sm font-medium text-emerald-800">{notice}</p>}
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      {needsRefresh && <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900"><p>Check the latest saved assignment before another change.</p><button type="button" className={packingSecondary + ' mt-2'} onClick={reload} disabled={saving}>Check latest progress</button></div>}
      {!editing && sheet.sentAt ? <>
        <div className="rounded-xl border border-slate-200 p-4"><div className="flex items-center gap-2 text-sm font-semibold text-emerald-800"><FiCheckCircle aria-hidden="true" />Assigned to {sheet.worker?.name || 'worker'}</div>{sheet.worker?.enabled === false && <p className="mt-2 text-sm text-amber-900">Worker access is disabled. Choose an enabled worker to continue.</p>}<dl className="mt-4 space-y-3 text-sm"><div><dt className="text-xs text-slate-500">Task</dt><dd className="mt-1 font-medium">{packingTaskLabel(sheet.preparationMode)}</dd></div><div><dt className="text-xs text-slate-500">Carton tag</dt><dd className="mt-1 break-words">{sheet.label}</dd></div></dl></div>
        <div className="flex flex-wrap gap-2"><Link to={'/admin/orders/' + sheet.orderId + '/packing'} onClick={leaveFor('/admin/orders/' + sheet.orderId + '/packing')} className={packingPrimary}>View packing<FiArrowRight aria-hidden="true" /></Link><button type="button" onClick={copyLink} className={packingSecondary}><FiCopy aria-hidden="true" />Copy worker link</button></div>
        {sheet.status === "Shipping" && <button type="button" className="min-h-11 text-sm font-medium text-slate-600 underline underline-offset-4" onClick={beginEdit}>Change assignment</button>}
      </> : <>
        <label className="block text-sm font-semibold">Worker<select value={form.workerId} onChange={event => setForm({ ...form, workerId: event.target.value })} disabled={saving} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base font-normal"><option value="">Select worker</option>{sheet.worker && !workers.some(w => w._id === sheet.worker.id) && <option value={sheet.worker.id} disabled>{sheet.worker.name} (disabled)</option>}{workers.map(worker => <option key={worker._id} value={worker._id}>{worker.name}</option>)}</select></label>
        {workersFailed ? <div role="alert" className="text-sm text-rose-800">Could not load worker accounts. <button type="button" className="min-h-11 font-semibold underline" onClick={retryWorkers}>Retry</button></div> : !workers.length && <p className="text-sm text-amber-900">Enable Worker access on an account in <Link to="/admin/users" onClick={leaveFor('/admin/users')} className="font-semibold underline">Users</Link> before assigning this order.</p>}
        <fieldset disabled={saving}><legend className="mb-2 text-sm font-semibold">Task</legend><div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{[["prepare_only", "Pack only"], ["prepare_deliver", "Pack & deliver"]].map(([value, label]) => <label key={value} className={'flex min-h-12 items-center gap-2 rounded-xl border p-3 text-sm ' + (form.mode === value ? 'border-indigo-300 bg-indigo-50 text-indigo-950' : 'border-slate-200')}><input type="radio" name="packing-task" value={value} checked={form.mode === value} onChange={() => setForm({ ...form, mode: value })} />{label}</label>)}</div></fieldset>
        {form.mode === "prepare_deliver" && <div className="space-y-3 border-t border-slate-100 pt-4"><h3 className="text-sm font-semibold">Delivery details</h3>{!sheet.deliverySavedToOrder && <p className="text-xs text-slate-500">Suggested from the customer profile. Review before sending.</p>}<div className="grid gap-3 sm:grid-cols-2">{[["contactName", "Recipient name"], ["phoneNumber", "Phone number"], ["secondaryPhoneNumber", "Backup phone (optional)"]].map(([field, label]) => <label key={field} className="block text-sm text-slate-600">{label}<input type={field === "contactName" ? "text" : "tel"} autoComplete="off" value={form.details[field]} maxLength={field === "contactName" ? 200 : 50} disabled={saving} onChange={event => change(field, event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base" /></label>)}</div>{[["address", "Address"], ["googleMapsUrl", "Map link"], ["notes", "Delivery notes"]].map(([field, label]) => <label key={field} className="block text-sm text-slate-600">{label}<textarea rows={field === "address" ? 2 : 1} value={form.details[field]} disabled={saving} onChange={event => change(field, event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base" /></label>)}<details className="text-sm"><summary className="min-h-11 cursor-pointer content-center text-slate-500">Customer location preference</summary><label className="flex min-h-11 items-start gap-2 py-2"><input type="checkbox" className="mt-1" checked={saveDefault} disabled={saving} onChange={event => setSaveDefault(event.target.checked)} />Also save this location as the customer default</label></details>{destinationMissing && <p className="text-sm text-amber-900">Add an address or map.</p>}</div>}
        {eligible ? <p className="flex items-center gap-2 text-sm text-emerald-800"><FiCheckCircle aria-hidden="true" />All {sheet.items.length} {sheet.items.length === 1 ? 'product is' : 'products are'} fully reserved.</p> : <div className="space-y-2 rounded-xl bg-amber-50 p-4 text-sm text-amber-950"><p className="font-semibold">{sheet.sendLockReason ? 'Invoice needs attention' : 'Reservations need attention'}</p>{sheet.sendLockReason && <p>{sheet.sendLockReason}</p>}{sheet.status !== "Shipping" && <p>The order must be Shipping before sending.</p>}{!sheet.items.length && <p>This order has no items.</p>}{blockedItems.map(item => <p key={item.productId} className="break-words">{item.sku}: {item.reservedQty} of {item.qty} reserved</p>)}{sheet.problems.map(problem => <p key={problem}>{problem}</p>)}<Link to={'/admin/orders/' + sheet.orderId + '?tab=' + (sheet.sendLockReason ? 'invoice' : 'stock')} onClick={leaveFor('/admin/orders/' + sheet.orderId + '?tab=' + (sheet.sendLockReason ? 'invoice' : 'stock'))} className="inline-flex min-h-11 items-center font-semibold underline">{sheet.sendLockReason ? 'Review order billing' : 'Review reservations'}</Link></div>}
        {!sheet.sentAt && !sheet.sendLockReason && <p className="text-xs text-slate-500">Send before invoicing. Resolve picking shortages first, then create the invoice after the worker marks the order Packed.</p>}
        {sheet.sentAt && <p className="text-xs text-slate-500">Changing the assignment preserves picked quantities. The next worker must check the existing carton.</p>}
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={send} disabled={saving || needsRefresh || !eligible || !validWorker || destinationMissing || (Boolean(sheet.sentAt) && !dirty)} className={packingPrimary}>{saving ? "Saving…" : sheet.sentAt ? "Save changes" : "Send to worker"}</button>{sheet.sentAt && <button type="button" className={packingSecondary} onClick={() => exit(() => { const next = formFor(sheet, workers); setForm(next); setBaseline(next); setSaveDefault(false); setEditing(false); })}>Cancel</button>}{!sheet.sentAt && onLegacy && <button type="button" disabled={saving} className="min-h-11 text-sm text-slate-500 underline underline-offset-4" onClick={() => exit(onLegacy)}>Copy packing message instead</button>}</div>
      </>}
    </div>}
  </PackingDialog>;
}
