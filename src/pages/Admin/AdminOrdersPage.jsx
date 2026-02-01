// src/pages/Admin/AdminOrdersPage.jsx
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiChevronDown,
  FiChevronUp,
  FiRefreshCw,
  FiSettings,
} from "react-icons/fi";

import Loader from "../../components/common/Loader";
import ErrorMessage from "../../components/common/ErrorMessage";
import Pagination from "../../components/common/Pagination";
import { useGetOrdersAdminQuery } from "../../features/orders/ordersApiSlice";
import useDebouncedValue from "../../hooks/useDebouncedValue";

function formatDateTime(iso) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return iso;
  }
}

function formatMoney(amount) {
  const n = Number(amount || 0);
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "AED",
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return String(n);
  }
}

function formatItemCount(items) {
  const count = Array.isArray(items) ? items.length : null;
  if (count == null) return "-";
  return `${count} item${count === 1 ? "" : "s"}`;
}

function getOrderTotal(order) {
  const items = Array.isArray(order?.orderItems) ? order.orderItems : [];
  const itemsTotal = items.reduce((sum, it) => {
    const line =
      typeof it?.lineTotal === "number"
        ? it.lineTotal
        : (Number(it?.qty) || 0) * (Number(it?.unitPrice) || 0);
    return sum + (Number.isFinite(line) ? line : 0);
  }, 0);
  const delivery = Number(order?.deliveryCharge) || 0;
  const extra = Number(order?.extraFee) || 0;
  const computed = itemsTotal + delivery + extra;
  const stored = Number(order?.totalPrice);

  if (items.length > 0 || delivery > 0 || extra > 0) {
    return Number.isFinite(computed) ? computed : 0;
  }

  return Number.isFinite(stored) ? stored : 0;
}

function getOrderRowMeta(order) {
  const isFinalized =
    Boolean(order?.stockFinalizedAt) || order?.status === "Delivered";
  const orderNumber = order?.orderNumber || order?._id || "-";
  const itemCountLabel = formatItemCount(order?.orderItems);
  return { isFinalized, orderNumber, itemCountLabel };
}

function StatusBadge({ status, size = "default" }) {
  const base =
    "inline-flex items-center rounded-full font-semibold ring-1 ring-inset";

  const sizes = {
    default: "px-2.5 py-1 text-xs",
    compact: "px-2 py-0.5 text-[10px]",
  };

  const map = {
    Processing: "bg-slate-50 text-slate-700 ring-slate-200",
    Shipping: "bg-blue-50 text-blue-700 ring-blue-200",
    Delivered: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    Cancelled: "bg-rose-50 text-rose-700 ring-rose-200",
  };

  return (
    <span
      className={`${base} ${sizes[size] || sizes.default} ${
        map[status] || map.Processing
      }`}
    >
      {status}
    </span>
  );
}

function StockBadge({ finalized, size = "default" }) {
  const base =
    "inline-flex items-center rounded-full font-semibold ring-1 ring-inset";
  const sizes = {
    default: "px-2.5 py-1 text-xs",
    compact: "px-2 py-0.5 text-[10px]",
  };
  if (!finalized) {
    return (
      <span
        className={`${base} ${
          sizes[size] || sizes.default
        } bg-amber-50 text-amber-700 ring-amber-200`}
      >
        Not Finalized
      </span>
    );
  }
  return (
    <span
      className={`${base} ${sizes[size] || sizes.default} bg-emerald-50 text-emerald-700 ring-emerald-200`}
    >
      Finalized
    </span>
  );
}

