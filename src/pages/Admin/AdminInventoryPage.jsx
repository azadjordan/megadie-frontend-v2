import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiChevronDown,
  FiChevronUp,
  FiRefreshCw,
  FiSettings,
  FiTrash2,
} from "react-icons/fi";
import { toast } from "react-toastify";
import Pagination from "../../components/common/Pagination";
import AdminInventoryTabs from "../../components/admin/AdminInventoryTabs";
import InventoryLocateModal from "../../components/admin/InventoryLocateModal";
import InventoryProductStockModal from "../../components/admin/InventoryProductStockModal";
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

const getInventoryRowMeta = (row, state = {}) => {
  const { isDeleting, deletingId } = state;
  const onHand = Number(row?.onHand || 0);
  const allocated = Number(row?.allocated || 0);
  const available = Math.max(0, onHand - allocated);
  const canDelete = onHand <= 0 && allocated <= 0;
  const isDeletingRow =
    isDeleting && String(deletingId) === String(row?.id);
  const deleteTitle = canDelete
    ? "Delete product"
    : `Cannot delete while on-hand (${formatQty(
        onHand
      )}) or allocated (${formatQty(allocated)}) quantities exist.`;
  const statusClass = STATUS_STYLES[row?.status] || STATUS_STYLES.OK;
  return {
    onHand,
    allocated,
    available,
    canDelete,
    isDeletingRow,
    deleteTitle,
    statusClass,
  };
};

