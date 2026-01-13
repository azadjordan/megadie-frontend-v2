export default function InventoryMoveModal({
  open,
  sourceSlotLabel,
  itemCount,
  unitCount,
  moveScope,
  moveSearch,
  onMoveSearchChange,
  isMoveDebouncing,
  moveSearchLoading,
  moveSearchError,
  moveSearchRows,
  selectedTargetSlot,
  selectedTargetSlotId,
  onSelectTargetSlot,
  onSubmit,
  moving,
  moveError,
  onClose,
  formatQty,
}) {
  if (!open) return null;

  const qtyFormatter =
    typeof formatQty === "function" ? formatQty : (value) => value;
  const totalItems = Number.isFinite(itemCount) ? itemCount : 0;
  const totalUnits = Number.isFinite(unitCount) ? unitCount : 0;
  const sourceLabel = sourceSlotLabel || "this slot";
  const rows = Array.isArray(moveSearchRows) ? moveSearchRows : [];
  const hasQuery = String(moveSearch || "").trim().length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="move-slot-title"
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-xl ring-1 ring-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <div
              id="move-slot-title"
              className="text-sm font-semibold text-slate-900"
            >
              Move stock
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {totalItems} items and {qtyFormatter(totalUnits)} units are being
              moved from {sourceLabel}.
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
          <label
            htmlFor="move-slot-search"
            className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
          >
            Destination slot
          </label>
          <input
            id="move-slot-search"
            value={moveSearch}
            onChange={(e) => onMoveSearchChange(e.target.value)}
            placeholder="Search slot label..."
            className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
          />

          {selectedTargetSlot ? (
            <div className="mt-2 text-xs text-slate-500">
              Selected:{" "}
              <span className="font-semibold text-slate-900">
                {selectedTargetSlot.label || "Unknown slot"}
              </span>
            </div>
          ) : null}

          <div className="mt-3">
            {!hasQuery ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                Type a slot label to search.
              </div>
            ) : isMoveDebouncing || moveSearchLoading ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                Searching slots...
              </div>
            ) : moveSearchError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {moveSearchError}
              </div>
            ) : rows.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                No slots match this search.
              </div>
            ) : (
              <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                {rows.map((row) => {
                  const rowId = String(row._id || row.id);
                  const isSelected = selectedTargetSlotId === rowId;
                  return (
                    <button
                      key={rowId}
                      type="button"
                      onClick={() => onSelectTargetSlot(row)}
                      className={[
                        "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm ring-1 ring-inset transition",
                        isSelected
                          ? "bg-amber-100 text-amber-900 ring-amber-300"
                          : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50",
                      ].join(" ")}
                    >
                      <span className="font-semibold">
                        {row.label || "Unknown slot"}
                      </span>
                      <span className="text-xs text-slate-500">
                        {row.store ? `Store ${row.store}` : "Store -"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={onSubmit}
              disabled={!selectedTargetSlotId || moving}
              className={[
                "rounded-xl px-4 py-2 text-xs font-semibold",
                !selectedTargetSlotId || moving
                  ? "cursor-not-allowed bg-slate-200 text-slate-500"
                  : "bg-slate-900 text-white hover:bg-slate-800",
              ].join(" ")}
            >
              {moving ? "Moving..." : moveScope === "all" ? "Move All" : "Move"}
            </button>
          </div>

          {moveError ? (
            <div className="mt-3 text-xs font-semibold text-rose-600">
              {moveError}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
