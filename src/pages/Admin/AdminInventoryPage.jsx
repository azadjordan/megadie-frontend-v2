
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiRefreshCw } from "react-icons/fi";
import Pagination from "../../components/common/Pagination";
import { useGetInventoryProductsQuery } from "../../features/inventory/inventoryApiSlice";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import { useLazyGetSlotItemsByProductQuery } from "../../features/slotItems/slotItemsApiSlice";

const SLOT_ROWS = [
  {
    id: "slot-a1-02",
    label: "A1-02",
    store: "Main Store",
    unit: "Shelf A1",
    position: "Left",
    skuCount: 12,
    totalQty: 420,
    status: "Active",
    updatedAt: "Today 09:12",
  },
  {
    id: "slot-a1-03",
    label: "A1-03",
    store: "Main Store",
    unit: "Shelf A1",
    position: "Right",
    skuCount: 5,
    totalQty: 120,
    status: "Low",
    updatedAt: "Yesterday",
  },
  {
    id: "slot-b2-01",
    label: "B2-01",
    store: "Main Store",
    unit: "Shelf B2",
    position: "Center",
    skuCount: 9,
    totalQty: 300,
    status: "Active",
    updatedAt: "Today 08:50",
  },
  {
    id: "slot-ov-01",
    label: "OV-01",
    store: "Overflow",
    unit: "Rack 4",
    position: "Top",
    skuCount: 0,
    totalQty: 0,
    status: "Empty",
    updatedAt: "Last week",
  },
  {
    id: "slot-c3-02",
    label: "C3-02",
    store: "Main Store",
    unit: "Shelf C3",
    position: "Left",
    skuCount: 3,
    totalQty: 60,
    status: "Low",
    updatedAt: "Today 09:00",
  },
];
const ALLOCATION_ORDERS = [
  {
    id: "ord-1052",
    orderNumber: "ORD-1052",
    customer: "Sara M.",
    status: "Allocated",
    pickedAt: "Today 10:12",
    items: [
      {
        id: "ord-1052-1",
        sku: "RB-25-RED",
        product: "Ribbon 25mm Red",
        slot: "A1-02",
        qty: 12,
        picker: "Nour",
      },
      {
        id: "ord-1052-2",
        sku: "BX-KRAFT-M",
        product: "Kraft Box Medium",
        slot: "B2-01",
        qty: 4,
        picker: "Nour",
      },
      {
        id: "ord-1052-3",
        sku: "TAG-THANK-YOU",
        product: "Thank You Tag",
        slot: "A1-03",
        qty: 20,
        picker: "Nour",
      },
    ],
  },
  {
    id: "ord-1053",
    orderNumber: "ORD-1053",
    customer: "Amal A.",
    status: "Partially Allocated",
    pickedAt: "Today 09:20",
    items: [
      {
        id: "ord-1053-1",
        sku: "RB-10-WHT",
        product: "Ribbon 10mm White",
        slot: "A1-03",
        qty: 8,
        picker: "Omar",
      },
      {
        id: "ord-1053-2",
        sku: "FLR-ROSE-RED",
        product: "Rose Red",
        slot: "OV-01",
        qty: 5,
        picker: "Omar",
      },
    ],
  },
];

const STATUS_STYLES = {
  OK: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Low: "bg-amber-50 text-amber-700 ring-amber-200",
  Out: "bg-rose-50 text-rose-700 ring-rose-200",
};

const SLOT_STATUS_STYLES = {
  Active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Low: "bg-amber-50 text-amber-700 ring-amber-200",
  Empty: "bg-slate-100 text-slate-600 ring-slate-200",
};

const ALLOCATION_STATUS_STYLES = {
  Allocated: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  "Partially Allocated": "bg-amber-50 text-amber-700 ring-amber-200",
};

const formatQty = (value) => {
  const n = Number(value) || 0;
  return new Intl.NumberFormat().format(n);
};