export default function AdminInventoryPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("recent");
  const [productStatus, setProductStatus] = useState("all");
  const [productTypeFilter, setProductTypeFilter] = useState("all");
  const [productPage, setProductPage] = useState(1);
  const [productLimit, setProductLimit] = useState(25);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [locateProduct, setLocateProduct] = useState(null);
  const [stockProduct, setStockProduct] = useState(null);
  const [stockStore, setStockStore] = useState("all");
  const [stockSearch, setStockSearch] = useState("");
  const [stockSearchRows, setStockSearchRows] = useState([]);
  const [stockSearchLoading, setStockSearchLoading] = useState(false);
  const [stockSearchError, setStockSearchError] = useState("");
  const [stockSelected, setStockSelected] = useState({});
  const [stockExistingAdds, setStockExistingAdds] = useState({});
  const [stockSubmitError, setStockSubmitError] = useState("");
  const [stockSubmitSuccess, setStockSubmitSuccess] = useState("");
  const [stockSubmitFailures, setStockSubmitFailures] = useState([]);
  const [stockSubmitting, setStockSubmitting] = useState(false);

  const trimmedSearch = q.trim();
  const debouncedSearch = useDebouncedValue(trimmedSearch, 1000);
  const isDebouncing = trimmedSearch !== debouncedSearch;
  const trimmedStockSearch = stockSearch.trim();
  const debouncedStockSearch = useDebouncedValue(trimmedStockSearch, 600);
  const isStockDebouncing = trimmedStockSearch !== debouncedStockSearch;

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
  const [adjustSlotItem] = useAdjustSlotItemMutation();
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
  const slotStoreOptions = SLOT_STORE_TABS;
  const existingSlotIds = useMemo(() => {
    const ids = new Set();
    slotItems.forEach((item) => {
      const slotId = item.slot?._id || item.slot;
      if (slotId) ids.add(String(slotId));
    });
    return ids;
  }, [slotItems]);
  const availableSlotSearchRows = useMemo(
    () =>
      (stockSearchRows || []).filter(
        (slot) => !existingSlotIds.has(String(slot._id || slot.id))
      ),
    [stockSearchRows, existingSlotIds]
  );

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

  useEffect(() => {
    if (!stockProduct) return;
    const query = debouncedStockSearch.trim();
    if (!query) {
      setStockSearchRows([]);
      setStockSearchLoading(false);
      setStockSearchError("");
      return;
    }

    let cancelled = false;
    const loadSlots = async () => {
      setStockSearchLoading(true);
      setStockSearchError("");
      setStockSearchRows([]);
      const params = { isActive: true, q: query, page: 1, limit: 50 };
      if (stockStore !== "all") params.store = stockStore;

      try {
        const batch = await getSlots(params).unwrap();
        const safeBatch = Array.isArray(batch?.rows) ? batch.rows : [];
        if (!cancelled) setStockSearchRows(safeBatch);
      } catch (err) {
        if (!cancelled) {
          setStockSearchError(
            err?.data?.message || err?.error || "Unable to load slots."
          );
        }
      } finally {
        if (!cancelled) setStockSearchLoading(false);
      }
    };

    loadSlots();
    return () => {
      cancelled = true;
    };
  }, [stockProduct, stockStore, debouncedStockSearch, getSlots]);

  const openLocateModal = (row) => {
    setLocateProduct(row);
    getSlotItemsByProduct(row.id);
  };

  const closeLocateModal = () => {
    setLocateProduct(null);
  };

  const openStockModal = (row) => {
    setStockProduct(row);
    setStockStore("all");
    setStockSearch("");
    setStockSearchRows([]);
    setStockSearchLoading(false);
    setStockSearchError("");
    setStockSelected({});
    setStockExistingAdds({});
    setStockSubmitError("");
    setStockSubmitSuccess("");
    setStockSubmitFailures([]);
    getSlotItemsByProduct(row.id);
  };

  const closeStockModal = () => {
    setStockProduct(null);
    setStockSearch("");
    setStockSearchRows([]);
    setStockSearchLoading(false);
    setStockSearchError("");
    setStockSelected({});
    setStockExistingAdds({});
    setStockSubmitError("");
    setStockSubmitSuccess("");
    setStockSubmitFailures([]);
  };

  const handleStockStoreChange = (value) => {
    setStockStore(value);
    setStockSearchRows([]);
    setStockSearchError("");
  };

  const handleStockSearchChange = (value) => {
    setStockSearch(value);
    setStockSubmitError("");
    setStockSubmitSuccess("");
    setStockSubmitFailures([]);
  };

  const toggleStockSlot = (slot) => {
    const slotId = slot?._id || slot?.id;
    if (!slotId) return;
    const key = String(slotId);
    setStockSelected((prev) => {
      const next = { ...prev };
      if (next[key]) {
        delete next[key];
      } else {
        next[key] = { slot, qty: "" };
      }
      return next;
    });
    setStockSubmitError("");
    setStockSubmitSuccess("");
    setStockSubmitFailures([]);
  };

  const handleStockQtyChange = (slotId, value) => {
    const key = String(slotId);
    setStockSelected((prev) => {
      if (!prev[key]) return prev;
      return { ...prev, [key]: { ...prev[key], qty: value } };
    });
  };

  const handleExistingQtyChange = (slotId, value) => {
    const key = String(slotId);
    setStockExistingAdds((prev) => ({ ...prev, [key]: value }));
  };

  const handleRemoveSelectedSlot = (slotId) => {
    const key = String(slotId);
    setStockSelected((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleClearSelectedSlots = () => {
    setStockSelected({});
    setStockSubmitError("");
    setStockSubmitSuccess("");
    setStockSubmitFailures([]);
  };

  const handleClearExistingAdds = () => {
    setStockExistingAdds({});
  };

  const handleStockSubmit = async () => {
    if (!stockProduct) return;
    const productId = stockProduct.id || stockProduct._id;
    if (!productId) {
      setStockSubmitError("Missing product id.");
      return;
    }

    const existingEntries = Object.entries(stockExistingAdds || {})
      .map(([slotId, qty]) => ({ slotId, qty }))
      .filter(({ qty }) => {
        const qtyValue = Number(qty);
        return Number.isFinite(qtyValue) && qtyValue > 0;
      });
    const newEntries = Object.entries(stockSelected || {}).map(
      ([slotId, entry]) => ({ slotId, entry })
    );
    const hasInvalidQty = newEntries.some(({ entry }) => {
      const qtyValue = Number(entry?.qty);
      return !Number.isFinite(qtyValue) || qtyValue <= 0;
    });

    if (!existingEntries.length && !newEntries.length) {
      setStockSubmitError("Select at least one slot.");
      return;
    }
    if (hasInvalidQty) {
      setStockSubmitError("Enter a qty for every selected slot.");
      return;
    }

    setStockSubmitting(true);
    setStockSubmitError("");
    setStockSubmitSuccess("");
    setStockSubmitFailures([]);

    const failures = [];
    let successCount = 0;
    const existingById = new Map();
    slotItems.forEach((item) => {
      const slotId = item.slot?._id || item.slot;
      if (!slotId) return;
      existingById.set(String(slotId), item);
    });

    for (const { slotId, qty } of existingEntries) {
      const qtyValue = Number(qty);
      try {
        await adjustSlotItem({
          productId,
          slotId,
          deltaQty: qtyValue,
        }).unwrap();
        successCount += 1;
      } catch (err) {
        const existingItem = existingById.get(String(slotId));
        failures.push({
          slotId,
          label: existingItem?.slot?.label,
          message: err?.data?.message || err?.error || "Unable to add stock.",
        });
      }
    }

    for (const { slotId, entry } of newEntries) {
      const qtyValue = Number(entry.qty);
      if (!Number.isFinite(qtyValue) || qtyValue <= 0) {
        failures.push({
          slotId,
          label: entry.slot?.label,
          message: "Qty must be a positive number.",
        });
        continue;
      }

      try {
        await adjustSlotItem({
          productId,
          slotId,
          deltaQty: qtyValue,
        }).unwrap();
        successCount += 1;
      } catch (err) {
        failures.push({
          slotId,
          label: entry.slot?.label,
          message: err?.data?.message || err?.error || "Unable to add stock.",
        });
      }
    }

    if (failures.length > 0) {
      const failedIds = new Set(failures.map((failure) => failure.slotId));
      setStockSelected((prev) => {
        const next = {};
        Object.entries(prev || {}).forEach(([id, value]) => {
          if (failedIds.has(id)) next[id] = value;
        });
        return next;
      });
      setStockExistingAdds((prev) => {
        const next = {};
        Object.entries(prev || {}).forEach(([id, value]) => {
          if (failedIds.has(id)) next[id] = value;
        });
        return next;
      });
      setStockSubmitFailures(failures);
      setStockSubmitError(`Failed to add ${failures.length} slot(s).`);
    } else {
      setStockSelected({});
      setStockExistingAdds({});
      setStockSearch("");
      setStockSearchRows([]);
    }

    if (successCount > 0) {
      setStockSubmitSuccess(`Added to ${successCount} slot(s).`);
      getSlotItemsByProduct(productId);
    }

    setStockSubmitting(false);
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

      <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
        <div className="flex flex-col gap-3">
          <AdminInventoryTabs />

          <div className="grid w-full grid-cols-1 gap-3 md:items-end md:grid-cols-[1fr_200px_220px_160px_200px_auto]">
            <div className="flex items-end gap-2 md:contents">
              <div className="flex-1">
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
              <button
                type="button"
                onClick={() => setFiltersOpen((prev) => !prev)}
                className="inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 md:hidden"
                aria-expanded={filtersOpen}
                aria-controls="inventory-filters-panel"
              >
                <span>{filtersOpen ? "Hide filters" : "Filters"}</span>
                {filtersOpen ? (
                  <FiChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <FiChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                )}
              </button>
            </div>

            <div
              id="inventory-filters-panel"
              className={[
                filtersOpen ? "grid grid-cols-2 gap-2" : "hidden",
                "md:contents",
              ].join(" ")}
            >
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

              <div className="col-span-2 flex items-end md:col-auto">
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
        <div className="space-y-3">
          <div className="space-y-3 md:hidden">
            {sortedRows.map((row) => {
              const meta = getInventoryRowMeta(row, { isDeleting, deletingId });
              return (
                <div
                  key={row.id}
                  className="rounded-2xl bg-white p-4 ring-1 ring-slate-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {row.image ? (
                        <img
                          src={row.image}
                          alt={row.name || "Product"}
                          className="h-12 w-12 rounded-lg border border-slate-200 object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-lg border border-dashed border-slate-200 bg-slate-50" />
                      )}
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          {row.name}
                        </div>
                        <div className="text-xs text-slate-500">{row.sku}</div>
                      </div>
                    </div>
                    <span
                      className={[
                        "inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ring-1 ring-inset",
                        meta.statusClass,
                      ].join(" ")}
                    >
                      {row.status}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        On-hand
                      </div>
                      <div className="mt-1 font-semibold text-slate-900 tabular-nums">
                        {formatQty(meta.onHand)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Reserved
                      </div>
                      <div className="mt-1 font-semibold text-slate-900 tabular-nums">
                        {formatQty(meta.allocated)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Available
                      </div>
                      <div className="mt-1 font-semibold text-slate-900 tabular-nums">
                        {formatQty(meta.available)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Link
                      to={`/admin/inventory/products/${row.id}/edit`}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-700 hover:bg-slate-50"
                      title="Edit product"
                      aria-label="Edit product"
                    >
                      <FiSettings className="h-3.5 w-3.5" />
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => openLocateModal(row)}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-700 hover:bg-slate-50"
                    >
                      Locate
                    </button>
                    <button
                      type="button"
                      onClick={() => openStockModal(row)}
                      className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-emerald-700 hover:bg-emerald-100"
                    >
                      Stock
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteProduct(row)}
                      disabled={meta.isDeletingRow}
                      aria-disabled={!meta.canDelete || meta.isDeletingRow}
                      className={[
                        "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-semibold uppercase tracking-wider ring-1",
                        meta.isDeletingRow
                          ? "cursor-not-allowed bg-white text-slate-300 ring-slate-200"
                          : meta.canDelete
                          ? "bg-white text-rose-600 ring-rose-200 hover:bg-rose-50"
                          : "bg-white text-slate-400 ring-slate-200 hover:bg-slate-50",
                      ].join(" ")}
                      title={meta.deleteTitle}
                      aria-label={meta.deleteTitle}
                    >
                      <FiTrash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden overflow-hidden rounded-2xl ring-1 ring-slate-200 md:block">
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
                    const meta = getInventoryRowMeta(row, {
                      isDeleting,
                      deletingId,
                    });
                    return (
                      <tr key={row.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {row.image ? (
                              <img
                                src={row.image}
                                alt={row.name || "Product"}
                                className="h-10 w-10 rounded-lg border border-slate-200 object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-lg border border-dashed border-slate-200 bg-slate-50" />
                            )}
                            <div>
                              <div className="font-semibold text-slate-900">
                                {row.name}
                              </div>
                              <div className="text-xs text-slate-500">
                                {row.sku}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {formatQty(meta.onHand)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {formatQty(meta.allocated)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-900">
                          {formatQty(meta.available)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={[
                              "inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ring-1 ring-inset",
                              meta.statusClass,
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
                              onClick={() => openStockModal(row)}
                              className="inline-flex h-8 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                            >
                              Stock
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(row)}
                              disabled={meta.isDeletingRow}
                              aria-disabled={!meta.canDelete || meta.isDeletingRow}
                              className={[
                                "inline-flex h-8 w-8 items-center justify-center rounded-lg border",
                                meta.isDeletingRow
                                  ? "cursor-not-allowed border-slate-200 bg-white text-slate-300"
                                  : meta.canDelete
                                  ? "border-rose-200 bg-white text-rose-600 hover:bg-rose-50"
                                  : "border-slate-200 bg-white text-slate-400 hover:bg-slate-50",
                              ].join(" ")}
                              title={meta.deleteTitle}
                              aria-label={meta.deleteTitle}
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

      <InventoryProductStockModal
        open={Boolean(stockProduct)}
        product={stockProduct}
        storeOptions={slotStoreOptions}
        storeValue={stockStore}
        onStoreChange={handleStockStoreChange}
        search={stockSearch}
        onSearchChange={handleStockSearchChange}
        isDebouncing={isStockDebouncing}
        searchLoading={stockSearchLoading}
        searchError={stockSearchError}
        searchRows={availableSlotSearchRows}
        existingSlots={slotItems}
        existingSlotsLoading={slotItemsLoading}
        existingSlotsError={slotItemsError}
        existingSlotsErrorMessage={slotItemsErrorMessage}
        existingAdditions={stockExistingAdds}
        onExistingQtyChange={handleExistingQtyChange}
        onClearExisting={handleClearExistingAdds}
        selectedSlots={stockSelected}
        onToggleSlot={toggleStockSlot}
        onRemoveSelected={handleRemoveSelectedSlot}
        onNewQtyChange={handleStockQtyChange}
        onClearSelected={handleClearSelectedSlots}
        onSubmit={handleStockSubmit}
        onClose={closeStockModal}
        submitting={stockSubmitting}
        submitError={stockSubmitError}
        submitSuccess={stockSubmitSuccess}
        submitFailures={stockSubmitFailures}
      />
    </div>
  );
}
