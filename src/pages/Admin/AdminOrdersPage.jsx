// src/pages/Admin/AdminOrdersPage.jsx
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiEdit2, FiTrash2 } from "react-icons/fi";

import Loader from "../../components/common/Loader";
import ErrorMessage from "../../components/common/ErrorMessage";
import Pagination from "../../components/common/Pagination";

import { useGetOrdersAdminQuery } from "../../features/orders/ordersApiSlice";
import useDebouncedValue from "../../hooks/useDebouncedValue";

function formatDateTime(iso) {
  if (!iso) return "—";
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

function StatusBadge({ status }) {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset";

  const map = {
    Processing: "bg-slate-50 text-slate-700 ring-slate-200",
    Delivered: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    Cancelled: "bg-rose-50 text-rose-700 ring-rose-200",
  };

  return (
    <span className={`${base} ${map[status] || map.Processing}`}>{status}</span>
  );
}

function InvoiceCell({ order }) {
  const hasInvoice = Boolean(order?.invoice);
  const isDelivered = order?.status === "Delivered";

  if (hasInvoice) {
    const invoiceNo =
      order?.invoice?.invoiceNumber || order?.invoice?.number || order?.invoice?._id;

    return (
      <div className="flex items-center justify-center gap-2">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
          ✓
        </span>
        <div className="min-w-0 text-left">
          <div className="text-xs font-semibold text-slate-800">Invoice</div>
          <div className="text-xs text-slate-500 truncate">
            {invoiceNo ? String(invoiceNo) : "—"}
          </div>
        </div>
      </div>
    );
  }

  // No invoice
  const enabled = isDelivered; // enabled only if Delivered and no invoice
  return (
    <button
      type="button"
      disabled={!enabled}
      className={[
        "rounded-xl px-3 py-2 text-xs font-semibold ring-1 transition",
        enabled
          ? "bg-slate-900 text-white ring-slate-900 hover:bg-slate-800"
          : "bg-white text-slate-400 ring-slate-200 cursor-not-allowed",
      ].join(" ")}
      onClick={() => {
        // TODO: wire to backend (create invoice for this order)
        // e.g. createInvoiceByAdmin({ orderId: order._id })
      }}
      title={
        enabled
          ? "Create invoice"
          : "Invoice can be created only after the order is delivered."
      }
    >
      Create invoice
    </button>
  );
}

function ActionsCell({ order }) {
  const canDelete = order.status === "Cancelled" && !order.invoice;

  return (
    <div className="flex items-center justify-center gap-2">
      {/* Edit */}
      <Link
        to={`/admin/orders/${order._id}/edit`}
        className="inline-flex items-center justify-center rounded-xl bg-slate-900 p-2 text-white ring-1 ring-slate-900 hover:bg-slate-800"
        title="Edit order"
        aria-label="Edit order"
      >
        <FiEdit2 className="h-4 w-4" />
      </Link>

      {/* Delete */}
      <button
        type="button"
        disabled={!canDelete}
        className={[
          "inline-flex items-center justify-center rounded-xl p-2 ring-1 transition",
          canDelete
            ? "bg-white text-rose-600 ring-slate-200 hover:bg-rose-50"
            : "bg-white text-slate-300 ring-slate-200 cursor-not-allowed",
        ].join(" ")}
        title={
          canDelete
            ? "Delete order"
            : "Only cancelled orders without invoices can be deleted"
        }
        aria-label="Delete order"
        onClick={() => {
          if (!canDelete) return;
          // TODO: confirm + call deleteOrderByAdmin(order._id)
        }}
      >
        <FiTrash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function AdminOrdersPage() {
  // ✅ Server-side filters (must match backend query params)
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  // ✅ Pagination (server-side)
  const [page, setPage] = useState(1);

  const trimmedSearch = search.trim();
  const debouncedSearch = useDebouncedValue(trimmedSearch, 500);
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-lg font-semibold text-slate-900">Orders</div>
          <div className="text-sm text-slate-500">
            Track orders created from quotes and manage fulfillment.
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
            onClick={() => {
              setSearch("");
              setStatus("all");
              setPage(1);
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-12 md:items-center">
          {/* ✅ Server-side search (name/email/order number) */}
          <div className="md:col-span-8">
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by user name, email, or order #"
              className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            />
          </div>

          {/* ✅ Server-side status filter */}
          <div className="md:col-span-4">
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            >
              <option value="all">All statuses</option>
              <option value="Processing">Processing</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <div>
            Showing{" "}
            <span className="font-semibold text-slate-700">{rows.length}</span>{" "}
            on this page
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
        <div className="overflow-hidden rounded-2xl ring-1 ring-slate-200">
          <div className="overflow-x-auto bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3 text-center">Invoice</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {rows.map((o) => (
                  <tr key={o._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link
                        to={`/admin/orders/${o._id}`}
                        className="font-semibold text-slate-900 hover:underline"
                      >
                        {o.orderNumber || o._id}
                      </Link>
                      <div className="mt-0.5 text-xs text-slate-500">
                        Created: {formatDateTime(o.createdAt)}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-slate-700">
                      <div className="font-medium text-slate-900">
                        {o.user?.name || "—"}
                      </div>
                      <div className="text-xs text-slate-500">{o.user?.email || ""}</div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-col items-center justify-center text-center">
                        <StatusBadge status={o.status} />
                      </div>
                    </td>

                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {formatMoney(o.totalPrice)}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <InvoiceCell order={o} />
                    </td>

                    <td className="px-4 py-3 text-center">
                      <ActionsCell order={o} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
