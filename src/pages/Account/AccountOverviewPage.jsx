import { Link } from "react-router-dom";
import { FiCheckCircle, FiClock } from "react-icons/fi";

import Loader from "../../components/common/Loader";
import ErrorMessage from "../../components/common/ErrorMessage";

import { useGetMyQuotesQuery } from "../../features/quotes/quotesApiSlice";
import { useGetMyOrdersQuery } from "../../features/orders/ordersApiSlice";
import {
  useGetMyInvoicesQuery,
  useGetMyInvoiceSummaryQuery,
} from "../../features/invoices/invoicesApiSlice";

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

function statusLabel(status) {
  if (status === "PartiallyPaid") return "Partially paid";
  return status || "-";
}

function formatMoney(amountMinor, currency = "AED", minorUnitFactor = 100) {
  const factor = Number(minorUnitFactor) > 0 ? Number(minorUnitFactor) : 100;
  const amount = (Number(amountMinor) || 0) / factor;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function StatusPill({ status, label, showIcon = false }) {
  const map = {
    Processing: "bg-slate-50 text-slate-700 ring-slate-200",
    Quoted: "bg-violet-50 text-violet-700 ring-violet-300",
    Confirmed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    Shipping: "bg-blue-50 text-blue-700 ring-blue-200",
    Delivered: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    Cancelled: "bg-rose-50 text-rose-700 ring-rose-200",
    Paid: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    PartiallyPaid: "bg-slate-50 text-slate-700 ring-slate-200",
    Unpaid: "bg-rose-50 text-rose-700 ring-rose-200",
    Issued: "bg-slate-50 text-slate-700 ring-slate-200",
  };

  return (
    <span
      className={[
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
        map[status] || "bg-slate-50 text-slate-600 ring-slate-200",
      ].join(" ")}
    >
      {showIcon && status === "Processing" ? (
        <FiClock className="h-3 w-3" />
      ) : null}
      {label || statusLabel(status)}
    </span>
  );
}

function StatCard({ label, value, hint, to, actionLabel, valueIcon }) {
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </div>
      <div className="mt-3 text-2xl font-semibold text-slate-900">
        <span className="inline-flex items-center gap-2">
          <span>{value}</span>
          {valueIcon ? <span className="inline-flex">{valueIcon}</span> : null}
        </span>
      </div>
      <div className="mt-1 text-sm text-slate-500">{hint}</div>
      {actionLabel && to ? (
        <div className="mt-3">
          <Link
            to={to}
            className="text-xs font-semibold text-violet-600 hover:text-violet-700 hover:underline hover:underline-offset-4"
          >
            {actionLabel}
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function BalanceSummaryCard({ summary }) {
  const unpaidTotalMinor = summary?.unpaidTotalMinor ?? 0;
  const overdueTotalMinor = summary?.overdueTotalMinor ?? 0;
  const unpaidCount = summary?.unpaidCount ?? 0;
  const overdueCount = summary?.overdueCount ?? 0;
  const currency = summary?.currency || "AED";
  const minorUnitFactor = summary?.minorUnitFactor || 100;

  const unpaidCountLabel =
    unpaidCount === 1 ? "1 invoice" : `${unpaidCount} invoices`;
  const overdueCountLabel =
    overdueCount === 0
      ? "No overdue invoices"
      : overdueCount === 1
      ? "1 overdue invoice"
      : `${overdueCount} overdue invoices`;

  const overdueTone =
    overdueTotalMinor > 0 ? "text-rose-600" : "text-slate-900";

  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        Invoice balance
      </div>
      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">
              Unpaid balance
            </div>
            <div className="text-xs text-slate-500">{unpaidCountLabel}</div>
          </div>
          <div className="text-sm font-semibold text-slate-900 tabular-nums">
            {formatMoney(unpaidTotalMinor, currency, minorUnitFactor)}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">
              Overdue balance
            </div>
            <div className="text-xs text-slate-500">{overdueCountLabel}</div>
          </div>
          <div className={`text-sm font-semibold tabular-nums ${overdueTone}`}>
            {formatMoney(overdueTotalMinor, currency, minorUnitFactor)}
          </div>
        </div>
      </div>
      <div className="mt-3">
        <Link
          to="/account/invoices"
          className="text-xs font-semibold text-violet-600 hover:text-violet-700 hover:underline hover:underline-offset-4"
        >
          View invoices
        </Link>
      </div>
    </div>
  );
}

function ActivityList({ items }) {
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
      <div className="text-sm font-semibold text-slate-900">
        Quotes needing action
      </div>
      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <div className="text-sm text-slate-500">
            No quotes awaiting your confirmation.
          </div>
        ) : (
          items.map((item) => (
            <Link
              key={item.id}
              to={item.to}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 transition hover:bg-slate-50"
            >
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  {item.label}
                </div>
                <div className="text-xs text-slate-500">
                  {formatDate(item.date)}
                </div>
              </div>
              <StatusPill
                status={item.status}
                label={item.statusLabel}
                showIcon={item.status === "Processing"}
              />
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

export default function AccountOverviewPage() {
  const quotesQuery = useGetMyQuotesQuery({ page: 1, limit: 5 });
  const ordersQuery = useGetMyOrdersQuery({ page: 1, limit: 5 });
  const invoicesQuery = useGetMyInvoicesQuery({ page: 1, unpaid: false });
  const invoiceSummaryQuery = useGetMyInvoiceSummaryQuery();

  const isLoading =
    quotesQuery.isLoading ||
    ordersQuery.isLoading ||
    invoicesQuery.isLoading ||
    invoiceSummaryQuery.isLoading;

  const error =
    quotesQuery.error ||
    ordersQuery.error ||
    invoicesQuery.error ||
    invoiceSummaryQuery.error;

  const quotes = quotesQuery.data?.data || [];
  const orders = ordersQuery.data?.data || [];
  const invoices = invoicesQuery.data?.items || [];
  const invoiceSummary = invoiceSummaryQuery.data || {};

  const processingQuotes = quotes.filter((q) => q.status === "Processing");
  const quotedQuotes = quotes.filter((q) => q.status === "Quoted");
  const showReadyQuotes = quotedQuotes.length > 0;
  const activityItems = quotedQuotes
    .map((q) => ({
      id: `quote-${q._id}`,
      label: `Quote ${q.quoteNumber || String(q._id).slice(-6).toUpperCase()}`,
      date: q.createdAt,
      status: q.status,
      to: "/account/requests",
      statusLabel: "Needs action",
    }))
    .filter((item) => item.date)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-sm shadow-slate-200/40">
        <Loader />
      </div>
    );
  }

  if (error) {
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
            <div className="text-2xl font-semibold text-slate-900">Overview</div>
            <div className="mt-1 text-sm text-slate-600">
              Track what matters and jump to each section quickly.
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {showReadyQuotes ? (
          <StatCard
            label="Ready quotes"
            value={quotedQuotes.length}
            valueIcon={
              quotedQuotes.length > 0 ? (
                <FiCheckCircle className="text-lg text-violet-500" aria-hidden="true" />
              ) : null
            }
            hint="Awaiting your confirmation."
          />
        ) : (
          <StatCard
            label="Preparing quotes"
            value={processingQuotes.length}
            valueIcon={
              processingQuotes.length > 0 ? (
                <FiClock className="text-lg text-slate-500" aria-hidden="true" />
              ) : null
            }
            hint="Quotes are in progress."
          />
        )}
        <BalanceSummaryCard summary={invoiceSummary} />
      </div>

      <ActivityList items={activityItems} />
    </div>
  );
}
