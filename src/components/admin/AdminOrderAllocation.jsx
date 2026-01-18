import { useEffect, useMemo, useState } from "react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
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

function formatDateTime(iso) {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatUserLabel(user) {
  if (!user) return { name: "-", email: "" };
  if (typeof user === "string") return { name: user, email: "" };
  const name = user?.name || user?.email || "-";
  const email = user?.name && user?.email ? user.email : "";
  return { name, email };
}

const ALLOCATION_STATUS_STYLES = {
  Reserved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Deducted: "bg-slate-100 text-slate-600 ring-slate-200",
  Cancelled: "bg-rose-50 text-rose-700 ring-rose-200",
};

const normalizeAllocationStatus = (status) =>
  status === "Deducted" || status === "Cancelled" ? status : "Reserved";

function SlotItemsPanel({
  orderId,
  productId,
  orderedQty,
  allocatedTotal,
  allocationsBySlot,
  allocationsList,
  allocationSummaryList,
  showAllocationHistory = false,
  isLocked = false,
  lockMessage = "",
  onAvailabilityChange,
  buttonPlacement = "inline",
  buttonWrapperClassName = "",
}) {
  const [open, setOpen] = useState(false);
  const isDisabled = !productId || !orderId;
  const shouldSkip = isDisabled || !open;
  const showLockedMessage = isLocked && Boolean(lockMessage);
  const [drafts, setDrafts] = useState({});
  const [localError, setLocalError] = useState("");
  const [actionError, setActionError] = useState("");
  const [isBulkPicking, setIsBulkPicking] = useState(false);
  const [isBulkUnpicking, setIsBulkUnpicking] = useState(false);
  const showHistory =
    showAllocationHistory &&
    Array.isArray(allocationSummaryList) &&
    allocationSummaryList.length > 0;
  const ordered = Number(orderedQty || 0);
  const reservedTotal = Number(allocatedTotal || 0);
  const remainingQty = Math.max(0, ordered - reservedTotal);

  const { data, isFetching, isError, error } = useGetSlotItemsByProductQuery(
    { productId, orderId },
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

  const rows = useMemo(() => {
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data)) return data;
    return [];
  }, [data]);
  const isLoading = isFetching;
  const showError = isError;
  const displayError = error;

  useEffect(() => {
    if (!open || typeof onAvailabilityChange !== "function") return;
    if (isLoading) {
      onAvailabilityChange({ status: "loading" });
      return;
    }
    if (showError) {
      onAvailabilityChange({ status: "error" });
      return;
    }

    const totals = rows.reduce(
      (acc, row) => {
        const onHandQty = Number(row?.qty) || 0;
        const availableQty = Number(row?.availableQty ?? row?.qty) || 0;
        const slotId = resolveEntityId(row?.slot);
        const existingQty = slotId
          ? Number(allocationsBySlot?.get(slotId)?.qty) || 0
          : 0;
        const availableForOrder = Math.max(0, availableQty - existingQty);
        acc.onHandTotal += onHandQty;
        acc.availableTotal += availableForOrder;
        return acc;
      },
      { onHandTotal: 0, availableTotal: 0 }
    );
    onAvailabilityChange({ status: "ready", ...totals });
  }, [open, isLoading, showError, rows, allocationsBySlot, onAvailabilityChange]);

  const combinedError = saveError || deleteError;
  const isBusy = isSaving || isDeleting || isBulkPicking || isBulkUnpicking;
  const hasReservations =
    Array.isArray(allocationsList) && allocationsList.length > 0;

  const resolveLimits = (availableQty, existingQty) => {
    const remainingAllowed = Math.max(
      0,
      ordered - (reservedTotal - existingQty)
    );
    const maxAllowed = Math.min(Number(availableQty || 0), remainingAllowed);
    return { maxAllowed, remainingAllowed };
  };

  const suggestedDrafts = useMemo(() => {
    const result = {};
    let remainingToFill = remainingQty;

    for (const row of rows) {
      const slotId = resolveEntityId(row.slot);
      if (!slotId) continue;

      const onHandQty = Number(row.qty) || 0;
      if (onHandQty <= 0) {
        result[slotId] = "";
        continue;
      }

      const existingQty = Number(allocationsBySlot?.get(slotId)?.qty) || 0;
      if (existingQty > 0) continue;

      if (remainingToFill <= 0) {
        result[slotId] = "";
        continue;
      }

      const availableQty = Number(row.availableQty ?? row.qty) || 0;
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
    if (!orderId || !productId || isLocked) return;
    setLocalError("");
    setActionError("");

    const available = Number(availableQty || 0);
    const existingQty = Number(existing?.qty) || 0;
    const availableForOrder = Math.max(0, available - existingQty);
    if (availableForOrder <= 0 && existingQty === 0) {
      setLocalError("No available stock in this slot.");
      return;
    }

    const raw = draftValue;
    const parsed =
      raw === undefined ? Number(existing?.qty || 0) : Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setLocalError("Enter a valid reserve quantity.");
      return;
    }

    const allocationId = resolveEntityId(existing);
    if (availableForOrder <= 0 && parsed >= existingQty) {
      setLocalError("No available stock in this slot.");
      return;
    }
    const { maxAllowed } = resolveLimits(availableQty, existingQty);

    if (parsed === 0) {
      setLocalError(
        allocationId
          ? "Use Unreserve to remove this reservation."
          : "Reserve qty must be at least 1."
      );
      return;
    }

    if (parsed > maxAllowed) {
      setLocalError(`Reserve qty cannot exceed ${maxAllowed}.`);
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
      setActionError(err?.data?.message || "Failed to save reservation.");
      return;
    }

    setDrafts((prev) => {
      const next = { ...prev };
      delete next[slotId];
      return next;
    });
  };

  const handlePickAll = async () => {
    if (!orderId || !productId || isLocked) return;
    setLocalError("");
    setActionError("");

    if (remainingQty <= 0) {
      setLocalError("Nothing left to reserve for this item.");
      return;
    }

    setIsBulkPicking(true);
    const touchedSlots = [];
    let remainingToFill = remainingQty;
    let reservedCount = 0;

    try {
      for (const row of rows) {
        if (remainingToFill <= 0) break;
        const slotId = resolveEntityId(row.slot);
        if (!slotId) continue;

        const onHandQty = Number(row.qty) || 0;
        if (onHandQty <= 0) continue;

        const existingQty = Number(allocationsBySlot?.get(slotId)?.qty) || 0;
        if (existingQty > 0) continue;

        const availableQty = Number(row.availableQty ?? row.qty) || 0;
        if (availableQty <= 0) continue;
        const pickQty = Math.min(availableQty, remainingToFill);
        if (pickQty <= 0) continue;

        await saveAllocation({
          orderId,
          productId,
          slotId,
          qty: pickQty,
        }).unwrap();

        touchedSlots.push(slotId);
        reservedCount += 1;
        remainingToFill -= pickQty;
      }

      if (reservedCount === 0) {
        setLocalError("No available slots to reserve from.");
      } else if (remainingToFill > 0) {
        setActionError(
          `Not enough stock to cover the remaining qty. ${remainingToFill} still unreserved.`
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
      setActionError(err?.data?.message || "Failed to reserve all slots.");
    } finally {
      setIsBulkPicking(false);
    }
  };

  const handleUnpick = async ({ slotId, existing }) => {
    if (!orderId || isLocked) return;
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
      setActionError(err?.data?.message || "Failed to unreserve slot.");
      return;
    }

    setDrafts((prev) => {
      const next = { ...prev };
      delete next[slotId];
      return next;
    });
  };

  const handleUnpickAll = async () => {
    if (!orderId || !hasReservations || isLocked) return;
    const confirmed = window.confirm("Remove all reservations for this item?");
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
      setActionError(err?.data?.message || "Failed to unreserve all slots.");
    } finally {
      setIsBulkUnpicking(false);
    }
  };

  const allocationStatusBySlot = useMemo(() => {
    const map = new Map();
    if (!Array.isArray(allocationSummaryList)) return map;
    for (const row of allocationSummaryList) {
      const slotId = resolveEntityId(row.slot);
      if (!slotId) continue;
      map.set(slotId, normalizeAllocationStatus(row.status));
    }
    return map;
  }, [allocationSummaryList]);
  const pickAllDisabled =
    isDisabled ||
    isBusy ||
    isFetching ||
    isLocked ||
    rows.length === 0 ||
    remainingQty <= 0;
  const unpickAllDisabled =
    isDisabled || isBusy || isLocked || !hasReservations;

  const buttonNode = (
    <>
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
        <span>{open ? "Close" : showHistory ? "View allocations" : "Reserve"}</span>
        {open ? (
          <FiChevronUp className="h-4 w-4" />
        ) : (
          <FiChevronDown className="h-4 w-4" />
        )}
      </button>
      {isDisabled ? (
        <div className="mt-2 text-[11px] text-slate-500">
          Product reference missing for this item.
        </div>
      ) : showLockedMessage ? (
        <div className="mt-2 text-[11px] text-slate-500">{lockMessage}</div>
      ) : null}
    </>
  );

  return (
    <div>
      {buttonPlacement === "corner" ? (
        <div className={buttonWrapperClassName}>{buttonNode}</div>
      ) : (
        buttonNode
      )}

      {open ? (
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50/60">
          {showHistory ? (
            <div>
              <div className="border-b border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600">
                Allocation history
              </div>
              <div className="p-3">
                <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                  <div className="grid grid-cols-12 gap-3 border-b border-slate-200 px-4 py-2 text-center text-[11px] font-semibold text-slate-600">
                    <div className="col-span-2">Slot</div>
                    <div className="col-span-1">Qty</div>
                    <div className="col-span-1">Status</div>
                    <div className="col-span-2">Reserved by</div>
                    <div className="col-span-2">Reserved at</div>
                    <div className="col-span-2">Deducted by</div>
                    <div className="col-span-2">Deducted at</div>
                  </div>
                  {(allocationSummaryList || []).map((row) => {
                    const slotLabel = row?.slot?.label || "Unknown slot";
                    const status = normalizeAllocationStatus(row?.status);
                    const reservedBy = formatUserLabel(row?.by);
                    const deductedBy = formatUserLabel(row?.deductedBy);
                    return (
                      <div
                        key={row?.id || row?._id || `${slotLabel}-${row?.qty}`}
                        className="grid grid-cols-12 gap-3 border-b border-slate-100 px-4 py-2 text-center text-xs text-slate-700 odd:bg-slate-100/60 last:border-b-0"
                      >
                        <div className="col-span-2 font-semibold text-slate-900">
                          {slotLabel}
                        </div>
                        <div className="col-span-1 tabular-nums">
                          {Number(row?.qty) || 0}
                        </div>
                        <div className="col-span-1 flex items-center justify-center">
                          <span
                            className={[
                              "inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold ring-1 ring-inset",
                              ALLOCATION_STATUS_STYLES[status] ||
                                ALLOCATION_STATUS_STYLES.Reserved,
                            ].join(" ")}
                          >
                            {status}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <div className="font-semibold text-slate-900">
                            {reservedBy.name}
                          </div>
                          {reservedBy.email ? (
                            <div className="text-[10px] text-slate-500">
                              {reservedBy.email}
                            </div>
                          ) : null}
                        </div>
                        <div className="col-span-2 text-[10px] text-slate-600">
                          {formatDateTime(row?.createdAt)}
                        </div>
                        <div className="col-span-2">
                          <div className="font-semibold text-slate-900">
                            {deductedBy.name}
                          </div>
                          {deductedBy.email ? (
                            <div className="text-[10px] text-slate-500">
                              {deductedBy.email}
                            </div>
                          ) : null}
                        </div>
                        <div className="col-span-2 text-[10px] text-slate-600">
                          {formatDateTime(row?.deductedAt)}
                        </div>
                      </div>
                    );
                  })}
                  {(allocationSummaryList || []).length === 0 ? (
                    <div className="px-4 py-3 text-xs text-slate-500">
                      No allocations found for this item.
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : isLoading ? (
            <div className="px-4 py-3 text-xs text-slate-500">
              Loading slots...
            </div>
          ) : showError ? (
            <div className="p-3">
              <ErrorMessage error={displayError} />
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
                      ? "Nothing left to reserve."
                      : "Reserve remaining qty across available slots."
                  }
                  className={[
                    "inline-flex items-center rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition",
                    pickAllDisabled
                      ? "border-emerald-200 bg-emerald-100 text-emerald-300"
                      : "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700",
                    "disabled:cursor-not-allowed",
                  ].join(" ")}
                >
                  Reserve all
                </button>
                <button
                  type="button"
                  onClick={handleUnpickAll}
                  disabled={unpickAllDisabled}
                  title={
                    hasReservations
                      ? "Remove all reservations for this item."
                      : "No reservations yet."
                  }
                  className={[
                    "inline-flex items-center rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition",
                    unpickAllDisabled
                      ? "border-rose-200 bg-white text-rose-300"
                      : "border-rose-300 bg-white text-rose-700 hover:bg-rose-50",
                    "disabled:cursor-not-allowed",
                  ].join(" ")}
                >
                  Unreserve all
                </button>
              </div>
              {actionError ? (
                <div className="border-b border-slate-200 px-4 py-2 text-[11px] text-rose-600">
                  {actionError}
                </div>
              ) : null}
              <div className="p-3">
                <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                  <div className="grid grid-cols-12 gap-3 border-b border-slate-200 px-4 py-2 text-center text-[11px] font-semibold text-slate-600">
                    <div className="col-span-2">Slot</div>
                    <div className="col-span-2 leading-tight">
                      <div>On hand</div>
                      <div className="text-[10px] text-slate-400">Available</div>
                    </div>
                    <div className="col-span-2">Reserved</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-2">Reserve</div>
                    <div className="col-span-2">Unreserve</div>
                  </div>
                  {rows.map((row) => {
                    const slotId = resolveEntityId(row.slot);
                    const existing = allocationsBySlot?.get(slotId);
                    const existingQty = Number(existing?.qty) || 0;
                    const allocationId = resolveEntityId(existing);
                    const allocationStatus = allocationStatusBySlot.get(slotId) || "-";
                    const onHandQty = Number(row.qty) || 0;
                    const availableQty = Number(row.availableQty ?? row.qty) || 0;
                    const availableForOrder = Math.max(0, availableQty - existingQty);
                    const isOutOfStock = onHandQty <= 0;
                    const draftValue = resolveDraftValue({
                      slotId,
                      existingQty,
                    });
                    const desiredQty =
                      draftValue === "" ? NaN : Number(draftValue);
                    const isFullyReserved = remainingQty === 0 && existingQty === 0;
                    const isAlreadyReserved = existingQty > 0;
                    const reserveDisabled =
                      isDisabled ||
                      isBusy ||
                      isLocked ||
                      isAlreadyReserved ||
                      isFullyReserved ||
                      isOutOfStock ||
                      (availableForOrder <= 0 &&
                        (existingQty === 0 ||
                          (Number.isFinite(desiredQty) &&
                            desiredQty >= existingQty)));
                    const reserveTitle =
                      isAlreadyReserved
                        ? "Already reserved. Unreserve to change."
                        : isFullyReserved
                        ? "Order fully reserved. Reduce another slot first."
                        : isOutOfStock
                        ? "No stock in this slot."
                        : availableForOrder <= 0
                        ? "No available stock. Reduce qty to adjust."
                        : "";

                    return (
                      <div
                        key={row._id}
                        className="grid grid-cols-12 gap-3 border-b border-slate-100 px-4 py-2 text-center text-xs text-slate-700 odd:bg-slate-100/60 last:border-b-0"
                      >
                        <div className="col-span-2 font-semibold text-slate-900">
                          {row.slot?.label || "Unknown slot"}
                        </div>
                        <div className="col-span-2 space-y-0.5 text-center">
                          <div className="tabular-nums">{onHandQty}</div>
                          <div className="text-[10px] text-slate-500">
                            Avail {availableForOrder}
                          </div>
                        </div>
                        <div className="col-span-2 tabular-nums">
                          {existingQty}
                        </div>
                        <div className="col-span-2 flex items-center justify-center">
                          {allocationStatus === "-" ? (
                            <span className="text-xs text-slate-400">-</span>
                          ) : (
                            <span
                              className={[
                                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset",
                                ALLOCATION_STATUS_STYLES[allocationStatus] ||
                                  ALLOCATION_STATUS_STYLES.Reserved,
                              ].join(" ")}
                            >
                              {allocationStatus}
                            </span>
                          )}
                        </div>
                        <div className="col-span-2 flex items-center justify-center gap-2">
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
                            disabled={isLocked}
                            className={[
                              "w-[52px] rounded-md px-1 py-1 text-center text-xs ring-1 ring-slate-200",
                              isLocked
                                ? "cursor-not-allowed bg-slate-50 text-slate-400"
                                : "bg-white text-slate-700",
                            ].join(" ")}
                          />
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
                            disabled={reserveDisabled}
                            title={reserveTitle}
                            className={[
                              "inline-flex min-w-[56px] items-center justify-center rounded border px-2.5 py-1.5 text-[11px] font-semibold transition",
                              reserveDisabled
                                ? "border-emerald-200 bg-emerald-100 text-emerald-300"
                                : "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700",
                              "disabled:cursor-not-allowed",
                            ].join(" ")}
                          >
                            Reserve
                          </button>
                        </div>
                        <div className="col-span-2 flex items-center justify-center text-center">
                          <button
                            type="button"
                            onClick={() =>
                              handleUnpick({
                                slotId,
                                existing,
                              })
                            }
                            disabled={isDisabled || isBusy || isLocked || !allocationId}
                            title={
                              allocationId
                                ? "Remove this reservation (removes full reservation)."
                                : "Nothing to unreserve."
                            }
                            className={[
                              "inline-flex min-w-[72px] items-center justify-center rounded border px-2.5 py-1.5 text-[11px] font-semibold transition",
                              allocationId && !isLocked
                                ? "border-rose-400 bg-white text-rose-700 hover:bg-rose-50"
                                : "border-rose-200 bg-white text-rose-300",
                              "disabled:cursor-not-allowed",
                            ].join(" ")}
                          >
                            Unreserve
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
                      {combinedError?.data?.message ||
                        "Failed to save reservation."}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function AllocationItemCard({
  orderId,
  item,
  allocationInfo,
  allocationSummary,
  isAllocationLocked,
  allocationLockMessage,
  showAvailability = true,
  showSlotActions = true,
  showDeducted = false,
  deductedQty = 0,
  showAllocationHistory = false,
}) {
  const name =
    item?.product?.name ||
    (typeof item?.product === "string" ? item.product : "") ||
    "Untitled product";
  const sku = item?.sku || item?.product?.sku || "";
  const productId = resolveProductId(item?.product);
  const orderedQty = Number(item?.qty) || 0;
  const reservedQty = Number(allocationInfo?.total) || 0;
  const isFullyReserved = orderedQty > 0 && reservedQty === orderedQty;

  const [availability, setAvailability] = useState({
    status: "idle",
    onHandTotal: 0,
    availableTotal: 0,
  });

  const resolveAvailabilityValue = (key) => {
    if (!showAvailability) return "-";
    if (availability.status === "ready") return availability[key];
    if (availability.status === "loading") return "...";
    if (availability.status === "error") return "-";
    return "-";
  };

  const onHandLabel = resolveAvailabilityValue("onHandTotal");
  const availableLabel = resolveAvailabilityValue("availableTotal");

  const stats = [
    { label: "Ordered", value: orderedQty },
    { label: "Reserved", value: reservedQty },
  ];

  if (showDeducted) {
    stats.push({ label: "Deducted", value: deductedQty });
  }

  if (showAvailability) {
    stats.push({ label: "On hand", value: onHandLabel });
    stats.push({ label: "Available", value: availableLabel });
  }

  return (
    <div className="relative rounded-2xl bg-white p-4 ring-1 ring-slate-200">
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-slate-900">
          {name}
        </div>
        {sku ? <div className="text-xs text-slate-500">SKU: {sku}</div> : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
        {stats.map((stat) => {
          const highlight =
            isFullyReserved &&
            (stat.label === "Ordered" || stat.label === "Reserved");
          return (
            <span
              key={stat.label}
              className={[
                "rounded-lg px-2 py-1",
                highlight
                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
                  : "bg-slate-100 text-slate-600",
              ].join(" ")}
            >
              {stat.label}{" "}
              <span
                className={[
                  "ml-1 font-semibold tabular-nums",
                  highlight ? "text-emerald-900" : "text-slate-900",
                ].join(" ")}
              >
                {stat.value}
              </span>
            </span>
          );
        })}
      </div>

      {showSlotActions ? (
        <div className="mt-3">
          <SlotItemsPanel
            orderId={orderId}
            productId={productId}
            orderedQty={orderedQty}
            allocatedTotal={reservedQty}
            allocationsBySlot={allocationInfo?.bySlot}
            allocationsList={allocationInfo?.list}
            allocationSummaryList={allocationSummary}
            showAllocationHistory={showAllocationHistory}
            isLocked={isAllocationLocked}
            lockMessage={allocationLockMessage}
            onAvailabilityChange={showAvailability ? setAvailability : undefined}
            buttonPlacement="corner"
            buttonWrapperClassName="absolute right-4 top-4"
          />
        </div>
      ) : null}
    </div>
  );
}

export default function AdminOrderAllocation({
  orderId,
  orderStatus,
  items,
  formatMoney,
  showPricing = true,
  showSlots = true,
  title = "Items",
  allocationEnabled = true,
  allocationLockReason = "",
  mode,
}) {
  const rows = Array.isArray(items) ? items : [];
  const money =
    typeof formatMoney === "function" ? formatMoney : (value) => value;
  const resolvedMode = mode || (showSlots && !showPricing ? "allocation" : "summary");
  const isAllocationView = ["allocation", "finalize", "stock"].includes(resolvedMode);
  const showSlotActions =
    resolvedMode === "allocation" || resolvedMode === "stock";
  const showFinalizeControls =
    resolvedMode === "finalize" || resolvedMode === "stock";
  const showAvailability =
    resolvedMode === "allocation" || resolvedMode === "stock";
  const isWorkflowLocked = isAllocationView && !allocationEnabled;
  const isOrderLocked =
    ["Delivered", "Cancelled"].includes(orderStatus) || isWorkflowLocked;
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

  const reservedAllocations = useMemo(
    () =>
      allocations.filter(
        (row) => !row.status || row.status === "Reserved"
      ),
    [allocations]
  );
  const deductedAllocations = useMemo(
    () => allocations.filter((row) => row.status === "Deducted"),
    [allocations]
  );
  const hasDeducted = deductedAllocations.length > 0;

  const allocationsByProduct = useMemo(() => {
    const map = new Map();
    for (const row of reservedAllocations) {
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
  }, [reservedAllocations]);

  const deductedByProduct = useMemo(() => {
    const map = new Map();
    for (const row of deductedAllocations) {
      const productId = resolveProductId(row.product);
      if (!productId) continue;
      const entry = map.get(productId) || { total: 0 };
      entry.total += Number(row.qty) || 0;
      map.set(productId, entry);
    }
    return map;
  }, [deductedAllocations]);

  const allocationSummaryByProduct = useMemo(() => {
    const map = new Map();
    for (const row of allocations) {
      const productId = resolveProductId(row.product);
      if (!productId) continue;
      const entry = map.get(productId) || { list: [] };
      entry.list.push(row);
      map.set(productId, entry);
    }
    return map;
  }, [allocations]);

  if (isAllocationView) {
    const orderedTotal = rows.reduce(
      (sum, it) => sum + (Number(it?.qty) || 0),
      0
    );
    const reservedTotal = reservedAllocations.reduce(
      (sum, row) => sum + (Number(row.qty) || 0),
      0
    );
    const deductedTotal = deductedAllocations.reduce(
      (sum, row) => sum + (Number(row.qty) || 0),
      0
    );

    const isAllocationLocked = isOrderLocked || hasDeducted;

    let allocationLockMessage = "";
    if (hasDeducted) {
      allocationLockMessage = "Stock finalized.";
    } else if (isWorkflowLocked) {
      allocationLockMessage =
        allocationLockReason || "Invoice and Shipping required before reserving.";
    } else if (["Delivered", "Cancelled"].includes(orderStatus)) {
      allocationLockMessage =
        "Reservations are locked for delivered or cancelled orders.";
    }
    const slotLockMessage = isAllocationLocked ? "" : allocationLockMessage;

    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="text-sm font-semibold text-slate-900">{title}</div>
              <div className="text-xs text-slate-500">
                {rows.length} item{rows.length !== 1 ? "s" : ""}
              </div>
            </div>

          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-lg bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-900 ring-1 ring-amber-200">
              Ordered{" "}
              <span className="ml-1 font-semibold text-amber-900 tabular-nums">
                {orderedTotal}
              </span>
            </span>
            <span className="rounded-lg bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-900 ring-1 ring-amber-200">
              Reserved{" "}
              <span className="ml-1 font-semibold text-amber-900 tabular-nums">
                {reservedTotal}
              </span>
            </span>
            <span className="rounded-lg bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-900 ring-1 ring-amber-200">
              Deducted{" "}
              <span className="ml-1 font-semibold text-amber-900 tabular-nums">
                {deductedTotal}
              </span>
            </span>
          </div>

          {isAllocationsLoading ? (
            <div className="mt-2 text-xs text-slate-500">
              Loading reservations...
            </div>
          ) : null}
          {isAllocationsError ? (
            <div className="mt-2">
              <ErrorMessage error={allocationsError} />
            </div>
          ) : null}
          {isAllocationLocked ? (
            <div className="mt-2 text-xs text-amber-700">
              {allocationLockMessage}
            </div>
          ) : null}
        </div>

        {rows.length === 0 ? (
          <div className="rounded-2xl bg-white p-4 text-sm text-slate-600 ring-1 ring-slate-200">
            No items in this order.
          </div>
        ) : (
          rows.map((it, idx) => {
            const productId = resolveProductId(it?.product);
            const allocationInfo =
              allocationsByProduct.get(productId) || {
                total: 0,
                bySlot: new Map(),
                list: [],
              };
            const allocationSummary =
              allocationSummaryByProduct.get(productId)?.list || [];
            const hasDeductedForItem = allocationSummary.some(
              (row) => normalizeAllocationStatus(row?.status) === "Deducted"
            );
            const deductedQty = Number(
              deductedByProduct.get(productId)?.total || 0
            );

            return (
              <AllocationItemCard
                key={`${orderId || "order"}-${idx}`}
                orderId={orderId}
                item={it}
                allocationInfo={allocationInfo}
                allocationSummary={allocationSummary}
                isAllocationLocked={isAllocationLocked}
                allocationLockMessage={slotLockMessage}
                showAvailability={showAvailability}
                showSlotActions={showSlotActions}
                showDeducted={showFinalizeControls}
                deductedQty={deductedQty}
                showAllocationHistory={hasDeductedForItem}
              />
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

