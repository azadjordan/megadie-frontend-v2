import { useEffect, useMemo, useState } from "react";

export default function InventoryProductStockModal({
  open,
  product,
  storeOptions,
  storeValue,
  onStoreChange,
  search,
  onSearchChange,
  isDebouncing,
  searchLoading,
  searchError,
  searchRows,
  existingSlots,
  existingSlotsLoading,
  existingSlotsError,
  existingSlotsErrorMessage,
  existingAdditions,
  onExistingQtyChange,
  onClearExisting,
  selectedSlots,
  onToggleSlot,
  onRemoveSelected,
  onNewQtyChange,
  onClearSelected,
  onSubmit,
  onClose,
  submitting,
  submitError,
  submitSuccess,
  submitFailures,
}) {
  if (!open || !product) return null;

  const selectedEntries = Object.entries(selectedSlots || {});
  const selectedEntriesByRecent = [...selectedEntries].reverse();
  const selectedCount = selectedEntries.length;
  const existingList = Array.isArray(existingSlots) ? existingSlots : [];
  const trimmedSearch = String(search || "").trim();
  const failures = Array.isArray(submitFailures) ? submitFailures : [];
  const hasMissingQty = selectedEntries.some(([, entry]) => {
    const qtyValue = Number(entry?.qty);
    return !Number.isFinite(qtyValue) || qtyValue <= 0;
  });

  const existingAddCount = useMemo(() => {
    const entries = Object.entries(existingAdditions || {});
    return entries.filter(([, qty]) => {
      const value = Number(qty);
      return Number.isFinite(value) && value > 0;
    }).length;
  }, [existingAdditions]);

  const hasPendingChanges = selectedCount > 0 || existingAddCount > 0;
  const canSubmit = hasPendingChanges && !hasMissingQty;
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!canSubmit) setShowConfirm(false);
  }, [canSubmit]);

  useEffect(() => {
    if (submitting || submitSuccess) setShowConfirm(false);
  }, [submitting, submitSuccess]);

  const totalAdds = existingAddCount + selectedCount;

  const handleRequestClose = () => {
    if (hasPendingChanges) {
      if (!window.confirm("Discard selected slots and additions?")) {
        return;
      }
    }
    onClose();
  };

  const handleOverlayClick = () => {
    if (hasPendingChanges) return;
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/50 p-2 sm:p-4"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="stock-product-title"
    >
      <div
        className="flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200 sm:h-[90vh] sm:max-w-4xl lg:max-w-6xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-200 px-4 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div
                id="stock-product-title"
                className="text-base font-semibold text-slate-900"
              >
                Stock this product
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-500">
                  SKU
                </span>
                <span className="font-semibold text-slate-900">
                  {product.sku || "SKU unavailable"}
                </span>
                <span className="text-slate-400">-</span>
                <span>{product.name || "Untitled product"}</span>
              </div>
              <div className="mt-2 text-xs text-slate-500">
                Select multiple slots and set quantities to add stock.
              </div>
            </div>
            <button
              type="button"
              onClick={handleRequestClose}
              className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:text-slate-900"
            >
              Close
            </button>
          </div>
        </div>

        <div className="grid flex-1 min-h-0 gap-4 overflow-y-auto px-4 py-4 lg:grid-cols-[1.1fr_0.9fr] lg:overflow-hidden">
          <div className="flex min-h-0 flex-col">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Search slots
              </label>
              <div className="flex flex-wrap gap-2">
                {(storeOptions || []).map((store) => {
                  const isActive = storeValue === store.value;
                  return (
                    <button
                      key={store.value}
                      type="button"
                      onClick={() => onStoreChange(store.value)}
                      className={[
                        "rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset transition",
                        isActive
                          ? "bg-slate-900 text-white ring-slate-900"
                          : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50",
                      ].join(" ")}
                    >
                      {store.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by slot label..."
              className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            />
            <div className="mt-1 text-[11px] text-slate-500">
              Search shows only new slots. Existing slots are listed on the
              right.
            </div>

            <div className="mt-3 flex min-h-0 flex-col space-y-2 lg:flex-1">
              {!trimmedSearch ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  Type a slot label to search.
                </div>
              ) : isDebouncing || searchLoading ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  Searching slots...
                </div>
              ) : searchError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {searchError}
                </div>
              ) : (searchRows || []).length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  No slots match this search.
                </div>
              ) : (
                <div className="space-y-2 overflow-visible lg:flex-1 lg:overflow-y-auto lg:pr-1">
                  {(searchRows || []).map((slot) => {
                    const slotId = slot._id || slot.id;
                    if (!slotId) return null;
                    const id = String(slotId);
                    const isSelected = Boolean(selectedSlots?.[id]);
                    return (
                      <label
                        key={id}
                        className={[
                          "flex cursor-pointer items-start justify-between gap-2 rounded-xl border px-2 py-2 text-left transition sm:gap-3 sm:px-3",
                          isSelected
                            ? "border-emerald-200 bg-emerald-50/60"
                            : "border-slate-200 bg-white hover:bg-slate-50",
                        ].join(" ")}
                      >
                        <div className="flex items-start gap-2 sm:gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => onToggleSlot(slot)}
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <div>
                            <div className="text-xs font-semibold text-slate-900 sm:text-sm">
                              {slot.label || "Unknown slot"}
                            </div>
                            <div className="text-[11px] text-slate-500 sm:text-xs">
                              {slot.store ? `Store ${slot.store}` : "Store -"}
                              {" / "}
                              {slot.unit ? `Unit ${slot.unit}` : "Unit -"}
                              {" / "}
                              {slot.position ?? "-"}
                            </div>
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-500 sm:text-xs">
                          {isSelected ? "Selected" : ""}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex min-h-0 flex-col">
            <div className="mt-2 flex-1 space-y-4 overflow-visible lg:overflow-y-auto lg:pr-1">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70">
                <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Existing slots ({existingList.length})
                  </div>
                  {existingAddCount > 0 ? (
                    <button
                      type="button"
                      onClick={onClearExisting}
                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-900"
                    >
                      Clear additions
                    </button>
                  ) : null}
                </div>

                <div className="p-2 space-y-2">
                  {existingSlotsLoading ? (
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                      Loading existing slots...
                    </div>
                  ) : existingSlotsError ? (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                      {existingSlotsErrorMessage}
                    </div>
                  ) : existingList.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
                      This SKU is not stored in any slots yet.
                    </div>
                  ) : (
                    existingList.map((item) => {
                      const slotId = item.slot?._id || item.slot;
                      if (!slotId) return null;
                      const key = String(slotId);
                      const addQty = existingAdditions?.[key] ?? "";
                      return (
                        <div
                          key={key}
                          className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white px-2 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-3"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-xs font-semibold text-slate-900 sm:text-sm">
                              {item.slot?.label || "Unknown slot"}
                            </div>
                            <div className="text-[11px] text-slate-500 sm:text-xs">
                              Current qty: {item.qty ?? 0}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                              Add
                            </div>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={addQty}
                              onChange={(e) =>
                                onExistingQtyChange(key, e.target.value)
                              }
                              placeholder="0"
                              className="w-full max-w-[120px] rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {existingList.length > 0 ? (
                  <div className="px-3 pb-3 text-[10px] text-slate-500">
                    Leave add qty empty to skip.
                  </div>
                ) : null}
              </div>

              <div className="rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    New slots ({selectedCount})
                  </div>
                  {selectedCount > 0 ? (
                    <button
                      type="button"
                      onClick={onClearSelected}
                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-900"
                    >
                      Clear selection
                    </button>
                  ) : null}
                </div>

                <div className="p-2 space-y-2">
                  {selectedCount === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                      Select slots from the search results to add this SKU.
                    </div>
                  ) : (
                    selectedEntriesByRecent.map(([id, entry]) => (
                      <div
                        key={id}
                        className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white px-2 py-2 sm:px-3"
                      >
                        <div className="flex items-start gap-2">
                          <button
                            type="button"
                            onClick={() => onRemoveSelected(id)}
                            className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            aria-label="Remove selected slot"
                            title="Remove"
                          >
                            <svg
                              viewBox="0 0 20 20"
                              className="h-3.5 w-3.5"
                              fill="currentColor"
                              aria-hidden="true"
                            >
                              <path
                                fillRule="evenodd"
                                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>
                          <div className="min-w-0">
                            <div className="truncate text-xs font-semibold text-slate-900 sm:text-sm">
                              {entry.slot?.label || "Unknown slot"}
                            </div>
                            <div className="text-[11px] text-slate-500 sm:text-xs">
                              {entry.slot?.store
                                ? `Store ${entry.slot.store}`
                                : "Store -"}
                              {" / "}
                              {entry.slot?.unit ? `Unit ${entry.slot.unit}` : "Unit -"}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pl-8">
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            Qty
                          </div>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={entry.qty ?? ""}
                            onChange={(e) => onNewQtyChange(id, e.target.value)}
                            className="w-full max-w-[120px] rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="mt-3">
              {showConfirm ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  <div className="font-semibold text-slate-700">
                    Add this product to {totalAdds} slot(s)?
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={onSubmit}
                      disabled={submitting || hasMissingQty}
                      className={[
                        "rounded-xl px-3 py-2 text-xs font-semibold transition",
                        submitting || hasMissingQty
                          ? "cursor-not-allowed bg-slate-200 text-slate-500"
                          : "bg-emerald-600 text-white hover:bg-emerald-700",
                      ].join(" ")}
                    >
                      {submitting ? "Adding..." : "Confirm add"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowConfirm(false)}
                      disabled={submitting}
                      className={[
                        "rounded-xl px-3 py-2 text-xs font-semibold transition",
                        submitting
                          ? "cursor-not-allowed bg-slate-200 text-slate-500"
                          : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50",
                      ].join(" ")}
                    >
                      Keep selecting
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowConfirm(true)}
                  disabled={!canSubmit || submitting}
                  className={[
                    "rounded-xl px-4 py-2 text-xs font-semibold transition",
                    !canSubmit || submitting
                      ? "cursor-not-allowed bg-slate-200 text-slate-500"
                      : "bg-emerald-600 text-white hover:bg-emerald-700",
                  ].join(" ")}
                >
                  Add to slots{canSubmit ? ` (${totalAdds})` : ""}
                </button>
              )}
            </div>

            {hasMissingQty ? (
              <div className="mt-2 text-xs font-semibold text-rose-600">
                Enter a qty for each selected slot to continue.
              </div>
            ) : null}

            <div className="mt-3 space-y-2">
              {submitSuccess ? (
                <div className="text-xs font-semibold text-emerald-700">
                  {submitSuccess}
                </div>
              ) : null}
              {submitError ? (
                <div className="text-xs font-semibold text-rose-600">
                  {submitError}
                </div>
              ) : null}
              {failures.length > 0 ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  <div className="font-semibold">Failed slots</div>
                  <div className="mt-2 space-y-1">
                    {failures.map((failure, index) => (
                      <div key={failure.slotId || index}>
                        <div className="font-semibold text-rose-700">
                          {failure.label || "Unknown slot"}
                        </div>
                        <div className="text-rose-700/80">
                          {failure.message || "Unable to add stock."}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
