import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FiChevronLeft } from "react-icons/fi";
import {
  useGetSlotByIdQuery,
  useLazyGetSlotsQuery,
} from "../../features/slots/slotsApiSlice";
import {
  useGetSlotItemsBySlotQuery,
  useMoveSlotItemsMutation,
  useClearSlotItemsMutation,
} from "../../features/slotItems/slotItemsApiSlice";
import InventoryMoveModal from "../../components/admin/InventoryMoveModal";
import useDebouncedValue from "../../hooks/useDebouncedValue";

const formatQty = (value) => {
  const n = Number(value) || 0;
  return new Intl.NumberFormat().format(n);
};

const formatNumber = (value, maxDigits = 2) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDigits,
  }).format(n);
};

const formatDate = (iso) => {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatPercent = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0%";
  return `${Math.round(Math.max(0, n))}%`;
};

const SLOT_STATUS_STYLES = {
  Active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Inactive: "bg-slate-100 text-slate-600 ring-slate-200",
};

export default function AdminSlotDetailsPage() {
  const { id: slotId } = useParams();
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedSlotItemIds, setSelectedSlotItemIds] = useState(new Set());
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [moveScope, setMoveScope] = useState("all");
  const [clearScope, setClearScope] = useState("all");
  const [moveSearch, setMoveSearch] = useState("");
  const [moveSearchRows, setMoveSearchRows] = useState([]);
  const [moveSearchLoading, setMoveSearchLoading] = useState(false);
  const [moveSearchError, setMoveSearchError] = useState("");
  const [moveTargetSlot, setMoveTargetSlot] = useState(null);
  const [moveError, setMoveError] = useState("");
  const [clearError, setClearError] = useState("");
  const selectAllRef = useRef(null);

  const {
    data: slot,
    isLoading: slotLoading,
    isFetching: slotFetching,
    error: slotError,
  } = useGetSlotByIdQuery(slotId, { skip: !slotId });

  const {
    data: slotItemsResult,
    isLoading: slotItemsLoading,
    isFetching: slotItemsFetching,
    error: slotItemsError,
  } = useGetSlotItemsBySlotQuery(slotId, { skip: !slotId });
  const [loadSlots] = useLazyGetSlotsQuery();
  const [moveSlotItems, { isLoading: movingSlotItems }] =
    useMoveSlotItemsMutation();
  const [clearSlotItems, { isLoading: clearingSlotItems }] =
    useClearSlotItemsMutation();

  const slotItems = slotItemsResult?.data ?? [];
  const slotItemIds = useMemo(
    () =>
      slotItems
        .map((item) => item.id || item._id)
        .filter(Boolean)
        .map((value) => String(value)),
    [slotItems]
  );
  const trimmedMoveSearch = moveSearch.trim();
  const debouncedMoveSearch = useDebouncedValue(trimmedMoveSearch, 600);
  const isMoveDebouncing = trimmedMoveSearch !== debouncedMoveSearch;
  const slotStatus = slot?.isActive === false ? "Inactive" : "Active";
  const totalQty = slotItems.reduce(
    (sum, item) => sum + (Number(item.qty) || 0),
    0
  );
  const computedUsedCbm = slotItems.reduce(
    (sum, item) => sum + (Number(item.cbm) || 0),
    0
  );
  const slotOccupiedCbm =
    typeof slot?.occupiedCbm === "number" ? slot.occupiedCbm : computedUsedCbm;
  const slotFillPercent =
    typeof slot?.fillPercent === "number"
      ? slot.fillPercent
      : Number(slot?.cbm || 0) > 0
      ? (slotOccupiedCbm / Number(slot?.cbm || 0)) * 100
      : 0;
  const isOverCapacity = slotFillPercent > 100;

  const slotErrorMessage =
    slotError?.data?.message || slotError?.error || "Unable to load slot.";
  const slotItemsErrorMessage =
    slotItemsError?.data?.message ||
    slotItemsError?.error ||
    "Unable to load slot items.";
  const slotItemsBusy = slotItemsLoading || slotItemsFetching;
  const selectedCount = selectedSlotItemIds.size;
  const selectedSlotItemIdsList = Array.from(selectedSlotItemIds);
  const selectedSlotItems = useMemo(() => {
    if (!selectedSlotItemIds.size) return [];
    return slotItems.filter((item) => {
      const itemId = String(item.id || item._id);
      return selectedSlotItemIds.has(itemId);
    });
  }, [slotItems, selectedSlotItemIds]);
  const selectedUnits = useMemo(
    () =>
      selectedSlotItems.reduce(
        (sum, item) => sum + (Number(item.qty) || 0),
        0
      ),
    [selectedSlotItems]
  );
  const hasSlotItems = slotItems.length > 0;
  const allSelected = hasSlotItems && selectedCount === slotItems.length;
  const someSelected = selectedCount > 0 && !allSelected;
  const moveTargetSlotId = moveTargetSlot
    ? String(moveTargetSlot._id || moveTargetSlot.id)
    : "";
  const isActionBusy = movingSlotItems || clearingSlotItems;
  const moveItemCount =
    moveScope === "all" ? slotItems.length : selectedSlotItems.length;
  const moveUnitCount = moveScope === "all" ? totalQty : selectedUnits;
  const clearTargetCount =
    clearScope === "all" ? slotItems.length : selectedSlotItems.length;

  useEffect(() => {
    if (!selectAllRef.current) return;
    selectAllRef.current.indeterminate = selectionMode && someSelected;
  }, [selectionMode, someSelected]);

  const summaryCards = [
    { label: "SKUs", value: formatQty(slotItems.length) },
    { label: "Total qty", value: formatQty(totalQty) },
    { label: "Used CBM", value: formatNumber(slotOccupiedCbm) },
    { label: "Updated", value: formatDate(slot?.updatedAt) },
  ];

  useEffect(() => {
    if (!moveModalOpen) return;
    const query = debouncedMoveSearch.trim();
    if (!query) {
      setMoveSearchRows([]);
      setMoveSearchLoading(false);
      setMoveSearchError("");
      return;
    }

    let cancelled = false;
    const fetchSlots = async () => {
      setMoveSearchLoading(true);
      setMoveSearchError("");
      setMoveSearchRows([]);
      try {
        const batch = await loadSlots({
          q: query,
          page: 1,
          limit: 25,
          isActive: true,
        }).unwrap();
        const rows = Array.isArray(batch?.rows) ? batch.rows : [];
        const filtered = rows.filter(
          (row) => String(row._id || row.id) !== String(slotId)
        );
        if (!cancelled) setMoveSearchRows(filtered);
      } catch (err) {
        if (!cancelled) {
          setMoveSearchError(
            err?.data?.message || err?.error || "Unable to load slots."
          );
        }
      } finally {
        if (!cancelled) setMoveSearchLoading(false);
      }
    };

    fetchSlots();
    return () => {
      cancelled = true;
    };
  }, [moveModalOpen, debouncedMoveSearch, slotId, loadSlots]);

  useEffect(() => {
    if (!selectionMode) return;
    setSelectedSlotItemIds((prev) => {
      if (!prev.size) return prev;
      const allowed = new Set(slotItemIds);
      const next = new Set();
      prev.forEach((id) => {
        if (allowed.has(id)) next.add(id);
      });
      return next;
    });
  }, [selectionMode, slotItemIds]);

  if (!slotId) {
    return (
      <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-slate-200">
        <div className="text-sm font-semibold text-slate-900">
          Missing slot id
        </div>
        <div className="mt-1 text-sm text-slate-500">
          Return to inventory and select a slot.
        </div>
      </div>
    );
  }

  if (slotLoading || slotFetching) {
    return (
      <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-slate-200">
        <div className="text-sm font-semibold text-slate-900">
          Loading slot...
        </div>
        <div className="mt-1 text-sm text-slate-500">
          Fetching slot details.
        </div>
      </div>
    );
  }

  if (slotError) {
    return (
      <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-slate-200">
        <div className="text-sm font-semibold text-slate-900">
          Unable to load slot
        </div>
        <div className="mt-1 text-sm text-slate-500">{slotErrorMessage}</div>
      </div>
    );
  }

  const toggleSelectionMode = () => {
    setSelectionMode((prev) => {
      const next = !prev;
      setSelectedSlotItemIds(new Set());
      return next;
    });
    setMoveError("");
    setClearError("");
  };

  const toggleSelectAll = () => {
    if (!hasSlotItems) return;
    setSelectedSlotItemIds(() =>
      allSelected ? new Set() : new Set(slotItemIds)
    );
  };

  const toggleSlotItem = (slotItemId) => {
    setSelectedSlotItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(slotItemId)) {
        next.delete(slotItemId);
      } else {
        next.add(slotItemId);
      }
      return next;
    });
  };

  const openMoveModal = (scope) => {
    setMoveScope(scope);
    setMoveModalOpen(true);
    setMoveSearch("");
    setMoveSearchRows([]);
    setMoveSearchLoading(false);
    setMoveSearchError("");
    setMoveTargetSlot(null);
    setMoveError("");
  };

  const closeMoveModal = () => {
    setMoveModalOpen(false);
    setMoveSearch("");
    setMoveSearchRows([]);
    setMoveSearchLoading(false);
    setMoveSearchError("");
    setMoveTargetSlot(null);
    setMoveError("");
  };

  const openClearModal = (scope) => {
    setClearScope(scope);
    setClearModalOpen(true);
    setClearError("");
  };

  const closeClearModal = () => {
    setClearModalOpen(false);
    setClearError("");
  };

  const handleMoveSearchChange = (value) => {
    setMoveSearch(value);
    setMoveTargetSlot(null);
    setMoveError("");
  };

  const handleMoveSelectSlot = (slotRow) => {
    setMoveTargetSlot(slotRow);
    setMoveError("");
  };

  const handleMoveSubmit = async () => {
    if (!moveTargetSlotId) {
      setMoveError("Select a target slot.");
      return;
    }
    if (String(moveTargetSlotId) === String(slotId)) {
      setMoveError("Select a different target slot.");
      return;
    }

    const targetIds =
      moveScope === "all" ? slotItemIds : selectedSlotItemIdsList;
    if (!targetIds.length) {
      setMoveError("Select at least one slot item to move.");
      return;
    }

    try {
      setMoveError("");
      await moveSlotItems({
        fromSlotId: slotId,
        toSlotId: moveTargetSlotId,
        slotItemIds: targetIds,
      }).unwrap();
      closeMoveModal();
      setSelectionMode(false);
      setSelectedSlotItemIds(new Set());
    } catch (err) {
      setMoveError(
        err?.data?.message || err?.error || "Unable to move slot items."
      );
    }
  };

  const handleClearSubmit = async () => {
    const targetIds =
      clearScope === "all" ? slotItemIds : selectedSlotItemIdsList;
    if (!targetIds.length) {
      setClearError("Select at least one slot item to clear.");
      return;
    }

    try {
      setClearError("");
      await clearSlotItems({
        slotId,
        slotItemIds: targetIds,
      }).unwrap();
      closeClearModal();
      setSelectionMode(false);
      setSelectedSlotItemIds(new Set());
    } catch (err) {
      setClearError(
        err?.data?.message || err?.error || "Unable to clear slot items."
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to="/admin/inventory/slots"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900"
          >
            <FiChevronLeft className="h-4 w-4" aria-hidden="true" />
            Inventory
          </Link>
          <div className="mt-2 text-lg font-semibold text-amber-700">
            Slot {slot?.label || "-"}
          </div>
          <div className="text-sm text-slate-500">Slot details</div>
        </div>
        <span
          className={[
            "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset",
            SLOT_STATUS_STYLES[slotStatus] || SLOT_STATUS_STYLES.Active,
          ].join(" ")}
        >
          {slotStatus}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl bg-white p-4 ring-1 ring-slate-200"
          >
            <div className="text-xs font-semibold text-slate-500">
              {card.label}
            </div>
            <div className="mt-2 text-lg font-semibold text-slate-900">
              {card.value}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Location
            </div>
            <div className="mt-2 text-sm text-slate-700">
              Store:{" "}
              <span className="font-semibold text-slate-900">
                {slot?.store || "-"}
              </span>
            </div>
            <div className="text-sm text-slate-700">
              Unit:{" "}
              <span className="font-semibold text-slate-900">
                {slot?.unit || "-"}
              </span>
            </div>
            <div className="text-sm text-slate-700">
              Position:{" "}
              <span className="font-semibold text-slate-900">
                {slot?.position ?? "-"}
              </span>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Capacity
            </div>
            <div className="mt-2 text-sm text-slate-700">
              Slot CBM:{" "}
              <span className="font-semibold text-slate-900">
                {formatNumber(slot?.cbm)}
              </span>
            </div>
            <div className="text-sm text-slate-700">
              Used CBM:{" "}
              <span
                className={[
                  "font-semibold",
                  isOverCapacity ? "text-rose-600" : "text-slate-900",
                ].join(" ")}
              >
                {formatNumber(slotOccupiedCbm)} ({formatPercent(slotFillPercent)})
              </span>
              {isOverCapacity ? (
                <span className="ml-2 inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600">
                  Over capacity
                </span>
              ) : null}
            </div>
            <div className="text-sm text-slate-700">
              Notes:{" "}
              <span className="font-semibold text-slate-900">
                {slot?.notes || "-"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl ring-1 ring-slate-200">
        <div className="bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  Slot contents
                </div>
                <div className="text-xs text-slate-500">
                  Products currently stored in this slot.
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={toggleSelectionMode}
                  disabled={!hasSlotItems || slotItemsBusy || isActionBusy}
                  className={[
                    "rounded-xl px-3 py-2 text-xs font-semibold transition",
                    selectionMode
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50",
                    !hasSlotItems || slotItemsBusy || isActionBusy
                      ? "cursor-not-allowed opacity-60"
                      : "",
                  ].join(" ")}
                >
                  {selectionMode ? "Cancel" : "Select"}
                </button>
                {selectionMode ? (
                  <>
                    <label
                      className={[
                        "inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700",
                        !hasSlotItems || slotItemsBusy || isActionBusy
                          ? "cursor-not-allowed opacity-60"
                          : "",
                      ].join(" ")}
                    >
                      <input
                        ref={selectAllRef}
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        disabled={!hasSlotItems || slotItemsBusy || isActionBusy}
                        aria-label="Select all items"
                        className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                      />
                      Select all
                    </label>
                    <button
                      type="button"
                      onClick={() => openMoveModal("selected")}
                      disabled={
                        selectedCount === 0 || slotItemsBusy || isActionBusy
                      }
                      className={[
                        "rounded-xl px-3 py-2 text-xs font-semibold transition",
                        selectedCount === 0 || slotItemsBusy || isActionBusy
                          ? "cursor-not-allowed bg-slate-200 text-slate-500"
                          : "bg-slate-900 text-white hover:bg-slate-800",
                      ].join(" ")}
                    >
                      Move
                    </button>
                    <button
                      type="button"
                      onClick={() => openClearModal("selected")}
                      disabled={
                        selectedCount === 0 || slotItemsBusy || isActionBusy
                      }
                      className={[
                        "rounded-xl px-3 py-2 text-xs font-semibold transition",
                        selectedCount === 0 || slotItemsBusy || isActionBusy
                          ? "cursor-not-allowed bg-slate-200 text-slate-500"
                          : "bg-rose-50 text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100",
                      ].join(" ")}
                    >
                      Clear
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => openMoveModal("all")}
                      disabled={!hasSlotItems || slotItemsBusy || isActionBusy}
                      className={[
                        "rounded-xl px-3 py-2 text-xs font-semibold transition",
                        !hasSlotItems || slotItemsBusy || isActionBusy
                          ? "cursor-not-allowed bg-slate-200 text-slate-500"
                          : "bg-slate-900 text-white hover:bg-slate-800",
                      ].join(" ")}
                    >
                      Move All
                    </button>
                    <button
                      type="button"
                      onClick={() => openClearModal("all")}
                      disabled={!hasSlotItems || slotItemsBusy || isActionBusy}
                      className={[
                        "rounded-xl px-3 py-2 text-xs font-semibold transition",
                        !hasSlotItems || slotItemsBusy || isActionBusy
                          ? "cursor-not-allowed bg-slate-200 text-slate-500"
                          : "bg-rose-50 text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100",
                      ].join(" ")}
                    >
                      Clear All
                    </button>
                  </>
                )}
              </div>
            </div>
            {selectionMode ? (
              <div className="mt-2 text-xs text-slate-500">
                {selectedCount > 0
                  ? `${selectedCount} selected`
                  : "Select items to move or clear."}
              </div>
            ) : null}
          </div>

          {slotItemsLoading || slotItemsFetching ? (
            <div className="p-4 text-sm text-slate-600">
              Loading slot contents...
            </div>
          ) : slotItemsError ? (
            <div className="p-4 text-sm text-rose-600">
              {slotItemsErrorMessage}
            </div>
          ) : slotItems.length === 0 ? (
            <div className="p-4 text-sm text-slate-600">
              This slot has no products yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
                  <tr>
                    {selectionMode ? (
                      <th className="px-4 py-3 text-center">Select</th>
                    ) : null}
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3 text-right">Qty</th>
                    <th className="px-4 py-3 text-right">CBM</th>
                    <th className="px-4 py-3 text-right">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {slotItems.map((item) => {
                    const product = item.product || {};
                    const itemId = String(item.id || item._id);
                    const isSelected = selectedSlotItemIds.has(itemId);
                    return (
                      <tr
                        key={item.id || item._id}
                        className={
                          isSelected ? "bg-amber-50" : "hover:bg-slate-50"
                        }
                      >
                        {selectionMode ? (
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSlotItem(itemId)}
                              aria-label={`Select ${product.name || "product"}`}
                              className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                            />
                          </td>
                        ) : null}
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">
                            {product.name || "Unknown product"}
                          </div>
                          <div className="text-xs text-slate-500">
                            {product.sku || "-"}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {formatQty(item.qty)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {formatNumber(item.cbm, 3)}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-slate-500">
                          {formatDate(item.updatedAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <InventoryMoveModal
        open={moveModalOpen}
        sourceSlotLabel={slot?.label}
        itemCount={moveItemCount}
        unitCount={moveUnitCount}
        moveScope={moveScope}
        moveSearch={moveSearch}
        onMoveSearchChange={handleMoveSearchChange}
        isMoveDebouncing={isMoveDebouncing}
        moveSearchLoading={moveSearchLoading}
        moveSearchError={moveSearchError}
        moveSearchRows={moveSearchRows}
        selectedTargetSlot={moveTargetSlot}
        selectedTargetSlotId={moveTargetSlotId}
        onSelectTargetSlot={handleMoveSelectSlot}
        onSubmit={handleMoveSubmit}
        moving={movingSlotItems}
        moveError={moveError}
        onClose={closeMoveModal}
        formatQty={formatQty}
      />

      {clearModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={closeClearModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-slot-title"
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-xl ring-1 ring-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <div
                  id="clear-slot-title"
                  className="text-sm font-semibold text-slate-900"
                >
                  Clear stock
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {clearScope === "all"
                    ? `Remove all ${clearTargetCount} items from this slot.`
                    : `Remove ${clearTargetCount} selected items from this slot.`}
                </div>
              </div>
              <button
                type="button"
                onClick={closeClearModal}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:text-slate-900"
              >
                Close
              </button>
            </div>

            <div className="px-4 py-4">
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                This action cannot be undone.
              </div>

              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleClearSubmit}
                  disabled={clearTargetCount === 0 || clearingSlotItems}
                  className={[
                    "rounded-xl px-4 py-2 text-xs font-semibold",
                    clearTargetCount === 0 || clearingSlotItems
                      ? "cursor-not-allowed bg-slate-200 text-slate-500"
                      : "bg-rose-600 text-white hover:bg-rose-700",
                  ].join(" ")}
                >
                  {clearingSlotItems
                    ? "Clearing..."
                    : clearScope === "all"
                    ? "Clear All"
                    : "Clear"}
                </button>
              </div>

              {clearError ? (
                <div className="mt-3 text-xs font-semibold text-rose-600">
                  {clearError}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
