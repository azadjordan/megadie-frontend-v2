// src/pages/Account/AccountInvoicesPage.jsx
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

/**
 * Currency-agnostic minor-units formatting
 */
function moneyMinor(amountMinor, currency = "AED", factor = 100) {
  if (typeof amountMinor !== "number" || !Number.isFinite(amountMinor))
    return "—";
  const f = typeof factor === "number" && factor > 0 ? factor : 100;
  const major = amountMinor / f;

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(major);
  } catch {
    return major.toFixed(2);
  }
}

/**
 * UI-only overdue computation:
 * overdue if dueDate < now AND balanceDueMinor > 0 AND invoice.status !== "Cancelled"
 */
function isOverdue(inv) {
  if (!inv) return false;
  if (inv.status === "Cancelled") return false;

  const due = inv.dueDate ? new Date(inv.dueDate).getTime() : null;
  if (!due || Number.isNaN(due)) return false;

  const paid = typeof inv.paidTotalMinor === "number" ? inv.paidTotalMinor : 0;
  const amount = typeof inv.amountMinor === "number" ? inv.amountMinor : 0;

  const balance =
    typeof inv.balanceDueMinor === "number"
      ? inv.balanceDueMinor
      : Math.max(amount - paid, 0);

  if (balance <= 0) return false;
  if (inv.paymentStatus === "Paid") return false;

  return due < Date.now();
}

function StatusBadge({ status }) {
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

  return (
    <span className={`${base} ${map[status] || map.Unpaid}`}>{label}</span>
  );
}

function Toggle({ checked, onChange, label, disabled }) {
  return (
    <label
      className={[
        "inline-flex items-center gap-2 select-none",
        disabled ? "opacity-50" : "",
      ].join(" ")}
    >
      <span className="text-sm font-semibold text-slate-900">{label}</span>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-disabled={disabled}
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          onChange(!checked);
        }}
        className={[
          "relative inline-flex h-6 w-11 items-center rounded-full transition",
          disabled ? "cursor-not-allowed" : "cursor-pointer",
          checked ? "bg-slate-900" : "bg-slate-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2",
        ].join(" ")}
      >
        <span
          className={[
            "inline-block h-5 w-5 transform rounded-full bg-white transition",
            checked ? "translate-x-5" : "translate-x-1",
          ].join(" ")}
        />
      </button>
    </label>
  );
}

export default function AccountInvoicesPage() {
  const [page, setPage] = useState(1);
  const [unpaidOnly, setUnpaidOnly] = useState(false);

  const { data, isLoading, isError, error, refetch, isFetching } =
    useGetMyInvoicesQuery({ page, unpaid: unpaidOnly });

  const invoices = useMemo(() => data?.items || [], [data]);

  const toggleDisabled = !data || invoices.length === 0;

  const pagination = useMemo(() => {
    if (!data) return null;

    return {
      page: data.page || 1,
      totalPages: data.pages || 1,
      hasPrev: (data.page || 1) > 1,
      hasNext: (data.page || 1) < (data.pages || 1),
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <Loader />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              My Invoices
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              View invoice status and payments.
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
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">My Invoices</h1>
          <p className="mt-1 text-sm text-slate-600">
            View invoice status and payments.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <Toggle
            checked={unpaidOnly}
            onChange={(v) => {
              if (toggleDisabled) return;
              setPage(1);
              setUnpaidOnly(v);
            }}
            label="Show Unpaid only"
            disabled={toggleDisabled}
          />

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-60"
          >
            {isFetching ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* Empty */}
      {invoices.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">
            {unpaidOnly ? "No unpaid invoices" : "No invoices yet"}
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {unpaidOnly
              ? "Everything looks fully paid right now."
              : "Invoices appear once an admin generates an invoice for an order."}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {invoices.map((inv) => {
              const currency = inv.currency || "AED";
              const factor = inv.minorUnitFactor || 100;
              const overdue = isOverdue(inv);

              return (
                <div
                  key={inv._id}
                  className={[
                    "relative rounded-2xl bg-white shadow-sm ring-1 ring-slate-200",
                    overdue ? "border-l-4 border-rose-500" : "",
                  ].join(" ")}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <StatusBadge status={inv.paymentStatus} />

                        {inv.status === "Cancelled" ? (
                          <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold bg-rose-50 text-rose-800 ring-1 ring-inset ring-rose-200">
                            Cancelled
                          </span>
                        ) : null}

                        <Link
                          to={`/account/invoices/${inv._id}`}
                          className="text-sm font-semibold text-slate-900 hover:underline"
                        >
                          {inv.invoiceNumber ||
                            `Invoice #${String(inv._id)
                              .slice(-6)
                              .toUpperCase()}`}
                        </Link>

                        <div className="text-xs text-slate-500">
                          {formatDate(inv.createdAt)}
                        </div>
                      </div>

                      <div className="mt-3 grid gap-2 text-sm text-slate-700">
                        {/* Balance (primary number) */}
                        <div className="text-base font-semibold text-slate-900">
                          Balance due:{" "}
                          {moneyMinor(inv.balanceDueMinor, currency, factor)}
                        </div>

                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                          <div>
                            Amount:{" "}
                            <span className="font-semibold text-slate-900">
                              {moneyMinor(inv.amountMinor, currency, factor)}
                            </span>
                          </div>
                          <div>
                            Paid:{" "}
                            <span className="font-semibold text-slate-900">
                              {moneyMinor(
                                inv.paidTotalMinor,
                                currency,
                                factor
                              )}
                            </span>
                          </div>
                        </div>

                        <div
                          className={[
                            "text-xs",
                            overdue
                              ? "text-rose-700 font-semibold"
                              : "text-slate-500",
                          ].join(" ")}
                        >
                          {inv.dueDate
                            ? `Due: ${formatDate(inv.dueDate)}`
                            : "No due date"}
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
