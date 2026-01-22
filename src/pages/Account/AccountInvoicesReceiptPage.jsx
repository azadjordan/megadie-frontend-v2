import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiPrinter } from "react-icons/fi";

import Loader from "../../components/common/Loader";
import ErrorMessage from "../../components/common/ErrorMessage";
import Pagination from "../../components/common/Pagination";

import {
  useGetMyInvoicesQuery,
  useLazyGetInvoicePdfQuery,
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

function paymentLabel(status) {
  if (status === "PartiallyPaid") return "Partially paid";
  if (status === "Paid") return "Paid";
  return "Unpaid";
}

function StatusDot({ tone = "neutral", label }) {
  const dotMap = {
    paid: "bg-emerald-500",
    partial: "bg-amber-500",
    unpaid: "bg-rose-500",
    overdue: "bg-rose-500",
    neutral: "bg-slate-400",
  };
  const textMap = {
    paid: "text-emerald-700",
    partial: "text-amber-700",
    unpaid: "text-rose-700",
    overdue: "text-rose-700",
    neutral: "text-slate-600",
  };

  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${textMap[tone] || textMap.neutral}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dotMap[tone] || dotMap.neutral}`} />
      <span>{label}</span>
    </span>
  );
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

export default function AccountInvoicesReceiptPage() {
  const [page, setPage] = useState(1);
  const [unpaidOnly, setUnpaidOnly] = useState(false);
  const [pdfId, setPdfId] = useState(null);

  const q = useGetMyInvoicesQuery({ page, unpaid: unpaidOnly, limit: 4 });
  const [getInvoicePdf, { isFetching: isPdfLoading }] =
    useLazyGetInvoicePdfQuery();

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

  const onPdf = async (inv) => {
    if (!inv?._id) return;
    try {
      setPdfId(inv._id);
      const blob = await getInvoicePdf(inv._id).unwrap();
      const fileName = inv.invoiceNumber
        ? `invoice-${inv.invoiceNumber}.pdf`
        : `invoice-${inv._id}.pdf`;
      const url = window.URL.createObjectURL(blob);
      const newTab = window.open(url, "_blank", "noopener,noreferrer");

      if (!newTab) {
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
      }

      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch {
      // Fail silently; invoices list remains visible.
    } finally {
      setPdfId(null);
    }
  };

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
                      : "border-slate-200 text-slate-500 hover:bg-slate-50",
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
                      : "border-slate-200 text-slate-500 hover:bg-slate-50",
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
              className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              View orders
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {invoices.map((inv) => {
              const currency = inv.currency || "AED";
              const factor = inv.minorUnitFactor || 100;
              const overdue = isOverdue(inv);
              const cancelled = inv.status === "Cancelled";
              const paidMinor =
                typeof inv.paidTotalMinor === "number" ? inv.paidTotalMinor : 0;
              const balanceMinor =
                typeof inv.balanceDueMinor === "number"
                  ? inv.balanceDueMinor
                  : Math.max((inv.amountMinor || 0) - paidMinor, 0);
              const orderItems = Array.isArray(inv.order?.orderItems)
                ? inv.order.orderItems
                : [];

              return (
                <div
                  key={inv._id}
                  className="w-full rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    <span>{cancelled ? "Cancelled" : "Issued"}</span>
                    {!cancelled ? <span>{formatDate(inv.createdAt)}</span> : <span />}
                  </div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">
                    {inv.invoiceNumber || `Invoice ${inv._id.slice(-6)}`}
                  </div>

                  <div className="mt-2 flex items-center justify-between rounded-xl px-2 py-1">
                    <div className="flex flex-wrap items-center gap-3">
                      {inv.paymentStatus === "Paid" ? (
                        <StatusDot tone="paid" label={paymentLabel(inv.paymentStatus)} />
                      ) : inv.paymentStatus === "PartiallyPaid" ? (
                        <StatusDot
                          tone="partial"
                          label={paymentLabel(inv.paymentStatus)}
                        />
                      ) : (
                        <StatusDot tone="unpaid" label={paymentLabel(inv.paymentStatus)} />
                      )}
                      {overdue ? <StatusDot tone="overdue" label="Overdue" /> : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => onPdf(inv)}
                      disabled={pdfId === inv._id || isPdfLoading}
                      className={[
                        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] transition",
                        pdfId === inv._id || isPdfLoading
                          ? "cursor-not-allowed border-slate-200 text-slate-300"
                          : "border-slate-300 text-slate-600 hover:bg-slate-50",
                      ].join(" ")}
                    >
                      <FiPrinter className="h-3 w-3" />
                      {pdfId === inv._id ? "PDF.." : "PDF"}
                    </button>
                  </div>

                  <div className="mt-3 border-t border-dashed border-slate-200 pt-3 text-xs">
                    <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                      <span>Items</span>
                      <span>Qty</span>
                    </div>
                    {orderItems.length ? (
                      <div className="mt-2 space-y-1">
                        {orderItems.map((item, idx) => {
                          const name =
                            item?.product?.name ||
                            item?.productName ||
                            item?.sku ||
                            (typeof item?.product === "string" ? item.product : "Item");
                          const qty = Number(item?.qty) || 0;
                          const rowTone =
                            idx % 2 === 0 ? "bg-slate-100/80" : "bg-transparent";

                          return (
                            <div
                              key={`${inv._id}-item-${idx}`}
                              className={`-mx-4 flex items-start justify-between gap-2 px-4 py-1.5 ${rowTone}`}
                            >
                              <span className="min-w-0 flex-1 text-[11px] text-slate-700 line-clamp-2">
                                {name}
                              </span>
                              <span className="tabular-nums text-[11px] text-slate-500">
                                {qty}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="mt-2 text-[11px] text-slate-500">
                        No items listed.
                      </div>
                    )}
                  </div>

                  <div className="mt-3 border-t border-dashed border-slate-200 pt-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Total</span>
                      <span className="font-semibold text-slate-900">
                        {moneyMinor(inv.amountMinor, currency, factor)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-slate-500">Paid</span>
                      <span className="text-slate-700">
                        {moneyMinor(paidMinor, currency, factor)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-slate-500">Balance</span>
                      <span className="font-semibold text-slate-900">
                        {moneyMinor(balanceMinor, currency, factor)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 border-t border-dashed border-slate-200 pt-3 text-xs">
                    <div className="text-slate-500">
                      Due Date:{" "}
                      <span
                        className={
                          overdue ? "text-rose-600" : "text-slate-700"
                        }
                      >
                        {inv.dueDate ? formatDate(inv.dueDate) : "No due date"}
                      </span>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>

        </>
      )}
    </div>
  );
}
