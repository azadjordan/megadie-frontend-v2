import { useEffect, useState } from "react";
import ErrorMessage from "../common/ErrorMessage";

function modalLabel(id) {
  return `mark-delivered-${id}`;
}

const DELIVERED_BY_OPTIONS = ["Azad", "Momani", "Ahmad Emad"];
const DELIVERED_BY_OTHER = "Other";

export default function MarkDeliveredModal({
  open,
  order,
  deliveredBy,
  onDeliveredByChange,
  onClose,
  onSubmit,
  isSaving,
  error,
  formError,
}) {
  const [selectedOption, setSelectedOption] = useState("");
  const [customValue, setCustomValue] = useState("");
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!open) {
      setInitialized(false);
      return;
    }
    if (initialized) return;

    const raw = String(deliveredBy ?? "");
    const normalized = raw.trim();
    if (!normalized) {
      setSelectedOption("");
      setCustomValue("");
      setInitialized(true);
      return;
    }
    if (DELIVERED_BY_OPTIONS.includes(normalized)) {
      setSelectedOption(normalized);
      setCustomValue("");
      setInitialized(true);
      return;
    }
    setSelectedOption(DELIVERED_BY_OTHER);
    setCustomValue(raw);
    setInitialized(true);
  }, [open, deliveredBy, initialized]);

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
        className="w-full max-w-md rounded-2xl bg-white shadow-xl ring-1 ring-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <div
              id={modalLabel("title")}
              className="text-sm font-semibold text-slate-900"
            >
              Mark Delivered
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {orderLabel} will be marked as delivered and the linked quote will
              be deleted.
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
          <label className="mb-1 block text-xs font-semibold text-slate-600">
            Delivered by
          </label>
          <select
            value={selectedOption}
            onChange={(e) => {
              const next = e.target.value;
              setSelectedOption(next);
              if (next === DELIVERED_BY_OTHER) {
                onDeliveredByChange(customValue);
                return;
              }
              setCustomValue("");
              onDeliveredByChange(next);
            }}
            className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
          >
            <option value="">Select</option>
            {DELIVERED_BY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
            <option value={DELIVERED_BY_OTHER}>{DELIVERED_BY_OTHER}</option>
          </select>
          {selectedOption === DELIVERED_BY_OTHER ? (
            <input
              type="text"
              value={customValue}
              onChange={(e) => {
                const next = e.target.value;
                setCustomValue(next);
                onDeliveredByChange(next);
              }}
              placeholder="Enter name"
              className="mt-2 w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            />
          ) : null}

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
              {isSaving ? "Saving..." : "Confirm"}
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
