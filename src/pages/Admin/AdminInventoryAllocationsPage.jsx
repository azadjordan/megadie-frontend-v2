import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiRefreshCw } from "react-icons/fi";
import AdminInventoryTabs from "../../components/admin/AdminInventoryTabs";
import Pagination from "../../components/common/Pagination";
import ErrorMessage from "../../components/common/ErrorMessage";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import { useGetInventoryAllocationsQuery } from "../../features/inventory/inventoryApiSlice";

const ALLOCATION_STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "reserved", label: "Reserved" },
  { value: "deducted", label: "Deducted" },
  { value: "cancelled", label: "Cancelled" },
];

const ORDER_STATUS_OPTIONS = [
  { value: "all", label: "All order statuses" },
  { value: "Processing", label: "Processing" },
  { value: "Shipping", label: "Shipping" },
  { value: "Delivered", label: "Delivered" },
  { value: "Cancelled", label: "Cancelled" },
];

const STATUS_STYLES = {
  Reserved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Deducted: "bg-slate-100 text-slate-600 ring-slate-200",
  Cancelled: "bg-rose-50 text-rose-700 ring-rose-200",
};

const ORDER_STATUS_STYLES = {
  Processing: "bg-slate-100 text-slate-700 ring-slate-200",
  Shipping: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  Delivered: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Cancelled: "bg-rose-50 text-rose-700 ring-rose-200",
};

const formatQty = (value) => {
  const n = Number(value) || 0;
  return new Intl.NumberFormat().format(n);
};

const formatDateTime = (iso) => {
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
};

const normalizeStatus = (status) =>
  status === "Deducted" || status === "Cancelled" ? status : "Reserved";

const resolveCustomer = (order) => {
  const user = order?.user;
  if (!user) return { name: "-", email: "" };
  if (typeof user === "string") return { name: user, email: "" };
  const name = user?.name || user?.email || "-";
  const email = user?.name && user?.email ? user.email : "";
  return { name, email };
};

