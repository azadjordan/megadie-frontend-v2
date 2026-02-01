import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiChevronDown, FiChevronUp, FiRefreshCw, FiTrash2 } from "react-icons/fi";
import { toast } from "react-toastify";

import Loader from "../../components/common/Loader";
import ErrorMessage from "../../components/common/ErrorMessage";
import Pagination from "../../components/common/Pagination";
import useDebouncedValue from "../../hooks/useDebouncedValue";

import {
  useDeletePaymentByAdminMutation,
  useGetPaymentsAdminQuery,
} from "../../features/payments/paymentsApiSlice";

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

function friendlyApiError(err) {
  const msg =
    err?.data?.message || err?.error || err?.message || "Something went wrong.";
  return String(msg);
}

function getPaymentRowMeta(payment, state = {}) {
  const { deletingId } = state;
  const invoice =
    payment?.invoice && typeof payment.invoice === "object"
      ? payment.invoice
      : null;
  const user =
    payment?.user && typeof payment.user === "object" ? payment.user : null;
  const currency = invoice?.currency || "AED";
  const factor = invoice?.minorUnitFactor || 100;
  const invoiceId =
    typeof payment?.invoice === "string"
      ? payment.invoice
      : String(invoice?._id || "");
  const rowDeleting = deletingId === payment?._id;

  return {
    invoice,
    user,
    currency,
    factor,
    invoiceId,
    rowDeleting,
  };
}