const formatSummaryValue = (value) =>
  typeof value === "number" ? formatQty(value) : "--";

const sumBy = (rows, key) =>
  rows.reduce((sum, row) => sum + (Number(row[key]) || 0), 0);

const uniqueCount = (rows, key) => new Set(rows.map((row) => row[key])).size;
export default function AdminInventoryPage() {
  const [tab, setTab] = useState("products");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("recent");
  const [productStatus, setProductStatus] = useState("all");
  const [slotStore, setSlotStore] = useState("all");
  const [allocationStatus, setAllocationStatus] = useState("all");
  const [productPage, setProductPage] = useState(1);
  const [productLimit, setProductLimit] = useState(50);
  const [locateProduct, setLocateProduct] = useState(null);

  const trimmedSearch = q.trim();
  const debouncedSearch = useDebouncedValue(trimmedSearch, 1000);
  const isDebouncing = tab === "products" && trimmedSearch !== debouncedSearch;

  const productParams = useMemo(() => {
    if (tab !== "products") return null;
    const params = { sort };
    if (debouncedSearch) params.q = debouncedSearch;
    if (productStatus !== "all") params.status = productStatus;
    params.page = productPage;
    params.limit = productLimit;
    return params;
  }, [tab, debouncedSearch, productStatus, sort, productPage, productLimit]);

  const {
    data: inventoryData,
    isLoading: inventoryLoading,
    isFetching: inventoryFetching,
    error: inventoryError,
  } = useGetInventoryProductsQuery(productParams, { skip: tab !== "products" });
  const [
    getSlotItemsByProduct,
    {
      data: slotItemsData,
      isFetching: slotItemsLoading,
      error: slotItemsError,
    },
  ] = useLazyGetSlotItemsByProductQuery();

  const productRows = inventoryData?.rows ?? [];
  const productPagination = inventoryData?.pagination ?? null;
  const productSummary = inventoryData?.summary ?? null;
  const hasProductSummary =
    productSummary && typeof productSummary.totalSkus === "number";
  const productTotal = hasProductSummary
    ? productSummary.totalSkus
    : productPagination?.total ?? productRows.length;
  const productLoading = tab === "products" && (inventoryLoading || inventoryFetching);
  const productError = tab === "products" ? inventoryError : null;
  const productErrorMessage =
    productError?.data?.message ||
    productError?.error ||
    "Unable to load inventory.";
  const slotItems = slotItemsData?.data ?? [];
  const slotItemsErrorMessage =
    slotItemsError?.data?.message ||
    slotItemsError?.error ||
    "Unable to load slot locations.";
  const filterLabel =
    tab === "products"
      ? "Status"
      : tab === "slots"
      ? "Store"
      : "Allocation status";
  const filterId =
    tab === "products"
      ? "inventory-status"
      : tab === "slots"
      ? "inventory-store"
      : "inventory-allocation-status";

  const allocationRows = useMemo(
    () =>
      ALLOCATION_ORDERS.map((order) => {
        const totalQty = order.items.reduce(
          (sum, item) => sum + (Number(item.qty) || 0),
          0
        );
        return {
          ...order,
          skuCount: order.items.length,
          totalQty,
        };
      }),
    []
  );

  const normalizedQuery = trimmedSearch.toLowerCase();

  const filteredRows = useMemo(() => {
    if (tab === "products") {
      return productRows;
    }

    if (tab === "slots") {
      let result = SLOT_ROWS;
      if (normalizedQuery) {
        result = result.filter((row) =>
          `${row.label} ${row.store} ${row.unit}`
            .toLowerCase()
            .includes(normalizedQuery)
        );
      }
      if (slotStore !== "all") {
        result = result.filter(
          (row) => row.store.toLowerCase() === slotStore
        );
      }
      return result;
    }

    let result = allocationRows;
    if (normalizedQuery) {
      result = result.filter((row) =>
        `${row.orderNumber} ${row.customer}`
          .toLowerCase()
          .includes(normalizedQuery)
      );
    }
    if (allocationStatus !== "all") {
      result = result.filter(
        (row) => row.status.toLowerCase() === allocationStatus
      );
    }
    return result;
  }, [
    tab,
    normalizedQuery,
    productRows,
    slotStore,
    allocationStatus,
    allocationRows,
  ]);

  const sortedRows = useMemo(() => {
    if (tab === "products") {
      return productRows;
    }
    const rows = [...filteredRows];
    if (sort === "qtyhigh" || sort === "qtylow") {
      rows.sort((a, b) => {
        const aQty =
          tab === "slots"
            ? Number(a.totalQty) || 0
            : Number(a.totalQty) || 0;
        const bQty =
          tab === "slots"
            ? Number(b.totalQty) || 0
            : Number(b.totalQty) || 0;
        return sort === "qtylow" ? aQty - bQty : bQty - aQty;
      });
    }
    return rows;
  }, [filteredRows, sort, tab, productRows]);

  const totalItems =
    tab === "products"
      ? productTotal
      : tab === "slots"
      ? SLOT_ROWS.length
      : allocationRows.length;

  const countLabel =
    tab === "products"
      ? "SKUs"
      : tab === "slots"
      ? "slots"
      : "orders";

  const summaryCards = useMemo(() => {
    if (tab === "products") {
      return [
        { label: "SKUs", value: formatSummaryValue(productTotal) },
        {
          label: "On-hand",
          value: formatSummaryValue(
            hasProductSummary ? productSummary.totalOnHand : null
          ),
        },
        {
          label: "Allocated",
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
      ];
    }

    if (tab === "slots") {
      return [
        { label: "Slots", value: formatQty(SLOT_ROWS.length) },
        { label: "Stores", value: formatQty(uniqueCount(SLOT_ROWS, "store")) },
        { label: "Total qty", value: formatQty(sumBy(SLOT_ROWS, "totalQty")) },
        {
          label: "Empty",
          value: formatQty(SLOT_ROWS.filter((row) => row.totalQty === 0).length),
        },
      ];
    }

    return [
      { label: "Orders", value: formatQty(allocationRows.length) },
      {
        label: "Allocated qty",
        value: formatQty(sumBy(allocationRows, "totalQty")),
      },
      {
        label: "Fully allocated",
        value: formatQty(
          allocationRows.filter((row) => row.status === "Allocated").length
        ),
      },
      {
        label: "Partially allocated",
        value: formatQty(
          allocationRows.filter((row) => row.status !== "Allocated").length
        ),
      },
    ];
  }, [tab, allocationRows, productRows, productSummary, productTotal]);

  const primaryActionLabel =
    tab === "products"
      ? "Add to Stock"
      : tab === "slots"
      ? "Add Product"
      : "Allocate Order";

  const resetFilters = () => {
    setQ("");
    setSort("recent");
    setProductStatus("all");
    setSlotStore("all");
    setAllocationStatus("all");
  };

  const openLocateModal = (row) => {
    setLocateProduct(row);
    getSlotItemsByProduct(row.id);
  };

  const closeLocateModal = () => {
    setLocateProduct(null);
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

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            {primaryActionLabel}
          </button>
        </div>
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
          <div className="flex flex-wrap gap-2">
            {[
              { key: "products", label: "By Product" },
              { key: "slots", label: "By Slot" },
              { key: "allocations", label: "Allocations" },
            ].map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={[
                    "rounded-xl px-3 py-2 text-sm font-semibold transition",
                    active
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50",
                  ].join(" ")}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          <div
            className={[
              "grid w-full grid-cols-1 gap-3 md:items-end",
              tab === "products"
                ? "md:grid-cols-[1fr_220px_160px_200px_auto]"
                : "md:grid-cols-[1fr_220px_200px_auto]",
            ].join(" ")}
          >
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
                  if (tab === "products") setProductPage(1);
                }}
                placeholder={
                  tab === "products"
                    ? "Search SKU..."
                    : tab === "slots"
                    ? "Search slot or store..."
                    : "Search order number or customer..."
                }
                onKeyDown={(e) => {
                  if (tab === "products" && e.key === "Enter") {
                    e.currentTarget.blur();
                  }
                }}
                className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              />
            </div>

            <div>
              <label
                htmlFor={filterId}
                className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
              >
                {filterLabel}
              </label>
              {tab === "products" ? (
                <select
                  id={filterId}
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
              ) : tab === "slots" ? (
                <select
                  id={filterId}
                  value={slotStore}
                  onChange={(e) => setSlotStore(e.target.value)}
                  className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                >
                  <option value="all">All stores</option>
                  <option value="main store">Main Store</option>
                  <option value="overflow">Overflow</option>
                </select>
              ) : (
                <select
                  id={filterId}
                  value={allocationStatus}
                  onChange={(e) => setAllocationStatus(e.target.value)}
                  className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                >
                  <option value="all">All status</option>
                  <option value="allocated">Allocated</option>
                  <option value="partially allocated">Partially Allocated</option>
                </select>
              )}
            </div>

            {tab === "products" ? (
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
            ) : null}

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
                  if (tab === "products") setProductPage(1);
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
                onClick={() => {
                  resetFilters();
                  setProductPage(1);
                }}
              >
                <FiRefreshCw
                  className="mr-1 h-3.5 w-3.5 text-slate-400"
                  aria-hidden="true"
                />
                Reset
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
            <div>
              Showing{" "}
              <span className="font-semibold text-slate-900">
                {filteredRows.length}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-900">{totalItems}</span>{" "}
              {countLabel}
              {tab === "products" && isDebouncing ? (
                <span className="ml-2">(Searching...)</span>
              ) : null}
            </div>
            {tab === "products" && productPagination ? (
              <Pagination
                pagination={productPagination}
                onPageChange={setProductPage}
                variant="compact"
              />
            ) : null}
          </div>
        </div>
      </div>
      {tab === "products" && productLoading ? (
        <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-slate-200">
          <div className="text-sm font-semibold text-slate-900">
            Loading inventory...
          </div>
          <div className="mt-1 text-sm text-slate-500">
            Fetching latest stock totals.
          </div>
        </div>
      ) : tab === "products" && productError ? (
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
            {tab === "products"
              ? "No products found"
              : tab === "slots"
              ? "No slots found"
              : "No allocations found"}
          </div>
          <div className="mt-1 text-sm text-slate-500">
            Try adjusting your search or filters to see results.
          </div>
        </div>
      ) : tab === "products" ? (
        <div className="overflow-hidden rounded-2xl ring-1 ring-slate-200">
          <div className="overflow-x-auto bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3 text-right">On-hand</th>
                  <th className="px-4 py-3 text-right">Allocated</th>
                  <th className="px-4 py-3 text-right">Available</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {sortedRows.map((row) => {
                  const available = Math.max(
                    0,
                    Number(row.onHand || 0) - Number(row.allocated || 0)
                  );
                  return (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link
                          to={`/admin/inventory/products/${row.id}`}
                          className="font-semibold text-slate-900 hover:underline"
                        >
                          {row.name}
                        </Link>
                        <div className="text-xs text-slate-500">{row.sku}</div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatQty(row.onHand)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatQty(row.allocated)}
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
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openLocateModal(row)}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Locate
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                          >
                            Add stock
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
      ) : tab === "slots" ? (
        <div className="overflow-hidden rounded-2xl ring-1 ring-slate-200">
          <div className="overflow-x-auto bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
                <tr>
                  <th className="px-4 py-3">Slot</th>
                  <th className="px-4 py-3">Store</th>
                  <th className="px-4 py-3 text-right">SKU count</th>
                  <th className="px-4 py-3 text-right">Total qty</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {sortedRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link
                        to={`/admin/inventory/slots/${row.id}`}
                        className="font-semibold text-slate-900 hover:underline"
                      >
                        {row.label}
                      </Link>
                      <div className="text-xs text-slate-500">
                        {row.unit} - {row.position}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-semibold text-slate-900">
                        {row.store}
                      </div>
                      <div className="text-xs text-slate-500">
                        Updated {row.updatedAt}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatQty(row.skuCount)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatQty(row.totalQty)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={[
                          "inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ring-1 ring-inset",
                          SLOT_STATUS_STYLES[row.status] ||
                            SLOT_STATUS_STYLES.Active,
                        ].join(" ")}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Show contents
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                        >
                          Add product
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedRows.map((order) => (
            <div
              key={order.id}
              className="rounded-2xl bg-white p-4 ring-1 ring-slate-200"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900">
                    Order {order.orderNumber}
                  </div>
                  <div className="text-xs text-slate-500">
                    {order.customer} - {order.skuCount} SKUs -{" "}
                    {formatQty(order.totalQty)} units
                  </div>
                  <div className="text-xs text-slate-500">
                    Picked at {order.pickedAt}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={[
                      "inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ring-1 ring-inset",
                      ALLOCATION_STATUS_STYLES[order.status] ||
                        ALLOCATION_STATUS_STYLES.Allocated,
                    ].join(" ")}
                  >
                    {order.status}
                  </span>
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Review picks
                  </button>
                </div>
              </div>

              <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
                <div className="grid grid-cols-12 gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600">
                  <div className="col-span-3">SKU</div>
                  <div className="col-span-4">Product</div>
                  <div className="col-span-3">Slot</div>
                  <div className="col-span-1 text-right">Qty</div>
                  <div className="col-span-1">Picker</div>
                </div>
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-12 gap-2 border-b border-slate-100 px-4 py-2 text-xs text-slate-700 last:border-b-0"
                  >
                    <div className="col-span-3 font-semibold text-slate-900">
                      {item.sku}
                    </div>
                    <div className="col-span-4">{item.product}</div>
                    <div className="col-span-3">{item.slot}</div>
                    <div className="col-span-1 text-right tabular-nums">
                      {formatQty(item.qty)}
                    </div>
                    <div className="col-span-1 text-slate-500">
                      {item.picker}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="text-xs text-slate-400">
        Tip: Allocations are picks that have not been deducted from stock yet.
      </div>

      {locateProduct ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={closeLocateModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="locate-product-title"
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-white shadow-xl ring-1 ring-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <div
                  id="locate-product-title"
                  className="text-sm font-semibold text-slate-900"
                >
                  Locate product
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {locateProduct.name}
                  {locateProduct.sku ? ` • ${locateProduct.sku}` : ""}
                </div>
              </div>
              <button
                type="button"
                onClick={closeLocateModal}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:text-slate-900"
              >
                Close
              </button>
            </div>

            <div className="px-4 py-4">
              {slotItemsLoading ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  Loading slot locations...
                </div>
              ) : slotItemsError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                  {slotItemsErrorMessage}
                </div>
              ) : slotItems.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  No slot items found for this product.
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="grid grid-cols-12 gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600">
                    <div className="col-span-4">Slot</div>
                    <div className="col-span-4">Store</div>
                    <div className="col-span-2">Unit</div>
                    <div className="col-span-2 text-right">Qty</div>
                  </div>
                  {slotItems.map((item) => (
                    <div
                      key={item.id || item._id}
                      className="grid grid-cols-12 gap-2 border-b border-slate-100 px-4 py-2 text-xs text-slate-700 last:border-b-0"
                    >
                      <div className="col-span-4 font-semibold text-slate-900">
                        {item.slot?.label || "Unknown"}
                      </div>
                      <div className="col-span-4">
                        {item.slot?.store || "-"}
                      </div>
                      <div className="col-span-2">
                        {item.slot?.unit || "-"}
                      </div>
                      <div className="col-span-2 text-right tabular-nums">
                        {formatQty(item.qty)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}



