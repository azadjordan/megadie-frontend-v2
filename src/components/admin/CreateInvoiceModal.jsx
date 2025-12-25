import ErrorMessage from "../common/ErrorMessage";

function modalLabel(id) {
  return `create-invoice-${id}`;
}

export default function CreateInvoiceModal({
  open,
  order,
  form,
  onFieldChange,
  onClose,
  onSubmit,
  isSaving,
  error,
  formError,
}) {
  if (!open) return null;

  const orderLabel = order?.orderNumber || order?._id || "Order";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={modalLabel("title")}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-white shadow-xl ring-1 ring-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <div
              id={modalLabel("title")}
              className="text-sm font-semibold text-slate-900"
            >
              Create invoice
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Create an invoice for {orderLabel}.
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
            <div className="md:col-span-4">
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Due date (required)
              </label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => onFieldChange("dueDate", e.target.value)}
                required
                className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              />
            </div>

            <div className="md:col-span-4">
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Currency (fixed)
              </label>
              <input
                type="text"
                value={form.currency}
                onChange={(e) => onFieldChange("currency", e.target.value)}
                placeholder="AED"
                disabled
                className={[
                  "w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20",
                  "cursor-not-allowed bg-slate-50 text-slate-400",
                ].join(" ")}
              />
            </div>

            <div className="md:col-span-4">
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Minor unit factor (fixed)
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={form.minorUnitFactor}
                onChange={(e) => onFieldChange("minorUnitFactor", e.target.value)}
                placeholder="100"
                disabled
                className={[
                  "w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20",
                  "cursor-not-allowed bg-slate-50 text-slate-400",
                ].join(" ")}
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
                placeholder="Optional note for this invoice..."
                className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              />
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
              {isSaving ? "Creating..." : "Create invoice"}
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
