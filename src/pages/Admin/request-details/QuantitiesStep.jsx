import { useEffect, useRef, useState } from "react";
import { FiRefreshCw } from "react-icons/fi";

import StepCard from "./StepCard";
import ErrorMessage from "../../../components/common/ErrorMessage";
import QuantityControlRequests from "../../../components/common/QantityControlRequests";
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
  editDraft,
  adjustDraftQty,
  quoteLocked,
  lockReason,
  showUpdateError,
  updateError,
}) {
  const [maxHit, setMaxHit] = useState({});
  const maxHitTimers = useRef({});

  useEffect(
    () => () => {
      Object.values(maxHitTimers.current).forEach(clearTimeout);
      maxHitTimers.current = {};
    },
    []
  );

  const triggerMaxHit = (key) => {
    if (!key) return;
    setMaxHit((prev) => ({ ...prev, [key]: true }));
    const timers = maxHitTimers.current;
    if (timers[key]) clearTimeout(timers[key]);
    timers[key] = setTimeout(() => {
      setMaxHit((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      delete timers[key];
    }, 1500);
  };

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
    const key = productKey;
    const draftQty = Number(editDraft?.[key]);
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
    const displayQty = showAvailability
      ? canAdjustQty
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
      canAdjustQty,
      displayQty,
      availableCap,
      fallbackQty,
      maxHitKey: productKey,
      qty,
    };
  });

  return (
    <StepCard
      n={2}
      title="Quantities"
      subtitle="Adjust quantities within stock."
      showNumber={false}
    >
      <div className="mb-3 grid gap-2 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="text-xs text-slate-500">
          {showAvailability
            ? stockCheckedAt
              ? `Stock checked ${stockCheckedAt}`
              : "No stock check yet."
            : "Stock check hidden for cancelled quotes."}
        </div>

        {showAvailability ? (
          <div className="flex flex-row items-center gap-2 justify-start lg:justify-end">
            <button
              type="button"
              onClick={onCheckStock}
              disabled={!canCheckStock || isCheckingStock}
              title={quoteLocked ? lockReason : undefined}
              className={[
                "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-xs font-semibold transition",
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
                "inline-flex items-center justify-center rounded-xl border px-3 py-3 text-xs font-semibold transition",
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

      <div className="space-y-3 md:hidden">
        {itemRows.map((row) => (
          <div
            key={row.key}
            className="rounded-xl border border-slate-200 bg-white p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-900">
                  {row.item.sku || "-"}
                </div>
                <div className="text-[11px] text-slate-500">
                  {row.item.name || "Unnamed item"}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Requested
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900 tabular-nums">
                  {row.requestedDisplay}
                </div>
              </div>
            </div>

            {showAvailability ? (
              <div className="mt-2 text-[11px] text-slate-600 tabular-nums">
                <span
                  className={[
                    "inline-flex items-center rounded-md px-2 py-0.5",
                    row.availabilityTone || "text-slate-600",
                  ].join(" ")}
                >
                  {`Hand ${row.onHandDisplay} / Avl ${row.availableDisplay}`}
                </span>
              </div>
            ) : null}

            {isEditingQty ? (
              <div className="mt-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  New Qty
                </div>
                <div className="mt-2">
                  {showAvailability ? (
                    row.canAdjustQty ? (
                      <QuantityControlRequests
                        value={row.displayQty}
                        onIncrease={() => {
                          const maxQty = Number(row.item.availableNow) || 0;
                          if (row.displayQty + 1 >= maxQty) {
                            triggerMaxHit(row.maxHitKey);
                          }
                          adjustDraftQty(
                            row.key,
                            1,
                            row.availableCap,
                            row.fallbackQty
                          );
                        }}
                        onDecrease={() =>
                          adjustDraftQty(
                            row.key,
                            -1,
                            row.availableCap,
                            row.fallbackQty
                          )
                        }
                        onChangeRaw={(rawValue) => {
                          const maxQty = row.availableCap;
                          if (!Number.isFinite(rawValue)) return;
                          const next = Math.max(0, rawValue);
                          adjustDraftQty(
                            row.key,
                            next - row.displayQty,
                            maxQty,
                            row.fallbackQty,
                            { allowAboveMax: true }
                          );
                        }}
                        onCommit={(rawValue) => {
                          const maxQty = row.availableCap;
                          const next = Math.max(
                            0,
                            Math.min(Number(rawValue) || 0, maxQty)
                          );
                          adjustDraftQty(
                            row.key,
                            next - row.displayQty,
                            maxQty,
                            row.fallbackQty
                          );
                        }}
                        min={0}
                        max={row.availableCap}
                        disableDecrease={row.displayQty <= 0}
                        maxHit={Boolean(maxHit[row.maxHitKey])}
                      />
                    ) : (
                      <span className="tabular-nums text-slate-900">
                        {row.displayQty}
                      </span>
                    )
                  ) : (
                    <span className="tabular-nums text-slate-900">{row.qty}</span>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full table-fixed text-left text-sm">
          <thead className="text-xs font-semibold text-slate-500">
            <tr className="border-b border-slate-200">
              <th className="w-[30%] py-2 pr-3">Item</th>
              <th className={`${isEditingQty ? "w-[45%]" : "w-[70%]"} py-2 pr-3`}>
                Qty
              </th>
              {isEditingQty ? (
                <th className="w-[25%] py-2 pr-3">New Qty</th>
              ) : null}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {itemRows.map((row) => (
              <tr key={row.key} className="hover:bg-slate-50">
                <td className="py-3 pr-3">
                  <div className="text-xs font-semibold text-slate-900">
                    {row.item.sku || "-"}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {row.item.name || "Unnamed item"}
                  </div>
                </td>

                <td className="py-3 pr-3">
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-slate-900 tabular-nums">
                      {row.requestedDisplay}
                    </div>
                    {showAvailability ? (
                      <div className="text-[11px] text-slate-600 tabular-nums">
                        <span
                          className={[
                            "inline-flex items-center rounded-md px-2 py-0.5",
                            row.availabilityTone || "text-slate-600",
                          ].join(" ")}
                        >
                          {`Hand ${row.onHandDisplay} / Avl ${row.availableDisplay}`}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </td>

                {isEditingQty ? (
                  <td className="py-3 pr-3 overflow-visible">
                    {showAvailability ? (
                      <div className="inline-flex items-center text-slate-900">
                        {row.canAdjustQty ? (
                          <QuantityControlRequests
                            value={row.displayQty}
                            onIncrease={() => {
                              const maxQty = Number(row.item.availableNow) || 0;
                              if (row.displayQty + 1 >= maxQty) {
                                triggerMaxHit(row.maxHitKey);
                              }
                              adjustDraftQty(
                                row.key,
                                1,
                                row.availableCap,
                                row.fallbackQty
                              );
                            }}
                            onDecrease={() =>
                              adjustDraftQty(
                                row.key,
                                -1,
                                row.availableCap,
                                row.fallbackQty
                              )
                            }
                            onChangeRaw={(rawValue) => {
                              const maxQty = row.availableCap;
                              if (!Number.isFinite(rawValue)) return;
                              const next = Math.max(0, rawValue);
                              adjustDraftQty(
                                row.key,
                                next - row.displayQty,
                                maxQty,
                                row.fallbackQty,
                                { allowAboveMax: true }
                              );
                            }}
                            onCommit={(rawValue) => {
                              const maxQty = row.availableCap;
                              const next = Math.max(
                                0,
                                Math.min(Number(rawValue) || 0, maxQty)
                              );
                              adjustDraftQty(
                                row.key,
                                next - row.displayQty,
                                maxQty,
                                row.fallbackQty
                              );
                            }}
                            min={0}
                            max={row.availableCap}
                            disableDecrease={row.displayQty <= 0}
                            maxHit={Boolean(maxHit[row.maxHitKey])}
                          />
                        ) : (
                          <span className="tabular-nums text-slate-900">
                            {row.displayQty}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="tabular-nums text-slate-900">
                        {row.qty}
                      </span>
                    )}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canUpdateQty ? (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onUpdateQty}
            disabled={updateQtyDisabled}
            title={quoteLocked ? lockReason : undefined}
          className={[
              "inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white transition sm:w-auto",
              updateQtyDisabled
                ? "cursor-not-allowed opacity-50"
                : "hover:bg-blue-500",
            ].join(" ")}
          >
            {isUpdatingQty ? "Updating..." : "Update Quantity"}
          </button>
        </div>
      ) : null}
    </StepCard>
  );
}
