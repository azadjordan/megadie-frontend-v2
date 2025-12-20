// src/pages/Admin/AdminRequestsPage.jsx
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiEdit2, FiTrash2, FiCheck, FiPlus } from "react-icons/fi";

import Pagination from "../../components/common/Pagination";
import Loader from "../../components/common/Loader";
import ErrorMessage from "../../components/common/ErrorMessage";

import {
  useDeleteQuoteByAdminMutation,
  useGetAdminQuotesQuery,
} from "../../features/quotes/quotesApiSlice";

function formatDateTime(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
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
  // RTK Query errors can come in several shapes
  const msg =
    err?.data?.message ||
    err?.error ||
    err?.message ||
    "Something went wrong.";
  return String(msg);
}

export default function AdminRequestsPage() {
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading, isError, error, isFetching } =
    useGetAdminQuotesQuery({ page, limit });

  const [deleteQuoteByAdmin, { isLoading: isDeleting }] =
    useDeleteQuoteByAdminMutation();

  // track which row is being deleted (nice UX so we can disable only that row)
  const [deletingId, setDeletingId] = useState(null);

  const rows = data?.data || [];
  const pages = data?.pages || 1;
  const total = data?.total ?? rows.length;

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
    // Backend rule: only Cancelled can be deleted.
    if (q.status !== "Cancelled") return;

    const ok = window.confirm(
      `Delete this quote?\n\nThis can only be done for Cancelled quotes.\n\nID: ${q._id}`
    );
    if (!ok) return;

    try {
      setDeletingId(q._id);
      await deleteQuoteByAdmin(q._id).unwrap();
      // list will refresh via invalidatesTags
    } catch (e) {
      alert(friendlyApiError(e));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-lg font-semibold text-slate-900">Requests</div>
          <div className="text-sm text-slate-500">
            Newest first • Review, quote, confirm, then create an order.
          </div>
        </div>
      </div>

      {/* Filters placeholder */}
      <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
        <div className="h-10 rounded-xl bg-white/60 ring-1 ring-slate-200" />
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
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-sm text-slate-500"
                    >
                      No requests found.
                    </td>
                  </tr>
                ) : (
                  rows.map((q) => {
                    const hasOrder = Boolean(q.order);
                    const canCreateOrder = q.status === "Confirmed" && !hasOrder;

                    const itemCount = itemCountById.get(q._id) ?? 0;

                    const deletable = q.status === "Cancelled";
                    const rowDeleting = deletingId === q._id;
                    const disableDelete = !deletable || isDeleting || rowDeleting;

                    return (
                      <tr key={q._id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-700">
                          {formatDateTime(q.createdAt)}
                        </td>

                        <td className="px-4 py-3">
                          <StatusBadge status={q.status} />
                        </td>

                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">
                            {q.user?.name || "—"}
                          </div>
                          <div className="text-xs text-slate-500">
                            {q.user?.email || "—"}
                          </div>
                        </td>

                        {/* Order column: Create button OR checkmark */}
                        <td className="px-4 py-3">
                          {hasOrder ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                              <FiCheck className="h-4 w-4" />
                              Created
                            </span>
                          ) : canCreateOrder ? (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                              // NOTE: wire this to your create-order mutation when backend is ready
                              onClick={() => {
                                // placeholder
                                // console.log("Create order for quote", q._id);
                              }}
                              title="Create order"
                            >
                              <FiPlus className="h-4 w-4" />
                              Create
                            </button>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200">
                              Not created
                            </span>
                          )}

                          {/* Optional: show order number if populated */}
                          {hasOrder && q.order?.orderNumber ? (
                            <div className="mt-1 text-xs text-slate-500">
                              {q.order.orderNumber}
                            </div>
                          ) : null}
                        </td>

                        <td className="px-4 py-3 text-slate-700">{itemCount}</td>

                        <td className="px-4 py-3 text-right font-semibold text-slate-900">
                          {money(q.totalPrice)}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-2">
                            {/* Edit icon */}
                            <Link
                              to={`/admin/requests/${q._id}`}
                              className="inline-flex items-center justify-center rounded-xl bg-slate-900 p-2 text-white hover:bg-slate-800"
                              title="Edit request"
                              aria-label="Edit request"
                            >
                              <FiEdit2 className="h-4 w-4" />
                            </Link>

                            {/* Delete icon (works) */}
                            <button
                              type="button"
                              className={[
                                "inline-flex items-center justify-center rounded-xl p-2 ring-1 ring-inset",
                                disableDelete
                                  ? "cursor-not-allowed bg-white text-slate-300 ring-slate-200"
                                  : "bg-white text-rose-600 ring-rose-200 hover:bg-rose-50",
                              ].join(" ")}
                              title={
                                deletable
                                  ? rowDeleting
                                    ? "Deleting…"
                                    : "Delete quote"
                                  : "Only Cancelled quotes can be deleted"
                              }
                              aria-label="Delete quote"
                              disabled={disableDelete}
                              onClick={() => onDelete(q)}
                            >
                              <FiTrash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3">
            <div className="text-sm text-slate-500">
              Showing {rows.length} of {total} request(s)
              {isFetching ? "…" : ""}
            </div>

            <Pagination page={page} pages={pages} onPageChange={setPage} />
          </div>
        </div>
      )}
    </div>
  );
}
