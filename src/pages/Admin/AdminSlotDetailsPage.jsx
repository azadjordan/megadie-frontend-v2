import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FiChevronLeft } from "react-icons/fi";
import {
  useGetSlotByIdQuery,
  useLazyGetSlotsQuery,
} from "../../features/slots/slotsApiSlice";
import {
  useGetSlotItemsBySlotQuery,
  useAdjustSlotItemMutation,
  useMoveSlotItemsMutation,
  useClearSlotItemsMutation,
} from "../../features/slotItems/slotItemsApiSlice";
import { useLazyGetInventoryProductsQuery } from "../../features/inventory/inventoryApiSlice";
import InventoryMoveModal from "../../components/admin/InventoryMoveModal";
import InventorySlotStockModal from "../../components/admin/InventorySlotStockModal";
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
  const [moveQuantities, setMoveQuantities] = useState({});
  const [clearError, setClearError] = useState("");
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [stockSearch, setStockSearch] = useState("");
  const [stockSearchRows, setStockSearchRows] = useState([]);
  const [stockSearchError, setStockSearchError] = useState("");
  const [stockSelected, setStockSelected] = useState({});
  const [stockSubmitError, setStockSubmitError] = useState("");
  const [stockSubmitSuccess, setStockSubmitSuccess] = useState("");
  const [stockSubmitFailures, setStockSubmitFailures] = useState([]);
  const [stockSubmitting, setStockSubmitting] = useState(false);
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
  const [loadInventoryProducts, { isFetching: stockSearchLoading }] =
    useLazyGetInventoryProductsQuery();
  const [adjustSlotItem] = useAdjustSlotItemMutation();

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
  const trimmedStockSearch = stockSearch.trim();
  const debouncedStockSearch = useDebouncedValue(trimmedStockSearch, 600);
  const isStockDebouncing = trimmedStockSearch !== debouncedStockSearch;
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
  const moveCandidates = useMemo(
    () => (moveScope === "all" ? slotItems : selectedSlotItems),
    [moveScope, slotItems, selectedSlotItems]
  );
  const hasSlotItems = slotItems.length > 0;
  const allSelected = hasSlotItems && selectedCount === slotItems.length;
  const someSelected = selectedCount > 0 && !allSelected;
  const moveTargetSlotId = moveTargetSlot
    ? String(moveTargetSlot._id || moveTargetSlot.id)
    : "";
  const isActionBusy = movingSlotItems || clearingSlotItems;
  const moveValidation = useMemo(() => {
    const errors = {};
    let totalUnits = 0;
    moveCandidates.forEach((item) => {
      const itemId = String(item.id || item._id);
      const onHand = Number(item.qty) || 0;
      const rawValue = moveQuantities[itemId];
      const qtyValue = Number(rawValue);
      if (!Number.isFinite(qtyValue) || qtyValue <= 0) {
        errors[itemId] = "Enter a qty.";
        return;
      }
      if (qtyValue > onHand) {
        errors[itemId] = "Exceeds on-hand qty.";
        return;
      }
      totalUnits += qtyValue;
    });

    const isValid =
      moveCandidates.length > 0 && Object.keys(errors).length === 0;

    return { errors, totalUnits, isValid };
  }, [moveCandidates, moveQuantities]);
  const moveItemCount = moveCandidates.length;
  const moveUnitCount = moveValidation.totalUnits;
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
    if (!stockModalOpen) return;
    const query = debouncedStockSearch.trim();
    if (!query) {
      setStockSearchRows([]);
      setStockSearchError("");
      return;
    }

    let cancelled = false;
    const loadProducts = async () => {
      setStockSearchError("");
      try {
        const batch = await loadInventoryProducts({
          q: query,
          page: 1,
          limit: 50,
        }).unwrap();
        const rows = Array.isArray(batch?.rows) ? batch.rows : [];
        if (!cancelled) setStockSearchRows(rows);
      } catch (err) {
        if (!cancelled) {
          setStockSearchError(
            err?.data?.message || err?.error || "Unable to load products."
          );
        }
      }
    };

    loadProducts();
    return () => {
      cancelled = true;
    };
  }, [stockModalOpen, debouncedStockSearch, loadInventoryProducts]);

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
    const sourceItems = scope === "all" ? slotItems : selectedSlotItems;
    const initialQuantities = {};
    sourceItems.forEach((item) => {
      const itemId = String(item.id || item._id);
      if (itemId) {
        initialQuantities[itemId] = String(item.qty ?? "");
      }
    });
    setMoveScope(scope);
    setMoveModalOpen(true);
    setMoveSearch("");
    setMoveSearchRows([]);
    setMoveSearchLoading(false);
    setMoveSearchError("");
    setMoveTargetSlot(null);
    setMoveError("");
    setMoveQuantities(initialQuantities);
  };

  const closeMoveModal = () => {
    setMoveModalOpen(false);
    setMoveSearch("");
    setMoveSearchRows([]);
    setMoveSearchLoading(false);
    setMoveSearchError("");
    setMoveTargetSlot(null);
    setMoveError("");
    setMoveQuantities({});
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

  const openStockModal = () => {
    setStockModalOpen(true);
    setStockSearch("");
    setStockSearchRows([]);
    setStockSearchError("");
    setStockSelected({});
    setStockSubmitError("");
    setStockSubmitSuccess("");
    setStockSubmitFailures([]);
  };

  const closeStockModal = () => {
    setStockModalOpen(false);
    setStockSearch("");
    setStockSearchRows([]);
    setStockSearchError("");
    setStockSelected({});
    setStockSubmitError("");
    setStockSubmitSuccess("");
    setStockSubmitFailures([]);
  };

  const handleStockSearchChange = (value) => {
    setStockSearch(value);
    setStockSubmitError("");
    setStockSubmitSuccess("");
    setStockSubmitFailures([]);
  };

  const toggleStockProduct = (product) => {
    const productId = product?.id || product?._id;
    if (!productId) return;
    const key = String(productId);
    setStockSelected((prev) => {
      const next = { ...prev };
      if (next[key]) {
        delete next[key];
      } else {
        next[key] = { product, qty: "" };
      }
      return next;
    });
    setStockSubmitError("");
    setStockSubmitSuccess("");
    setStockSubmitFailures([]);
  };

  const handleStockQtyChange = (productId, value) => {
    const key = String(productId);
    setStockSelected((prev) => {
      if (!prev[key]) return prev;
      return { ...prev, [key]: { ...prev[key], qty: value } };
    });
  };

  const handleRemoveSelected = (productId) => {
    const key = String(productId);
    setStockSelected((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleClearSelection = () => {
    setStockSelected({});
    setStockSubmitError("");
    setStockSubmitSuccess("");
    setStockSubmitFailures([]);
  };

  const handleStockSubmit = async () => {
    const resolvedSlotId = String(slot?._id || slot?.id || slotId || "");
    if (!resolvedSlotId) {
      setStockSubmitError("Missing slot id.");
      return;
    }

    const entries = Object.entries(stockSelected || {});
    if (entries.length === 0) {
      setStockSubmitError("Select at least one SKU.");
      return;
    }
    const hasInvalidQty = entries.some(([, entry]) => {
      const qtyValue = Number(entry?.qty);
      return !Number.isFinite(qtyValue) || qtyValue <= 0;
    });
    if (hasInvalidQty) {
      setStockSubmitError("Enter a qty for every selected SKU.");
      return;
    }

    setStockSubmitting(true);
    setStockSubmitError("");
    setStockSubmitSuccess("");
    setStockSubmitFailures([]);

    const failures = [];
    let successCount = 0;

    for (const [productId, entry] of entries) {
      const qtyValue = Number(entry.qty);
      if (!Number.isFinite(qtyValue) || qtyValue <= 0) {
        failures.push({
          productId,
          name: entry.product?.name,
          sku: entry.product?.sku,
          message: "Qty must be a positive number.",
        });
        continue;
      }

      try {
        await adjustSlotItem({
          productId,
          slotId: resolvedSlotId,
          deltaQty: qtyValue,
        }).unwrap();
        successCount += 1;
      } catch (err) {
        failures.push({
          productId,
          name: entry.product?.name,
          sku: entry.product?.sku,
          message: err?.data?.message || err?.error || "Unable to add stock.",
        });
      }
    }

    if (failures.length > 0) {
      const failedIds = new Set(failures.map((failure) => failure.productId));
      setStockSelected((prev) => {
        const next = {};
        Object.entries(prev || {}).forEach(([id, value]) => {
          if (failedIds.has(id)) next[id] = value;
        });
        return next;
      });
      setStockSubmitFailures(failures);
      setStockSubmitError(`Failed to add ${failures.length} SKU(s).`);
    } else {
      setStockSelected({});
      setStockSearch("");
      setStockSearchRows([]);
    }

    if (successCount > 0) {
      setStockSubmitSuccess(`Added stock for ${successCount} SKU(s).`);
    }

    setStockSubmitting(false);
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

  const handleMoveQtyChange = (slotItemId, value) => {
    const key = String(slotItemId);
    setMoveQuantities((prev) => ({ ...prev, [key]: value }));
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

    if (!moveCandidates.length) {
      setMoveError("Select at least one slot item to move.");
      return;
    }
    if (!moveValidation.isValid) {
      setMoveError("Enter a valid qty for every item.");
      return;
    }

    const moves = moveCandidates.reduce((acc, item) => {
      const itemId = String(item.id || item._id);
      const qtyValue = Number(moveQuantities[itemId]);
      if (!itemId || !Number.isFinite(qtyValue) || qtyValue <= 0) return acc;
      acc.push({ slotItemId: itemId, qty: qtyValue });
      return acc;
    }, []);
    if (moves.length === 0) {
      setMoveError("Enter a valid qty for every item.");
      return;
    }

    try {
      setMoveError("");
      await moveSlotItems({
        fromSlotId: slotId,
        toSlotId: moveTargetSlotId,
        moves,
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

      <div className="grid grid-flow-col auto-cols-fr gap-2 sm:grid-flow-row sm:auto-cols-auto sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="min-w-0 rounded-2xl bg-white p-2 ring-1 ring-slate-200 sm:p-4"
          >
            <div className="text-[10px] font-semibold text-slate-500 sm:text-xs">
              {card.label}
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-900 sm:mt-2 sm:text-lg">
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
                    "inline-flex h-8 items-center justify-center rounded-lg px-3 text-xs font-semibold transition",
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
                <button
                  type="button"
                  onClick={openStockModal}
                  disabled={selectionMode || slotItemsBusy || isActionBusy}
                  className={[
                    "inline-flex h-8 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-100",
                    selectionMode || slotItemsBusy || isActionBusy
                      ? "cursor-not-allowed opacity-60"
                      : "",
                  ].join(" ")}
                >
                  Stock
                </button>
                {selectionMode ? (
                  <>
                    <button
                      type="button"
                      onClick={() => openMoveModal("selected")}
                      disabled={
                        selectedCount === 0 || slotItemsBusy || isActionBusy
                      }
                      className={[
                        "inline-flex h-8 items-center justify-center rounded-lg px-3 text-xs font-semibold transition",
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
                        "inline-flex h-8 items-center justify-center rounded-lg px-3 text-xs font-semibold transition",
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
                        "inline-flex h-8 items-center justify-center rounded-lg px-3 text-xs font-semibold transition",
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
                        "inline-flex h-8 items-center justify-center rounded-lg px-3 text-xs font-semibold transition",
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
                      <th className="px-4 py-3 text-center">
                        <label
                          className={[
                            "inline-flex items-center gap-2",
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
                            disabled={
                              !hasSlotItems || slotItemsBusy || isActionBusy
                            }
                            aria-label="Select all items"
                            className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                          />
                          <span className="text-[11px] font-semibold text-slate-500">
                            All
                          </span>
                        </label>
                      </th>
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

      <InventorySlotStockModal
        open={stockModalOpen}
        slot={slot}
        search={stockSearch}
        onSearchChange={handleStockSearchChange}
        isDebouncing={isStockDebouncing}
        searchLoading={stockSearchLoading}
        searchError={stockSearchError}
        searchRows={stockSearchRows}
        selectedItems={stockSelected}
        onToggleProduct={toggleStockProduct}
        onRemoveSelected={handleRemoveSelected}
        onQtyChange={handleStockQtyChange}
        onClearSelection={handleClearSelection}
        onSubmit={handleStockSubmit}
        onClose={closeStockModal}
        submitting={stockSubmitting}
        submitError={stockSubmitError}
        submitSuccess={stockSubmitSuccess}
        submitFailures={stockSubmitFailures}
      />

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
        moveItems={moveCandidates}
        moveQuantities={moveQuantities}
        onMoveQtyChange={handleMoveQtyChange}
        moveItemErrors={moveValidation.errors}
        canSubmit={moveValidation.isValid}
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