export default function AdminOrdersPage() {
  // Note: Server-side filters (must match backend query params)
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  // Note: Pagination (server-side)
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const trimmedSearch = search.trim();
  const debouncedSearch = useDebouncedValue(trimmedSearch, 1000);
  const searchParam = debouncedSearch;
  const isDebouncing = trimmedSearch !== debouncedSearch;

  const {
    data: ordersRes,
    isLoading,
    isFetching,
    isError,
    error,
  } = useGetOrdersAdminQuery({
    page,
    status,
    search: searchParam,
  });
  const rows = useMemo(() => ordersRes?.data || [], [ordersRes]);
  const pagination = ordersRes?.pagination;
  const totalItems =
    typeof pagination?.total === "number" ? pagination.total : rows.length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-lg font-semibold text-slate-900">Orders</div>
          <div className="text-sm text-slate-500">
            Track orders created from quotes and manage fulfillment.
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_200px_auto] md:items-end">
          <div className="flex items-end gap-2 md:contents">
            <div className="flex-1">
              <label
                htmlFor="orders-search"
                className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
              >
                Search
              </label>
              <input
                id="orders-search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by user name, email, or order #"
                className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              />
            </div>
            <button
              type="button"
              onClick={() => setFiltersOpen((prev) => !prev)}
              className="inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 md:hidden"
              aria-expanded={filtersOpen}
              aria-controls="orders-filters-panel"
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
            id="orders-filters-panel"
            className={[
              filtersOpen ? "grid grid-cols-2 gap-2" : "hidden",
              "md:contents",
            ].join(" ")}
          >
            <div>
              <label
                htmlFor="orders-status"
                className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
              >
                Status
              </label>
              <select
                id="orders-status"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              >
                <option value="all">All statuses</option>
                <option value="Processing">Processing</option>
                <option value="Shipping">Shipping</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div className="col-span-2 flex items-end md:col-auto md:justify-end">
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                onClick={() => {
                  setSearch("");
                  setStatus("all");
                  setPage(1);
                }}
              >
                <FiRefreshCw
                  className="h-3.5 w-3.5 mr-1 text-slate-400"
                  aria-hidden="true"
                />
                Reset filters
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <div>
            Showing{" "}
            <span className="font-semibold text-slate-900">{rows.length}</span> of{" "}
            <span className="font-semibold text-slate-900">{totalItems}</span>{" "}
            items
            {isDebouncing ? <span className="ml-2">(Searching...)</span> : null}
            {isFetching ? <span className="ml-2">(Updating)</span> : null}
          </div>

          <Pagination
            pagination={pagination}
            onPageChange={setPage}
            variant="compact"
          />
        </div>
      </div>

      {/* States */}
      {isLoading ? (
        <Loader />
      ) : isError ? (
        <ErrorMessage error={error} />
      ) : rows.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-slate-200">
          <div className="text-sm font-semibold text-slate-900">No orders found</div>
          <div className="mt-1 text-sm text-slate-500">
            Try changing the status filter or clearing the user filter.
          </div>
        </div>
      ) : (
        <div className="space-y-3">
<div className="grid grid-cols-2 gap-3 md:hidden">
  {rows.map((o) => {
    const row = getOrderRowMeta(o);
    return (
      <div
        key={o._id}
        className="rounded-2xl bg-white p-3 ring-1 ring-slate-200"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-900">
              {row.orderNumber}
            </div>
            <div className="text-[10px] text-slate-500">
              {formatDateTime(o.createdAt)}
            </div>
          </div>
          <StatusBadge status={o.status} size="compact" />
        </div>

        <div className="mt-2 rounded-lg bg-slate-50 px-2 py-1.5">
          <div className="truncate text-[11px] font-semibold text-slate-900">
            {o.user?.name || "-"}
          </div>
          <div className="truncate text-[10px] text-slate-500">
            {o.user?.email || ""}
          </div>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
          <div>
            <div className="uppercase font-semibold tracking-wide text-slate-400">
              Stock
            </div>
            <StockBadge finalized={row.isFinalized} size="compact" />
          </div>

          <div className="text-right">
            <div className="uppercase font-semibold tracking-wide text-slate-400">
              Total
            </div>
            <div className="font-semibold text-slate-900">
              {formatMoney(getOrderTotal(o))}
            </div>
            <div className="text-[10px] text-slate-500">
              {row.itemCountLabel}
            </div>
          </div>
        </div>

        <div className="mt-3">
          <Link
            to={`/admin/orders/${o._id}`}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-white hover:bg-slate-800"
            aria-label="Open order"
            title="Open order"
          >
            <FiSettings className="h-3.5 w-3.5" />
            Open
          </Link>
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
                    <th className="px-4 py-3">Order</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Stock</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3 text-center">Open</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {rows.map((o) => {
                    const row = getOrderRowMeta(o);
                    return (
                      <tr key={o._id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">
                            {row.orderNumber}
                          </div>
                          <div className="mt-0.5 text-xs text-slate-500">
                            Created: {formatDateTime(o.createdAt)}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-slate-700">
                          <div className="font-medium text-slate-900">
                            {o.user?.name || "-"}
                          </div>
                          <div className="text-xs text-slate-500">
                            {o.user?.email || ""}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex justify-center">
                            <StatusBadge status={o.status} size="compact" />
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex justify-center">
                            <StockBadge finalized={row.isFinalized} size="compact" />
                          </div>
                        </td>

                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {formatMoney(getOrderTotal(o))}
                          <div className="mt-0.5 text-xs font-normal text-slate-500">
                            {row.itemCountLabel}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <Link
                              to={`/admin/orders/${o._id}`}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                              aria-label="Open order"
                              title="Open order"
                            >
                              <FiSettings className="h-4 w-4" />
                            </Link>
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
    </div>
  );
}
