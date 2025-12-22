// src/pages/Admin/AdminRequestsPage.jsx
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiEdit2, FiTrash2, FiCheck, FiPlus } from "react-icons/fi";

import Pagination from "../../components/common/Pagination";
import Loader from "../../components/common/Loader";
import ErrorMessage from "../../components/common/ErrorMessage";

import useDebouncedValue from "../../hooks/useDebouncedValue";

import {
  useDeleteQuoteByAdminMutation,
  useGetAdminQuotesQuery,
} from "../../features/quotes/quotesApiSlice";

import { useCreateOrderFromQuoteMutation } from "../../features/orders/ordersApiSlice";

function formatDateTime(iso) {
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
    return iso || "—";
  }
}

function StatusBadge({ status }) {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset";

  const map = {
    Processing: "bg-slate-50 text-slate-700 ring-slate-200",
    Quoted: "bg-blue-50 text-blue-700 ring-blue-200",
    Confirmed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    Cancelled: "bg-rose-50 text-rose-700 ring-rose-200",
  };

  return (
    <span className={`${base} ${map[status] || map.Processing}`}>{status}</span>
  );
}

function money(amount, currency = "AED") {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${n.toFixed(2)} ${currency}`;
  }
}

function friendlyApiError(err) {
  const msg =
    err?.data?.message || err?.error || err?.message || "Something went wrong.";
  return String(msg);
}

export default function AdminRequestsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const trimmedSearch = search.trim();
  const debouncedSearch = useDebouncedValue(trimmedSearch, 500);
  const isDebouncing = trimmedSearch !== debouncedSearch;

  const { data, isLoading, isError, error, isFetching } =
    useGetAdminQuotesQuery({ page, status, search: debouncedSearch });

  const [deleteQuoteByAdmin, { isLoading: isDeleting }] =
    useDeleteQuoteByAdminMutation();

  const [createOrderFromQuote, { isLoading: isCreatingOrder }] =
    useCreateOrderFromQuoteMutation();

  const [deletingId, setDeletingId] = useState(null);
  const [creatingId, setCreatingId] = useState(null);

  const rows = data?.data || [];
  const total = data?.pagination?.total ?? data?.total ?? rows.length;

  const pagination = useMemo(() => {
    if (data?.pagination) return data.pagination;

    const totalPages = data?.pages || 1;
    return {
      page,
      totalPages,
      hasPrev: page > 1,
      hasNext: page < totalPages,
    };
  }, [data, page]);

  const itemCountById = useMemo(() => {
    const map = new Map();
    for (const q of rows) {
      const itemCount = (q.requestedItems || []).reduce(
        (sum, it) => sum + (Number(it.qty) || 0),
        0
      );
      map.set(q._id, itemCount);
    }
    return map;
  }, [rows]);

  async function onDelete(q) {
    if (q.status !== "Cancelled") return;

    const ok = window.confirm(
      `Delete this quote?`
    );
    if (!ok) return;

    try {
      setDeletingId(q._id);
      await deleteQuoteByAdmin(q._id).unwrap();
    } catch (e) {
      alert(friendlyApiError(e));
    } finally {
      setDeletingId(null);
    }
  }

  async function onCreateOrder(quoteId) {
    const ok = window.confirm(
      "Create an order from this confirmed quote?"
    );
    if (!ok) return;

    try {
      setCreatingId(quoteId);
      await createOrderFromQuote(quoteId).unwrap();
    } catch (e) {
      alert(friendlyApiError(e));
    } finally {
      setCreatingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-lg font-semibold text-slate-900">Requests</div>
          <div className="text-sm text-slate-500">
            Newest first - Review, quote, confirm, then create an order.
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

      {/* Filters + Pagination */}
      <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-12 md:items-center">
          <div className="md:col-span-8">
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by user name, email, or quote #"
              className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            />
          </div>

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
              <option value="Quoted">Quoted</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <div>
            Showing{" "}
            <span className="font-semibold text-slate-700">{rows.length}</span>{" "}
            of <span className="font-semibold text-slate-700">{total}</span>{" "}
            request(s)
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
        <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
          <Loader />
        </div>
      ) : isError ? (
        <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
          <ErrorMessage error={error} />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl ring-1 ring-slate-200">
          <div className="overflow-x-auto bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
                <tr>
                  <th className="px-4 py-3">Quote</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {rows.map((q) => {
                  const hasOrder = Boolean(q.order);
                  const canCreateOrder = q.status === "Confirmed" && !hasOrder;

                  const itemCount = itemCountById.get(q._id) ?? 0;

                  const rowCreating = creatingId === q._id;
                  const rowDeleting = deletingId === q._id;

                  return (
                    <tr key={q._id} className="hover:bg-slate-50">
                      {/* Quote: quoteNumber + createdAt */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">
                          {q.quoteNumber || "—"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {formatDateTime(q.createdAt)}
                        </div>
                      </td>

                      {/* User */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">
                          {q.user?.name || "—"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {q.user?.email || "—"}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <StatusBadge status={q.status} />
                      </td>

                      {/* Total: totalPrice + items below */}
                      <td className="px-4 py-3 text-right">
                        <div className="font-semibold text-slate-900">
                          {money(q.totalPrice)}
                        </div>
                        <div className="text-xs text-slate-500">
                          {itemCount} item(s)
                        </div>
                      </td>

                      {/* Order status */}
                      <td className="px-4 py-3">
                        {hasOrder ? (
                          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                            <span className="text-slate-700">
                              {q.order?.orderNumber}
                            </span>
                            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 ring-1 ring-inset ring-emerald-200">
                              <FiCheck className="h-3 w-3" />
                            </span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className={[
                              "rounded-xl px-3 py-2 text-xs font-semibold",
                              q.status === "Confirmed"
                                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                : "bg-slate-200 text-slate-400 cursor-not-allowed",
                            ].join(" ")}
                            onClick={
                              q.status === "Confirmed"
                                ? () => onCreateOrder(q._id)
                                : undefined
                            }
                            disabled={
                              q.status !== "Confirmed" ||
                              rowCreating ||
                              isCreatingOrder
                            }
                          >
                            {rowCreating ? "Creating…" : "Create"}
                          </button>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <Link
                            to={`/admin/requests/${q._id}`}
                            className="inline-flex items-center justify-center rounded-xl bg-slate-900 p-2 text-white hover:bg-slate-800"
                            title="Edit"
                          >
                            <FiEdit2 className="h-4 w-4" />
                          </Link>

                          <button
                            type="button"
                            className={[
                              "inline-flex items-center justify-center rounded-xl p-2 ring-1 ring-inset",
                              q.status !== "Cancelled" ||
                              rowDeleting ||
                              isDeleting
                                ? "cursor-not-allowed bg-white text-slate-300 ring-slate-200"
                                : "bg-white text-rose-600 ring-rose-200 hover:bg-rose-50",
                            ].join(" ")}
                            disabled={
                              q.status !== "Cancelled" ||
                              rowDeleting ||
                              isDeleting
                            }
                            onClick={() => onDelete(q)}
                            title="Delete"
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
    </div>
  );
}
