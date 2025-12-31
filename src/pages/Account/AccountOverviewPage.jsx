import { Link } from "react-router-dom";
import { FiCheckCircle, FiClock } from "react-icons/fi";

import Loader from "../../components/common/Loader";
import ErrorMessage from "../../components/common/ErrorMessage";

import { useGetMyQuotesQuery } from "../../features/quotes/quotesApiSlice";
import { useGetMyOrdersQuery } from "../../features/orders/ordersApiSlice";
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

function statusLabel(status) {
  if (status === "PartiallyPaid") return "Partially paid";
  return status || "-";
}

function StatusPill({ status, label, showIcon = false }) {
  const map = {
    Processing: "bg-slate-50 text-slate-700 ring-slate-200",
    Quoted: "bg-violet-50 text-violet-700 ring-violet-300",
    Confirmed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
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

function StatCard({ label, value, hint, to, actionLabel = "Review now", valueIcon }) {
  return (
    <div className="rounded-3xl border border-white/70 bg-white/85 p-5 shadow-sm shadow-slate-200/40">
      <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
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
        <div className="mt-4">
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

function MiniList({ title, items, empty, renderItem, actionLabel, to }) {
  return (
    <div className="rounded-3xl border border-white/70 bg-white/85 p-5 shadow-sm shadow-slate-200/40">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <Link
          to={to}
          className="text-xs font-semibold text-violet-600 hover:text-violet-700 hover:underline hover:underline-offset-4"
        >
          {actionLabel}
        </Link>
      </div>
      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <div className="text-sm text-slate-500">{empty}</div>
        ) : (
          items.map(renderItem)
        )}
      </div>
    </div>
  );
}

export default function AccountOverviewPage() {
  const quotesQuery = useGetMyQuotesQuery({ page: 1, limit: 5 });
  const ordersQuery = useGetMyOrdersQuery({ page: 1, limit: 5 });
  const invoicesQuery = useGetMyInvoicesQuery({ page: 1, unpaid: false });
  const unpaidQuery = useGetMyInvoicesQuery({ page: 1, unpaid: true });

  const isLoading =
    quotesQuery.isLoading ||
    ordersQuery.isLoading ||
    invoicesQuery.isLoading ||
    unpaidQuery.isLoading;

  const error =
    quotesQuery.error ||
    ordersQuery.error ||
    invoicesQuery.error ||
    unpaidQuery.error;

  const quotes = quotesQuery.data?.data || [];
  const orders = ordersQuery.data?.data || [];
  const invoices = invoicesQuery.data?.items || [];
  const unpaidInvoices = unpaidQuery.data?.items || [];

  const processingQuotes = quotes.filter((q) => q.status === "Processing");
  const quotedQuotes = quotes.filter((q) => q.status === "Quoted");
  const unpaidTotal = unpaidQuery.data?.total ?? unpaidInvoices.length;

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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Ready quotes"
          value={quotedQuotes.length}
          valueIcon={
            quotedQuotes.length > 0 ? (
              <FiCheckCircle className="text-lg text-violet-500" aria-hidden="true" />
            ) : null
          }
          hint="Awaiting your confirmation."
          to="/account/requests"
          actionLabel="Check Quotes"
        />
        <StatCard
          label="Preparing quotes"
          value={processingQuotes.length}
          valueIcon={
            processingQuotes.length > 0 ? (
              <FiClock className="text-lg text-slate-500" aria-hidden="true" />
            ) : null
          }
          hint="We are preparing a quote."
          to="/account/requests"
          actionLabel={null}
        />
        <StatCard
          label="Unpaid invoices"
          value={unpaidTotal}
          hint="Invoices waiting to be paid."
          to="/account/invoices"
          actionLabel="Review Invoices"
        />
      </div>

      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          Recent activity
        </div>
        <div className="mt-3 grid gap-4 lg:grid-cols-3">
          <MiniList
            title="Recent requests"
            items={quotes.slice(0, 2)}
            empty="No requests yet."
            actionLabel="View all"
            to="/account/requests"
            renderItem={(q) => (
              <div
                key={q._id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-3 py-2"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Request{" "}
                    {q.quoteNumber || String(q._id).slice(-6).toUpperCase()}
                  </div>
                  <div className="text-xs text-slate-500">
                    {formatDate(q.createdAt)}
                  </div>
                </div>
                <StatusPill
                  status={q.status}
                  label={q.status === "Processing" ? "Preparing" : null}
                  showIcon
                />
              </div>
            )}
          />

          <MiniList
            title="Recent orders"
            items={orders.slice(0, 2)}
            empty="No orders yet."
            actionLabel="View all"
            to="/account/orders"
            renderItem={(o) => (
              <div
                key={o._id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-3 py-2"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    {o.orderNumber || `Order ${String(o._id).slice(-6)}`}
                  </div>
                  <div className="text-xs text-slate-500">
                    {formatDate(o.createdAt)}
                  </div>
                </div>
                <StatusPill status={o.status} />
              </div>
            )}
          />

          <MiniList
            title="Recent invoices"
            items={invoices.slice(0, 2)}
            empty="No invoices yet."
            actionLabel="View all"
            to="/account/invoices"
            renderItem={(inv) => (
              <div
                key={inv._id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-3 py-2"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    {inv.invoiceNumber ||
                      `Invoice ${String(inv._id).slice(-6)}`}
                  </div>
                  <div className="text-xs text-slate-500">
                    {formatDate(inv.createdAt)}
                  </div>
                </div>
                <StatusPill status={inv.paymentStatus} />
              </div>
            )}
          />
        </div>
      </div>
    </div>
  );
}
