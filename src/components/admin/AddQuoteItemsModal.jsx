import { FiPlus, FiX } from "react-icons/fi";
import QuantityControl from "../common/QuantityControl";

const resolveNumeric = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export default function AddQuoteItemsModal({
  open,
  search,
  onSearchChange,
  isDebouncing,
  searchLoading,
  searchError,
  searchRows,
  existingProductIds,
  selectedItems,
  onToggleItem,
  onQtyChange,
  onRemoveSelected,
  onClearSelected,
  onSubmit,
  onClose,
}) {
  if (!open) return null;

  const trimmedSearch = String(search || "").trim();
  const rows = Array.isArray(searchRows) ? searchRows : [];
  const selectedEntries = Object.entries(selectedItems || {});
  const selectedCount = selectedEntries.length;
  const existingSet =
    existingProductIds instanceof Set
      ? existingProductIds
      : new Set(existingProductIds || []);
  const hasMissingQty = selectedEntries.some(([, entry]) => {
    const qtyValue = Number(entry?.qty);
    return !Number.isFinite(qtyValue) || qtyValue <= 0;
  });
  const canSubmit = selectedCount > 0 && !hasMissingQty;

  const handleOverlayClick = () => {
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/50 p-2 sm:p-4"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-quote-items-title"
    >
      <div
        className="flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200 sm:h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-200 px-4 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div
                id="add-quote-items-title"
                className="text-base font-semibold text-slate-900"
              >
                Add products to quote
              </div>
              <div className="mt-2 text-xs text-slate-500">
                Search inventory and set quantities to add.
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
        </div>

        <div className="grid flex-1 min-h-0 gap-4 overflow-y-auto px-4 py-4 lg:grid-cols-[1.1fr_0.9fr] lg:overflow-hidden">
          <div className="flex min-h-0 flex-col">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Search products
            </label>
            <input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by SKU or name..."
              className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            />

            <div className="mt-3 flex min-h-0 flex-col space-y-2 lg:flex-1">
              {!trimmedSearch ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  Type a SKU or product name to search.
                </div>
              ) : isDebouncing || searchLoading ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  Searching inventory...
                </div>
              ) : searchError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {searchError}
                </div>
              ) : rows.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  No products match this search.
                </div>
              ) : (
                <div className="space-y-2 overflow-visible lg:flex-1 lg:overflow-y-auto lg:pr-1">
                  {rows.map((row) => {
                    const productId = row.id || row._id;
                    if (!productId) return null;
                    const id = String(productId);
                    const available = resolveNumeric(row.available, 0);
                    const isSelected = Boolean(selectedItems?.[id]);
                    const isInQuote = existingSet.has(id);
                    const isOutOfStock = available <= 0;
                    const isDisabled = isInQuote || isOutOfStock;
                    return (
                      <label
                        key={id}
                        className={[
                          "flex cursor-pointer items-start justify-between gap-2 rounded-xl border px-2 py-2 text-left transition sm:gap-3 sm:px-3",
                          isSelected
                            ? "border-emerald-200 bg-emerald-50/60"
                            : "border-slate-200 bg-white hover:bg-slate-50",
                          isDisabled ? "cursor-not-allowed opacity-70" : "",
                        ].join(" ")}
                      >
                        <div className="flex items-start gap-2 sm:gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => onToggleItem(row)}
                            disabled={isDisabled}
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <div>
                            <div className="text-xs font-semibold text-slate-900 sm:text-sm">
                              {row.name || "Untitled product"}
                            </div>
                            <div className="text-[11px] text-slate-500 sm:text-xs">
                              {row.sku ? `SKU ${row.sku}` : "SKU -"}
                              {" \u00b7 "}
                              Avl {available}
                            </div>
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-500 sm:text-xs">
                          {isInQuote
                            ? "Already in quote"
                            : isOutOfStock
                            ? "Out of stock"
                            : isSelected
                            ? "Selected"
                            : ""}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex min-h-0 flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Selected ({selectedCount})
              </div>
              {selectedCount > 0 ? (
                <button
                  type="button"
                  onClick={onClearSelected}
                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-900"
                >
                  Clear
                </button>
              ) : null}
            </div>

            <div className="mt-3 flex-1 space-y-2 overflow-visible lg:overflow-y-auto lg:pr-1">
              {selectedCount === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  Select products from the search results to add them.
                </div>
              ) : (
                selectedEntries.map(([id, entry]) => {
                  const product = entry.product || {};
                  const available = resolveNumeric(product.available, 0);
                  const maxQty = available > 0 ? available : undefined;
                  return (
                    <div
                      key={id}
                      className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white px-2 py-2 sm:px-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-xs font-semibold text-slate-900 sm:text-sm">
                            {product.name || "Untitled product"}
                          </div>
                          <div className="text-[11px] text-slate-500 sm:text-xs">
                            {product.sku ? `SKU ${product.sku}` : "SKU -"}
                            {" \u00b7 "}
                            Avl {available}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onRemoveSelected(id)}
                          className="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          aria-label="Remove selected product"
                          title="Remove"
                        >
                          <FiX className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Qty
                        </div>
                        <QuantityControl
                          quantity={entry.qty}
                          setQuantity={(nextValue) =>
                            onQtyChange(id, nextValue)
                          }
                          min={1}
                          max={maxQty}
                          size="sm"
                          compact
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onSubmit}
                disabled={!canSubmit}
                className={[
                  "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition",
                  !canSubmit
                    ? "cursor-not-allowed bg-slate-200 text-slate-500"
                    : "bg-emerald-600 text-white hover:bg-emerald-700",
                ].join(" ")}
              >
                <FiPlus className="h-4 w-4" />
                Add selected
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-white px-4 py-2 text-xs font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>

            {hasMissingQty ? (
              <div className="mt-2 text-xs font-semibold text-rose-600">
                Enter a qty for each selected product to continue.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
