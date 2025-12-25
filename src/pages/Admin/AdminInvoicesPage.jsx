import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiSettings, FiTrash2, FiRefreshCw } from "react-icons/fi";
import { toast } from "react-toastify";

import Loader from "../../components/common/Loader";
import ErrorMessage from "../../components/common/ErrorMessage";
import Pagination from "../../components/common/Pagination";
import useDebouncedValue from "../../hooks/useDebouncedValue";

import {
  useDeleteInvoiceByAdminMutation,
  useGetInvoicesAdminQuery,
  useLazyGetInvoicePdfQuery,
} from "../../features/invoices/invoicesApiSlice";

function formatDateTime(iso) {
  if (!iso) return "";
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

function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return iso;
  }
}

function moneyMinor(amountMinor, currency = "AED", factor = 100) {
  if (typeof amountMinor !== "number" || !Number.isFinite(amountMinor))
    return "";

  const f = typeof factor === "number" && factor > 0 ? factor : 100;
  const major = amountMinor / f;

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(major);
  } catch {
    return String(major);
  }
}

function balanceDueMinor(inv) {
  if (!inv) return 0;
  if (typeof inv.balanceDueMinor === "number") return inv.balanceDueMinor;
  const amount = typeof inv.amountMinor === "number" ? inv.amountMinor : 0;
  const paid = typeof inv.paidTotalMinor === "number" ? inv.paidTotalMinor : 0;
  return Math.max(amount - paid, 0);
}

function isOverdue(inv) {
  if (!inv || inv.status === "Cancelled") return false;
  const due = inv.dueDate ? Date.parse(inv.dueDate) : NaN;
  if (!Number.isFinite(due)) return false;
  if (inv.paymentStatus === "Paid") return false;
  return balanceDueMinor(inv) > 0 && due < Date.now();
}

function PaymentStatusBadge({ status }) {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset";

  const map = {
    Paid: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    PartiallyPaid: "bg-amber-50 text-amber-800 ring-amber-200",
    Unpaid: "bg-rose-50 text-rose-800 ring-rose-200",
  };

  const label =
    status === "PartiallyPaid"
      ? "Partially paid"
      : status === "Paid"
      ? "Paid"
      : "Unpaid";

  return <span className={`${base} ${map[status] || map.Unpaid}`}>{label}</span>;
}

function OverdueBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-800 ring-1 ring-inset ring-rose-200">
      Overdue
    </span>
  );
}

function friendlyApiError(err) {
  const msg =
    err?.data?.message || err?.error || err?.message || "Something went wrong.";
  return String(msg);
}

