import { FiCornerUpLeft, FiPlus, FiRefreshCw, FiTrash2 } from "react-icons/fi";

import StepCard from "./StepCard";
import ErrorMessage from "../../../components/common/ErrorMessage";
import QuantityControl from "../../../components/common/QuantityControl";
import { parseNullableNumber } from "./helpers";

export default function QuantitiesStep({
  items,
  showAvailability,
  stockCheckedAt,
  canCheckStock,
  isCheckingStock,
  onCheckStock,
  stockCheckError,
  stockCheckByProduct,
  canUpdateQty,
  updateQtyDisabled,
  isUpdatingQty,
  onUpdateQty,
  isEditingQty,
  onToggleEditQty,
  onAddItem,
  canAddItem,
  editDraft,
  adjustDraftQty,
  quoteLocked,
  lockReason,
  showUpdateError,
  updateError,
}) {
  const itemRows = items.map((it, idx) => {
    const inputQty = parseNullableNumber(it.qtyStr);
    const qty = inputQty == null ? 0 : inputQty;
    const availableNow = Number.isFinite(Number(it.availableNow))
      ? Number(it.availableNow)
      : null;
    const productKey = String(it.productId || idx);
    const stockRow = stockCheckByProduct?.get(productKey) || null;
    const onHandValue = stockRow ? Number(stockRow.onHand) : availableNow;
    const availableValue = stockRow
      ? Number(stockRow.availableAfterReserve)
      : null;
    const availableCap = Number.isFinite(availableValue)
      ? Math.max(0, availableValue)
      : availableNow == null
      ? 0
      : Math.max(0, Number(availableNow));
    const requestedQty = Number.isFinite(Number(it.requestedQty))
      ? Number(it.requestedQty)
      : qty;
    const shortage =
      showAvailability && Number.isFinite(availableCap)
        ? Math.max(0, requestedQty - availableCap)
        : null;
    const shortageDisplay =
      Number.isFinite(Number(shortage)) && Number(shortage) > 0
        ? Number(shortage)
        : null;
    const key = productKey;
    const draftQty = Number(editDraft?.[key]);
    const hasDraftQty = Number.isFinite(draftQty);
    const hasAvailableCap = stockRow
      ? Number.isFinite(availableValue)
      : Number.isFinite(availableNow);
    const defaultQty = hasAvailableCap
      ? Math.min(requestedQty, availableCap)
      : requestedQty;
    const fallbackQty = showAvailability ? defaultQty : qty;
    const editingQty = Number.isFinite(draftQty) ? draftQty : fallbackQty;
    const canAdjustQty =
      showAvailability &&
      isEditingQty &&
      Number.isFinite(availableNow) &&
      availableCap > 0 &&
      !quoteLocked &&
      Boolean(it.productId);
    const canRemove =
      showAvailability && isEditingQty && !quoteLocked && Boolean(it.productId);
    const isRemoved = isEditingQty && hasDraftQty && Number(draftQty) === 0;
    const displayQty = showAvailability
      ? isRemoved
        ? editingQty
        : canAdjustQty
        ? editingQty
        : availableCap
      : qty;
    const requestedDisplay = Number.isFinite(Number(requestedQty))
      ? Number(requestedQty)
      : "-";
    const onHandDisplay = Number.isFinite(onHandValue) ? onHandValue : "-";
    const availableDisplay = Number.isFinite(availableValue) ? availableValue : "-";
    const availabilityTone =
      showAvailability && Number.isFinite(availableCap)
        ? Number(availableCap) <= 0
          ? "bg-red-50 text-red-700"
          : Number.isFinite(Number(shortage)) && Number(shortage) > 0
          ? "bg-amber-50 text-amber-800"
          : "bg-emerald-50 text-emerald-700"
        : "";

    return {
      item: it,
      idx,
      key,
      requestedDisplay,
      onHandDisplay,
      availableDisplay,
      availabilityTone,
      shortageDisplay,
      canAdjustQty,
      canRemove,
      isRemoved,
      displayQty,
      availableCap,
      fallbackQty,
      draftQty,
      qty,
    };
  });
  const allRemoved =
    isEditingQty && itemRows.length > 0 && itemRows.every((row) => row.isRemoved);
  const saveDisabled = updateQtyDisabled || allRemoved;
  const canAddItems =
    Boolean(onAddItem) &&
    Boolean(canAddItem) &&
    isEditingQty &&
    !isUpdatingQty &&
    !isCheckingStock;

  return (
    <StepCard
      n={2}
      title="Quantities"
      subtitle="Adjust quantities within stock."
      showNumber={false}
    >
      <div className="mb-3 grid gap-2 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span>
            {showAvailability
              ? stockCheckedAt
                ? `Stock checked ${stockCheckedAt}`
                : "No stock check yet."
              : "Stock check hidden for cancelled quotes."}
          </span>
          {isEditingQty ? (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
              Edit mode
            </span>
          ) : null}
        </div>

        {showAvailability ? (
          <div className="flex flex-row items-center gap-2 justify-start lg:justify-end min-h-[44px]">
            <button
              type="button"
              onClick={onAddItem}
              disabled={!canAddItems}
              title={quoteLocked ? lockReason : undefined}
              className={[
                "inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-semibold transition",
                !canAddItems
                  ? "cursor-not-allowed border-slate-200 bg-white text-slate-400"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
                isEditingQty ? "" : "invisible pointer-events-none",
              ].join(" ")}
            >
              <FiPlus className="h-3.5 w-3.5" aria-hidden="true" />
              Add product
            </button>

            <button
              type="button"
              onClick={onCheckStock}
              disabled={!canCheckStock || isCheckingStock}
              title={quoteLocked ? lockReason : undefined}
              className={[
                "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-3 text-xs font-semibold transition",
                !canCheckStock || isCheckingStock
                  ? "cursor-not-allowed bg-slate-300 text-white"
                  : "bg-slate-900 text-white hover:bg-slate-800",
              ].join(" ")}
            >
              <FiRefreshCw
                className={[
                  "h-3.5 w-3.5",
                  isCheckingStock ? "animate-spin" : "",
                ].join(" ")}
                aria-hidden="true"
              />
              {isCheckingStock ? "Checking..." : "Check Stock"}
            </button>

            <button
              type="button"
              onClick={onToggleEditQty}
              disabled={!canUpdateQty || isUpdatingQty || isCheckingStock}
              title={quoteLocked ? lockReason : undefined}
              className={[
                "inline-flex h-11 min-w-[96px] items-center justify-center rounded-xl border px-3 text-xs font-semibold transition",
                !canUpdateQty || isUpdatingQty || isCheckingStock
                  ? "cursor-not-allowed border-slate-200 bg-white text-slate-400"
                  : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50",
              ].join(" ")}
            >
              {isEditingQty ? "Cancel Edit" : "Edit Qty"}
            </button>
          </div>
        ) : null}
      </div>

      {stockCheckError ? (
        <div className="mb-3">
          <ErrorMessage error={stockCheckError} />
        </div>
      ) : null}

      {showUpdateError ? (
        <div className="mb-3">
          <ErrorMessage error={updateError} />
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
        {itemRows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
            No items in this quote yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {itemRows.map((row) => {
              const gridCols =
                "sm:grid-cols-[80px_minmax(0,1.2fr)_minmax(0,0.85fr)_minmax(0,0.9fr)]";

              return (
                <div
                  key={row.key}
                  className="relative py-3"
                >
                  <div
                    className={[
                      `grid gap-4 ${gridCols} items-center`,
                      row.isRemoved ? "opacity-70" : "",
                    ].join(" ")}
                  >
                    <div className="hidden sm:flex items-center justify-center self-stretch">
                      {isEditingQty && row.canRemove && !row.isRemoved ? (
                        <button
                          type="button"
                          onClick={() =>
                            adjustDraftQty(
                              row.key,
                              -row.displayQty,
                              row.availableCap,
                              row.fallbackQty
                            )
                          }
                          className="flex h-7 items-center justify-center gap-1.5 rounded-md border border-rose-200 px-2 text-[11px] font-semibold text-rose-600 hover:border-rose-300 hover:text-rose-700 leading-none"
                          aria-label="Remove item"
                          title="Remove"
                        >
                          <FiTrash2 className="h-3.5 w-3.5" />
                          <span>Delete</span>
                        </button>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2 sm:self-center">
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          SKU / Name
                        </div>
                        <div className="text-xs font-semibold text-slate-900">
                          {row.item.sku || "-"}
                        </div>
                        <div className="text-[11px] text-slate-600">
                          {row.item.name || "Unnamed item"}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 sm:contents">
                      <div className="flex flex-col justify-center gap-1 sm:self-center">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Requested
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900 tabular-nums">
                          <span>{row.requestedDisplay}</span>
                          {showAvailability ? (
                            <span
                              className={[
                                "inline-flex items-center rounded-full px-2 py-0.5 font-semibold",
                                row.availabilityTone || "text-slate-600",
                              ].join(" ")}
                            >
                              {`Hand ${row.onHandDisplay} / Avl ${row.availableDisplay}`}
                              {row.shortageDisplay ? (
                                <span className="ml-1">
                                  {`(Short ${row.shortageDisplay})`}
                                </span>
                              ) : null}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-500">
                              Stock hidden
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col justify-center gap-1 sm:self-center">
                        <div
                          className={[
                            "text-[10px] font-semibold uppercase tracking-wider text-slate-400",
                            isEditingQty && !row.isRemoved ? "" : "invisible",
                          ].join(" ")}
                        >
                          New qty
                        </div>
                        <div className="min-h-[36px] flex items-center">
                          {isEditingQty ? (
                            showAvailability ? (
                              row.isRemoved ? (
                                <div className="h-5" aria-hidden="true" />
                              ) : row.canAdjustQty ? (
                                <QuantityControl
                                  quantity={row.displayQty}
                                  setQuantity={(nextValue) =>
                                    adjustDraftQty(
                                      row.key,
                                      nextValue - row.displayQty,
                                      row.availableCap,
                                      row.fallbackQty
                                    )
                                  }
                                  min={0}
                                  max={row.availableCap}
                                  size="sm"
                                  compact
                                />
                              ) : (
                                <div className="text-xs text-slate-500">
                                  No stock available
                                </div>
                              )
                            ) : (
                              <span className="tabular-nums text-slate-900">
                                {row.qty}
                              </span>
                            )
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  {isEditingQty && row.canRemove && !row.isRemoved ? (
                    <button
                      type="button"
                      onClick={() =>
                        adjustDraftQty(
                          row.key,
                          -row.displayQty,
                          row.availableCap,
                          row.fallbackQty
                        )
                      }
                      className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-md border border-rose-200 bg-white text-rose-600 hover:border-rose-300 hover:text-rose-700 sm:hidden"
                      aria-label="Remove item"
                      title="Remove"
                    >
                      <FiTrash2 className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                  {isEditingQty && row.isRemoved ? (
                    <div className="absolute bottom-3 right-3 flex items-center gap-2 text-rose-700">
                      <span className="inline-flex items-center rounded-full border border-rose-200 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-rose-700">
                        Will be removed
                      </span>
                      {row.canRemove ? (
                        <button
                          type="button"
                          onClick={() =>
                            adjustDraftQty(
                              row.key,
                              row.fallbackQty - row.displayQty,
                              row.availableCap,
                              row.fallbackQty
                            )
                          }
                          className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-700 hover:bg-emerald-100"
                        >
                          <FiCornerUpLeft className="h-3.5 w-3.5" />
                          Undo
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {canUpdateQty && isEditingQty ? (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
          {allRemoved ? (
            <div className="text-xs font-semibold text-rose-600">
              At least one item must remain.
            </div>
          ) : null}
          <button
            type="button"
            onClick={onToggleEditQty}
            disabled={isUpdatingQty}
            className={[
              "inline-flex w-full items-center justify-center rounded-xl border px-4 py-2.5 text-xs font-semibold transition sm:w-auto",
              isUpdatingQty
                ? "cursor-not-allowed border-slate-200 bg-white text-slate-400"
                : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50",
            ].join(" ")}
          >
            Cancel Edit
          </button>
          <button
            type="button"
            onClick={onUpdateQty}
            disabled={saveDisabled}
            title={quoteLocked ? lockReason : undefined}
            className={[
              "inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white transition sm:w-auto",
              saveDisabled
                ? "cursor-not-allowed opacity-50"
                : "hover:bg-blue-500",
            ].join(" ")}
          >
            {isUpdatingQty ? "Updating..." : "Update"}
          </button>
        </div>
      ) : null}
    </StepCard>
  );
}
