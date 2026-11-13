import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FiPlus } from "react-icons/fi";
import PackingDialog from "../packing/PackingDialog";
import { useGetOrderItemsEditorQuery, useGetOrderItemPreviewQuery, useSearchOrderItemProductsQuery, useSaveOrderItemsMutation } from "../../features/orders/orderItemsApiSlice";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import { packingDate, packingError, packingPrimary, packingQuantity, packingSecondary } from "../../utils/packing";

const money = n => new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);
const drafts = sheet => sheet.items.map(row => ({ ...row, qty: String(row.qty), unitPrice: String(row.unitPrice), removed: false }));
const payloadFor = rows => rows.filter(row => !row.removed).map(row => row.key ? { key: row.key, qty: Number(row.qty) } : { productId: row.productId, qty: Number(row.qty), unitPrice: Number(row.unitPrice) });
const identity = sheet => JSON.stringify(sheet.items.map(row => [row.key, row.productId, row.unitPrice]));
const field = "mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base tabular-nums disabled:bg-slate-50 disabled:text-slate-400";

export default function EditOrderItemsModal({ orderId, focusProduct = "", onClose, onSaved }) {
  const query = useGetOrderItemsEditorQuery(orderId, { refetchOnMountOrArgChange: true });
  if (!query.currentData?.data) return <PackingDialog title="Edit order items" onClose={onClose} wide>
    {query.isError ? <div role="alert"><p>Could not load order items.</p><button type="button" className={packingSecondary + ' mt-3'} onClick={query.refetch}>Retry</button></div> : <p role="status">Loading order items…</p>}
  </PackingDialog>;
  return <OrderItemEditor key={orderId} initialSheet={query.currentData.data} refresh={query.refetch} focusProduct={focusProduct} onClose={onClose} onSaved={onSaved} />;
}

