import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiRefreshCw, FiSettings, FiTrash2 } from "react-icons/fi";
import { toast } from "react-toastify";
import Pagination from "../../components/common/Pagination";
import AdminInventoryTabs from "../../components/admin/AdminInventoryTabs";
import InventoryLocateModal from "../../components/admin/InventoryLocateModal";
import InventoryStockModal from "../../components/admin/InventoryStockModal";
import { useGetInventoryProductsQuery } from "../../features/inventory/inventoryApiSlice";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import {
  useAdjustSlotItemMutation,
  useLazyGetSlotItemsByProductQuery,
} from "../../features/slotItems/slotItemsApiSlice";
import { useLazyGetSlotsQuery } from "../../features/slots/slotsApiSlice";
import {
  useDeleteProductMutation,
  useGetProductMetaQuery,
} from "../../features/products/productsApiSlice";

const SLOT_STORE_TABS = [
  { label: "All stores", value: "all" },
  { label: "AE1", value: "AE1" },
  { label: "AE2", value: "AE2" },
];

const STATUS_STYLES = {
  OK: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Low: "bg-amber-50 text-amber-700 ring-amber-200",
  Out: "bg-rose-50 text-rose-700 ring-rose-200",
};

const formatQty = (value) => {
  const n = Number(value) || 0;
  return new Intl.NumberFormat().format(n);
};

const formatSummaryValue = (value) =>
  typeof value === "number" ? formatQty(value) : "--";

