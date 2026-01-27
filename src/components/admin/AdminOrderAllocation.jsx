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
  defaultOpen = false,
  forceOpen = false,
  hideToggle = false,
}) {
  const [open, setOpen] = useState(Boolean(defaultOpen));
  const isDisabled = !productId || !orderId;
  const isOpen = forceOpen || open;
  const shouldSkip = isDisabled || !isOpen;
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
    if (!isOpen || typeof onAvailabilityChange !== "function") return;
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
  }, [isOpen, isLoading, showError, rows, allocationsBySlot, onAvailabilityChange]);

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

    const confirmed = window.confirm(
      "Reserve all remaining qty across available slots?"
    );
    if (!confirmed) return;

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

  const buttonNode = hideToggle ? null : (
    <>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        disabled={isDisabled}
        title={isDisabled ? "Product reference missing." : ""}
        aria-expanded={isOpen}
        className={[
          "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition",
          !isDisabled
            ? isOpen
              ? "border-slate-900 bg-white text-slate-900"
              : "border-slate-900 bg-slate-900 text-white hover:bg-slate-800"
            : "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400",
        ].join(" ")}
      >
        <span>{isOpen ? "Close" : showHistory ? "View allocations" : "Reserve"}</span>
        {isOpen ? (
          <FiChevronUp className="h-4 w-4" />
        ) : (
          <FiChevronDown className="h-4 w-4" />
        )}
      </button>
    </>
  );

  const helperMessage = isDisabled ? (
    <div className="mt-2 text-[11px] text-slate-500">
      Product reference missing for this item.
    </div>
  ) : showLockedMessage ? (
    <div className="mt-2 text-[11px] text-slate-500">{lockMessage}</div>
  ) : null;

  return (
    <div>
      {buttonPlacement === "corner" ? (
        <div className={buttonWrapperClassName}>{buttonNode}</div>
      ) : (
        buttonNode
      )}

      {helperMessage}

      {isOpen ? (
        <div className="mt-3">
          {showHistory ? (
            <div>
              <div className="hidden px-3 py-2 text-xs font-semibold text-slate-600 xl:block">
                Allocation history
              </div>
              <div className="px-3 pb-3 space-y-3">
                <div className="xl:hidden">
                  <details className="rounded-lg border border-slate-200 bg-white">
                    <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-slate-600">
                      Allocation history
                    </summary>
                    <div className="border-t border-slate-200 p-3 space-y-3">
                      {(allocationSummaryList || []).map((row) => {
                        const slotLabel = row?.slot?.label || "Unknown slot";
                        const status = normalizeAllocationStatus(row?.status);
                        const reservedBy = formatUserLabel(row?.by);
                        const deductedBy = formatUserLabel(row?.deductedBy);
                        return (
                          <div
                            key={row?.id || row?._id || `${slotLabel}-${row?.qty}`}
                            className="rounded-lg border border-slate-200 bg-white p-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="text-sm font-semibold text-slate-900">
                                {slotLabel}
                              </div>
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
                            <div className="mt-1 text-xs text-slate-500">
                              Qty: <span className="tabular-nums">{Number(row?.qty) || 0}</span>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                  Reserved by
                                </div>
                                <div className="mt-1 font-semibold text-slate-900">
                                  {reservedBy.name}
                                </div>
                                {reservedBy.email ? (
                                  <div className="text-[10px] text-slate-500">
                                    {reservedBy.email}
                                  </div>
                                ) : null}
                                <div className="mt-1 text-[10px] text-slate-500">
                                  {formatDateTime(row?.createdAt)}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                  Deducted by
                                </div>
                                <div className="mt-1 font-semibold text-slate-900">
                                  {deductedBy.name}
                                </div>
                                {deductedBy.email ? (
                                  <div className="text-[10px] text-slate-500">
                                    {deductedBy.email}
                                  </div>
                                ) : null}
                                <div className="mt-1 text-[10px] text-slate-500">
                                  {formatDateTime(row?.deductedAt)}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {(allocationSummaryList || []).length === 0 ? (
                        <div className="text-xs text-slate-500">
                          No allocations found for this item.
                        </div>
                      ) : null}
                    </div>
                  </details>
                </div>

                <div className="hidden xl:block">
                  <div className="overflow-x-auto">
                    <table className="w-full table-fixed text-[10px] text-slate-700">
                      <colgroup>
                        <col className="w-[16%]" />
                        <col className="w-[6%]" />
                        <col className="w-[10%]" />
                        <col className="w-[18%]" />
                        <col className="w-[14%]" />
                        <col className="w-[18%]" />
                        <col className="w-[18%]" />
                      </colgroup>
                      <thead className="text-[10px] font-semibold text-slate-600">
                        <tr className="border-b border-slate-200">
                          <th className="px-2 py-1 text-left">Slot</th>
                          <th className="px-2 py-1 text-center">Qty</th>
                          <th className="px-2 py-1 text-center">Status</th>
                          <th className="px-2 py-1 text-left">Reserved by</th>
                          <th className="px-2 py-1 text-center">Reserved at</th>
                          <th className="px-2 py-1 text-left">Deducted by</th>
                          <th className="px-2 py-1 text-center">Deducted at</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(allocationSummaryList || []).map((row) => {
                          const slotLabel = row?.slot?.label || "Unknown slot";
                          const status = normalizeAllocationStatus(row?.status);
                          const reservedBy = formatUserLabel(row?.by);
                          const deductedBy = formatUserLabel(row?.deductedBy);
                          return (
                            <tr
                              key={row?.id || row?._id || `${slotLabel}-${row?.qty}`}
                              className="odd:bg-slate-100/60"
                            >
                              <td
                                className="px-2 py-1.5 font-semibold text-slate-900 truncate"
                                title={slotLabel}
                              >
                                {slotLabel}
                              </td>
                              <td className="px-2 py-1.5 text-center tabular-nums">
                                {Number(row?.qty) || 0}
                              </td>
                              <td className="px-2 py-1.5 text-center">
                                <span
                                  className={[
                                    "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset",
                                    ALLOCATION_STATUS_STYLES[status] ||
                                      ALLOCATION_STATUS_STYLES.Reserved,
                                  ].join(" ")}
                                >
                                  {status}
                                </span>
                              </td>
                              <td className="px-2 py-1.5">
                                <div className="truncate font-semibold text-slate-900">
                                  {reservedBy.name}
                                </div>
                                {reservedBy.email ? (
                                  <div className="truncate text-[10px] text-slate-500">
                                    {reservedBy.email}
                                  </div>
                                ) : null}
                              </td>
                              <td className="px-2 py-1.5 text-center text-[10px] text-slate-600">
                                {formatDateTime(row?.createdAt)}
                              </td>
                              <td className="px-2 py-1.5">
                                <div className="truncate font-semibold text-slate-900">
                                  {deductedBy.name}
                                </div>
                                {deductedBy.email ? (
                                  <div className="truncate text-[10px] text-slate-500">
                                    {deductedBy.email}
                                  </div>
                                ) : null}
                              </td>
                              <td className="px-2 py-1.5 text-center text-[10px] text-slate-600">
                                {formatDateTime(row?.deductedAt)}
                              </td>
                            </tr>
                          );
                        })}
                        {(allocationSummaryList || []).length === 0 ? (
                          <tr>
                            <td
                              colSpan={7}
                              className="px-2 py-2 text-xs text-slate-500"
                            >
                              No allocations found for this item.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
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
              <div className="flex flex-wrap items-center justify-end gap-2 px-4 py-2">
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
                    "inline-flex items-center rounded-lg px-3 py-1.5 text-[11px] font-semibold transition",
                    pickAllDisabled
                      ? "cursor-not-allowed bg-emerald-200 text-emerald-600"
                      : "bg-emerald-600 text-white hover:bg-emerald-700",
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
                    "inline-flex items-center rounded-lg px-3 py-1.5 text-[11px] font-semibold transition",
                    unpickAllDisabled
                      ? "cursor-not-allowed bg-rose-200 text-rose-600"
                      : "bg-rose-600 text-white hover:bg-rose-700",
                  ].join(" ")}
                >
                  Unreserve all
                </button>
              </div>
              {actionError ? (
                <div className="px-4 py-2 text-[11px] text-rose-600">
                  {actionError}
                </div>
              ) : null}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 px-3 pb-3 xl:hidden">
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
                        className="rounded-lg border border-slate-200 bg-white p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">
                              {row.slot?.label || "Unknown slot"}
                            </div>
                            <div className="text-xs text-slate-500">
                              On hand {onHandQty} • Avail {availableForOrder}
                            </div>
                          </div>
                          <div>
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
                        </div>

                        <div className="mt-2 text-xs text-slate-600">
                          Reserved{" "}
                          <span className="ml-1 font-semibold tabular-nums text-slate-900">
                            {existingQty}
                          </span>
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-2">
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
                              "w-full rounded-lg px-3 py-2 text-sm ring-1 ring-slate-200",
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
                              "inline-flex w-full items-center justify-center rounded-lg border px-3 py-2 text-xs font-semibold transition",
                              reserveDisabled
                                ? "border-emerald-200 bg-emerald-100 text-emerald-300"
                                : "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700",
                              "disabled:cursor-not-allowed",
                            ].join(" ")}
                          >
                            Reserve
                          </button>
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
                              "inline-flex w-full items-center justify-center rounded-lg border px-3 py-2 text-xs font-semibold transition",
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
                </div>

                <div className="hidden border-t border-slate-200 xl:block">
                  <div className="overflow-x-auto">
                    <table className="w-full table-fixed text-xs text-slate-700">
                      <colgroup>
                        <col className="w-[22%]" />
                        <col className="w-[12%]" />
                        <col className="w-[8%]" />
                        <col className="w-[10%]" />
                        <col className="w-[30%]" />
                        <col className="w-[18%]" />
                      </colgroup>
                      <thead className="text-xs font-semibold text-slate-600">
                        <tr className="border-b border-slate-200">
                          <th className="px-2 py-1 text-left">Slot</th>
                          <th className="px-2 py-1 text-center">
                            <div className="leading-tight">
                              <div>On hand</div>
                              <div className="text-[11px] text-slate-400">Avail</div>
                            </div>
                          </th>
                          <th className="px-2 py-1 text-center">Reserved</th>
                          <th className="px-2 py-1 text-center">Status</th>
                          <th className="px-2 py-1 text-center">Reserve</th>
                          <th className="px-2 py-1 text-center">Unreserve</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
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
                            <tr key={row._id} className="odd:bg-slate-100/60">
                              <td
                                className="px-2 py-1.5 font-semibold text-slate-900 truncate"
                                title={row.slot?.label || "Unknown slot"}
                              >
                                {row.slot?.label || "Unknown slot"}
                              </td>
                              <td className="px-2 py-1.5 text-center">
                                <div className="tabular-nums">{onHandQty}</div>
                                <div className="text-[11px] text-slate-500">
                                  Avail {availableForOrder}
                                </div>
                              </td>
                              <td className="px-2 py-1.5 text-center tabular-nums">
                                {existingQty}
                              </td>
                              <td className="px-2 py-1.5 text-center">
                                {allocationStatus === "-" ? (
                                  <span className="text-xs text-slate-400">-</span>
                                ) : (
                                  <span
                                    className={[
                                      "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
                                      ALLOCATION_STATUS_STYLES[allocationStatus] ||
                                        ALLOCATION_STATUS_STYLES.Reserved,
                                    ].join(" ")}
                                  >
                                    {allocationStatus}
                                  </span>
                                )}
                              </td>
                              <td className="px-2 py-1.5">
                                <div className="flex items-center justify-center gap-1">
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
                                      "w-[44px] rounded-md px-1 py-1 text-center text-[11px] ring-1 ring-slate-200",
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
                                      "inline-flex min-w-[48px] items-center justify-center rounded border px-2 py-1 text-[11px] font-semibold transition",
                                      reserveDisabled
                                        ? "border-emerald-200 bg-emerald-100 text-emerald-300"
                                        : "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700",
                                      "disabled:cursor-not-allowed",
                                    ].join(" ")}
                                  >
                                    Reserve
                                  </button>
                                </div>
                              </td>
                              <td className="px-2 py-1.5 text-center">
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
                                    "inline-flex min-w-[60px] items-center justify-center rounded border px-2 py-1 text-[11px] font-semibold transition",
                                    allocationId && !isLocked
                                      ? "border-rose-400 bg-white text-rose-700 hover:bg-rose-50"
                                      : "border-rose-200 bg-white text-rose-300",
                                    "disabled:cursor-not-allowed",
                                  ].join(" ")}
                                >
                                  Unreserve
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {localError ? (
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] text-rose-600">
                    {localError}
                  </div>
                ) : combinedError ? (
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] text-rose-600">
                    {combinedError?.data?.message ||
                      "Failed to save reservation."}
                  </div>
                ) : null}
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
  forceOpenSlots = false,
  hideSlotToggle = false,
}) {
  const name =
    item?.product?.name ||
    item?.productName ||
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
    <div className="relative overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
      <div className="p-4">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900 break-words xl:truncate">
            {name}
          </div>
          {sku ? (
            <div className="text-xs text-slate-500 break-words">SKU: {sku}</div>
          ) : null}
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
      </div>

      {showSlotActions ? (
        <div className="border-t border-slate-200">
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
            buttonWrapperClassName="xl:absolute xl:right-4 xl:top-4"
            forceOpen={forceOpenSlots}
            hideToggle={hideSlotToggle}
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

  const itemRows = useMemo(() => {
    return rows.map((it, idx) => {
      const productId = resolveProductId(it?.product);
      const key = `${productId || "item"}-${idx}`;
      const allocationInfo =
        allocationsByProduct.get(productId) || {
          total: 0,
          bySlot: new Map(),
          list: [],
        };
      const allocationSummary =
        allocationSummaryByProduct.get(productId)?.list || [];
      const orderedQty = Number(it?.qty) || 0;
      const reservedQty = Number(allocationInfo.total) || 0;
      const deductedQty = Number(deductedByProduct.get(productId)?.total || 0);
      const allocatedQty = reservedQty + deductedQty;
      const remainingQty = Math.max(0, orderedQty - allocatedQty);
      const reservedPct =
        orderedQty > 0 ? Math.min(100, Math.round((allocatedQty / orderedQty) * 100)) : 0;
      const hasDeductedForItem = allocationSummary.some(
        (row) => normalizeAllocationStatus(row?.status) === "Deducted"
      );
      let status = "Unreserved";
      if (hasDeductedForItem || deductedQty > 0) {
        status = "Deducted";
      } else if (reservedQty >= orderedQty && orderedQty > 0) {
        status = "Reserved";
      } else if (reservedQty > 0) {
        status = "Partial";
      }

      return {
        key,
        item: it,
        productId,
        allocationInfo,
        allocationSummary,
        orderedQty,
        reservedQty,
        deductedQty,
        allocatedQty,
        remainingQty,
        reservedPct,
        status,
        hasDeductedForItem,
      };
    });
  }, [rows, allocationsByProduct, allocationSummaryByProduct, deductedByProduct]);

  const [activeItemKey, setActiveItemKey] = useState("");

  useEffect(() => {
    if (!itemRows.length) {
      setActiveItemKey("");
      return;
    }
    if (!itemRows.some((row) => row.key === activeItemKey)) {
      setActiveItemKey(itemRows[0].key);
    }
  }, [itemRows, activeItemKey]);

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

    const activeRow =
      itemRows.find((row) => row.key === activeItemKey) || itemRows[0] || null;
    const statusStyles = {
      Unreserved: "bg-slate-100 text-slate-600 ring-slate-200",
      Partial: "bg-amber-50 text-amber-700 ring-amber-200",
      Reserved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      Deducted: "bg-slate-200 text-slate-700 ring-slate-300",
    };

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

          <div className="mt-2 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
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
          <>
            <div className="space-y-3 2xl:hidden">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {itemRows.map((row) => {
                  const name =
                    row.item?.product?.name ||
                    row.item?.productName ||
                    (typeof row.item?.product === "string"
                      ? row.item.product
                      : "") ||
                    "Item";
                  const sku = row.item?.sku || row.item?.product?.sku || "";
                  const isActive = row.key === activeItemKey;
                  return (
                    <button
                      key={row.key}
                      type="button"
                      onClick={() => setActiveItemKey(row.key)}
                      className={[
                        "min-w-[140px] rounded-xl border px-3 py-2 text-left text-[11px] transition",
                        isActive
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-700",
                      ].join(" ")}
                    >
                      <div className="text-[11px] font-semibold leading-snug break-words">
                        {name}
                      </div>
                      {sku ? (
                        <div className="mt-0.5 text-[10px] opacity-80">
                          SKU: {sku}
                        </div>
                      ) : null}
                      <div className="mt-1 flex items-center justify-between text-[10px]">
                        <span className="tabular-nums">
                          {row.allocatedQty}/{row.orderedQty}
                        </span>
                        <span
                          className={[
                            "rounded-full px-2 py-0.5 font-semibold",
                            statusStyles[row.status] || statusStyles.Unreserved,
                          ].join(" ")}
                        >
                          {row.status}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {activeRow ? (
                <AllocationItemCard
                  key={activeRow.key}
                  orderId={orderId}
                  item={activeRow.item}
                  allocationInfo={activeRow.allocationInfo}
                  allocationSummary={activeRow.allocationSummary}
                  isAllocationLocked={isAllocationLocked}
                  allocationLockMessage={slotLockMessage}
                  showAvailability={showAvailability}
                  showSlotActions={showSlotActions}
                  showDeducted={showFinalizeControls}
                  deductedQty={activeRow.deductedQty}
                  showAllocationHistory={activeRow.hasDeductedForItem}
                  forceOpenSlots
                  hideSlotToggle
                />
              ) : null}
            </div>

            <div className="hidden 2xl:grid 2xl:grid-cols-[minmax(320px,420px)_minmax(0,1fr)] 2xl:gap-4">
              <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
                <div className="border-b border-slate-200 px-4 py-3 text-xs font-semibold text-slate-600">
                  Order items
                </div>
                <div className="max-h-[70vh] overflow-y-auto">
                  {itemRows.map((row) => {
                    const name =
                      row.item?.product?.name ||
                      row.item?.productName ||
                      (typeof row.item?.product === "string"
                        ? row.item.product
                        : "") ||
                      "Untitled product";
                    const sku = row.item?.sku || row.item?.product?.sku || "";
                    const isActive = row.key === activeItemKey;
                    const progressTone =
                      row.status === "Reserved"
                        ? "bg-emerald-500"
                        : row.status === "Partial"
                        ? "bg-amber-500"
                        : row.status === "Deducted"
                        ? "bg-slate-500"
                        : "bg-slate-300";

                    return (
                      <button
                        key={row.key}
                        type="button"
                        onClick={() => setActiveItemKey(row.key)}
                        className={[
                          "w-full border-b border-slate-100 px-4 py-3 text-left transition",
                          isActive
                            ? "bg-emerald-100 ring-1 ring-emerald-200"
                            : "bg-white hover:bg-slate-50",
                        ].join(" ")}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-slate-900">
                              {name}
                            </div>
                            {sku ? (
                              <div className="text-xs text-slate-500">SKU: {sku}</div>
                            ) : null}
                          </div>
                          <span
                            className={[
                              "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ring-inset",
                              statusStyles[row.status] || statusStyles.Unreserved,
                            ].join(" ")}
                          >
                            {row.status}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <div className="h-2 flex-1 rounded-full bg-slate-100">
                            <div
                              className={`h-2 rounded-full ${progressTone}`}
                              style={{ width: `${row.reservedPct}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-semibold text-slate-700 tabular-nums">
                            {row.allocatedQty}/{row.orderedQty}
                          </span>
                        </div>
                        {row.remainingQty > 0 ? (
                          <div className="mt-1 text-[10px] text-amber-600">
                            Remaining {row.remainingQty}
                          </div>
                        ) : (
                          <div className="mt-1 text-[10px] text-emerald-600">
                            Fully reserved
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                {activeRow ? (
                  <AllocationItemCard
                    key={activeRow.key}
                    orderId={orderId}
                    item={activeRow.item}
                    allocationInfo={activeRow.allocationInfo}
                    allocationSummary={activeRow.allocationSummary}
                    isAllocationLocked={isAllocationLocked}
                    allocationLockMessage={slotLockMessage}
                    showAvailability={showAvailability}
                    showSlotActions={showSlotActions}
                    showDeducted={showFinalizeControls}
                    deductedQty={activeRow.deductedQty}
                    showAllocationHistory={activeRow.hasDeductedForItem}
                    forceOpenSlots
                    hideSlotToggle
                  />
                ) : null}
              </div>
            </div>
          </>
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

      <div className="md:hidden">
        {rows.length === 0 ? (
          <div className="px-4 py-4 text-sm text-slate-600">
            No items in this order.
          </div>
        ) : (
          <div className="space-y-3 px-4 py-3">
            {rows.map((it, idx) => {
              const name =
                it?.product?.name ||
                it?.productName ||
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
                  className="rounded-xl border border-slate-200 bg-white p-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900">
                      {name}
                    </div>
                    {sku ? (
                      <div className="text-xs text-slate-500">SKU: {sku}</div>
                    ) : null}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className={showPricing ? "" : "col-span-2"}>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Qty
                      </div>
                      <div className="mt-1 text-sm font-semibold text-slate-900 tabular-nums">
                        {qty}
                      </div>
                    </div>
                    {showPricing ? (
                      <div className="text-right">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Unit
                        </div>
                        <div className="mt-1 text-sm font-semibold text-slate-900 tabular-nums">
                          {money(unit)}
                        </div>
                      </div>
                    ) : null}
                    {showPricing ? (
                      <div className="col-span-2 text-right">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Total
                        </div>
                        <div className="mt-1 text-sm font-semibold text-slate-900 tabular-nums">
                          {money(totalLine)}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {showSlots ? (
                    <div className="mt-3">
                      <SlotItemsPanel productId={productId} />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="hidden md:block">
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
              it?.productName ||
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
                  <div
                    className={showPricing ? "col-span-6 min-w-0" : "col-span-9 min-w-0"}
                  >
                    <div className="truncate font-semibold text-slate-900">
                      {name}
                    </div>
                    {sku ? (
                      <div className="text-xs text-slate-500">SKU: {sku}</div>
                    ) : null}
                  </div>
                  <div
                    className={showPricing ? "col-span-2 text-right tabular-nums" : "col-span-3 text-right tabular-nums"}
                  >
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
    </div>
  );
}

