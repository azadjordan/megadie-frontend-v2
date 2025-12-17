import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import Loader from "../../components/common/Loader";
import ErrorMessage from "../../components/common/ErrorMessage";
import Pagination from "../../components/common/Pagination";

import { useGetMyOrdersQuery } from "../../features/orders/ordersApiSlice";

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso || "";
  }
}

function StatusBadge({ status }) {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset";
  const map = {
    Processing: "bg-slate-50 text-slate-700 ring-slate-200",
    Delivered: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    Cancelled: "bg-slate-100 text-slate-700 ring-slate-200",
  };
  return (
    <span className={`${base} ${map[status] || map.Processing}`}>
      {status || "—"}
    </span>
  );
}

export default function AccountOrdersPage() {
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading, isError, error, refetch, isFetching } =
    useGetMyOrdersQuery({ page, limit });

  const orders = useMemo(() => data?.data || [], [data]);
  const pagination = data?.pagination;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">My Orders</h1>
            <p className="mt-1 text-sm text-slate-600">
              Track your orders and view details.
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
            <h1 className="text-2xl font-semibold text-slate-900">My Orders</h1>
            <p className="mt-1 text-sm text-slate-600">
              Track your orders and view details.
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
          <h1 className="text-2xl font-semibold text-slate-900">My Orders</h1>
          <p className="mt-1 text-sm text-slate-600">
            Track your orders and view details.
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

      {orders.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">
            No orders yet
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Once your requests are confirmed and processed, your orders will
            appear here.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to="/account/requests"
              className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Go to requests
            </Link>
            <Link
              to="/shop"
              className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
            >
              Go to shop
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {orders.map((o) => {
              const invoiceId =
                o?.invoice?._id ||
                (typeof o?.invoice === "string" ? o.invoice : null);
              const invoiceNumber = o?.invoice?.invoiceNumber || null;

              return (
                <div
                  key={o._id}
                  className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <StatusBadge status={o.status} />
                        <div className="text-sm font-semibold text-slate-900">
                          {o.orderNumber ||
                            `Order #${String(o._id).slice(-6).toUpperCase()}`}
                        </div>
                        <div className="text-xs text-slate-500">
                          {formatDate(o.createdAt)}
                        </div>
                      </div>

                      {invoiceId ? (
                        <div className="mt-2 text-sm text-slate-700">
                          Invoice:{" "}
                          <Link
                            to={`/account/invoices/${invoiceId}`}
                            className="font-semibold text-slate-900 hover:underline"
                          >
                            {invoiceNumber || "View invoice"}
                          </Link>
                        </div>
                      ) : (
                        <div className="mt-2 text-sm text-slate-500">
                          Invoice:{" "}
                          <span className="text-slate-600">
                            Not generated yet
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="shrink-0">
                      <Link
                        to={`/account/orders/${o._id}`}
                        className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                      >
                        View order
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
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