export default function AdminInventoryPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("recent");
  const [productStatus, setProductStatus] = useState("all");
  const [productTypeFilter, setProductTypeFilter] = useState("all");
  const [productPage, setProductPage] = useState(1);
  const [productLimit, setProductLimit] = useState(25);
  const [locateProduct, setLocateProduct] = useState(null);
  const [addStockProduct, setAddStockProduct] = useState(null);
  const [addStockMode, setAddStockMode] = useState("existing");
  const [addExistingSlotId, setAddExistingSlotId] = useState("");
  const [addExistingQty, setAddExistingQty] = useState("1");
  const [addNewSlotId, setAddNewSlotId] = useState("");
  const [addNewQty, setAddNewQty] = useState("");
  const [addNewSlotStore, setAddNewSlotStore] = useState("AE1");
  const [addNewSlotLabel, setAddNewSlotLabel] = useState("");
  const [addNewSlotSelectedLabel, setAddNewSlotSelectedLabel] = useState("");
  const [allSlots, setAllSlots] = useState([]);
  const [allSlotsLoading, setAllSlotsLoading] = useState(false);
  const [allSlotsError, setAllSlotsError] = useState("");
  const [addStockError, setAddStockError] = useState("");
  const [addStockSuccess, setAddStockSuccess] = useState("");

  const trimmedSearch = q.trim();
  const debouncedSearch = useDebouncedValue(trimmedSearch, 1000);
  const isDebouncing = trimmedSearch !== debouncedSearch;
  const trimmedNewSlotSearch = addNewSlotLabel.trim();
  const debouncedNewSlotSearch = useDebouncedValue(trimmedNewSlotSearch, 1000);
  const isNewSlotDebouncing =
    trimmedNewSlotSearch !== debouncedNewSlotSearch;

  const {
    data: metaData,
    isLoading: metaLoading,
    error: metaError,
  } = useGetProductMetaQuery();
  const productTypes = metaData?.productTypes ?? [];

  const productParams = useMemo(() => {
    const params = { sort, page: productPage, limit: productLimit };
    if (debouncedSearch) params.q = debouncedSearch;
    if (productStatus !== "all") params.status = productStatus;
    if (productTypeFilter !== "all") params.productType = productTypeFilter;
    return params;
  }, [
    debouncedSearch,
    productStatus,
    productTypeFilter,
    sort,
    productPage,
    productLimit,
  ]);

  const {
    data: inventoryData,
    isLoading: inventoryLoading,
    isFetching: inventoryFetching,
    error: inventoryError,
  } = useGetInventoryProductsQuery(productParams);

  const [
    getSlotItemsByProduct,
    {
      data: slotItemsData,
      isFetching: slotItemsLoading,
      error: slotItemsError,
    },
  ] = useLazyGetSlotItemsByProductQuery();
  const [getSlots] = useLazyGetSlotsQuery();
  const [adjustSlotItem, { isLoading: adjustingStock }] =
    useAdjustSlotItemMutation();
  const [deleteProduct, { isLoading: isDeleting }] =
    useDeleteProductMutation();
  const [deletingId, setDeletingId] = useState(null);

  const productRows = inventoryData?.rows ?? [];
  const productPagination = inventoryData?.pagination ?? null;
  const productSummary = inventoryData?.summary ?? null;
  const hasProductSummary =
    productSummary && typeof productSummary.totalSkus === "number";
  const productTotal = hasProductSummary
    ? productSummary.totalSkus
    : productPagination?.total ?? productRows.length;
  const productLoading = inventoryLoading || inventoryFetching;
  const productError = inventoryError;
  const productErrorMessage =
    productError?.data?.message ||
    productError?.error ||
    "Unable to load inventory.";

  const slotItems = slotItemsData?.data ?? [];
  const slotItemsErrorMessage =
    slotItemsError?.data?.message ||
    slotItemsError?.error ||
    "Unable to load slot locations.";
  const hasSlotItems = slotItems.length > 0;
  const slotStoreOptions = SLOT_STORE_TABS;
  const newSlotSearchRows = allSlots;
  const newSlotSearchLoading = allSlotsLoading;
  const hasNewSlotSearchError = !!allSlotsError;
  const newSlotSearchErrorMessage = allSlotsError || "Unable to load slots.";

  const availableNewSlots = useMemo(() => {
    const existingIds = new Set(
      slotItems.map((item) => String(item.slot?._id || item.slot))
    );
    return newSlotSearchRows.filter(
      (slot) => !existingIds.has(String(slot._id || slot.id))
    );
  }, [newSlotSearchRows, slotItems]);

  const availableNewSlotsByLabel = useMemo(() => {
    const map = new Map();
    availableNewSlots.forEach((slot) => {
      if (!slot?.label) return;
      map.set(String(slot.label).trim().toLowerCase(), slot);
    });
    return map;
  }, [availableNewSlots]);

  const availableNewSlotsById = useMemo(() => {
    const map = new Map();
    availableNewSlots.forEach((slot) => {
      const slotId = slot?._id || slot?.id;
      if (!slotId) return;
      map.set(String(slotId), slot);
    });
    return map;
  }, [availableNewSlots]);

  const existingSlotLabelsById = useMemo(() => {
    const map = new Map();
    slotItems.forEach((item) => {
      const slotId = item.slot?._id || item.slot;
      if (!slotId) return;
      map.set(String(slotId), item.slot?.label || "Unknown slot");
    });
    return map;
  }, [slotItems]);

  const selectedNewSlot = addNewSlotId
    ? availableNewSlotsById.get(String(addNewSlotId))
    : null;
  const selectedNewSlotLabel = addNewSlotSelectedLabel
    ? addNewSlotSelectedLabel
    : selectedNewSlot?.label
    ? String(selectedNewSlot.label)
    : "";

  const canSubmitExisting =
    !adjustingStock &&
    !slotItemsLoading &&
    !slotItemsError &&
    hasSlotItems &&
    !!addExistingSlotId;
  const newQtyValue = Number(addNewQty);
  const canSubmitNew =
    !adjustingStock &&
    !!addNewSlotId &&
    Number.isFinite(newQtyValue) &&
    newQtyValue > 0;

  const filteredRows = productRows;
  const sortedRows = productRows;
  const totalItems = productTotal;
  const countLabel = "SKUs";

  const summaryCards = useMemo(
    () => [
      { label: "SKUs", value: formatSummaryValue(productTotal) },
      {
        label: "On-hand",
        value: formatSummaryValue(
          hasProductSummary ? productSummary.totalOnHand : null
        ),
      },
      {
        label: "Reserved",
        value: formatSummaryValue(
          hasProductSummary ? productSummary.totalAllocated : null
        ),
      },
      {
        label: "Low stock",
        value: formatSummaryValue(
          hasProductSummary ? productSummary.lowStockCount : null
        ),
      },
    ],
    [hasProductSummary, productSummary, productTotal]
  );

  const primaryAction = {
    label: "+ New Product",
    onClick: () => navigate("/admin/inventory/products/new"),
  };

  const resetFilters = () => {
    setQ("");
    setSort("recent");
    setProductStatus("all");
    setProductTypeFilter("all");
    setProductPage(1);
    setProductLimit(25);
  };

  const handleStockModeChange = (nextMode) => {
    setAddStockMode(nextMode);
    setAddStockError("");
    setAddStockSuccess("");
  };

  const handleExistingSlotChange = (slotId) => {
    setAddExistingSlotId(String(slotId));
    setAddStockError("");
    setAddStockSuccess("");
  };

  const handleExistingQtyChange = (value) => {
    setAddExistingQty(value);
    setAddStockError("");
    setAddStockSuccess("");
  };

  const handleNewSlotStoreChange = (storeValue) => {
    setAddNewSlotStore(storeValue);
    setAddNewSlotLabel("");
    setAddNewSlotId("");
    setAddNewSlotSelectedLabel("");
    setAddStockError("");
    setAddStockSuccess("");
  };

  const handleNewSlotLabelChange = (value) => {
    if (addNewSlotId || addNewSlotSelectedLabel) {
      setAddNewSlotId("");
      setAddNewSlotSelectedLabel("");
    }
    setAddNewSlotLabel(value);
    setAddStockError("");
    setAddStockSuccess("");

    const normalized = String(value || "").trim().toLowerCase();
    if (!normalized) return;
    const match = availableNewSlotsByLabel.get(normalized);
    if (!match) return;

    setAddNewSlotId(String(match._id || match.id));
    setAddNewSlotSelectedLabel(String(match.label || value).trim());
    setAddNewSlotLabel("");
  };

  const handleClearNewSlotSelection = () => {
    setAddNewSlotId("");
    setAddNewSlotSelectedLabel("");
    setAddNewSlotLabel("");
    setAddStockError("");
    setAddStockSuccess("");
  };

  const handleNewQtyChange = (value) => {
    setAddNewQty(value);
    setAddStockError("");
    setAddStockSuccess("");
  };

  useEffect(() => {
    if (!addStockProduct) return;
    if (addExistingSlotId) return;
    if (!slotItems.length) return;
    const firstSlotId = slotItems[0]?.slot?._id || slotItems[0]?.slot || "";
    if (firstSlotId) setAddExistingSlotId(firstSlotId);
  }, [addStockProduct, addExistingSlotId, slotItems]);

  useEffect(() => {
    if (!addStockProduct) return;
    const query = debouncedNewSlotSearch.trim();
    if (!query) {
      setAllSlots([]);
      setAllSlotsLoading(false);
      setAllSlotsError("");
      return;
    }

    let cancelled = false;
    const loadSlots = async () => {
      setAllSlotsLoading(true);
      setAllSlotsError("");
      setAllSlots([]);
      const params = { isActive: true, q: query, page: 1, limit: 50 };
      if (addNewSlotStore !== "all") params.store = addNewSlotStore;

      try {
        const batch = await getSlots(params).unwrap();
        const safeBatch = Array.isArray(batch?.rows) ? batch.rows : [];
        if (!cancelled) setAllSlots(safeBatch);
      } catch (err) {
        if (!cancelled) {
          setAllSlotsError(
            err?.data?.message || err?.error || "Unable to load slots."
          );
        }
      } finally {
        if (!cancelled) setAllSlotsLoading(false);
      }
    };

    loadSlots();
    return () => {
      cancelled = true;
    };
  }, [addStockProduct, addNewSlotStore, debouncedNewSlotSearch, getSlots]);

  const openLocateModal = (row) => {
    setLocateProduct(row);
    getSlotItemsByProduct(row.id);
  };

  const closeLocateModal = () => {
    setLocateProduct(null);
  };

  const openAddStockModal = (row) => {
    setAddStockProduct(row);
    setAddStockMode("existing");
    setAddExistingQty("1");
    setAddNewQty("");
    setAddNewSlotStore("AE1");
    setAddNewSlotLabel("");
    setAddExistingSlotId("");
    setAddNewSlotId("");
    setAddNewSlotSelectedLabel("");
    setAddStockError("");
    setAddStockSuccess("");
    getSlotItemsByProduct(row.id);
  };

  const closeAddStockModal = () => {
    setAddStockProduct(null);
    setAddStockMode("existing");
    setAllSlots([]);
    setAllSlotsLoading(false);
    setAllSlotsError("");
    setAddStockError("");
    setAddStockSuccess("");
    setAddNewSlotSelectedLabel("");
  };

  const handleAddStockExisting = async () => {
    if (!addStockProduct) return;
    if (!addExistingSlotId) {
      setAddStockError("Select an existing slot to add stock.");
      setAddStockSuccess("");
      return;
    }
    const qtyValue = Number(addExistingQty);
    if (!Number.isFinite(qtyValue) || qtyValue <= 0) {
      setAddStockError("Qty must be a positive number.");
      setAddStockSuccess("");
      return;
    }

    try {
      setAddStockError("");
      setAddStockSuccess("");
      await adjustSlotItem({
        productId: addStockProduct.id,
        slotId: addExistingSlotId,
        deltaQty: qtyValue,
      }).unwrap();
      const label =
        existingSlotLabelsById.get(String(addExistingSlotId)) || "slot";
      setAddStockSuccess(`Added ${formatQty(qtyValue)} to ${label}.`);
      setAddExistingQty("1");
      getSlotItemsByProduct(addStockProduct.id);
    } catch (err) {
      setAddStockError(
        err?.data?.message || err?.error || "Unable to add stock."
      );
      setAddStockSuccess("");
    }
  };

  const handleAddStockNew = async () => {
    if (!addStockProduct) return;
    if (!addNewSlotId) {
      setAddStockError("Select a new slot to add stock.");
      setAddStockSuccess("");
      return;
    }
    const qtyValue = Number(addNewQty);
    if (!Number.isFinite(qtyValue) || qtyValue <= 0) {
      setAddStockError("Qty must be a positive number.");
      setAddStockSuccess("");
      return;
    }

    try {
      setAddStockError("");
      setAddStockSuccess("");
      await adjustSlotItem({
        productId: addStockProduct.id,
        slotId: addNewSlotId,
        deltaQty: qtyValue,
      }).unwrap();
      const label = selectedNewSlotLabel || "slot";
      setAddStockSuccess(`Added ${formatQty(qtyValue)} to ${label}.`);
      setAddNewQty("");
      setAddNewSlotLabel("");
      setAddNewSlotId("");
      setAddNewSlotSelectedLabel("");
      getSlotItemsByProduct(addStockProduct.id);
    } catch (err) {
      setAddStockError(
        err?.data?.message || err?.error || "Unable to add stock."
      );
      setAddStockSuccess("");
    }
  };

  const friendlyApiError = (err) =>
    err?.data?.message || err?.error || err?.message || "Something went wrong.";

  const handleDeleteProduct = async (row) => {
    if (!row?.id) return;
    const onHand = Number(row.onHand || 0);
    const allocated = Number(row.allocated || 0);
    if (onHand > 0 || allocated > 0) {
      toast.error(
        `Cannot delete while on-hand (${formatQty(
          onHand
        )}) or allocated (${formatQty(allocated)}) quantities exist.`
      );
      return;
    }

    const ok = window.confirm("Delete this product? This cannot be undone.");
    if (!ok) return;

    try {
      setDeletingId(row.id);
      const res = await deleteProduct(row.id).unwrap();
      toast.success(res?.message || "Product deleted.");
    } catch (err) {
      toast.error(friendlyApiError(err));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-lg font-semibold text-slate-900">Inventory</div>
          <div className="text-sm text-slate-500">
            Track stock by product, slot, and allocations.
          </div>
        </div>

        {primaryAction ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={primaryAction.onClick}
              className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              {primaryAction.label}
            </button>
          </div>
        ) : null}
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

      <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
        <div className="flex flex-col gap-3">
          <AdminInventoryTabs />

          <div className="grid w-full grid-cols-1 gap-3 md:items-end md:grid-cols-[1fr_200px_220px_160px_200px_auto]">
            <div>
              <label
                htmlFor="inventory-search"
                className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
              >
                Search
              </label>
              <input
                id="inventory-search"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setProductPage(1);
                }}
                placeholder="Search SKU..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.currentTarget.blur();
                  }
                }}
                className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              />
            </div>

            <div>
              <label
                htmlFor="inventory-product-type"
                className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
              >
                Product type
              </label>
              <select
                id="inventory-product-type"
                value={productTypeFilter}
                onChange={(e) => {
                  setProductTypeFilter(e.target.value);
                  setProductPage(1);
                }}
                disabled={metaLoading || !productTypes.length}
                className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20 disabled:bg-slate-50"
              >
                <option value="all">All product types</option>
                {productTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              {metaError ? (
                <div className="mt-1 text-[11px] text-rose-600">
                  Unable to load product types.
                </div>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="inventory-status"
                className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
              >
                Status
              </label>
              <select
                id="inventory-status"
                value={productStatus}
                onChange={(e) => {
                  setProductStatus(e.target.value);
                  setProductPage(1);
                }}
                className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              >
                <option value="all">All status</option>
                <option value="ok">OK</option>
                <option value="low">Low stock</option>
                <option value="out">Out of stock</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="inventory-limit"
                className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
              >
                Per page
              </label>
              <select
                id="inventory-limit"
                value={productLimit}
                onChange={(e) => {
                  setProductLimit(Number(e.target.value) || 50);
                  setProductPage(1);
                }}
                className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              >
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="inventory-sort"
                className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
              >
                Sort
              </label>
              <select
                id="inventory-sort"
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  setProductPage(1);
                }}
                className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              >
                <option value="recent">Most recent</option>
                <option value="qtyhigh">Quantity (high)</option>
                <option value="qtylow">Quantity (low)</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                onClick={resetFilters}
              >
                <FiRefreshCw
                  className="mr-1 h-3.5 w-3.5 text-slate-400"
                  aria-hidden="true"
                />
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <div>
            Showing{" "}
            <span className="font-semibold text-slate-900">
              {filteredRows.length}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-slate-900">{totalItems}</span>{" "}
            {countLabel}
            {isDebouncing ? <span className="ml-2">(Searching...)</span> : null}
          </div>
          {productPagination ? (
            <Pagination
              pagination={productPagination}
              onPageChange={setProductPage}
              variant="compact"
            />
          ) : null}
        </div>
      </div>

      {productLoading ? (
        <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-slate-200">
          <div className="text-sm font-semibold text-slate-900">
            Loading inventory...
          </div>
          <div className="mt-1 text-sm text-slate-500">
            Fetching latest stock totals.
          </div>
        </div>
      ) : productError ? (
        <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-slate-200">
          <div className="text-sm font-semibold text-slate-900">
            Unable to load inventory
          </div>
          <div className="mt-1 text-sm text-slate-500">
            {productErrorMessage}
          </div>
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-slate-200">
          <div className="text-sm font-semibold text-slate-900">
            No products found
          </div>
          <div className="mt-1 text-sm text-slate-500">
            Try adjusting your search or filters to see results.
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl ring-1 ring-slate-200">
          <div className="overflow-x-auto bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3 text-right">On-hand</th>
                  <th className="px-4 py-3 text-right">Reserved</th>
                  <th className="px-4 py-3 text-right">Available</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {sortedRows.map((row) => {
                  const onHand = Number(row.onHand || 0);
                  const allocated = Number(row.allocated || 0);
                  const available = Math.max(0, onHand - allocated);
                  const canDelete = onHand <= 0 && allocated <= 0;
                  const isDeletingRow =
                    isDeleting && String(deletingId) === String(row.id);
                  const deleteTitle = canDelete
                    ? "Delete product"
                    : `Cannot delete while on-hand (${formatQty(
                        onHand
                      )}) or allocated (${formatQty(allocated)}) quantities exist.`;
                  return (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">
                          {row.name}
                        </div>
                        <div className="text-xs text-slate-500">{row.sku}</div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatQty(onHand)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatQty(allocated)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-900">
                        {formatQty(available)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={[
                            "inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ring-1 ring-inset",
                            STATUS_STYLES[row.status] || STATUS_STYLES.OK,
                          ].join(" ")}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-nowrap items-center justify-end gap-2">
                          <Link
                            to={`/admin/inventory/products/${row.id}/edit`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                            title="Edit product"
                            aria-label="Edit product"
                          >
                            <FiSettings className="h-4 w-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => openLocateModal(row)}
                            className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Locate
                          </button>
                          <button
                            type="button"
                            onClick={() => openAddStockModal(row)}
                            className="inline-flex h-8 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                          >
                            Stock
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(row)}
                            disabled={isDeletingRow}
                            aria-disabled={!canDelete || isDeletingRow}
                            className={[
                              "inline-flex h-8 w-8 items-center justify-center rounded-lg border",
                              isDeletingRow
                                ? "cursor-not-allowed border-slate-200 bg-white text-slate-300"
                                : canDelete
                                ? "border-rose-200 bg-white text-rose-600 hover:bg-rose-50"
                                : "border-slate-200 bg-white text-slate-400 hover:bg-slate-50",
                            ].join(" ")}
                            title={deleteTitle}
                            aria-label={deleteTitle}
                          >
                            <FiTrash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="text-xs text-slate-400">
        Tip: Allocations are reservations that have not been deducted from stock
        yet.
      </div>

      <InventoryLocateModal
        open={Boolean(locateProduct)}
        product={locateProduct}
        slotItems={slotItems}
        slotItemsLoading={slotItemsLoading}
        slotItemsError={slotItemsError}
        slotItemsErrorMessage={slotItemsErrorMessage}
        onClose={closeLocateModal}
        formatQty={formatQty}
      />

      <InventoryStockModal
        open={Boolean(addStockProduct)}
        product={addStockProduct}
        mode={addStockMode}
        onModeChange={handleStockModeChange}
        slotItems={slotItems}
        slotItemsLoading={slotItemsLoading}
        slotItemsError={slotItemsError}
        slotItemsErrorMessage={slotItemsErrorMessage}
        slotStoreOptions={slotStoreOptions}
        addExistingSlotId={addExistingSlotId}
        onExistingSlotChange={handleExistingSlotChange}
        addExistingQty={addExistingQty}
        onExistingQtyChange={handleExistingQtyChange}
        canSubmitExisting={canSubmitExisting}
        onAddExisting={handleAddStockExisting}
        addNewSlotStore={addNewSlotStore}
        onNewSlotStoreChange={handleNewSlotStoreChange}
        addNewSlotLabel={addNewSlotLabel}
        onNewSlotLabelChange={handleNewSlotLabelChange}
        addNewSlotSelectedLabel={selectedNewSlotLabel}
        onClearNewSlotSelection={handleClearNewSlotSelection}
        addNewSlotId={addNewSlotId}
        addNewQty={addNewQty}
        onNewQtyChange={handleNewQtyChange}
        canSubmitNew={canSubmitNew}
        onAddNew={handleAddStockNew}
        adjustingStock={adjustingStock}
        addStockError={addStockError}
        addStockSuccess={addStockSuccess}
        trimmedNewSlotSearch={trimmedNewSlotSearch}
        isNewSlotDebouncing={isNewSlotDebouncing}
        newSlotSearchLoading={newSlotSearchLoading}
        hasNewSlotSearchError={hasNewSlotSearchError}
        newSlotSearchErrorMessage={newSlotSearchErrorMessage}
        newSlotSearchRows={newSlotSearchRows}
        availableNewSlots={availableNewSlots}
        onClose={closeAddStockModal}
        formatQty={formatQty}
      />
    </div>
  );
}