function OrderItemEditor({ initialSheet, refresh, focusProduct, onClose, onSaved }) {
  const [sheet, setSheet] = useState(initialSheet);
  const [rows, setRows] = useState(() => drafts(initialSheet));
  const [confirmedToken, setConfirmedToken] = useState(null);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [checkingLatest, setCheckingLatest] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [previousDraft, setPreviousDraft] = useState(null);
  const [check, setCheck] = useState(0);
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const writing = useRef(false), container = useRef(null);
  const [save, { isLoading: saving }] = useSaveOrderItemsMutation();
  const payload = useMemo(() => payloadFor(rows), [rows]);
  const key = JSON.stringify({ version: sheet.version, payload, check });
  const debouncedKey = useDebouncedValue(key, 350);
  const changed = JSON.stringify(payload) !== JSON.stringify(payloadFor(drafts(sheet)));
  const invalid = rows.some(row => !row.removed && (row.qty.trim() === "" || !Number.isSafeInteger(Number(row.qty)) || Number(row.qty) < 1 || (!row.key && (row.unitPrice.trim() === "" || !Number.isFinite(Number(row.unitPrice)) || Number(row.unitPrice) < 0 || Math.abs(Number(row.unitPrice) * 100 - Math.round(Number(row.unitPrice) * 100)) > 0.000001))));
  const preview = useGetOrderItemPreviewQuery({ id: sheet.orderId, expectedRevision: sheet.version, items: payload, check }, { skip: !sheet.canEdit || !changed || invalid || key !== debouncedKey || needsRefresh });
  const plan = changed && sheet.canEdit && key === debouncedKey && !needsRefresh && !invalid ? preview.currentData?.data : null;
  const previewError = changed && !invalid && key === debouncedKey && !needsRefresh && preview.isError ? preview.error : null;
  const checking = changed && !invalid && sheet.canEdit && !needsRefresh && (key !== debouncedKey || preview.isFetching || (!plan && !previewError));
  const confirmed = Boolean(plan && confirmedToken === plan.token);
  const canSave = sheet.canEdit && changed && !invalid && plan?.canSave && !checking && !saving && !needsRefresh && (!plan.requiresPhysicalReturn || confirmed);
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const searchQuery = useSearchOrderItemProductsQuery({ id: sheet.orderId, search: debouncedSearch }, { skip: !adding || debouncedSearch.length < 2 });
  const searchRows = (searchQuery.currentData?.data || []).filter(p => !sheet.items.some(row => row.productId === p.productId) && !rows.some(row => row.productId === p.productId));
  const amount = rows.filter(row => !row.removed).reduce((sum,row) => sum + (Number(row.qty) || 0) * (Number(row.unitPrice) || 0), 0) + (sheet.deliveryCharge || 0) + (sheet.extraFee || 0);
  const beforeAmount = sheet.items.reduce((sum,row) => sum + row.qty * row.unitPrice, 0) + (sheet.deliveryCharge || 0) + (sheet.extraFee || 0);
  const activeCount = rows.filter(row => !row.removed).length;
  const busy = saving || checkingLatest;

  useEffect(() => {
    if (!focusProduct) return;
    container.current?.querySelector('[data-product="' + focusProduct.replace(/[^a-zA-Z0-9-]/g, '') + '"]')?.scrollIntoView({ block: 'nearest' });
  }, [focusProduct]);
  function change(id, values) {
    if (busy || writing.current) return;
    setRows(current => current.map(row => (row.key || row.productId) === id ? { ...row, ...values } : row));
    setConfirmedToken(null); setError(""); setNotice("");
  }
  function close() { if (busy || writing.current) return; if (changed) setDiscard(true); else onClose(); }
  function add(product) {
    setRows(current => [...current, { ...product, qty: '1', unitPrice: '', pickedQty: 0, removed: false }]);
    setAdding(false); setSearch(""); setConfirmedToken(null); setError("");
  }
  async function reload() {
    if (busy || writing.current) return;
    setCheckingLatest(true); setConfirmedToken(null);
    try {
      const latest = (await refresh().unwrap()).data;
      if (latest.status === "Cancelled" && rows.every(row => row.removed)) {
        onSaved({ message: "Order cancellation confirmed from the latest saved state.", data: { cancelled: true } });
        return;
      }
      if (identity(latest) === identity(sheet)) {
        setRows(current => current.map(row => row.key ? { ...row, ...latest.items.find(r => r.key === row.key), qty: row.qty, unitPrice: row.unitPrice, removed: row.removed } : row));
        setNotice("Latest progress loaded. Review your draft and any return quantities again.");
      } else {
        setPreviousDraft(rows); setRows(drafts(latest));
        setNotice("Another admin changed the item list. The latest items are loaded. Your earlier draft is kept below for reference.");
      }
      setSheet(latest); setCheck(n => n + 1); setNeedsRefresh(false); setError("");
    } catch (err) { setError(packingError(err)); }
    finally { setCheckingLatest(false); }
  }
  async function submit() {
    if (!canSave || writing.current) return;
    writing.current = true; setError("");
    try {
      const result = await save({ id: sheet.orderId, expectedRevision: sheet.version, items: payload, token: plan.token, confirmedPhysicalReturn: confirmed, cancelOrder: plan.cancelOrder }).unwrap();
      onSaved(result);
    } catch (err) {
      setError(packingError(err)); setConfirmedToken(null);
      if (err?.data?.refresh || !Number.isFinite(err?.status) || err.status >= 500 || err.status === 409) setNeedsRefresh(true);
    } finally { writing.current = false; }
  }
  const failureNeedsRefresh = needsRefresh || previewError?.data?.refresh;
  return <PackingDialog title="Edit order items" onClose={close} busy={busy} wide footer={!discard && <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs text-slate-500">{activeCount ? 'Order total · AED' : 'Whole-order cancellation'}</p><p className="mt-1 text-xl font-semibold tabular-nums">{changed && activeCount > 0 && <span className="mr-2 text-xs font-normal text-slate-400 line-through">{money(beforeAmount)}</span>}{money(activeCount ? (plan?.afterTotal ?? amount) : 0)}</p><p role="status" className="mt-1 text-xs text-slate-500">{checking ? 'Checking stock and return quantities…' : !changed ? 'No unsaved changes' : 'Changes apply together when saved.'}</p></div><div className="ml-auto flex gap-2"><button type="button" className={packingSecondary} disabled={busy} onClick={close}>Cancel</button><button type="button" className={packingPrimary + (plan?.cancelOrder ? ' bg-rose-700 hover:bg-rose-600' : '')} disabled={!canSave} onClick={submit}>{saving ? 'Saving…' : plan?.cancelOrder ? 'Cancel order' : 'Save changes'}</button></div></div>}>
    {discard ? <div className="space-y-4"><p>Discard unsaved item changes?</p><div className="flex flex-wrap gap-2"><button type="button" className={packingPrimary} onClick={() => setDiscard(false)}>Keep editing</button><button type="button" className={packingSecondary} onClick={onClose}>Discard changes</button></div></div> : <div ref={container} className="space-y-4">
      <div><h3 className="break-words text-lg font-semibold">{sheet.customerName}</h3><p className="mt-1 text-xs text-slate-500">{sheet.orderNumber}</p>{sheet.sentAt && <p className="mt-3 text-sm text-slate-600">{sheet.workerName} · Coordinate changes to affected items with the worker before saving.</p>}</div>
      {!sheet.canEdit && <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-950"><p>{sheet.lockReason}</p>{sheet.lockReason.includes('Packed') && <Link to={'/admin/orders/' + sheet.orderId + '/packing'} className="mt-2 inline-flex min-h-11 items-center font-semibold underline" onClick={event => { if (changed) { event.preventDefault(); setDiscard(true); } else onClose(); }}>Open packing to reopen it</Link>}</div>}
      {notice && <p role="status" className="rounded-xl bg-indigo-50 p-3 text-sm text-indigo-900">{notice}</p>}
      {previousDraft && <details className="text-sm"><summary className="min-h-11 cursor-pointer content-center font-semibold">Your previous draft</summary><ul className="space-y-2 py-2">{previousDraft.map(row => <li key={row.key || row.productId}>{row.sku}: {row.removed ? 'Removed' : row.qty + ' × ' + row.unit + (row.key ? '' : ' · AED ' + row.unitPrice)}</li>)}</ul></details>}
      <div className="divide-y divide-slate-200 border-y border-slate-200">{rows.map(row => {
        const id = row.key || row.productId, old = sheet.items.find(r => r.key === row.key), rowChanged = old && Number(row.qty) !== old.qty;
        return <article key={id} data-product={row.productId} aria-label={row.sku} className={'grid grid-cols-3 items-start gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_80px_100px_80px] ' + (focusProduct === row.productId ? 'bg-indigo-50/40' : '')}>
          <div className="col-span-3 min-w-0 sm:col-span-1"><p className={'break-words text-sm font-semibold ' + (row.removed ? 'text-slate-400 line-through' : '')}>{row.name}{!row.key && <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-normal text-slate-500">Added</span>}</p><p className="mt-1 break-all text-xs text-slate-500">{row.sku} · {row.unit}</p><p className="mt-1 text-xs text-slate-500">{row.pickedQty} picked for this SKU{row.problemQty > 0 ? ' · ' + row.problemQty + ' reported missing' : ''}</p><button type="button" disabled={busy || !sheet.canEdit} className="min-h-11 text-xs font-medium text-rose-700 underline-offset-4 hover:underline disabled:opacity-40" onClick={() => row.key ? change(id, { removed: !row.removed }) : (setRows(current => current.filter(r => r.productId !== row.productId)), setConfirmedToken(null))}>{row.removed ? 'Undo removal' : 'Remove item'}</button></div>
          <label className={'block text-xs text-slate-500 ' + (row.removed ? 'opacity-40' : '')}>Order qty<input aria-label={'Order quantity for ' + row.sku} type="number" inputMode="numeric" min="1" step="1" value={row.qty} disabled={busy || !sheet.canEdit || row.removed} onChange={event => change(id, { qty: event.target.value })} className={field} />{rowChanged && <span className="mt-1 block text-xs text-amber-800">{old.qty} → {row.qty || '—'}</span>}</label>
          <div className={row.removed ? 'opacity-40' : ''}><p className="text-xs text-slate-500">Unit price · AED</p>{row.key ? <p className="pt-3 text-sm tabular-nums">{money(row.unitPrice)}</p> : <input aria-label={'Agreed unit price for ' + row.sku} type="number" inputMode="decimal" min="0" step="0.01" placeholder="Price" value={row.unitPrice} disabled={busy || !sheet.canEdit || row.removed} onChange={event => change(id, { unitPrice: event.target.value })} className={field} />}</div>
          <div className={row.removed ? 'opacity-40' : ''}><p className="text-xs text-slate-500">Line total</p><p className="pt-3 text-sm tabular-nums">{money(row.removed ? 0 : Number(row.qty) * Number(row.unitPrice))}</p></div>
        </article>;
      })}</div>
      {sheet.canEdit && <button type="button" className={packingSecondary} disabled={busy} onClick={() => setAdding(!adding)}><FiPlus aria-hidden="true" />{adding ? 'Close product search' : 'Add item'}</button>}
      {adding && <section className="space-y-3"><label className="block text-sm font-medium">Search by SKU or product name<input type="search" value={search} disabled={busy} onChange={event => setSearch(event.target.value)} className={field} placeholder="Search products…" /></label>{search.trim().length < 2 ? <p className="text-sm text-slate-500">Enter at least two characters.</p> : debouncedSearch !== search.trim() || searchQuery.isFetching ? <p role="status" className="text-sm text-slate-500">Searching products…</p> : searchQuery.isError ? <div role="alert" className="text-sm text-rose-800">Could not search products. <button type="button" onClick={searchQuery.refetch} className="min-h-11 underline">Retry</button></div> : searchRows.length ? <ul className="divide-y divide-slate-100">{searchRows.map(p => <li key={p.productId} className="flex flex-wrap items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="break-words text-sm font-medium">{p.name}</p><p className="mt-1 text-xs text-slate-500">{p.sku} · {p.unit} · {p.availableQty} available</p></div><button type="button" className={packingSecondary} disabled={busy || p.availableQty <= 0} onClick={() => add(p)} aria-label={'Add ' + p.sku}>{p.availableQty > 0 ? 'Add item' : 'Out of stock'}</button></li>)}</ul> : <p className="text-sm text-slate-500">No new products match this search.</p>}</section>}
      {invalid && <p role="alert" className="text-sm text-rose-800">Enter positive whole-number quantities and an agreed price with up to two decimal places for added items.</p>}
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      {previewError && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{packingError(previewError)}</p>}
      {failureNeedsRefresh && <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-950"><p>Load the latest order, then review the changes and any returns again.</p><button type="button" className={packingSecondary + ' mt-2'} disabled={busy} onClick={reload}>{checkingLatest ? 'Loading…' : 'Load latest order'}</button></div>}
      {plan?.issues.length > 0 && <div role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-950"><p className="font-semibold">No changes can be saved yet</p>{plan.issues.map((issue,index) => <p key={index} className="mt-2">{issue.sku}: {issue.message}</p>)}<button type="button" className="mt-2 min-h-11 font-semibold underline" disabled={busy} onClick={() => { setConfirmedToken(null); preview.refetch(); }}>Check stock again</button></div>}
      {activeCount === 0 && <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-900">Removing every item will cancel this order and release all reservations. The original items and history will be retained.</p>}
      {plan?.requiresPhysicalReturn && <section aria-label="Goods to return" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><h3 className="font-semibold">{plan.returns.length ? 'Return these units before saving' : 'Confirm the worker has stopped'}</h3><ul className="mt-3 divide-y divide-amber-200">{plan.returns.map(row => <li key={row.allocationId} className="flex flex-wrap justify-between gap-2 py-2"><span>{row.sku} · {row.slot}</span><strong>{packingQuantity(row.qty, row.unit)}</strong></li>)}</ul><label className="mt-3 flex min-h-11 items-start gap-3 border-t border-amber-200 pt-3"><input type="checkbox" checked={confirmed} disabled={busy || checking} onChange={event => setConfirmedToken(event.target.checked ? plan.token : null)} className="mt-0.5 h-5 w-5 shrink-0" /><span>{plan.cancelOrder ? 'The worker has stopped, and all collected goods are physically back in their original slots.' : 'I confirm the listed units are back in their original slots.'}</span></label></section>}
      {sheet.history.length > 0 && <details className="border-t border-slate-100 pt-2 text-sm"><summary className="min-h-11 cursor-pointer content-center font-semibold">Recent item changes</summary><ul className="space-y-3 py-2">{sheet.history.map((entry,index) => <li key={entry._id || index}><p className="font-medium">{entry.byName} · {packingDate(entry.at)}{entry.cancelled ? ' · Cancelled' : ''}</p><p className="mt-1 text-xs text-slate-500">Before: {entry.before.map(row => row.sku + ' × ' + row.qty).join(', ')}</p><p className="mt-1 text-xs text-slate-500">After: {entry.after.length ? entry.after.map(row => row.sku + ' × ' + row.qty).join(', ') : 'Order cancelled'}</p></li>)}</ul></details>}
    </div>}
  </PackingDialog>;
}
