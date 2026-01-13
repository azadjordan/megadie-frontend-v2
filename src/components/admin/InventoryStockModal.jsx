export default function InventoryStockModal({
  open,
  product,
  mode,
  onModeChange,
  slotItems,
  slotItemsLoading,
  slotItemsError,
  slotItemsErrorMessage,
  slotStoreOptions,
  addExistingSlotId,
  onExistingSlotChange,
  addExistingQty,
  onExistingQtyChange,
  canSubmitExisting,
  onAddExisting,
  addNewSlotStore,
  onNewSlotStoreChange,
  addNewSlotLabel,
  onNewSlotLabelChange,
  addNewSlotSelectedLabel,
  onClearNewSlotSelection,
  addNewSlotId,
  addNewQty,
  onNewQtyChange,
  canSubmitNew,
  onAddNew,
  adjustingStock,
  addStockError,
  addStockSuccess,
  trimmedNewSlotSearch,
  isNewSlotDebouncing,
  newSlotSearchLoading,
  hasNewSlotSearchError,
  newSlotSearchErrorMessage,
  newSlotSearchRows,
  availableNewSlots,
  onClose,
  formatQty,
}) {
  if (!open || !product) return null;

  const safeSlotItems = Array.isArray(slotItems) ? slotItems : [];
  const hasSlotItems = safeSlotItems.length > 0;
  const qtyFormatter =
    typeof formatQty === "function" ? formatQty : (value) => value;
  const isNewMode = mode === "new";

  const handleModeChange = (nextMode) => {
    if (typeof onModeChange === "function") {
      onModeChange(nextMode);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-stock-title"
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-xl ring-1 ring-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-200 px-4 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div
                id="add-stock-title"
                className="text-base font-semibold text-slate-900"
              >
                Stock adjustment
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-500">
                  SKU
                </span>
                <span className="font-semibold text-slate-900">
                  {product.sku || "SKU unavailable"}
                </span>
              </div>
              <div className="mt-2 text-xs text-slate-500">
                Choose an existing slot to increase, or create a new slot record
                for this product.
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

        <div className="px-4 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleModeChange("existing")}
              className={[
                "rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset transition",
                !isNewMode
                  ? "bg-slate-900 text-white ring-slate-900"
                  : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50",
              ].join(" ")}
            >
              Existing slot
            </button>
            <button
              type="button"
              onClick={() => handleModeChange("new")}
              className={[
                "rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset transition",
                isNewMode
                  ? "bg-slate-900 text-white ring-slate-900"
                  : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50",
              ].join(" ")}
            >
              New slot
            </button>
          </div>

          {isNewMode ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-sm font-semibold text-slate-900">
                Add to new slot
              </div>
              <div className="text-xs text-slate-500">
                Creates a new slot record for this product.
              </div>
              <div className="mt-3 space-y-3">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Store
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(slotStoreOptions || []).map((store) => {
                      const isActive = addNewSlotStore === store.value;
                      return (
                        <button
                          key={store.value}
                          type="button"
                          onClick={() => onNewSlotStoreChange(store.value)}
                          className={[
                            "rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset transition",
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
                <div className="space-y-3">
                  <div>
                    <label
                      htmlFor="new-slot-search"
                      className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
                    >
                      Slot
                    </label>
                    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus-within:ring-2 focus-within:ring-slate-900/20">
                      {addNewSlotSelectedLabel ? (
                        <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-900 ring-1 ring-amber-300">
                          <span>{addNewSlotSelectedLabel}</span>
                          <button
                            type="button"
                            onClick={onClearNewSlotSelection}
                            className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-amber-900/70 hover:text-amber-900"
                          >
                            Clear
                          </button>
                        </span>
                      ) : (
                        <input
                          id="new-slot-search"
                          value={addNewSlotLabel}
                          onChange={(e) => onNewSlotLabelChange(e.target.value)}
                          placeholder="Type a slot label..."
                          className="min-w-[160px] flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                        />
                      )}
                    </div>
                  </div>

                  {addNewSlotId ? (
                    <div className="flex flex-wrap items-end gap-2">
                      <div>
                        <label
                          htmlFor="new-slot-qty"
                          className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
                        >
                          Qty
                        </label>
                        <input
                          id="new-slot-qty"
                          type="number"
                          min="1"
                          step="1"
                          value={addNewQty}
                          onChange={(e) => onNewQtyChange(e.target.value)}
                          className="w-24 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={onAddNew}
                        disabled={!canSubmitNew}
                        className={[
                          "rounded-xl px-4 py-2 text-xs font-semibold",
                          !canSubmitNew
                            ? "cursor-not-allowed bg-slate-200 text-slate-500"
                            : "bg-slate-900 text-white hover:bg-slate-800",
                        ].join(" ")}
                      >
                        {adjustingStock ? "Adding..." : "Add to new slot"}
                      </button>
                    </div>
                  ) : !trimmedNewSlotSearch ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      Type a slot label to search.
                    </div>
                  ) : isNewSlotDebouncing || newSlotSearchLoading ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      Searching slots...
                    </div>
                  ) : hasNewSlotSearchError ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                      {newSlotSearchErrorMessage}
                    </div>
                  ) : (newSlotSearchRows || []).length === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      No slots match this search.
                    </div>
                  ) : (availableNewSlots || []).length === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      All matching slots already carry this product. Use
                      Existing slot to add stock (one slot at a time).
                    </div>
                  ) : (
                    <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                      {(availableNewSlots || []).map((slot) => {
                        const label = slot.label || "Unknown slot";
                        const slotId = String(slot._id || slot.id);
                        return (
                          <button
                            key={slotId}
                            type="button"
                            onClick={() => onNewSlotLabelChange(label)}
                            className={[
                              "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm ring-1 ring-inset transition",
                              "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50",
                            ].join(" ")}
                          >
                            <span className="font-semibold">{label}</span>
                            <span className="text-xs text-slate-500">
                              {slot.store ? `Store ${slot.store}` : "Store -"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Existing stock
                  </div>
                  <div className="text-xs text-slate-500">
                    Tap a slot chip to select where to increase.
                  </div>
                </div>
                <div className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold uppercase text-slate-500 ring-1 ring-slate-200">
                  {slotItemsLoading
                    ? "Loading"
                    : hasSlotItems
                    ? `${safeSlotItems.length} slots`
                    : "No slots"}
                </div>
              </div>
              <div className="mt-3">
                {slotItemsLoading ? (
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                    Checking existing stock...
                  </div>
                ) : slotItemsError ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {slotItemsErrorMessage}
                  </div>
                ) : !hasSlotItems ? (
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                    No stock locations yet.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {safeSlotItems.map((item) => {
                      const slotId = item.slot?._id || item.slot;
                      const label = item.slot?.label || "Unknown slot";
                      const isSelected =
                        String(slotId) === String(addExistingSlotId);
                      return (
                        <button
                          key={item.id || item._id || label}
                          type="button"
                          onClick={() =>
                            onExistingSlotChange(String(slotId))
                          }
                          aria-pressed={isSelected}
                          className={[
                            "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset transition",
                            isSelected
                              ? "bg-amber-100 text-amber-900 ring-amber-300"
                              : "bg-white text-slate-700 ring-slate-200 hover:bg-amber-50",
                          ].join(" ")}
                        >
                          <span>{label}</span>
                          <span
                            className={
                              isSelected
                                ? "text-amber-800/70"
                                : "text-slate-400"
                            }
                          >
                            |
                          </span>
                          <span className="tabular-nums">
                            {qtyFormatter(item.qty)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              {hasSlotItems ? (
                <div className="mt-4 flex flex-wrap items-end gap-2">
                  <div>
                    <label
                      htmlFor="existing-qty"
                      className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
                    >
                      Qty
                    </label>
                    <input
                      id="existing-qty"
                      type="number"
                      min="1"
                      step="1"
                      value={addExistingQty}
                      onChange={(e) => onExistingQtyChange(e.target.value)}
                      className="w-24 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={onAddExisting}
                    disabled={!canSubmitExisting}
                    className={[
                      "rounded-xl px-4 py-2 text-xs font-semibold transition",
                      !canSubmitExisting
                        ? "cursor-not-allowed bg-slate-200 text-slate-500"
                        : "bg-slate-900 text-white hover:bg-slate-800",
                    ].join(" ")}
                  >
                    {adjustingStock ? "Adding..." : "Increase"}
                  </button>
                </div>
              ) : null}
            </div>
          )}

          {addStockSuccess ? (
            <div className="mt-3 text-xs font-semibold text-emerald-700">
              {addStockSuccess}
            </div>
          ) : null}

          {addStockError ? (
            <div className="mt-2 text-xs font-semibold text-rose-600">
              {addStockError}
            </div>
          ) : null}

        </div>
      </div>
    </div>
  );
}
