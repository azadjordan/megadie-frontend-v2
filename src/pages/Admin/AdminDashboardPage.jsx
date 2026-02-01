import { useMemo } from "react";
import { Link } from "react-router-dom";

import { useGetAdminQuotesQuery } from "../../features/quotes/quotesApiSlice";
import { useGetOrdersAdminQuery } from "../../features/orders/ordersApiSlice";
import {
  useGetInvoicesAdminQuery,
  useGetInvoicesAdminSummaryQuery,
} from "../../features/invoices/invoicesApiSlice";
import { useGetPaymentsAdminQuery } from "../../features/payments/paymentsApiSlice";
import { useGetUsersAdminQuery } from "../../features/users/usersApiSlice";

const formatCount = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  return new Intl.NumberFormat().format(n);
};

const getTotalFromData = (data) => {
  if (!data) return null;
  if (Number.isFinite(data.total)) return data.total;
  if (Number.isFinite(data?.pagination?.total)) return data.pagination.total;
  return null;
};

const getRowsFromData = (data) =>
  Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data?.items)
      ? data.items
      : [];

const buildStatValue = (loading, error, value) => {
  if (loading) return "...";
  if (error) return "--";
  return formatCount(value);
};

const buildMoneyValue = (loading, error, amountMinor, currency, factor) => {
  if (loading) return "...";
  if (error) return "--";
  return formatMoneyMinor(amountMinor, currency, factor);
};

const formatDate = (iso) => {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
};

const formatMoneyMinor = (amountMinor, currency = "AED", factor = 100) => {
  if (typeof amountMinor !== "number" || !Number.isFinite(amountMinor)) {
    return "-";
  }

  const divisor = typeof factor === "number" && factor > 0 ? factor : 100;
  const major = amountMinor / divisor;

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(major);
  } catch {
    return `${major.toFixed(2)} ${currency}`;
  }
};

const formatPaymentStatusLabel = (status) => {
  if (status === "PartiallyPaid") return "Partially paid";
  if (status === "Paid") return "Paid";
  return "Unpaid";
};

const getRowTimestamp = (row) => {
  const raw = row?.createdAt || row?.updatedAt || row?.created || row?.date;
  if (!raw) return 0;
  const ts = Date.parse(raw);
  return Number.isFinite(ts) ? ts : 0;
};

const sortByNewest = (rows) =>
  [...rows].sort((a, b) => getRowTimestamp(b) - getRowTimestamp(a));

const isInvoiceOverdue = (inv) => {
  if (!inv || inv.status === "Cancelled") return false;
  if (inv.paymentStatus === "Paid") return false;
  const due = inv.dueDate ? Date.parse(inv.dueDate) : NaN;
  if (!Number.isFinite(due)) return false;
  const balance =
    typeof inv.balanceDueMinor === "number"
      ? inv.balanceDueMinor
      : Math.max(
          (typeof inv.amountMinor === "number" ? inv.amountMinor : 0) -
            (typeof inv.paidTotalMinor === "number" ? inv.paidTotalMinor : 0),
          0,
        );
  return balance > 0 && due < Date.now();
};

const QUOTE_STATUS_STYLES = {
  Processing: "bg-slate-50 text-slate-700 ring-slate-200",
  Quoted: "bg-violet-50 text-violet-700 ring-violet-300",
  Confirmed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Cancelled: "bg-rose-50 text-rose-700 ring-rose-200",
};

const ORDER_STATUS_STYLES = {
  Processing: "bg-slate-50 text-slate-700 ring-slate-200",
  Shipping: "bg-blue-50 text-blue-700 ring-blue-200",
  Delivered: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Cancelled: "bg-rose-50 text-rose-700 ring-rose-200",
};

const PAYMENT_STATUS_STYLES = {
  Paid: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  PartiallyPaid: "bg-amber-50 text-amber-800 ring-amber-200",
  Unpaid: "bg-rose-50 text-rose-800 ring-rose-200",
};

const OVERDUE_STATUS_STYLE = "bg-rose-50 text-rose-800 ring-rose-200";

function StatCard({ title, value, hint, to }) {
  const content = (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 transition hover:bg-slate-100">
      <div className="text-xs font-semibold text-slate-500">{title}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
      {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
    </div>
  );

  return to ? (
    <Link to={to} className="block">
      {content}
    </Link>
  ) : (
    content
  );
}

function ListCard({ title, to, actionLabel, children }) {
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        {to ? (
          <Link
            to={to}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            {actionLabel || "View all"}
          </Link>
        ) : null}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function StatusBadge({ status, styles, label }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset",
        styles[status] || "bg-slate-50 text-slate-600 ring-slate-200",
      ].join(" ")}
    >
      {label || status || "-"}
    </span>
  );
}

function OverdueBadge() {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset",
        OVERDUE_STATUS_STYLE,
      ].join(" ")}
    >
      Overdue
    </span>
  );
}

