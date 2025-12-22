import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import Loader from "../../components/common/Loader";
import ErrorMessage from "../../components/common/ErrorMessage";
import Pagination from "../../components/common/Pagination";
import useDebouncedValue from "../../hooks/useDebouncedValue";

import { useGetPaymentsAdminQuery } from "../../features/payments/paymentsApiSlice";

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

export default function AdminPaymentsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [method, setMethod] = useState("all");
  const [sort, setSort] = useState("newest");

  const trimmedSearch = search.trim();
  const debouncedSearch = useDebouncedValue(trimmedSearch, 500);
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-lg font-semibold text-slate-900">Payments</div>
          <div className="text-sm text-slate-500">
            Track recorded payments and jump to the linked invoice.
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
            onClick={() => {
              setSearch("");
              setMethod("all");
              setSort("newest");
              setPage(1);
            }}
          >
            Reset
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-12 md:items-center">
          <div className="md:col-span-6">
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by invoice #, user, payment reference..."
              className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            />
          </div>

          <div className="md:col-span-3">
            <select
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

          <div className="md:col-span-3">
            <select
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
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <div>
            Showing{" "}
            <span className="font-semibold text-slate-700">{rows.length}</span>{" "}
            of <span className="font-semibold text-slate-700">{total}</span>{" "}
            payment(s)
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
        <div className="overflow-hidden rounded-2xl ring-1 ring-slate-200">
          <div className="overflow-x-auto bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
                <tr>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {rows.map((p) => {
                  const invoice = p.invoice && typeof p.invoice === "object" ? p.invoice : null;
                  const user = p.user && typeof p.user === "object" ? p.user : null;
                  const currency = invoice?.currency || "AED";
                  const factor = invoice?.minorUnitFactor || 100;
                  const invoiceId =
                    typeof p.invoice === "string"
                      ? p.invoice
                      : String(invoice?._id || "");

                  return (
                    <tr key={p._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">
                          {p.reference || p._id}
                        </div>
                        {p.receivedBy ? (
                          <div className="text-xs text-slate-500">
                            Received by: {p.receivedBy}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {invoiceId ? (
                          <Link
                            to={`/admin/invoices/${invoiceId}/edit`}
                            className="font-semibold text-slate-900 hover:underline"
                          >
                            {invoice?.invoiceNumber || invoiceId}
                          </Link>
                        ) : (
                          <span className="text-slate-500">No invoice</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <div className="font-medium text-slate-900">
                          {user?.name || ""}
                        </div>
                        <div className="text-xs text-slate-500">
                          {user?.email || ""}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {p.paymentMethod || ""}
                      </td>
                      <td className="px-4 py-3 text-slate-700 tabular-nums">
                        {moneyMinor(p.amountMinor, currency, factor)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-slate-700">
                          Created: {formatDateTime(p.createdAt) || "-"}
                        </div>
                        <div className="text-xs text-slate-500">
                          Paid: {formatDateTime(p.paymentDate) || "-"}
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
        Tip: keep payments immutable once recorded; if a mistake happens, add an adjusting entry (later) or admin-only correction flow.
      </div>
    </div>
  );
}