export default function AdminInvoicesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [sort, setSort] = useState("newest");

  const trimmedSearch = search.trim();
  const debouncedSearch = useDebouncedValue(trimmedSearch, 500);
  const isDebouncing = trimmedSearch !== debouncedSearch;
  const overdueOnly = paymentStatusFilter === "overdue";
  const statusFilter = overdueOnly ? "Issued" : "all";
  const effectivePaymentStatus = overdueOnly ? "all" : paymentStatusFilter;

  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
  } = useGetInvoicesAdminQuery({
    page,
    status: statusFilter,
    paymentStatus: effectivePaymentStatus,
    overdue: overdueOnly,
    sort,
    search: debouncedSearch,
  });

  const [deleteInvoiceByAdmin, { isLoading: isDeleting }] =
    useDeleteInvoiceByAdminMutation();
  const [getInvoicePdf, { isFetching: isPdfLoading }] =
    useLazyGetInvoicePdfQuery();

  const [deletingId, setDeletingId] = useState(null);
  const [pdfId, setPdfId] = useState(null);

  const rows = useMemo(() => data?.data || data?.items || [], [data]);
  const total = data?.pagination?.total ?? data?.total ?? rows.length;

  const pagination = useMemo(() => {
    if (!data) return null;
    if (data.pagination) return data.pagination;

    const cur = data.page || 1;
    const totalPages = data.pages || 1;
    return {
      page: cur,
      totalPages,
      hasPrev: cur > 1,
      hasNext: cur < totalPages,
    };
  }, [data]);

  async function onDelete(inv) {
    if (inv.status !== "Cancelled") return;
    const detail = inv.order
      ? "Invoice and linked payments deleted AND Order unlinked."
      : "Invoice and linked payments deleted.";
    const ok = window.confirm(`Delete this cancelled invoice? ${detail}`);
    if (!ok) return;

    try {
      setDeletingId(inv._id);
      const res = await deleteInvoiceByAdmin(inv._id).unwrap();
      toast.success(res?.message || detail);
    } catch (e) {
      toast.error(friendlyApiError(e));
    } finally {
      setDeletingId(null);
    }
  }

  async function onPdf(inv) {
    try {
      setPdfId(inv._id);
      const blob = await getInvoicePdf(inv._id).unwrap();
      const fileName = inv.invoiceNumber
        ? `invoice-${inv.invoiceNumber}.pdf`
        : `invoice-${inv._id}.pdf`;
      const url = window.URL.createObjectURL(blob);
      const newTab = window.open(url, "_blank", "noopener,noreferrer");

      if (!newTab) {
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
      }

      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (e) {
      toast.error(friendlyApiError(e));
    } finally {
      setPdfId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-lg font-semibold text-slate-900">Invoices</div>
          <div className="text-sm text-slate-500">
            Monitor invoice status, payments, and balances.
          </div>
        </div>

      </div>

      <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_200px_200px_auto] md:items-end">
          <div>
            <label
              htmlFor="invoices-search"
              className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
            >
              Search
            </label>
            <input
              id="invoices-search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by invoice #, order #, or user"
              className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            />
          </div>

          <div>
            <label
              htmlFor="invoices-payment-status"
              className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
            >
              Payment status
            </label>
            <select
              id="invoices-payment-status"
              value={paymentStatusFilter}
              onChange={(e) => {
                setPaymentStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            >
              <option value="all">All payments</option>
              <option value="Paid">Paid</option>
              <option value="PartiallyPaid">Partially paid</option>
              <option value="Unpaid">Unpaid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="invoices-sort"
              className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
            >
              Sort
            </label>
            <select
              id="invoices-sort"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="amountHigh">Amount (high)</option>
              <option value="amountLow">Amount (low)</option>
            </select>
          </div>

          <div className="flex items-end md:justify-end">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900"
              onClick={() => {
                setSearch("");
                setPaymentStatusFilter("all");
                setSort("newest");
                setPage(1);
              }}
            >
              <FiRefreshCw className="h-3.5 w-3.5 mr-1 text-slate-400" aria-hidden="true" />
              Reset filters
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <div>
            Showing{" "}
            <span className="font-semibold text-slate-900">{rows.length}</span> of{" "}
            <span className="font-semibold text-slate-900">{total}</span> items
            {isDebouncing ? <span className="ml-2">(Searching...)</span> : null}
            {isFetching ? <span className="ml-2">(Updating)</span> : null}
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

      {isLoading ? (
        <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
          <Loader />
        </div>
      ) : isError ? (
        <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
          <ErrorMessage error={error} />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-slate-200">
          <div className="text-sm font-semibold text-slate-900">
            No invoices found
          </div>
          <div className="mt-1 text-sm text-slate-500">
            Invoices appear once they are created for an order.
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl ring-1 ring-slate-200">
          <div className="overflow-x-auto bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
                <tr>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Money</th>
                  <th className="px-4 py-3">Due</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {rows.map((inv) => {
                  const currency = inv.currency || "AED";
                  const factor = inv.minorUnitFactor || 100;
                  const overdue = isOverdue(inv);
                  const balance = balanceDueMinor(inv);
                  const rowDeleting = deletingId === inv._id;
                  const rowPdf = pdfId === inv._id;
                  const canDelete = inv.status === "Cancelled";

                  return (
                    <tr key={inv._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">
                          {inv.invoiceNumber || inv._id}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span
                            className={[
                              "font-semibold",
                              inv.status === "Cancelled"
                                ? "text-rose-700"
                                : "text-emerald-700",
                            ].join(" ")}
                          >
                            {inv.status === "Cancelled" ? "Cancelled" : "Issued"}
                          </span>
                          {inv.status === "Cancelled" ? null : (
                            <span>{formatDateTime(inv.createdAt)}</span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-slate-700">
                        <div className="font-medium text-slate-900">
                          {inv.user?.name || ""}
                        </div>
                        <div className="text-xs text-slate-500">
                          {inv.user?.email || ""}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <PaymentStatusBadge status={inv.paymentStatus} />
                          {overdue ? <OverdueBadge /> : null}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">
                          Amount:{" "}
                          <span className="tabular-nums">
                            {moneyMinor(inv.amountMinor, currency, factor)}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">
                          Balance:{" "}
                          <span className="tabular-nums">
                            {moneyMinor(balance, currency, factor)}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div
                          className={[
                            "text-sm",
                            overdue
                              ? "text-rose-700 font-semibold"
                              : "text-slate-700",
                          ].join(" ")}
                        >
                          {inv.dueDate ? formatDate(inv.dueDate) : "No due date"}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            className={[
                              "inline-flex items-center justify-center rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider ring-1 ring-inset transition",
                              rowPdf || isPdfLoading
                                ? "cursor-not-allowed bg-white text-slate-300 ring-slate-200"
                                : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50",
                            ].join(" ")}
                            disabled={rowPdf || isPdfLoading}
                            onClick={() => onPdf(inv)}
                            title="PDF"
                          >
                            {rowPdf ? "PDF.." : "PDF"}
                          </button>

                          <Link
                            to={`/admin/invoices/${inv._id}/edit`}
                            className="inline-flex items-center justify-center rounded-xl bg-slate-900 p-2 text-white ring-1 ring-slate-900 hover:bg-slate-800"
                            title="Edit invoice"
                            aria-label="Edit invoice"
                          >
                            <FiSettings className="h-4 w-4" />
                          </Link>

                          <button
                            type="button"
                            disabled={!canDelete || rowDeleting || isDeleting}
                            className={[
                              "inline-flex items-center justify-center rounded-xl p-2 ring-1 transition",
                              canDelete && !rowDeleting && !isDeleting
                                ? "bg-white text-rose-600 ring-slate-200 hover:bg-rose-50"
                                : "bg-white text-slate-300 ring-slate-200 cursor-not-allowed",
                            ].join(" ")}
                            title={
                              canDelete
                                ? "Delete invoice"
                                : "Only cancelled invoices can be deleted"
                            }
                            aria-label="Delete invoice"
                            onClick={() => onDelete(inv)}
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
