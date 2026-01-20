import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";

import Loader from "../../components/common/Loader";
import ErrorMessage from "../../components/common/ErrorMessage";
import Pagination from "../../components/common/Pagination";

import { useGetMyOrdersQuery } from "../../features/orders/ordersApiSlice";

function formatDateTime(iso) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatDate(iso) {
  if (!iso) return "-";
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

function StatusBadge({ status }) {
  const base =
    "inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset";
  const map = {
    Processing: "bg-slate-50 text-slate-700 ring-slate-200",
    Shipping: "bg-blue-50 text-blue-700 ring-blue-200",
    Delivered: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    Cancelled: "bg-rose-50 text-rose-700 ring-rose-200",
  };
  return (
    <span className={`${base} ${map[status] || map.Processing}`}>
      {status || "-"}
    </span>
  );
}

export default function AccountOrdersPage() {
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState({});
  const limit = 4;

  const { data, isLoading, isError, error } = useGetMyOrdersQuery({
    page,
    limit,
  });

  const rows = useMemo(() => data?.data || [], [data]);
  const pagination = data?.pagination;

  const toggle = (id) => setOpen((prev) => ({ ...prev, [id]: !prev[id] }));

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-sm shadow-slate-200/40">
        <Loader />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-sm shadow-slate-200/40">
        <ErrorMessage error={error} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="h-8 w-1 rounded-full bg-violet-500" aria-hidden="true" />
          <div>
            <div className="text-2xl font-semibold text-slate-900">Orders</div>
            <div className="mt-1 text-sm text-slate-600">
              Follow your orders from processing to delivery.
            </div>
          </div>
        </div>
        {pagination ? (
          <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
            <Pagination
              pagination={pagination}
              onPageChange={(next) => setPage(next)}
              variant="compact"
              showSummary={false}
              showNumbers={false}
            />
          </div>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <div className="text-sm font-semibold text-slate-900">
            No orders yet
          </div>
          <div className="mt-2 text-sm text-slate-600">
            Orders appear after a quote is confirmed.
          </div>
          <div className="mt-4">
            <Link
              to="/account/requests"
              className="inline-flex items-center rounded-2xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-violet-200/60 hover:bg-violet-700"
            >
              View requests
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {rows.map((order) => {
              const orderItems = Array.isArray(order.orderItems)
                ? order.orderItems
                : [];
              const items = orderItems.length;
              const invoice =
                order.invoice && typeof order.invoice === "object"
                  ? order.invoice
                  : null;
              const invoiceId =
                typeof order.invoice === "string"
                  ? order.invoice
                  : String(invoice?._id || "");
              const isOpen = !!open[order._id];

              return (
                <div
                  key={order._id}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="grid items-start gap-4 md:grid-cols-[1fr_auto]">
                    <div className="min-w-0">
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                        {isOpen ? (
                          <div className="col-span-full text-sm font-semibold text-slate-700">
                            Order details
                          </div>
                        ) : (
                          <>
                            <div className="flex flex-col gap-1 lg:col-span-1">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                                Status
                              </span>
                              <StatusBadge status={order.status} />
                            </div>
                            <div className="flex flex-col gap-1 lg:col-span-2">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                                Order
                              </span>
                              <div className="text-lg font-semibold text-slate-900">
                                {order.orderNumber ||
                                  `Order ${order._id.slice(-6)}`}
                              </div>
                            </div>
                            <div className="flex flex-col gap-1 lg:col-span-1">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                                Date
                              </span>
                              <div className="text-sm font-semibold text-slate-900">
                                {formatDate(order.createdAt)}
                              </div>
                            </div>
                            <div className="flex flex-col gap-1 lg:col-span-1">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                                Items
                              </span>
                              <div className="text-sm font-semibold text-slate-900">
                                {items} item{items === 1 ? "" : "s"}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggle(order._id)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      {isOpen ? "Hide" : "Details"}
                      {isOpen ? (
                        <FiChevronUp className="h-4 w-4" />
                      ) : (
                        <FiChevronDown className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {isOpen ? (
                    <div className="mt-5 space-y-4 border-t border-slate-200 pt-4">
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-2xl border border-slate-100 bg-white px-3 py-2">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                            Order no#
                          </div>
                          <div className="mt-1 text-sm font-semibold text-slate-900">
                            {order.orderNumber ||
                              `Order ${order._id.slice(-6)}`}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-slate-100 bg-white px-3 py-2">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                            Status
                          </div>
                          <div className="mt-1">
                            <StatusBadge status={order.status} />
                          </div>
                        </div>
                        <div className="rounded-2xl border border-slate-100 bg-white px-3 py-2">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                            Invoice
                          </div>
                          <div className="mt-1 text-sm font-semibold text-slate-900">
                            {invoiceId ? (
                              <span>{invoice?.invoiceNumber || invoiceId}</span>
                            ) : (
                              "None"
                            )}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-slate-100 bg-white px-3 py-2">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                            Date
                          </div>
                          <div className="mt-1 text-sm font-semibold text-slate-900">
                            {formatDate(order.createdAt)}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-slate-100 bg-white px-3 py-2">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                            Delivered
                          </div>
                          <div className="mt-1 text-sm font-semibold text-slate-900">
                            {order.deliveredAt
                              ? formatDateTime(order.deliveredAt)
                              : "Not yet"}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-slate-100 bg-white px-3 py-2">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                            Items
                          </div>
                          <div className="mt-1 text-sm font-semibold text-slate-900">
                            {items} item{items === 1 ? "" : "s"}
                          </div>
                        </div>
                      </div>

                      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                        <div className="grid grid-cols-12 bg-slate-50 px-5 py-3 text-xs font-semibold text-slate-600">
                          <div className="col-span-9">Product</div>
                          <div className="col-span-3 text-right">Qty</div>
                        </div>

                        {items === 0 ? (
                          <div className="px-5 py-4 text-sm text-slate-600">
                            No items.
                          </div>
                        ) : (
                          orderItems.map((it, idx) => {
                            const name =
                              it?.product?.name ||
                              it?.productName ||
                              (typeof it?.product === "string"
                                ? it.product
                                : "") ||
                              "Unnamed item";
                            const qty = it?.qty ?? 0;

                            return (
                              <div
                                key={`${order._id}-${idx}`}
                                className="grid grid-cols-12 items-center border-t border-slate-200 px-5 py-3 text-sm text-slate-800"
                              >
                                <div className="col-span-9 min-w-0">
                                  <div className="truncate font-semibold text-slate-900">
                                    {name}
                                  </div>
                                </div>
                                <div className="col-span-3 text-right tabular-nums">
                                  {qty}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          {pagination ? (
            <Pagination
              pagination={pagination}
              onPageChange={(next) => setPage(next)}
              tone="violet"
            />
          ) : null}
        </>
      )}
    </div>
  );
}
