import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiChevronDown, FiChevronUp, FiDownload } from "react-icons/fi";

import Loader from "../../components/common/Loader";
import ErrorMessage from "../../components/common/ErrorMessage";

import {
  useGetInvoiceByIdQuery,
  useLazyGetInvoicePdfQuery,
} from "../../features/invoices/invoicesApiSlice";

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
    return String(major);
  }
}

function isOverdue(inv) {
  if (!inv || inv.status === "Cancelled") return false;
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

function MetaCard({ label, value, valueClassName = "" }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
        {label}
      </div>
      <div className={`mt-1 text-sm font-semibold ${valueClassName}`}>
        {value}
      </div>
    </div>
  );
}

export default function AccountInvoiceDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, isError, error } = useGetInvoiceByIdQuery(id);
  const [getInvoicePdf, { isFetching: isPdfLoading }] =
    useLazyGetInvoicePdfQuery();

  const invoice = data?.data ?? data;
  const payments = Array.isArray(invoice?.payments) ? invoice.payments : [];

  const paymentsSorted = useMemo(() => {
    return [...payments].sort(
      (a, b) =>
        new Date(b.paymentDate || b.createdAt) -
        new Date(a.paymentDate || a.createdAt)
    );
  }, [payments]);

  const currency = invoice?.currency || "AED";
  const factor = invoice?.minorUnitFactor || 100;

  const paidTotalMinor =
    typeof invoice?.paidTotalMinor === "number" ? invoice.paidTotalMinor : 0;
  const balanceDueMinor =
    typeof invoice?.balanceDueMinor === "number"
      ? invoice.balanceDueMinor
      : Math.max((invoice?.amountMinor || 0) - paidTotalMinor, 0);

  const overdue = isOverdue(invoice);
  const cancelled = invoice?.status === "Cancelled";

  const orderItems = Array.isArray(invoice?.order?.orderItems)
    ? invoice.order.orderItems
    : [];
  const [itemsOpen, setItemsOpen] = useState(false);

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

  if (!invoice) {
    return (
      <div className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-sm shadow-slate-200/40">
        <div className="text-sm font-semibold text-slate-900">
          Invoice not found
        </div>
        <p className="mt-2 text-sm text-slate-600">
          The invoice data is missing from the response.
        </p>
      </div>
    );
  }

  async function handlePdfDownload() {
    if (!id) return;
    try {
      const blob = await getInvoicePdf(id).unwrap();
      const fileName = invoice?.invoiceNumber
        ? `invoice-${invoice.invoiceNumber}.pdf`
        : `invoice-${id}.pdf`;
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
    } catch (err) {
      console.error("Failed to download invoice PDF.", err);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="h-8 w-1 rounded-full bg-violet-500" aria-hidden="true" />
            <div>
              <div className="text-2xl font-semibold text-slate-900">
                Invoice details
              </div>
              <div className="mt-1 text-sm text-slate-600">
                All payment details and linked order information.
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePdfDownload}
              disabled={isPdfLoading}
              className={[
                "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-semibold",
                isPdfLoading
                  ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
              ].join(" ")}
            >
              <FiDownload className="h-4 w-4" />
              {isPdfLoading ? "Preparing PDF" : "PDF Invoice"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/account/invoices")}
              className="inline-flex items-center gap-2 rounded-2xl border border-violet-200 bg-white px-3 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50"
            >
              <FiArrowLeft className="h-4 w-4" />
              Back to invoices
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-6">
          <div className="grid gap-3 md:grid-cols-3">
            <MetaCard
              label="Invoice number"
              value={
                invoice?.invoiceNumber || `Invoice ${invoice?._id?.slice(-6)}`
              }
            />
            <MetaCard
              label="Due date"
              value={invoice.dueDate ? formatDate(invoice.dueDate) : "No due date"}
              valueClassName={overdue ? "text-rose-600" : "text-slate-900"}
            />
            <MetaCard
              label="Status"
              value={
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={invoice?.paymentStatus} />
                  {overdue ? <OverdueBadge /> : null}
                  {cancelled ? <CancelledBadge /> : null}
                </div>
              }
            />
          </div>

          <div className="border-t border-slate-200 pt-6">
            <div className="grid gap-3 md:grid-cols-3">
              <MetaCard
                label="Amount"
                value={moneyMinor(invoice.amountMinor, currency, factor)}
              />
              <MetaCard
                label="Paid"
                value={moneyMinor(paidTotalMinor, currency, factor)}
              />
              <MetaCard
                label="Balance"
                value={moneyMinor(balanceDueMinor, currency, factor)}
              />
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6">
            <button
              type="button"
              onClick={() => setItemsOpen((prev) => !prev)}
              disabled={orderItems.length === 0}
              className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-left transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  Ordered items
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {orderItems.length} item{orderItems.length === 1 ? "" : "s"}
                </div>
              </div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                {itemsOpen ? "Hide items" : "Show items"}
                {itemsOpen ? (
                  <FiChevronUp className="h-4 w-4" />
                ) : (
                  <FiChevronDown className="h-4 w-4" />
                )}
              </div>
            </button>

            {itemsOpen ? (
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="grid grid-cols-12 bg-slate-50 px-5 py-3 text-xs font-semibold text-slate-600">
                  <div className="col-span-9">Product</div>
                  <div className="col-span-3 text-right">Qty</div>
                </div>

                {orderItems.length === 0 ? (
                  <div className="px-5 py-4 text-sm text-slate-600">
                    No items found.
                  </div>
                ) : (
                  orderItems.map((it, idx) => {
                    const name =
                      it?.product?.name ||
                      (typeof it?.product === "string" ? it.product : "") ||
                      "Unnamed item";
                    const qty = it?.qty ?? 0;

                    return (
                      <div
                        key={`${invoice?._id || "invoice"}-${idx}`}
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
            ) : null}
          </div>

          <div className="border-t border-slate-200 pt-6">
            <div className="text-sm font-semibold text-slate-900">Payments</div>
            <div className="mt-1 text-xs text-slate-500">
              Recent Added Payments.
            </div>

            {paymentsSorted.length === 0 ? (
              <div className="mt-4 text-sm text-slate-600">
                No payments recorded yet.
              </div>
            ) : (
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="grid grid-cols-12 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600">
                  <div className="col-span-4">Date</div>
                  <div className="col-span-4">Method</div>
                  <div className="col-span-4 text-right">Amount</div>
                </div>
                {paymentsSorted.map((p) => (
                  <div
                    key={p._id}
                    className="grid grid-cols-12 items-start border-t border-slate-200 px-4 py-3 text-sm text-slate-800"
                  >
                    <div className="col-span-4">
                      <div className="font-semibold text-slate-900">
                        {formatDateTime(p.paymentDate || p.createdAt)}
                      </div>
                      {p.reference ? (
                        <div className="text-xs text-slate-500">
                          Ref: {p.reference}
                        </div>
                      ) : null}
                    </div>
                    <div className="col-span-4">
                      <div className="font-semibold text-slate-900">
                        {p.paymentMethod || "-"}
                      </div>
                      {p.receivedBy ? (
                        <div className="text-xs text-slate-500">
                          Received by: {p.receivedBy}
                        </div>
                      ) : null}
                    </div>
                    <div className="col-span-4 text-right tabular-nums font-semibold text-slate-900">
                      {moneyMinor(p.amountMinor, currency, factor)}
                    </div>
                    {p.note ? (
                      <div className="col-span-12 mt-2 text-xs text-slate-600 whitespace-pre-wrap">
                        {p.note}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
