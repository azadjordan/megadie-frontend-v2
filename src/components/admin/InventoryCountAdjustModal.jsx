import { useMemo, useState } from "react";

const formatQty = (value) => {
  const n = Number(value) || 0;
  return new Intl.NumberFormat().format(n);
};

function resolveSlotLabel(slotItem) {
  return slotItem?.slot?.label || "Unknown slot";
}

function resolveSlotId(slotItem) {
  return slotItem?.slot?._id || slotItem?.slot?.id || slotItem?.slot || "";
}

function resolveProductId(product, slotItem) {
  return (
    product?.id ||
    product?._id ||
    slotItem?.product?._id ||
    slotItem?.product?.id ||
    slotItem?.product ||
    ""
  );
}

export default function InventoryCountAdjustModal(props) {
  if (!props.open || !props.slotItem) return null;
  const slotId = resolveSlotId(props.slotItem);
  const productId = resolveProductId(props.product, props.slotItem);
  const key = `${productId}:${slotId}:${props.slotItem?.qty ?? ""}`;
  return <InventoryCountAdjustModalContent key={key} {...props} />;
}

function InventoryCountAdjustModalContent({
  product,
  slotItem,
  onClose,
  onSubmit,
  submitting = false,
  submitError = "",
}) {
  const currentQty = Number(slotItem?.qty || 0);
  const reservedQty = Number(slotItem?.reservedQty || 0);
  const availableToRemove = Math.max(0, currentQty - reservedQty);
  const [actualQty, setActualQty] = useState(() => String(currentQty));
  const [note, setNote] = useState("");

  const parsedQty = useMemo(() => {
    if (actualQty === "" || actualQty == null) return null;
    const value = Number(actualQty);
    if (!Number.isFinite(value) || !Number.isInteger(value)) return null;
    return value;
  }, [actualQty]);

  const productId = resolveProductId(product, slotItem);
  const slotId = resolveSlotId(slotItem);
  const productName =
    product?.name || slotItem?.product?.name || "Untitled product";
  const productSku = product?.sku || slotItem?.product?.sku || "";
  const deltaQty = parsedQty == null ? 0 : parsedQty - currentQty;
  const cleanNote = note.trim();
  const isDecrease = deltaQty < 0;
  const isIncrease = deltaQty > 0;
  const qtyError =
    parsedQty == null
      ? "Enter a whole number."
      : parsedQty < 0
      ? "Actual qty cannot be negative."
      : parsedQty < reservedQty
      ? `Actual qty cannot be below reserved qty (${formatQty(reservedQty)}).`
      : "";
  const noteError =
    isDecrease && !cleanNote ? "Reason is required when reducing stock." : "";
  const canSubmit =
    Boolean(productId) &&
    Boolean(slotId) &&
    !submitting &&
    !qtyError &&
    !noteError &&
    deltaQty !== 0;
  const differenceTone = isDecrease
    ? "bg-rose-50 text-rose-700 ring-rose-200"
    : isIncrease
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : "bg-slate-100 text-slate-600 ring-slate-200";
  const differenceLabel = isDecrease
    ? `-${formatQty(Math.abs(deltaQty))} Adjust Out`
    : isIncrease
    ? `+${formatQty(deltaQty)} Adjust In`
    : "No change";

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      productId,
      slotId,
      actualQty: parsedQty,
      note: cleanNote,
    });
  };

  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-900/50 p-3 sm:p-4"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="count-adjust-title"
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-200 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div
                id="count-adjust-title"
                className="text-sm font-semibold text-slate-900"
              >
                Adjust count
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Set the actual counted quantity for this slot.
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Close
            </button>
          </div>
        </div>

        <div className="space-y-4 px-4 py-4">
          <div className="rounded-xl bg-slate-50 px-3 py-3 ring-1 ring-slate-200">
            <div className="text-xs font-semibold text-slate-900">
              {productName}
            </div>
            <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-500">
              {productSku ? <span>SKU {productSku}</span> : null}
              <span>Slot {resolveSlotLabel(slotItem)}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Current
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-900 tabular-nums">
                {formatQty(currentQty)}
              </div>
            </div>
            <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Reserved
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-900 tabular-nums">
                {formatQty(reservedQty)}
              </div>
            </div>
            <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Removable
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-900 tabular-nums">
                {formatQty(availableToRemove)}
              </div>
            </div>
          </div>

          <div>
            <label
              htmlFor="actual-count"
              className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
            >
              Actual qty
            </label>
            <input
              id="actual-count"
              type="number"
              min="0"
              step="1"
              value={actualQty}
              onChange={(e) => setActualQty(e.target.value)}
              className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            />
            {qtyError ? (
              <div className="mt-1 text-xs font-semibold text-rose-600">
                {qtyError}
              </div>
            ) : null}
          </div>

          <div>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Difference
            </div>
            <div
              className={[
                "inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset",
                differenceTone,
              ].join(" ")}
            >
              {differenceLabel}
            </div>
          </div>

          <div>
            <label
              htmlFor="adjust-note"
              className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
            >
              Reason {isDecrease ? "" : "(optional)"}
            </label>
            <textarea
              id="adjust-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Count correction, damaged, missing..."
              className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            />
            {noteError ? (
              <div className="mt-1 text-xs font-semibold text-rose-600">
                {noteError}
              </div>
            ) : null}
          </div>

          {submitError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
              {submitError}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={[
                "rounded-xl px-4 py-2 text-xs font-semibold transition",
                canSubmit
                  ? "bg-slate-900 text-white hover:bg-slate-800"
                  : "cursor-not-allowed bg-slate-200 text-slate-500",
              ].join(" ")}
            >
              {submitting ? "Saving..." : "Save count"}
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="rounded-xl bg-white px-4 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
