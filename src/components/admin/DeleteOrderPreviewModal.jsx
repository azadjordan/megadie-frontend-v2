import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { FiAlertTriangle, FiCheck, FiTrash2, FiX } from "react-icons/fi";

import ErrorMessage from "../common/ErrorMessage";
import { packingQuantity } from "../../utils/packing";

function formatCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  return new Intl.NumberFormat().format(n);
}

function formatMoneyMinor(amountMinor, currency = "AED", factor = 100) {
  const n = Number(amountMinor);
  if (!Number.isFinite(n)) return "";
  const divisor = Number.isFinite(Number(factor)) && factor > 0 ? factor : 100;
  const major = n / divisor;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(major);
  } catch {
    return `${major.toFixed(2)} ${currency}`;
  }
}

function ActionLine({ children }) {
  return (
    <li className="flex gap-2 text-sm text-slate-700">
      <FiCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
      <span>{children}</span>
    </li>
  );
}

export default function DeleteOrderPreviewModal({
  open,
  order,
  preview,
  isLoading = false,
  isDeleting = false,
  confirmValue = "",
  confirmedPhysicalReturn = false,
  onPhysicalReturnChange,
  onConfirmValueChange,
  onClose,
  onSubmit,
  needsRefresh = false,
  onRefresh,
  error,
}) {
  const dialog = useRef(null);
  const latest = useRef({ onClose, isDeleting });
  useEffect(() => { latest.current = { onClose, isDeleting }; }, [onClose, isDeleting]);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.dispatchEvent(new CustomEvent("packing-dialog-host", { detail: dialog.current?.querySelector('[data-session-warning-slot]') }));
    dialog.current?.querySelector("button:not(:disabled)")?.focus();
    const keydown = event => {
      if (event.key === "Escape" && !latest.current.isDeleting) { event.stopPropagation(); latest.current.onClose(); }
      if (event.key !== "Tab") return;
      const nodes = [...dialog.current.querySelectorAll('button:not(:disabled),input:not(:disabled),a[href]')].filter(node => node.getClientRects().length);
      const first = nodes[0], last = nodes.at(-1);
      if (!first) return;
      if (!dialog.current.contains(document.activeElement)) { event.preventDefault(); (event.shiftKey ? last : first).focus(); }
      else if (event.shiftKey && event.target === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && event.target === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.dispatchEvent(new CustomEvent("packing-dialog-host", { detail: null }));
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", keydown);
      if (previous?.isConnected) previous.focus();
    };
  }, [open]);
  if (!open) return null;

  const orderNumber =
    preview?.order?.orderNumber || order?.orderNumber || order?._id || "Order";
  const orderStatus = preview?.order?.status || order?.status || "-";
  const confirmText = preview?.confirmText || orderNumber;
  const stock = preview?.stock || {};
  const invoice = preview?.invoice || {};
  const payments = preview?.payments || {};
  const warnings = Array.isArray(preview?.warnings) ? preview.warnings : [];
  const blockers = Array.isArray(preview?.blockers) ? preview.blockers : [];
  const actions = Array.isArray(preview?.actions) ? preview.actions : [];
  const restoreRows = Array.isArray(stock.restoreRows) ? stock.restoreRows : [];
  const returnRows = Array.isArray(stock.returnRows) ? stock.returnRows : [];
  const isRestore = Number(stock.deductedQty || 0) > 0;
  const canSubmit =
    preview?.allowed &&
    !isLoading &&
    !isDeleting &&
    !needsRefresh &&
    (!stock.requiresPhysicalReturn || confirmedPhysicalReturn) &&
    String(confirmValue).trim() === String(confirmText).trim();

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 px-3 py-6">
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-order-title"
        className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-700 ring-1 ring-rose-100">
                <FiTrash2 className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <h2
                  id="delete-order-title"
                  className="text-base font-semibold text-slate-900"
                >
                  Delete Order
                </h2>
                <div className="text-xs text-slate-500">
                  {orderNumber} - {orderStatus}
                </div>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300"
            aria-label="Close delete order preview"
          >
            <FiX className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 space-y-4 overflow-y-auto overscroll-contain p-4">
          <div data-session-warning-slot />
          {isLoading ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-6 text-center ring-1 ring-slate-200">
              <div className="text-sm font-semibold text-slate-900">
                Checking order...
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Preparing the delete preview.
              </div>
            </div>
          ) : preview ? (
            <>
              <section
                className={[
                  "rounded-2xl p-3 ring-1",
                  isRestore
                    ? "bg-rose-50 text-rose-900 ring-rose-200"
                    : "bg-slate-50 text-slate-900 ring-slate-200",
                ].join(" ")}
              >
                <div className="flex gap-2">
                  <FiAlertTriangle
                    className={[
                      "mt-0.5 h-4 w-4 shrink-0",
                      isRestore ? "text-rose-700" : "text-slate-500",
                    ].join(" ")}
                  />
                  <div>
                    <div className="text-sm font-semibold">
                      {isRestore
                        ? "Stock was already deducted."
                        : "Stock has not been deducted."}
                    </div>
                    <div className="mt-1 text-xs leading-5">
                      {isRestore
                        ? "The deducted quantities will be restored to their original slots before the order is deleted."
                        : "Reserved quantities will be released before the order is deleted."}
                    </div>
                  </div>
                </div>
              </section>

              {blockers.length ? (
                <section className="rounded-2xl bg-rose-50 p-3 ring-1 ring-rose-200">
                  <div className="text-sm font-semibold text-rose-800">
                    This order cannot be deleted safely.
                  </div>
                  <ul className="mt-2 space-y-1 text-xs font-medium text-rose-700">
                    {blockers.map((blocker, index) => (
                      <li key={`${blocker}-${index}`}>x {blocker}</li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {warnings.length ? (
                <section className="rounded-2xl bg-amber-50 p-3 ring-1 ring-amber-200">
                  <div className="text-sm font-semibold text-amber-900">
                    Please notice
                  </div>
                  <ul className="mt-2 space-y-1 text-xs font-medium text-amber-800">
                    {warnings.map((warning, index) => (
                      <li key={`${warning}-${index}`}>- {warning}</li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {isRestore ? (
                <section className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
                  <div className="text-sm font-semibold text-slate-900">
                    Stock to restore
                  </div>
                  <div className="mt-2 overflow-hidden rounded-xl border border-slate-200">
                    <table className="min-w-full text-left text-xs">
                      <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="px-3 py-2">Product</th>
                          <th className="px-3 py-2">Slot</th>
                          <th className="px-3 py-2 text-right">Qty</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {restoreRows.map((row) => (
                          <tr key={row.allocationId || `${row.productId}-${row.slotId}`}>
                            <td className="px-3 py-2 font-medium text-slate-900">
                              {row.productName || "Unknown product"}
                            </td>
                            <td className="px-3 py-2 text-slate-600">
                              {row.slotLabel || "Unknown slot"}
                            </td>
                            <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-900">
                              +{formatCount(row.qty)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : null}

              {returnRows.length > 0 && <section className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                <h3 className="text-sm font-semibold text-amber-950">Picked goods to return</h3>
                <p className="mt-1 text-xs leading-5 text-amber-900">Return these goods to their original slots before confirming. Deleting records the return and releases the reservations; these quantities will not be added to stock again.</p>
                <ul className="mt-3 divide-y divide-amber-200">{returnRows.map(row => <li key={row.allocationId} className="flex flex-wrap items-start justify-between gap-2 py-2 text-sm"><div className="min-w-0"><p className="break-words font-semibold text-slate-900">{row.sku || row.productName}</p><p className="mt-1 text-xs text-slate-600">Original slot: {row.slotLabel}</p></div><span className="font-semibold text-amber-950">{packingQuantity(row.qty, row.unit)}</span></li>)}</ul>
              </section>}

              <section className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
                <div className="text-sm font-semibold text-slate-900">
                  What will happen
                </div>
                <ul className="mt-2 space-y-2">
                  {actions.map((action, index) => (
                    <ActionLine key={`${action}-${index}`}>{action}</ActionLine>
                  ))}
                </ul>
              </section>

              <section className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                  <div className="font-semibold text-slate-500">Allocations</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {formatCount(preview?.allocations?.total || 0)}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                  <div className="font-semibold text-slate-500">Invoice</div>
                  <div className="mt-1 truncate text-sm font-semibold text-slate-900">
                    {invoice.exists ? invoice.invoiceNumber : "None"}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                  <div className="font-semibold text-slate-500">Payments</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {formatCount(payments.count || 0)}
                  </div>
                  {Number(payments.totalMinor || 0) > 0 ? (
                    <div className="mt-0.5 text-[11px] text-slate-500">
                      {formatMoneyMinor(
                        payments.totalMinor,
                        payments.currency,
                        payments.minorUnitFactor
                      )}
                    </div>
                  ) : null}
                </div>
              </section>

              {preview.allowed && stock.requiresPhysicalReturn && <label className="flex min-h-11 items-start gap-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900"><input type="checkbox" checked={confirmedPhysicalReturn} onChange={event => onPhysicalReturnChange?.(event.target.checked)} disabled={isDeleting || needsRefresh} className="mt-1 h-5 w-5 shrink-0" /><span>The worker has stopped picking, and all collected goods are physically in their original slots.</span></label>}
              {preview.allowed ? (
                <section>
                  <label
                    htmlFor="delete-order-confirm"
                    className="mb-1 block text-xs font-semibold text-slate-600"
                  >
                    Type {confirmText} to confirm
                  </label>
                  <input
                    id="delete-order-confirm"
                    type="text"
                    value={confirmValue}
                    onChange={(event) => onConfirmValueChange(event.target.value)}
                    disabled={isDeleting || needsRefresh}
                    className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-300 disabled:cursor-not-allowed disabled:bg-slate-50"
                    placeholder={confirmText}
                  />
                </section>
              ) : null}
            </>
          ) : (
            <div className="rounded-2xl bg-slate-50 px-4 py-6 text-center ring-1 ring-slate-200">
              <div className="text-sm font-semibold text-slate-900">
                Preview unavailable
              </div>
            </div>
          )}

          {error ? <ErrorMessage message={error} /> : null}
        </div>

        <div className="shrink-0 space-y-2 border-t border-slate-200 bg-white px-4 py-3">
          {needsRefresh ? <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-amber-900"><p>Check the latest order before trying again.</p><button type="button" onClick={onRefresh} disabled={isLoading || isDeleting} className="min-h-11 font-semibold underline">{isLoading ? "Checking…" : "Refresh delete preview"}</button></div> : preview && !preview.allowed ? <p className="text-xs text-rose-700">Resolve the issues above before deleting.</p> : preview && !canSubmit && !isDeleting && <p className="text-xs text-slate-500">{stock.requiresPhysicalReturn && !confirmedPhysicalReturn ? "Confirm the goods are back, then type the order number above." : "Type the order number above to enable deletion."}</p>}
          <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
          >
            {preview?.allowed ? "Cancel" : "Close"}
          </button>
          {(
            <button
              type="button"
              onClick={onSubmit}
              disabled={!canSubmit}
              className={[
                "rounded-xl px-4 py-2 text-sm font-semibold text-white",
                canSubmit
                  ? "bg-rose-600 hover:bg-rose-500"
                  : "cursor-not-allowed bg-slate-300",
              ].join(" ")}
            >
              {isDeleting
                ? "Deleting..."
                : isRestore
                ? "Restore Stock & Delete"
                : "Delete Order"}
            </button>
          )}
          </div>
        </div>
      </div>
    </div>, document.body
  );
}
