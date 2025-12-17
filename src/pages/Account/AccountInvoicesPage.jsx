import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import Loader from "../../components/common/Loader";
import ErrorMessage from "../../components/common/ErrorMessage";
import Pagination from "../../components/common/Pagination";

import { useGetMyInvoicesQuery } from "../../features/invoices/invoicesApiSlice";

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return iso || "";
  }
}

function money(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "AED",
  }).format(n);
}

function StatusBadge({ status }) {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset";
  const map = {
    Paid: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    "Partially Paid": "bg-amber-50 text-amber-800 ring-amber-200",
    Overdue: "bg-rose-50 text-rose-800 ring-rose-200",
    Unpaid: "bg-slate-50 text-slate-700 ring-slate-200",
  };
  return (
    <span className={`${base} ${map[status] || map.Unpaid}`}>
      {status || "Unpaid"}
    </span>
  );
}

export default function AccountInvoicesPage() {
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading, isError, error, refetch, isFetching } =
    useGetMyInvoicesQuery({ page, limit });

  const invoices = useMemo(() => data?.items || [], [data]);
  const pagination = data?.pagination;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              My Invoices
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              View invoice status, payments, and PDF.
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <Loader />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              My Invoices
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              View invoice status, payments, and PDF.
            </p>
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
          >
            Retry
          </button>
        </div>

        <ErrorMessage error={error} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">My Invoices</h1>
          <p className="mt-1 text-sm text-slate-600">
            View invoice status, payments, and PDF.
          </p>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-60"
        >
          {isFetching ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {invoices.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">
            No invoices yet
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Invoices appear once an order invoice is generated.
          </p>
          <div className="mt-4">
            <Link
              to="/account/orders"
              className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Go to orders
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {invoices.map((inv) => (
              <div
                key={inv._id}
                className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"
              >
                <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <StatusBadge status={inv.status} />
                      <Link
                        to={`/account/invoices/${inv._id}`}
                        className="text-sm font-semibold text-slate-900 hover:underline"
                      >
                        {inv.invoiceNumber ||
                          `Invoice #${String(inv._id).slice(-6).toUpperCase()}`}
                      </Link>
                      <div className="text-xs text-slate-500">
                        {formatDate(inv.createdAt)}
                      </div>
                    </div>

                    <div className="mt-2 grid gap-1 text-sm text-slate-700">
                      <div>
                        Amount:{" "}
                        <span className="font-semibold text-slate-900">
                          {money(inv.amount)}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-6 gap-y-1">
                        <div>
                          Paid:{" "}
                          <span className="font-semibold text-slate-900">
                            {money(inv.totalPaid)}
                          </span>
                        </div>
                        <div>
                          Balance:{" "}
                          <span className="font-semibold text-slate-900">
                            {money(inv.balanceDue)}
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-slate-500">
                        {inv.dueDate
                          ? `Due: ${formatDate(inv.dueDate)}`
                          : "No due date"}
                        {inv.orderNumber ? ` • Order: ${inv.orderNumber}` : ""}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <Link
                      to={`/account/invoices/${inv._id}`}
                      className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                      View invoice
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {pagination ? (
            <div className="pt-2">
              <Pagination
                pagination={pagination}
                onPageChange={(p) => setPage(p)}
              />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