export default function AdminPaymentsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [method, setMethod] = useState("all");
  const [sort, setSort] = useState("newest");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const trimmedSearch = search.trim();
  const debouncedSearch = useDebouncedValue(trimmedSearch, 1000);
  const isDebouncing = trimmedSearch !== debouncedSearch;

  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
  } = useGetPaymentsAdminQuery({
    page,
    search: debouncedSearch,
    method,
    sort,
  });

  const [deletePaymentByAdmin, { isLoading: isDeleting }] =
    useDeletePaymentByAdminMutation();
  const [deletingId, setDeletingId] = useState(null);

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

  const handleDelete = async (payment) => {
    if (!payment?._id) return;
    const ok = window.confirm(
      "Delete this payment? The invoice balance will be updated."
    );
    if (!ok) return;

    try {
      setDeletingId(payment._id);
      const res = await deletePaymentByAdmin(payment._id).unwrap();
      toast.success(res?.message || "Payment deleted.");
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
          <div className="text-lg font-semibold text-slate-900">Payments</div>
          <div className="text-sm text-slate-500">
            Track recorded payments and jump to the linked invoice.
          </div>
        </div>

      </div>

      <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_200px_200px_auto] md:items-end">
          <div className="flex items-end gap-2 md:contents">
            <div className="flex-1">
              <label
                htmlFor="payments-search"
                className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
              >
                Search
              </label>
              <input
                id="payments-search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by invoice #, user, payment reference..."
                className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              />
            </div>
            <button
              type="button"
              onClick={() => setFiltersOpen((prev) => !prev)}
              className="inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 md:hidden"
              aria-expanded={filtersOpen}
              aria-controls="payments-filters-panel"
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
            id="payments-filters-panel"
            className={[
              filtersOpen ? "grid grid-cols-2 gap-2" : "hidden",
              "md:contents",
            ].join(" ")}
          >
            <div>
              <label
                htmlFor="payments-method"
                className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
              >
                Method
              </label>
              <select
                id="payments-method"
                value={method}
                onChange={(e) => {
                  setMethod(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              >
                <option value="all">All methods</option>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank transfer</option>
                <option value="Credit Card">Credit card</option>
                <option value="Cheque">Cheque</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="payments-sort"
                className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
              >
                Sort
              </label>
              <select
                id="payments-sort"
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

            <div className="col-span-2 flex items-end md:col-auto md:justify-end">
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                onClick={() => {
                  setSearch("");
                  setMethod("all");
                  setSort("newest");
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
          <div className="text-sm font-semibold text-slate-900">No payments yet</div>
          <div className="mt-1 text-sm text-slate-500">
            Add payments when money is received. Each payment should be linked to an invoice.
          </div>

          <div className="mt-4 flex flex-col items-center justify-center gap-2 sm:flex-row">
            <Link
              to="/admin/invoices"
              className="w-full rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50 sm:w-auto"
            >
              View invoices
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-3 md:hidden">
            {rows.map((p) => {
              const row = getPaymentRowMeta(p, { deletingId });
              const invoiceLabel = row.invoice?.invoiceNumber || row.invoiceId;
              return (
                <div
                  key={p._id}
                  className="rounded-2xl bg-white p-4 ring-1 ring-slate-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900">
                        {p.reference || p._id}
                      </div>
                      <div className="text-xs text-slate-500">
                        Paid: {formatDate(p.paymentDate) || "-"}
                      </div>
                    </div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {p.paymentMethod || "Method"}
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2">
                    <div className="text-xs font-semibold text-slate-900">
                      {row.user?.name || ""}
                    </div>
                    <div className="text-xs text-slate-500">
                      {row.user?.email || ""}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Invoice
                      </div>
                      <div className="mt-1 text-xs text-slate-700">
                        {row.invoiceId ? invoiceLabel : "No invoice"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Amount
                      </div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">
                        {moneyMinor(p.amountMinor, row.currency, row.factor)}
                      </div>
                      {p.receivedBy ? (
                        <div className="text-[10px] text-slate-500">
                          Received by: {p.receivedBy}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDelete(p)}
                      disabled={isDeleting && row.rowDeleting}
                      className={[
                        "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-semibold uppercase tracking-wider ring-1 transition",
                        isDeleting && row.rowDeleting
                          ? "cursor-not-allowed bg-white text-slate-300 ring-slate-200"
                          : "bg-white text-rose-600 ring-slate-200 hover:bg-rose-50",
                      ].join(" ")}
                      title="Delete payment"
                      aria-label="Delete payment"
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
                    <th className="px-4 py-3 w-[170px]">Payment</th>
                    <th className="px-4 py-3 min-w-[150px]">Invoice</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {rows.map((p) => {
                    const row = getPaymentRowMeta(p, { deletingId });
                    const invoiceLabel = row.invoice?.invoiceNumber || row.invoiceId;

                    return (
                      <tr key={p._id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 w-[170px]">
                          <div className="mt-0.5 font-semibold text-slate-900">
                            {p.reference || p._id}
                          </div>
                          <div className="mt-0.5 text-xs text-slate-500">
                            Paid: {formatDate(p.paymentDate) || "-"}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-700 min-w-[150px]">
                          {row.invoiceId ? (
                            <span className="text-xs text-slate-700">
                              {invoiceLabel}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500">No invoice</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          <div className="font-medium text-slate-900">
                            {row.user?.name || ""}
                          </div>
                          <div className="text-xs text-slate-500">
                            {row.user?.email || ""}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {p.paymentMethod || ""}
                        </td>
                        <td className="px-4 py-3 text-slate-700 tabular-nums">
                          {moneyMinor(p.amountMinor, row.currency, row.factor)}
                          {p.receivedBy ? (
                            <div className="text-xs text-slate-500">
                              Received by: {p.receivedBy}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDelete(p)}
                            disabled={isDeleting && row.rowDeleting}
                            className={[
                              "inline-flex items-center justify-center rounded-xl p-2 ring-1 transition",
                              isDeleting && row.rowDeleting
                                ? "cursor-not-allowed bg-white text-slate-300 ring-slate-200"
                                : "bg-white text-rose-600 ring-slate-200 hover:bg-rose-50",
                            ].join(" ")}
                            title="Delete payment"
                            aria-label="Delete payment"
                          >
                            <FiTrash2 className="h-4 w-4" />
                          </button>
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
        Tip: keep payments immutable once recorded; if a mistake happens, add an adjusting entry (later) or admin-only correction flow.
      </div>
    </div>
  );
}
