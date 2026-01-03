import { useMemo, useState } from "react";
import ErrorMessage from "../common/ErrorMessage";
import { useGetSlotItemsByProductQuery } from "../../features/slotItems/slotItemsApiSlice";
import {
  useGetOrderAllocationsQuery,
  useUpsertOrderAllocationMutation,
  useDeleteOrderAllocationMutation,
} from "../../features/orderAllocations/orderAllocationsApiSlice";

function resolveProductId(product) {
  if (!product) return "";
  if (typeof product === "string") return product;
  if (typeof product === "object") {
    if (product._id) return String(product._id);
    if (product.id) return String(product.id);
    if (typeof product.toString === "function") return String(product);
  }
  return "";
}

function resolveEntityId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    if (value._id) return String(value._id);
    if (value.id) return String(value.id);
    if (typeof value.toString === "function") return String(value);
  }
  return "";
}

function lineTotal(item) {
  if (!item) return 0;
  if (typeof item.lineTotal === "number") return item.lineTotal;
  const qty = Number(item.qty) || 0;
  const unit = Number(item.unitPrice) || 0;
  return qty * unit;
}

function SlotItemsPanel({
  orderId,
  productId,
  orderedQty,
  allocatedTotal,
  allocationsBySlot,
  allocationsList,
}) {
  const [open, setOpen] = useState(false);
  const isDisabled = !productId || !orderId;
  const shouldSkip = !open || isDisabled;
  const [drafts, setDrafts] = useState({});
  const [localError, setLocalError] = useState("");
  const [actionError, setActionError] = useState("");
  const [isBulkPicking, setIsBulkPicking] = useState(false);
  const [isBulkUnpicking, setIsBulkUnpicking] = useState(false);
  const ordered = Number(orderedQty || 0);
  const allocated = Number(allocatedTotal || 0);
  const remainingQty = Math.max(0, ordered - allocated);

  const { data, isFetching, isError, error } = useGetSlotItemsByProductQuery(
    productId,
    { skip: shouldSkip }
  );

  const [
    saveAllocation,
    { isLoading: isSaving, error: saveError },
  ] = useUpsertOrderAllocationMutation();
  const [
    removeAllocation,
    { isLoading: isDeleting, error: deleteError },
  ] = useDeleteOrderAllocationMutation();

  const rows = Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data)
      ? data
      : [];

  const combinedError = saveError || deleteError;
  const isBusy = isSaving || isDeleting || isBulkPicking || isBulkUnpicking;
  const hasPicks = Array.isArray(allocationsList) && allocationsList.length > 0;

  const resolveLimits = (availableQty, existingQty) => {
    const remainingAllowed = Math.max(0, ordered - (allocated - existingQty));
    const maxAllowed = Math.min(Number(availableQty || 0), remainingAllowed);
    return { maxAllowed, remainingAllowed };
  };

  const suggestedDrafts = useMemo(() => {
    const result = {};
    let remainingToFill = remainingQty;

    for (const row of rows) {
      const slotId = resolveEntityId(row.slot);
      if (!slotId) continue;

      const existingQty = Number(allocationsBySlot?.get(slotId)?.qty) || 0;
      if (existingQty > 0) continue;

      if (remainingToFill <= 0) {
        result[slotId] = "";
        continue;
      }

      const availableQty = Number(row.qty) || 0;
      const suggested = Math.min(availableQty, remainingToFill);
      if (suggested > 0) {
        result[slotId] = String(suggested);
        remainingToFill -= suggested;
      } else {
        result[slotId] = "";
      }
    }

    return result;
  }, [rows, remainingQty, allocationsBySlot]);

  const resolveDraftValue = ({ slotId, existingQty }) => {
    if (drafts[slotId] !== undefined) {
      return drafts[slotId];
    }
    if (existingQty) {
      return String(existingQty);
    }
    if (suggestedDrafts[slotId] !== undefined) {
      return suggestedDrafts[slotId];
    }
    return "";
  };

  const handlePick = async ({ slotId, availableQty, existing, draftValue }) => {
    if (!orderId || !productId) return;
    setLocalError("");
    setActionError("");

    const raw = draftValue;
    const parsed =
      raw === undefined ? Number(existing?.qty || 0) : Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setLocalError("Enter a valid pick quantity.");
      return;
    }

    const existingQty = Number(existing?.qty) || 0;
    const allocationId = resolveEntityId(existing);
    const { maxAllowed } = resolveLimits(availableQty, existingQty);

    if (parsed === 0) {
      if (allocationId) {
        try {
          await removeAllocation({
            orderId,
            allocationId,
          }).unwrap();
        } catch (err) {
          setActionError(err?.data?.message || "Failed to unpick slot.");
          return;
        }
        setDrafts((prev) => {
          const next = { ...prev };
          delete next[slotId];
          return next;
        });
      } else {
        setLocalError("Pick qty must be at least 1.");
      }
      return;
    }

    if (parsed > maxAllowed) {
      setLocalError(`Pick qty cannot exceed ${maxAllowed}.`);
      return;
    }

    try {
      await saveAllocation({
        orderId,
        productId,
        slotId,
        qty: parsed,
      }).unwrap();
    } catch (err) {
      setActionError(err?.data?.message || "Failed to save pick.");
      return;
    }

    setDrafts((prev) => {
      const next = { ...prev };
      delete next[slotId];
      return next;
    });
  };

  const handlePickAll = async () => {
    if (!orderId || !productId) return;
    setLocalError("");
    setActionError("");

    if (remainingQty <= 0) {
      setLocalError("Nothing left to pick for this item.");
      return;
    }

    setIsBulkPicking(true);
    const touchedSlots = [];
    let remainingToFill = remainingQty;
    let pickedCount = 0;

    try {
      for (const row of rows) {
        if (remainingToFill <= 0) break;
        const slotId = resolveEntityId(row.slot);
        if (!slotId) continue;

        const existingQty = Number(allocationsBySlot?.get(slotId)?.qty) || 0;
        if (existingQty > 0) continue;

        const availableQty = Number(row.qty) || 0;
        const pickQty = Math.min(availableQty, remainingToFill);
        if (pickQty <= 0) continue;

        await saveAllocation({
          orderId,
          productId,
          slotId,
          qty: pickQty,
        }).unwrap();

        touchedSlots.push(slotId);
        pickedCount += 1;
        remainingToFill -= pickQty;
      }

      if (pickedCount === 0) {
        setLocalError("No available slots to pick from.");
      } else if (remainingToFill > 0) {
        setActionError(
          `Not enough stock to cover the remaining qty. ${remainingToFill} still unpicked.`
        );
      } else if (touchedSlots.length) {
        setDrafts((prev) => {
          const next = { ...prev };
          for (const slotId of touchedSlots) {
            delete next[slotId];
          }
          return next;
        });
      }
    } catch (err) {
      setActionError(err?.data?.message || "Failed to pick all slots.");
    } finally {
      setIsBulkPicking(false);
    }
  };

  const handleUnpick = async ({ slotId, existing }) => {
    if (!orderId) return;
    const allocationId = resolveEntityId(existing);
    if (!allocationId) return;
    setLocalError("");
    setActionError("");

    try {
      await removeAllocation({
        orderId,
        allocationId,
      }).unwrap();
    } catch (err) {
      setActionError(err?.data?.message || "Failed to unpick slot.");
      return;
    }

    setDrafts((prev) => {
      const next = { ...prev };
      delete next[slotId];
      return next;
    });
  };

  const handleUnpickAll = async () => {
    if (!orderId || !hasPicks) return;
    const confirmed = window.confirm("Remove all picks for this item?");
    if (!confirmed) return;
    setLocalError("");
    setActionError("");
    setIsBulkUnpicking(true);

    try {
      for (const allocation of allocationsList || []) {
        const allocationId = resolveEntityId(allocation);
        if (!allocationId) continue;
        await removeAllocation({
          orderId,
          allocationId,
        }).unwrap();
      }
      setDrafts({});
    } catch (err) {
      setActionError(err?.data?.message || "Failed to unpick all slots.");
    } finally {
      setIsBulkUnpicking(false);
    }
  };

  const summaryRows = Array.isArray(allocationsList)
    ? allocationsList.map((row, index) => ({
        id:
          resolveEntityId(row) ||
          `${resolveEntityId(row.slot) || "slot"}-${index}`,
        label: row.slot?.label || "Slot",
        qty: Number(row.qty) || 0,
      }))
    : [];
  const pickAllDisabled =
    isDisabled || isBusy || isFetching || rows.length === 0 || remainingQty <= 0;
  const unpickAllDisabled = isDisabled || isBusy || !hasPicks;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        disabled={isDisabled}
        title={isDisabled ? "Product reference missing." : ""}
        aria-expanded={open}
        className={[
          "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition",
          !isDisabled
            ? open
              ? "border-slate-900 bg-white text-slate-900"
              : "border-slate-900 bg-slate-900 text-white hover:bg-slate-800"
            : "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400",
        ].join(" ")}
      >
        <span>{open ? "Close" : "Allocate"}</span>
        <span className="text-[10px] leading-none">{open ? "v" : ">"}</span>
      </button>
      {isDisabled ? (
        <div className="mt-2 text-[11px] text-slate-500">
          Product reference missing for this item.
        </div>
      ) : null}

      {open ? (
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50/60">
          {isFetching ? (
            <div className="px-4 py-3 text-xs text-slate-500">
              Loading slots...
            </div>
          ) : isError ? (
            <div className="p-3">
              <ErrorMessage error={error} />
            </div>
          ) : rows.length === 0 ? (
            <div className="px-4 py-3 text-xs text-slate-500">
              No slot items found for this product.
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-end gap-2 border-b border-slate-200 px-4 py-2">
                <button
                  type="button"
                  onClick={handlePickAll}
                  disabled={pickAllDisabled}
                  title={
                    remainingQty <= 0
                      ? "Nothing left to pick."
                      : "Pick remaining qty across available slots."
                  }
                  className={[
                    "inline-flex items-center rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition",
                    pickAllDisabled
                      ? "border-emerald-100 bg-emerald-50/40 text-emerald-300"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
                    "disabled:cursor-not-allowed",
                  ].join(" ")}
                >
                  Pick all
                </button>
                <button
                  type="button"
                  onClick={handleUnpickAll}
                  disabled={unpickAllDisabled}
                  title={hasPicks ? "Remove all picks for this item." : "No picks yet."}
                  className={[
                    "inline-flex items-center rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition",
                    unpickAllDisabled
                      ? "border-rose-100 bg-rose-50/40 text-rose-300"
                      : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
                    "disabled:cursor-not-allowed",
                  ].join(" ")}
                >
                  Unpick all
                </button>
              </div>
              {actionError ? (
                <div className="border-b border-slate-200 px-4 py-2 text-[11px] text-rose-600">
                  {actionError}
                </div>
              ) : null}
              <div className="grid grid-cols-1 gap-3 p-3 lg:grid-cols-[1fr_240px]">
                <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                  <div className="grid grid-cols-12 gap-2 border-b border-slate-200 px-4 py-2 text-center text-[11px] font-semibold text-slate-600">
                    <div className="col-span-4">Slot</div>
                    <div className="col-span-2">Available</div>
                    <div className="col-span-2">Picked</div>
                    <div className="col-span-2">Pick qty</div>
                    <div className="col-span-2">Actions</div>
                  </div>
                  {rows.map((row) => {
                    const slotId = resolveEntityId(row.slot);
                    const existing = allocationsBySlot?.get(slotId);
                    const existingQty = Number(existing?.qty) || 0;
                    const allocationId = resolveEntityId(existing);
                    const availableQty = Number(row.qty) || 0;
                    const draftValue = resolveDraftValue({
                      slotId,
                      existingQty,
                    });

                    return (
                      <div
                        key={row._id}
                        className="grid grid-cols-12 gap-2 border-b border-slate-100 px-4 py-2 text-center text-xs text-slate-700 last:border-b-0"
                      >
                        <div className="col-span-4 font-semibold text-slate-900">
                          {row.slot?.label || "Unknown slot"}
                        </div>
                        <div className="col-span-2 tabular-nums">
                          {availableQty}
                        </div>
                        <div className="col-span-2 tabular-nums">
                          {existingQty}
                        </div>
                        <div className="col-span-2 flex justify-center">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={draftValue}
                            onChange={(e) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [slotId]: e.target.value,
                              }))
                            }
                            placeholder="0"
                            className="w-full max-w-[84px] rounded-md bg-white px-2 py-1 text-center text-xs text-slate-700 ring-1 ring-slate-200"
                          />
                        </div>
                        <div className="col-span-2 flex items-center justify-center gap-2 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              handlePick({
                                slotId,
                                availableQty,
                                existing,
                                draftValue,
                              })
                            }
                            disabled={isDisabled || isBusy}
                            className={[
                              "inline-flex min-w-[52px] items-center justify-center rounded-md border px-2 py-1 text-[11px] font-semibold transition",
                              isDisabled || isBusy
                                ? "border-emerald-100 bg-emerald-50/40 text-emerald-300"
                                : "border-emerald-200 bg-emerald-50/60 text-emerald-600 hover:bg-emerald-50",
                              "disabled:cursor-not-allowed",
                            ].join(" ")}
                          >
                            Pick
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleUnpick({
                                slotId,
                                existing,
                              })
                            }
                            disabled={isDisabled || isBusy || !allocationId}
                            title={
                              allocationId
                                ? "Remove this pick."
                                : "Nothing to unpick."
                            }
                            className={[
                              "inline-flex min-w-[52px] items-center justify-center rounded-md border px-2 py-1 text-[11px] font-semibold transition",
                              allocationId
                                ? "border-rose-200 bg-rose-50/60 text-rose-600 hover:bg-rose-50"
                                : "border-rose-100 bg-rose-50/30 text-rose-300",
                              "disabled:cursor-not-allowed",
                            ].join(" ")}
                          >
                            Unpick
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {localError ? (
                    <div className="border-t border-slate-200 px-4 py-2 text-[11px] text-rose-600">
                      {localError}
                    </div>
                  ) : combinedError ? (
                    <div className="border-t border-slate-200 px-4 py-2 text-[11px] text-rose-600">
                      {combinedError?.data?.message || "Failed to save pick."}
                    </div>
                  ) : null}
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="text-center text-[11px] font-semibold text-slate-700">
                    Picked summary
                  </div>
                  {summaryRows.length ? (
                    <div className="mt-2 space-y-1 text-xs text-slate-700">
                      {summaryRows.map((row) => (
                        <div
                          key={row.id}
                          className="flex items-center justify-between gap-2"
                        >
                          <span className="truncate">{row.label}</span>
                          <span className="tabular-nums font-semibold text-slate-900">
                            {row.qty}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-2 text-center text-[11px] text-slate-500">
                      No picks yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function AdminOrderAllocation({
  orderId,
  items,
  formatMoney,
  showPricing = true,
  showSlots = true,
  title = "Items",
}) {
  const rows = Array.isArray(items) ? items : [];
  const money =
    typeof formatMoney === "function" ? formatMoney : (value) => value;
  const isAllocationView = showSlots && !showPricing;
  const shouldLoadAllocations = Boolean(orderId) && isAllocationView;

  const {
    data: allocationsResult,
    isLoading: isAllocationsLoading,
    isError: isAllocationsError,
    error: allocationsError,
  } = useGetOrderAllocationsQuery(orderId, { skip: !shouldLoadAllocations });

  const allocations = Array.isArray(allocationsResult?.data)
    ? allocationsResult.data
    : Array.isArray(allocationsResult)
      ? allocationsResult
      : [];

  const allocationsByProduct = useMemo(() => {
    const map = new Map();
    for (const row of allocations) {
      const productId = resolveProductId(row.product);
      const slotId = resolveEntityId(row.slot);
      if (!productId || !slotId) continue;
      const entry =
        map.get(productId) || { total: 0, bySlot: new Map(), list: [] };
      const qty = Number(row.qty) || 0;
      entry.total += qty;
      entry.bySlot.set(slotId, row);
      entry.list.push(row);
      map.set(productId, entry);
    }
    return map;
  }, [allocations]);

  if (isAllocationView) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold text-slate-900">{title}</div>
            <div className="text-xs text-slate-500">
              {rows.length} item{rows.length !== 1 ? "s" : ""}
            </div>
          </div>
          {isAllocationsLoading ? (
            <div className="mt-2 text-xs text-slate-500">
              Loading picks...
            </div>
          ) : null}
          {isAllocationsError ? (
            <div className="mt-2">
              <ErrorMessage error={allocationsError} />
            </div>
          ) : null}
        </div>

        {rows.length === 0 ? (
          <div className="rounded-2xl bg-white p-4 text-sm text-slate-600 ring-1 ring-slate-200">
            No items in this order.
          </div>
        ) : (
          rows.map((it, idx) => {
            const name =
              it?.product?.name ||
              (typeof it?.product === "string" ? it.product : "") ||
              "Untitled product";
            const sku = it?.sku || it?.product?.sku || "";
            const productId = resolveProductId(it?.product);
            const orderedQty = Number(it?.qty) || 0;
            const allocationInfo =
              allocationsByProduct.get(productId) || {
                total: 0,
                bySlot: new Map(),
                list: [],
              };
            const pickedQty = Number(allocationInfo.total) || 0;
            const remainingQty = Math.max(0, orderedQty - pickedQty);

            return (
              <div
                key={`${orderId || "order"}-${idx}`}
                className="rounded-2xl bg-white p-4 ring-1 ring-slate-200"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">
                      {name}
                    </div>
                    {sku ? (
                      <div className="text-xs text-slate-500">
                        SKU: {sku}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                    <span className="rounded-lg bg-slate-100 px-2 py-1">
                      Ordered{" "}
                      <span className="ml-1 font-semibold text-slate-900 tabular-nums">
                        {orderedQty}
                      </span>
                    </span>
                    <span className="rounded-lg bg-slate-100 px-2 py-1">
                      Picked{" "}
                      <span className="ml-1 font-semibold text-slate-900 tabular-nums">
                        {pickedQty}
                      </span>
                    </span>
                    <span className="rounded-lg bg-slate-100 px-2 py-1">
                      Remaining{" "}
                      <span className="ml-1 font-semibold text-slate-900 tabular-nums">
                        {remainingQty}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="mt-3">
                  <SlotItemsPanel
                    orderId={orderId}
                    productId={productId}
                    orderedQty={orderedQty}
                    allocatedTotal={pickedQty}
                    allocationsBySlot={allocationInfo.bySlot}
                    allocationsList={allocationInfo.list}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
      <div className="border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          <div className="text-xs text-slate-500">
            {rows.length} item{rows.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {showPricing ? (
        <div className="grid grid-cols-12 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700">
          <div className="col-span-6">Product</div>
          <div className="col-span-2 text-right">Qty</div>
          <div className="col-span-2 text-right">Unit</div>
          <div className="col-span-2 text-right">Total</div>
        </div>
      ) : (
        <div className="grid grid-cols-12 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700">
          <div className="col-span-9">Product</div>
          <div className="col-span-3 text-right">Qty</div>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="px-4 py-4 text-sm text-slate-600">
          No items in this order.
        </div>
      ) : (
        rows.map((it, idx) => {
          const name =
            it?.product?.name ||
            (typeof it?.product === "string" ? it.product : "") ||
            "Untitled product";
          const sku = it?.sku || it?.product?.sku || "";
          const productId = resolveProductId(it?.product);
          const qty = Number(it?.qty) || 0;
          const unit = Number(it?.unitPrice) || 0;
          const totalLine = showPricing ? lineTotal(it) : 0;

          return (
            <div
              key={`${orderId || "order"}-${idx}`}
              className="border-t border-slate-200"
            >
              <div className="grid grid-cols-12 items-center px-4 py-3 text-sm text-slate-800">
                <div className={showPricing ? "col-span-6 min-w-0" : "col-span-9 min-w-0"}>
                  <div className="truncate font-semibold text-slate-900">
                    {name}
                  </div>
                  {sku ? (
                    <div className="text-xs text-slate-500">SKU: {sku}</div>
                  ) : null}
                </div>
                <div className={showPricing ? "col-span-2 text-right tabular-nums" : "col-span-3 text-right tabular-nums"}>
                  {qty}
                </div>
                {showPricing ? (
                  <div className="col-span-2 text-right tabular-nums">
                    {money(unit)}
                  </div>
                ) : null}
                {showPricing ? (
                  <div className="col-span-2 text-right tabular-nums font-semibold text-slate-900">
                    {money(totalLine)}
                  </div>
                ) : null}
              </div>
              {showSlots ? (
                <div className="px-4 pb-3">
                  <SlotItemsPanel productId={productId} />
                </div>
              ) : null}
            </div>
          );
        })
      )}
    </div>
  );
}
