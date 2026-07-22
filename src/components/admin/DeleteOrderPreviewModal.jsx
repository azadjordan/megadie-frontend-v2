import { FiAlertTriangle, FiCheck, FiTrash2, FiX } from "react-icons/fi";

import ErrorMessage from "../common/ErrorMessage";

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
  onConfirmValueChange,
  onClose,
  onSubmit,
  error,
}) {
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
  const isRestore = Number(stock.deductedQty || 0) > 0;
  const canSubmit =
    preview?.allowed &&
    !isLoading &&
    !isDeleting &&
    String(confirmValue).trim() === String(confirmText).trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-3 py-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-order-title"
        className="max-h-full w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl ring-1 ring-slate-200"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
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

        <div className="space-y-4 p-4">
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
                    disabled={isDeleting}
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

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
          >
            {preview?.allowed ? "Cancel" : "Close"}
          </button>
          {preview?.allowed ? (
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
          ) : null}
        </div>
      </div>
    </div>
  );
}
