import ErrorMessage from "../common/ErrorMessage";

function modalLabel(id) {
  return `add-payment-${id}`;
}

export default function AddPaymentModal({
  open,
  onClose,
  onSubmit,
  isSaving,
  error,
  form,
  onFieldChange,
  paymentError,
}) {
  if (!open) return null;

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
              Add payment
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Record a payment received for this invoice.
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
            <div className="md:col-span-3">
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Amount
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => onFieldChange("amount", e.target.value)}
                placeholder="0.00"
                className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              />
            </div>

            <div className="md:col-span-3">
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Method
              </label>
              <select
                value={form.method}
                onChange={(e) => onFieldChange("method", e.target.value)}
                className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              >
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank transfer</option>
                <option value="Credit Card">Credit card</option>
                <option value="Cheque">Cheque</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Received by
              </label>
              <input
                type="text"
                value={form.receivedBy}
                onChange={(e) => onFieldChange("receivedBy", e.target.value)}
                placeholder="Accounting"
                className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              />
            </div>

            <div className="md:col-span-3">
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Payment date
              </label>
              <input
                type="datetime-local"
                value={form.date}
                onChange={(e) => onFieldChange("date", e.target.value)}
                className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              />
            </div>

            <div className="md:col-span-6">
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Reference
              </label>
              <input
                type="text"
                value={form.reference}
                onChange={(e) => onFieldChange("reference", e.target.value)}
                placeholder="Optional reference"
                className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              />
            </div>

            <div className="md:col-span-6">
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Note
              </label>
              <input
                type="text"
                value={form.note}
                onChange={(e) => onFieldChange("note", e.target.value)}
                placeholder="Optional note"
                className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
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
              {isSaving ? "Saving..." : "Save payment"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>

          {paymentError ? (
            <div className="mt-2 text-xs font-semibold text-rose-600">
              {paymentError}
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
