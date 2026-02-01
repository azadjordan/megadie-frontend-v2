import { useEffect, useState } from "react";

export default function InventorySlotStockModal({
  open,
  slot,
  search,
  onSearchChange,
  isDebouncing,
  searchLoading,
  searchError,
  searchRows,
  selectedItems,
  onToggleProduct,
  onRemoveSelected,
  onQtyChange,
  onClearSelection,
  onSubmit,
  onClose,
  submitting,
  submitError,
  submitSuccess,
  submitFailures,
}) {
  if (!open || !slot) return null;

  const slotLabel = slot.label || "Unknown slot";

  const selectedEntries = Object.entries(selectedItems || {});
  const selectedEntriesByRecent = [...selectedEntries].reverse();
  const selectedCount = selectedEntries.length;
  const trimmedSearch = String(search || "").trim();
  const failures = Array.isArray(submitFailures) ? submitFailures : [];
  const [showConfirm, setShowConfirm] = useState(false);
  const hasPendingChanges = selectedCount > 0;
  const hasMissingQty = selectedEntries.some(([, entry]) => {
    const qtyValue = Number(entry?.qty);
    return !Number.isFinite(qtyValue) || qtyValue <= 0;
  });
  const canSubmit = selectedCount > 0 && !hasMissingQty;

  const handleRequestClose = () => {
    if (hasPendingChanges) {
      if (!window.confirm("Discard selected products?")) {
        return;
      }
    }
    onClose();
  };

  const handleOverlayClick = () => {
    if (hasPendingChanges) return;
    onClose();
  };

  useEffect(() => {
    if (selectedCount === 0) {
      setShowConfirm(false);
    }
  }, [selectedCount]);

  useEffect(() => {
    if (!canSubmit) setShowConfirm(false);
  }, [canSubmit]);

  useEffect(() => {
    if (submitting || submitSuccess) {
      setShowConfirm(false);
    }
  }, [submitting, submitSuccess]);

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/50 p-2 sm:p-4"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="stock-slot-title"
    >
      <div
        className="flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200 sm:h-[90vh] sm:max-w-4xl lg:max-w-6xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-200 px-4 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div
                id="stock-slot-title"
                className="text-base font-semibold text-slate-900"
              >
                Stock this slot
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-500">
                  Slot
                </span>
                <span className="font-semibold text-slate-900">{slotLabel}</span>
              </div>
              <div className="mt-2 text-xs text-slate-500">
                Search products, select multiple SKUs, then set quantities.
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
            <label
              htmlFor="slot-stock-search"
              className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500"
            >
              Search products
            </label>
            <input
              id="slot-stock-search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by SKU or name..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            />

            <div className="mt-3 flex min-h-0 flex-col space-y-2 lg:flex-1">
              {!trimmedSearch ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  Type a SKU or product name to search.
                </div>
              ) : isDebouncing || searchLoading ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  Searching products...
                </div>
              ) : searchError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {searchError}
                </div>
              ) : (searchRows || []).length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  No products match this search.
                </div>
              ) : (
                <div className="space-y-2 overflow-visible lg:flex-1 lg:overflow-y-auto lg:pr-1">
                  {(searchRows || []).map((row) => {
                    const productId = row.id || row._id;
                    if (!productId) return null;
                    const id = String(productId);
                    const isSelected = Boolean(selectedItems?.[id]);
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
                            onChange={() => onToggleProduct(row)}
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <div>
                            <div className="text-xs font-semibold text-slate-900 sm:text-sm">
                              {row.name || "Untitled product"}
                            </div>
                            <div className="text-[11px] text-slate-500 sm:text-xs">
                              {row.sku || "-"}
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
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Selected ({selectedCount})
              </div>
              {selectedCount > 0 ? (
                <button
                  type="button"
                  onClick={onClearSelection}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-900"
                >
                  Clear
                </button>
              ) : null}
            </div>

            {selectedCount === 0 ? (
              <div className="mt-3 rounded-xl border border-dashed border-slate-200 px-3 py-3 text-sm text-slate-500">
                Select products from the search results to add stock.
              </div>
            ) : (
              <div className="mt-3 space-y-2 overflow-visible lg:max-h-[360px] lg:overflow-y-auto lg:pr-1">
                {selectedEntriesByRecent.map(([id, entry]) => (
                  <div
                    key={id}
                    className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-2 py-2 sm:px-3"
                  >
                    <div className="flex items-start gap-2">
                      <button
                        type="button"
                        onClick={() => onRemoveSelected(id)}
                        className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                        aria-label="Remove selected SKU"
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
                          {entry.product?.name || "Untitled product"}
                        </div>
                        <div className="text-[11px] text-slate-500 sm:text-xs">
                          {entry.product?.sku || "-"}
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
                        onChange={(e) => onQtyChange(id, e.target.value)}
                        className="w-full max-w-[120px] rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3">
              {showConfirm ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  <div className="font-semibold text-slate-700">
                    Add {selectedCount} SKU(s) to this slot?
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
                  Add to slot{selectedCount ? ` (${selectedCount})` : ""}
                </button>
              )}
            </div>

            {hasMissingQty ? (
              <div className="mt-2 text-xs font-semibold text-rose-600">
                Enter a qty for each selected SKU to continue.
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
                  <div className="font-semibold">Failed items</div>
                  <div className="mt-2 space-y-1">
                    {failures.map((failure, index) => (
                      <div key={failure.productId || index}>
                        <div className="font-semibold text-rose-700">
                          {failure.name || failure.sku || "Unknown SKU"}
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
