import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowRight } from "react-icons/fi";

import Loader from "../../components/common/Loader";
import ErrorMessage from "../../components/common/ErrorMessage";
import Pagination from "../../components/common/Pagination";

import { useGetMyInvoicesQuery } from "../../features/invoices/invoicesApiSlice";

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

function moneyMinor(amountMinor, currency = "AED", factor = 100) {
  if (typeof amountMinor !== "number" || !Number.isFinite(amountMinor))
    return "-";

  const f = typeof factor === "number" && factor > 0 ? factor : 100;
  const major = amountMinor / f;

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(major);
  } catch {
    return major.toFixed(2);
  }
}

function isOverdue(inv) {
  if (!inv || inv.status === "Cancelled") return false;

  const due = inv.dueDate ? Date.parse(inv.dueDate) : NaN;
  if (!Number.isFinite(due)) return false;

  const balance =
    typeof inv.balanceDueMinor === "number"
      ? inv.balanceDueMinor
      : Math.max((inv.amountMinor || 0) - (inv.paidTotalMinor || 0), 0);

  if (balance <= 0) return false;
  if (inv.paymentStatus === "Paid") return false;

  return due < Date.now();
}

function StatusBadge({ status }) {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset";

  const map = {
    Paid: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    PartiallyPaid: "bg-amber-50 text-amber-700 ring-amber-200",
    Unpaid: "bg-rose-50 text-rose-700 ring-rose-200",
  };

  const label =
    status === "PartiallyPaid"
      ? "Partially paid"
      : status === "Paid"
      ? "Paid"
      : "Unpaid";

  return (
    <span className={`${base} ${map[status] || map.Unpaid}`}>{label}</span>
  );
}

function OverdueBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-200">
      Overdue
    </span>
  );
}

function CancelledBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">
      Cancelled
    </span>
  );
}

export default function AccountInvoicesPage() {
  const [page, setPage] = useState(1);
  const [unpaidOnly, setUnpaidOnly] = useState(false);

  const q = useGetMyInvoicesQuery({ page, unpaid: unpaidOnly });

  const invoices = useMemo(() => q.data?.items || [], [q.data]);
  const pagination = useMemo(() => {
    if (!q.data) return null;
    return {
      page: q.data.page || 1,
      totalPages: q.data.pages || 1,
      hasPrev: q.data.page > 1,
      hasNext: q.data.page < (q.data.pages || 1),
    };
  }, [q.data]);
  const showPagination = Boolean(pagination) && invoices.length > 0;
  const showControls = invoices.length > 0;

  if (q.isLoading) {
    return (
      <div className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-sm shadow-slate-200/40">
        <Loader />
      </div>
    );
  }

  if (q.isError) {
    return (
      <div className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-sm shadow-slate-200/40">
        <ErrorMessage error={q.error} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="h-8 w-1 rounded-full bg-violet-500" aria-hidden="true" />
          <div>
            <div className="text-2xl font-semibold text-slate-900">Invoices</div>
            <div className="mt-1 text-sm text-slate-600">
              Review balances, due dates, and payments.
            </div>
          </div>
        </div>
      </div>

      {showControls ? (
        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Filter
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPage(1);
                    setUnpaidOnly(false);
                  }}
                  className={[
                    "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                    !unpaidOnly
                      ? "border-violet-300 text-violet-700 hover:bg-violet-50"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50",
                  ].join(" ")}
                >
                  All invoices
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPage(1);
                    setUnpaidOnly(true);
                  }}
                  className={[
                    "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                    unpaidOnly
                      ? "border-violet-300 text-violet-700 hover:bg-violet-50"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50",
                  ].join(" ")}
                >
                  Unpaid only
                </button>
              </div>
            </div>
            {showPagination ? (
              <Pagination
                pagination={pagination}
                onPageChange={(next) => setPage(next)}
                variant="compact"
                showSummary={false}
                showNumbers={false}
              />
            ) : null}
          </div>
        </div>
      ) : null}

      {invoices.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <div className="text-sm font-semibold text-slate-900">
            {unpaidOnly ? "No unpaid invoices" : "No invoices yet"}
          </div>
          <p className="mt-2 text-sm text-slate-600">
            {unpaidOnly
              ? "Everything looks fully paid right now."
              : "Invoices appear once an admin generates one for your order."}
          </p>
          <div className="mt-4">
            <Link
              to="/account/orders"
              className="inline-flex items-center rounded-2xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-violet-200/60 hover:bg-violet-700"
            >
              View orders
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {invoices.map((inv) => {
              const currency = inv.currency || "AED";
              const factor = inv.minorUnitFactor || 100;
              const overdue = isOverdue(inv);
              const cancelled = inv.status === "Cancelled";

              return (
                <div
                  key={inv._id}
                  className={[
                    "rounded-3xl border border-slate-200 bg-white p-5 shadow-sm",
                    overdue
                      ? "border-l-4 border-l-rose-500"
                      : "border-l-4 border-l-transparent",
                  ].join(" ")}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="grid gap-4 sm:grid-cols-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                            Status
                          </span>
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge status={inv.paymentStatus} />
                            {overdue ? <OverdueBadge /> : null}
                            {cancelled ? <CancelledBadge /> : null}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                            Invoice
                          </span>
                          <div className="text-lg font-semibold text-slate-900">
                            {inv.invoiceNumber || `Invoice ${inv._id.slice(-6)}`}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                            Amount
                          </span>
                          <div className="text-sm font-semibold text-slate-900">
                            {moneyMinor(inv.amountMinor, currency, factor)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <Link
                      to={`/account/invoices/${inv._id}`}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                      Details
                      <FiArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
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