export default function AdminDashboardPage() {
  const {
    data: processingQuotesData,
    isLoading: processingQuotesLoading,
    isError: processingQuotesError,
  } = useGetAdminQuotesQuery({ page: 1, status: "Processing" });
  const {
    data: quotedQuotesData,
    isLoading: quotedQuotesLoading,
    isError: quotedQuotesError,
  } = useGetAdminQuotesQuery({ page: 1, status: "Quoted" });

  const {
    data: processingOrdersData,
    isLoading: processingOrdersLoading,
    isError: processingOrdersError,
  } = useGetOrdersAdminQuery({ page: 1, status: "Processing" });
  const {
    data: shippingOrdersData,
    isLoading: shippingOrdersLoading,
    isError: shippingOrdersError,
  } = useGetOrdersAdminQuery({ page: 1, status: "Shipping" });

  const {
    data: invoiceSummaryData,
    isLoading: invoiceSummaryLoading,
    isError: invoiceSummaryError,
  } = useGetInvoicesAdminSummaryQuery();
  const {
    data: actionableInvoicesData,
    isLoading: actionableInvoicesLoading,
    isError: actionableInvoicesError,
  } = useGetInvoicesAdminQuery({ page: 1, unpaid: true, sort: "newest" });

  const {
    data: paymentsData,
    isLoading: paymentsLoading,
    isError: paymentsError,
  } = useGetPaymentsAdminQuery({ page: 1, sort: "newest" });

  const {
    data: usersData,
    isLoading: usersLoading,
    isError: usersError,
  } = useGetUsersAdminQuery({ page: 1, sort: "newest" });

  const openRequestsCount =
    (getTotalFromData(processingQuotesData) || 0) +
    (getTotalFromData(quotedQuotesData) || 0);
  const openRequestsLoading = processingQuotesLoading || quotedQuotesLoading;
  const openRequestsError = processingQuotesError || quotedQuotesError;

  const ordersInProgressCount =
    (getTotalFromData(processingOrdersData) || 0) +
    (getTotalFromData(shippingOrdersData) || 0);
  const ordersInProgressLoading =
    processingOrdersLoading || shippingOrdersLoading;
  const ordersInProgressError = processingOrdersError || shippingOrdersError;

  const invoiceSummary = invoiceSummaryData || {};
  const invoiceSummaryCurrency = invoiceSummary.currency || "AED";
  const invoiceSummaryFactor = invoiceSummary.minorUnitFactor || 100;
  const unpaidInvoicesCount = invoiceSummary.unpaidCount || 0;
  const overdueInvoicesCount = invoiceSummary.overdueCount || 0;
  const unpaidBalanceMinor = invoiceSummary.unpaidTotalMinor || 0;
  const overdueBalanceMinor = invoiceSummary.overdueTotalMinor || 0;
  const unpaidInvoicesHint = invoiceSummaryLoading
    ? "Loading..."
    : invoiceSummaryError
      ? "Unavailable"
      : `${formatCount(unpaidInvoicesCount)} invoice${
          unpaidInvoicesCount === 1 ? "" : "s"
        }`;
  const overdueInvoicesHint = invoiceSummaryLoading
    ? "Loading..."
    : invoiceSummaryError
      ? "Unavailable"
      : `${formatCount(overdueInvoicesCount)} overdue`;
  const paymentsCount = getTotalFromData(paymentsData) || 0;
  const usersCount = getTotalFromData(usersData) || 0;

  const actionableQuotesLoading = processingQuotesLoading || quotedQuotesLoading;
  const actionableQuotesError = processingQuotesError || quotedQuotesError;
  const actionableQuotes = useMemo(
    () =>
      sortByNewest([
        ...getRowsFromData(processingQuotesData),
        ...getRowsFromData(quotedQuotesData),
      ]).slice(0, 6),
    [processingQuotesData, quotedQuotesData]
  );

  const actionableOrdersLoading = processingOrdersLoading || shippingOrdersLoading;
  const actionableOrdersError = processingOrdersError || shippingOrdersError;
  const actionableOrders = useMemo(
    () =>
      sortByNewest([
        ...getRowsFromData(processingOrdersData),
        ...getRowsFromData(shippingOrdersData),
      ]).slice(0, 6),
    [processingOrdersData, shippingOrdersData]
  );

  const actionableInvoices = getRowsFromData(actionableInvoicesData).slice(0, 6);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-lg font-semibold text-slate-900">Dashboard</div>
          <div className="text-sm text-slate-500">
            Quick view of what needs attention right now.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-8">
        <StatCard
          title="Requests to review"
          value={buildStatValue(
            openRequestsLoading,
            openRequestsError,
            openRequestsCount,
          )}
          hint="Processing + quoted"
          to="/admin/requests"
        />
        <StatCard
          title="Orders in progress"
          value={buildStatValue(
            ordersInProgressLoading,
            ordersInProgressError,
            ordersInProgressCount,
          )}
          hint="Processing + shipping"
          to="/admin/orders"
        />
        <div className="col-span-2">
          <StatCard
            title="Unpaid balance"
            value={buildMoneyValue(
              invoiceSummaryLoading,
              invoiceSummaryError,
              unpaidBalanceMinor,
              invoiceSummaryCurrency,
              invoiceSummaryFactor,
            )}
            hint={unpaidInvoicesHint}
            to="/admin/invoices"
          />
        </div>
        <div className="col-span-2">
          <StatCard
            title="Overdue balance"
            value={buildMoneyValue(
              invoiceSummaryLoading,
              invoiceSummaryError,
              overdueBalanceMinor,
              invoiceSummaryCurrency,
              invoiceSummaryFactor,
            )}
            hint={overdueInvoicesHint}
            to="/admin/invoices"
          />
        </div>
        <StatCard
          title="Payments recorded"
          value={buildStatValue(paymentsLoading, paymentsError, paymentsCount)}
          hint="All time"
          to="/admin/payments"
        />
        <StatCard
          title="Total users"
          value={buildStatValue(usersLoading, usersError, usersCount)}
          hint="All accounts"
          to="/admin/users"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <ListCard title="Requests to review" to="/admin/requests">
          {actionableQuotesLoading ? (
            <div className="text-xs text-slate-500">Loading requests...</div>
          ) : actionableQuotesError ? (
            <div className="text-xs font-semibold text-rose-600">
              Unable to load requests.
            </div>
          ) : actionableQuotes.length === 0 ? (
            <div className="text-xs text-slate-500">
              No requests need action.
            </div>
          ) : (
            <ul className="space-y-2">
              {actionableQuotes.map((quote) => {
                const quoteId = quote?._id;
                const quoteNumber =
                  quote?.quoteNumber ||
                  (quoteId ? quoteId.slice(-6).toUpperCase() : "Quote");
                const userName = quote?.user?.name || "Unknown user";
                return (
                  <li key={quoteId}>
                    <Link
                      to={`/admin/requests/${quoteId}`}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 transition hover:bg-slate-50"
                    >
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          {quoteNumber}
                        </div>
                        <div className="text-xs text-slate-500">
                          {userName} - {formatDate(quote?.createdAt)}
                        </div>
                      </div>
                      <StatusBadge
                        status={quote?.status}
                        styles={QUOTE_STATUS_STYLES}
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </ListCard>

        <ListCard title="Orders in progress" to="/admin/orders">
          {actionableOrdersLoading ? (
            <div className="text-xs text-slate-500">Loading orders...</div>
          ) : actionableOrdersError ? (
            <div className="text-xs font-semibold text-rose-600">
              Unable to load orders.
            </div>
          ) : actionableOrders.length === 0 ? (
            <div className="text-xs text-slate-500">
              No orders need action.
            </div>
          ) : (
            <ul className="space-y-2">
              {actionableOrders.map((order) => {
                const orderId = order?._id;
                const orderNumber =
                  order?.orderNumber ||
                  (orderId ? orderId.slice(-6).toUpperCase() : "Order");
                const userName = order?.user?.name || "Unknown user";
                return (
                  <li key={orderId}>
                    <Link
                      to={`/admin/orders/${orderId}`}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 transition hover:bg-slate-50"
                    >
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          {orderNumber}
                        </div>
                        <div className="text-xs text-slate-500">
                          {userName} - {formatDate(order?.createdAt)}
                        </div>
                      </div>
                      <StatusBadge
                        status={order?.status}
                        styles={ORDER_STATUS_STYLES}
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </ListCard>

        <ListCard title="Invoices to collect" to="/admin/invoices">
          {actionableInvoicesLoading ? (
            <div className="text-xs text-slate-500">Loading invoices...</div>
          ) : actionableInvoicesError ? (
            <div className="text-xs font-semibold text-rose-600">
              Unable to load invoices.
            </div>
          ) : actionableInvoices.length === 0 ? (
            <div className="text-xs text-slate-500">
              No unpaid invoices right now.
            </div>
          ) : (
            <ul className="space-y-2">
              {actionableInvoices.map((inv) => {
                const invoiceId = inv?._id;
                const invoiceNumber =
                  inv?.invoiceNumber ||
                  (invoiceId ? invoiceId.slice(-6).toUpperCase() : "Invoice");
                const userName = inv?.user?.name || "Unknown user";
                const currency = inv?.currency || "AED";
                const factor = inv?.minorUnitFactor || 100;
                const showCancelled = inv?.status === "Cancelled";
                const overdue = isInvoiceOverdue(inv);
                return (
                  <li key={invoiceId}>
                    <Link
                      to={`/admin/invoices/${invoiceId}/edit`}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 transition hover:bg-slate-50"
                    >
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          {invoiceNumber}
                        </div>
                        <div className="text-xs text-slate-500">
                          {userName} -{" "}
                          {formatMoneyMinor(inv?.amountMinor, currency, factor)}
                        </div>
                      </div>
                      {showCancelled ? (
                        <StatusBadge
                          status="Cancelled"
                          styles={{ Cancelled: QUOTE_STATUS_STYLES.Cancelled }}
                        />
                      ) : (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <StatusBadge
                            status={inv?.paymentStatus || "Unpaid"}
                            label={formatPaymentStatusLabel(inv?.paymentStatus)}
                            styles={PAYMENT_STATUS_STYLES}
                          />
                          {overdue ? <OverdueBadge /> : null}
                        </div>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </ListCard>
      </div>
    </div>
  );
}
