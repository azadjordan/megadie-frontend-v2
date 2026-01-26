import ErrorMessage from "../common/ErrorMessage";

function modalLabel(id) {
  return `create-manual-invoice-${id}`;
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatMoney(value) {
  const n = toNumber(value);
  if (!Number.isFinite(n)) return "";
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export default function CreateManualInvoiceModal({
  open,
  users,
  form,
  items,
  onClose,
  onSubmit,
  onFieldChange,
  onItemChange,
  onAddItem,
  onRemoveItem,
  isSaving,
  error,
  formError,
  disableUserSelect = false,
}) {
  if (!open) return null;

  const itemsTotal = (items || []).reduce((sum, item) => {
    const qty = toNumber(item?.qty);
    const unit = toNumber(item?.unitPrice);
    return sum + qty * unit;
  }, 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={modalLabel("title")}
    >
      <div
        className="w-full max-w-3xl rounded-2xl bg-white shadow-xl ring-1 ring-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <div
              id={modalLabel("title")}
              className="text-sm font-semibold text-slate-900"
            >
              Create manual invoice
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Create a manual invoice not linked to an order.
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:text-slate-900"
          >
            Close
          </button>
        </div>

        <div className="px-4 py-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
            <div className="md:col-span-6">
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Client (required)
              </label>
              <select
                value={form.userId}
                onChange={(e) => onFieldChange("userId", e.target.value)}
                disabled={disableUserSelect}
                className={[
                  "w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20",
                  disableUserSelect ? "cursor-not-allowed bg-slate-50 text-slate-400" : "",
                ].join(" ")}
              >
                <option value="">Select client</option>
                {(users || []).map((user) => {
                  const userId = user._id || user.id;
                  const label = user.name
                    ? `${user.name}${user.email ? ` - ${user.email}` : ""}`
                    : user.email || userId;
                  return (
                    <option key={userId} value={userId}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Due date (required)
              </label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => onFieldChange("dueDate", e.target.value)}
                className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              />
            </div>

            <div className="md:col-span-3">
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Currency (locked)
              </label>
              <input
                type="text"
                value="AED"
                readOnly
                disabled
                className="w-full rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200"
              />
            </div>

            <div className="md:col-span-12">
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Admin note
              </label>
              <textarea
                rows={3}
                value={form.adminNote}
                onChange={(e) => onFieldChange("adminNote", e.target.value)}
                placeholder="Optional note for this invoice"
                className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              />
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Line items
              </div>
              <button
                type="button"
                onClick={onAddItem}
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Add item
              </button>
            </div>

            <div className="grid grid-cols-12 gap-2 bg-slate-50 px-4 py-2 text-[11px] font-semibold text-slate-500">
              <div className="col-span-6">Description</div>
              <div className="col-span-2 text-right">Qty</div>
              <div className="col-span-2 text-right">Unit price</div>
              <div className="col-span-2 text-right">Total</div>
            </div>

            {(items || []).map((item, idx) => {
              const qty = toNumber(item?.qty);
              const unit = toNumber(item?.unitPrice);
              const lineTotal = qty * unit;
              return (
                <div
                  key={item.id}
                  className="grid grid-cols-12 items-start gap-2 border-t border-slate-200 px-4 py-2"
                >
                  <div className="col-span-6">
                    <input
                      value={item.description}
                      onChange={(e) => onItemChange(item.id, "description", e.target.value)}
                      placeholder={`Item ${idx + 1}`}
                      className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={item.qty}
                      onChange={(e) => onItemChange(item.id, "qty", e.target.value)}
                      className="w-full rounded-xl bg-white px-3 py-2 text-right text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => onItemChange(item.id, "unitPrice", e.target.value)}
                      className="w-full rounded-xl bg-white px-3 py-2 text-right text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                    />
                  </div>
                  <div className="col-span-2 flex items-center justify-end text-right text-sm font-semibold text-slate-700">
                    {formatMoney(lineTotal)}
                  </div>
                  <div className="col-span-12 flex justify-end">
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.id)}
                      className="text-[11px] font-semibold text-rose-600 hover:text-rose-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}

            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
              <span className="font-semibold text-slate-600">Total</span>
              <span className="font-semibold text-slate-900">
                {formatMoney(itemsTotal)}
              </span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onSubmit}
              disabled={isSaving}
              className={[
                "rounded-xl px-4 py-2 text-sm font-semibold text-white",
                isSaving
                  ? "cursor-not-allowed bg-slate-300"
                  : "bg-slate-900 hover:bg-slate-800",
              ].join(" ")}
            >
              {isSaving ? "Creating..." : "Create manual invoice"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>

          {formError ? (
            <div className="mt-2 text-xs font-semibold text-rose-600">
              {formError}
            </div>
          ) : null}

          {error ? (
            <div className="mt-3">
              <ErrorMessage error={error} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
