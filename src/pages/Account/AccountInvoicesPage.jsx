// src/pages/Account/AccountInvoicesPage.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import Loader from "../../components/common/Loader";
import ErrorMessage from "../../components/common/ErrorMessage";
import Pagination from "../../components/common/Pagination";

import { useGetMyInvoicesQuery } from "../../features/invoices/invoicesApiSlice";
import useAccountHeader from "../../hooks/useAccountHeader";

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

/** Currency-agnostic minor-units formatting */
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

function Pill({ children }) {
  return (
    <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-800 ring-1 ring-inset ring-rose-200">
      {children}
    </span>
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
          if (!disabled) onChange(!checked);
        }}
        className={[
          "relative inline-flex h-6 w-11 items-center rounded-full transition",
          disabled ? "cursor-not-allowed" : "cursor-pointer",
          checked ? "bg-slate-900" : "bg-slate-300",
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

function invoiceTitle(inv) {
  if (inv.invoiceNumber) return inv.invoiceNumber;
  return `Invoice #${String(inv._id).slice(-6).toUpperCase()}`;
}

// ✅ best-practice: simple, global page scroll (not “scroll to cards”)
function scrollToPageTop() {
  window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
}

export default function AccountInvoicesPage() {
  const { setAccountHeader, clearAccountHeader } = useAccountHeader();

  const [page, setPage] = useState(1);
  const [unpaidOnly, setUnpaidOnly] = useState(false);

  const q = useGetMyInvoicesQuery({ page, unpaid: unpaidOnly });

  const invoices = q.data?.items ?? [];
  const toggleDisabled = !q.data || invoices.length === 0;

  const pagination = useMemo(() => {
    if (!q.data) return null;
    const cur = q.data.page || 1;
    const total = q.data.pages || 1;
    return {
      page: cur,
      totalPages: total,
      hasPrev: cur > 1,
      hasNext: cur < total,
    };
  }, [q.data]);

  useEffect(() => {
    setAccountHeader({
      title: "Invoices & Orders",
      subtitle:
        "Invoices show status, payments, and link to the related order.",
      right: null,
      bottom: (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <Toggle
            checked={unpaidOnly}
            onChange={(v) => {
              if (toggleDisabled) return;
              scrollToPageTop(); // ✅ very top of the page
              setPage(1);
              setUnpaidOnly(v);
            }}
            label="Unpaid only"
            disabled={toggleDisabled}
          />
        </div>
      ),
    });

    return () => clearAccountHeader();
  }, [setAccountHeader, clearAccountHeader, unpaidOnly, toggleDisabled]);

  const handlePageChange = (nextPage) => {
    if (nextPage === page) return;
    scrollToPageTop(); // ✅ very top of the page
    setPage(nextPage);
  };

  if (q.isLoading) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <Loader />
      </div>
    );
  }

  if (q.isError) {
    return (
      <div className="space-y-4">
        <ErrorMessage error={q.error} />
        <div>
          <button
            type="button"
            onClick={q.refetch}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-6">
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
                        {overdue ? <Pill>Overdue</Pill> : null}
                        {inv.status === "Cancelled" ? (
                          <Pill>Cancelled</Pill>
                        ) : null}

                        <Link
                          to={`/account/billing/invoices/${inv._id}`}
                          className="text-sm font-semibold text-slate-900 hover:underline"
                        >
                          {invoiceTitle(inv)}
                        </Link>

                        <div className="text-xs text-slate-500">
                          {formatDate(inv.createdAt)}
                        </div>
                      </div>

                      {/* ✅ Compact row: Balance due + Due date */}
                      <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-1">
                        <div className="text-base font-semibold text-slate-900">
                          Amount:{" "}
                          <span className="tabular-nums">
                            {moneyMinor(inv.amountMinor, currency, factor)}
                          </span>
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
                        to={`/account/billing/invoices/${inv._id}`}
                        className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                      >
                        Details
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
                onPageChange={handlePageChange}
              />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