export default function AdminInventoryAllocationsPage() {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [orderStatus, setOrderStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  const trimmedSearch = q.trim();
  const debouncedSearch = useDebouncedValue(trimmedSearch, 1000);
  const isDebouncing = trimmedSearch !== debouncedSearch;

  const queryParams = useMemo(() => {
    const params = { page, limit };
    if (statusFilter !== "all") params.status = statusFilter;
    if (orderStatus !== "all") params.orderStatus = orderStatus;
    if (debouncedSearch) params.q = debouncedSearch;
    return params;
  }, [page, limit, statusFilter, orderStatus, debouncedSearch]);

  const {
    data: allocationsResult,
    isLoading,
    isFetching,
    error,
  } = useGetInventoryAllocationsQuery(queryParams);

  const allocations = Array.isArray(allocationsResult?.rows)
    ? allocationsResult.rows
    : [];
  const pagination = allocationsResult?.pagination ?? null;
  const totalAllocations = pagination?.total ?? allocations.length;

  const statusCounts = useMemo(() => {
    const counts = { Reserved: 0, Deducted: 0, Cancelled: 0 };
    for (const row of allocations) {
      const key = normalizeStatus(row?.status);
      counts[key] += 1;
    }
    return counts;
  }, [allocations]);

  const summaryCards = useMemo(
    () => [
      { label: "Allocations", value: formatQty(totalAllocations) },
      { label: "Reserved (page)", value: formatQty(statusCounts.Reserved) },
      { label: "Deducted (page)", value: formatQty(statusCounts.Deducted) },
      { label: "Cancelled (page)", value: formatQty(statusCounts.Cancelled) },
    ],
    [totalAllocations, statusCounts]
  );

  const resetFilters = () => {
    setQ("");
    setStatusFilter("all");
    setOrderStatus("all");
    setPage(1);
    setLimit(25);
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

          <div className="grid w-full grid-cols-1 gap-3 md:items-end md:grid-cols-[1fr_200px_200px_160px_auto]">
            <div>
              <label
                htmlFor="allocation-search"
                className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
              >
                Search
              </label>
              <input
                id="allocation-search"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="Order, product, slot, customer..."
                className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              />
            </div>

            <div>
              <label
                htmlFor="allocation-status"
                className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
              >
                Allocation status
              </label>
              <select
                id="allocation-status"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              >
                {ALLOCATION_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="allocation-order-status"
                className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
              >
                Order status
              </label>
              <select
                id="allocation-order-status"
                value={orderStatus}
                onChange={(e) => {
                  setOrderStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              >
                {ORDER_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="allocation-limit"
                className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
              >
                Per page
              </label>
              <select
                id="allocation-limit"
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value) || 25);
                  setPage(1);
                }}
                className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              >
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
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

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
            <div>
              Showing{" "}
              <span className="font-semibold text-slate-900">
                {allocations.length}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-900">
                {totalAllocations}
              </span>{" "}
              allocations
              {isDebouncing ? <span className="ml-2">(Searching...)</span> : null}
              {!isDebouncing && isFetching ? (
                <span className="ml-2">(Refreshing...)</span>
              ) : null}
            </div>
            {pagination ? (
              <Pagination
                pagination={pagination}
                onPageChange={setPage}
                variant="compact"
              />
            ) : null}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-slate-200">
          <div className="text-sm font-semibold text-slate-900">
            Loading allocations...
          </div>
          <div className="mt-1 text-sm text-slate-500">
            Fetching allocation ledger.
          </div>
        </div>
      ) : error ? (
        <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
          <ErrorMessage error={error} />
        </div>
      ) : allocations.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-slate-200">
          <div className="text-sm font-semibold text-slate-900">
            No allocations found
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
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 w-[220px]">Product</th>
                  <th className="px-4 py-3">Slot</th>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Customer / Reserved by</th>
                  <th className="px-4 py-3">Reserved at</th>
                  <th className="px-4 py-3">Deducted at</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {allocations.map((row) => {
                  const status = normalizeStatus(row?.status);
                  const productName = row?.product?.name || "Unknown product";
                  const productSku = row?.product?.sku || "";
                  const slotLabel = row?.slot?.label || "Unknown slot";
                  const order = row?.order || {};
                  const orderId = order?.id || order?._id || "";
                  const orderNumber = order?.orderNumber || orderId || "-";
                  const orderStatusLabel = order?.status || "Processing";
                  const { name: customerName, email: customerEmail } =
                    resolveCustomer(order);
                  const reservedByName =
                    row?.by?.name || row?.by?.email || "-";
                  const reservedByEmail =
                    row?.by?.name && row?.by?.email ? row.by.email : "";
                  return (
                    <tr key={row?.id || `${orderNumber}-${slotLabel}`}>
                      <td className="px-4 py-3">
                        <span
                          className={[
                            "inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ring-1 ring-inset",
                            STATUS_STYLES[status] || STATUS_STYLES.Reserved,
                          ].join(" ")}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatQty(row?.qty)}
                      </td>
                      <td className="px-4 py-3 max-w-[220px]">
                        <div
                          className="truncate font-semibold text-slate-900"
                          title={productName}
                        >
                          {productName}
                        </div>
                        {productSku ? (
                          <div className="truncate text-xs text-slate-500">
                            SKU {productSku}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">
                          {slotLabel}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {orderId ? (
                          <Link
                            to={`/admin/orders/${orderId}?tab=stock`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-slate-900 hover:underline"
                          >
                            {orderNumber}
                          </Link>
                        ) : (
                          <span className="font-semibold text-slate-900">
                            {orderNumber}
                          </span>
                        )}
                        <div className="mt-1 text-xs">
                          <span
                            className={[
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset",
                              ORDER_STATUS_STYLES[orderStatusLabel] ||
                                ORDER_STATUS_STYLES.Processing,
                            ].join(" ")}
                          >
                            {orderStatusLabel}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-semibold text-slate-900">
                          {customerName}
                        </div>
                        {customerEmail ? (
                          <div className="text-xs text-slate-500">
                            {customerEmail}
                          </div>
                        ) : null}
                        <div className="mt-2 text-xs text-slate-500">
                          Reserved by{" "}
                          <span className="font-semibold text-slate-900">
                            {reservedByName}
                          </span>
                        </div>
                        {reservedByEmail ? (
                          <div className="text-xs text-slate-500">
                            {reservedByEmail}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {formatDateTime(row?.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {formatDateTime(row?.deductedAt)}
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
    </div>
  );
}
