// src/pages/Account/AccountInvoiceDetailsPage.jsx
import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import Loader from "../../components/common/Loader";
import ErrorMessage from "../../components/common/ErrorMessage";

import { useGetInvoiceByIdQuery } from "../../features/invoices/invoicesApiSlice";

function formatDateTime(iso) {
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
    return String(major);
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
    "inline-flex items-center px-2.5 py-1 text-xs font-semibold ring-1 ring-inset leading-none";

  const map = {
    Paid: "rounded-full bg-emerald-50 text-emerald-800 ring-emerald-200",
    PartiallyPaid: "rounded-full bg-amber-50 text-amber-800 ring-amber-200",
    Unpaid: "rounded-full bg-rose-50 text-rose-800 ring-rose-200",
  };

  const label =
    status === "PartiallyPaid"
      ? "Partially paid"
      : status === "Paid"
      ? "Paid"
      : "Unpaid";

  return <span className={`${base} ${map[status] || map.Unpaid}`}>{label}</span>;
}

function CancelledBadge() {
  const base =
    "inline-flex items-center px-2.5 py-1 text-xs font-semibold ring-1 ring-inset leading-none";
  return (
    <span className={`${base} rounded-full bg-rose-50 text-rose-800 ring-rose-200`}>
      Cancelled
    </span>
  );
}

function MetaItem({ label, value, valueClassName = "" }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-semibold text-slate-600">{label}</div>
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

  const invoice = data;
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

  const pdfComingSoon = true;

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
        {/* Back outside */}
        <div>
          <button
            type="button"
            onClick={() => navigate("/account/invoices")}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
          >
            Back
          </button>
        </div>

        <ErrorMessage error={error} />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="space-y-4">
        {/* Back outside */}
        <div>
          <button
            type="button"
            onClick={() => navigate("/account/invoices")}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
          >
            Back
          </button>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="text-sm font-semibold text-slate-900">
            Invoice not found
          </div>
          <p className="mt-1 text-sm text-slate-600">
            The invoice data is missing from the response.
          </p>
        </div>
      </div>
    );
  }

  const totalPaidMinor =
    typeof invoice?.paidTotalMinor === "number" ? invoice.paidTotalMinor : 0;

  const balanceDueMinor =
    typeof invoice?.balanceDueMinor === "number"
      ? invoice.balanceDueMinor
      : Math.max((invoice?.amountMinor || 0) - totalPaidMinor, 0);

  const paymentStatus = invoice?.paymentStatus;

  const orderId = invoice?.order?._id || invoice?.order;
  const orderNumber = invoice?.order?.orderNumber;

  const overdue = isOverdue(invoice);
  const cancelled = invoice?.status === "Cancelled";

  return (
    <div className="space-y-6">
      {/* Back OUTSIDE the invoice document area */}
      <div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
        >
          Back
        </button>
      </div>

      {/* Invoice "document" panel (Header + Meta + Summary together) */}
      <div
        className={[
          "relative overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200",
          overdue ? "border-l-4 border-rose-500" : "",
        ].join(" ")}
      >
        <div className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold text-slate-900">
                {invoice?.invoiceNumber || "Invoice details"}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusBadge status={paymentStatus} />
                {cancelled ? <CancelledBadge /> : null}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {pdfComingSoon ? (
                <button
                  type="button"
                  disabled
                  className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 cursor-not-allowed"
                >
                  PDF (soon)
                </button>
              ) : (
                <a
                  href={`/api/invoices/${id}/pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  View PDF
                </a>
              )}
            </div>
          </div>

          {/* Meta */}
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <MetaItem label="Created" value={formatDateTime(invoice?.createdAt)} />

            <MetaItem
              label="Due date"
              value={invoice?.dueDate ? formatDate(invoice?.dueDate) : "No due date"}
              valueClassName={
                overdue ? "text-rose-700 font-semibold" : "text-slate-900"
              }
            />

            <MetaItem
              label="Order"
              value={
                orderId && orderNumber ? (
                  <Link
                    to={`/account/orders/${orderId}`}
                    className="font-semibold text-slate-900 hover:underline"
                  >
                    {orderNumber}
                  </Link>
                ) : (
                  "—"
                )
              }
            />
          </div>
        </div>

        {/* Summary merged into same panel */}
        <div className="border-t border-slate-200 p-5">
          <div className="text-sm font-semibold text-slate-900">Summary</div>

          <div className="mt-3 grid gap-2 text-sm text-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Amount</span>
              <span className="font-semibold tabular-nums">
                {moneyMinor(invoice?.amountMinor, currency, factor)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-600">Paid</span>
              <span className="font-semibold tabular-nums">
                {moneyMinor(totalPaidMinor, currency, factor)}
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <span className="font-semibold text-slate-900">Balance due</span>
              <span className="font-semibold tabular-nums">
                {moneyMinor(balanceDueMinor, currency, factor)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Payments */}
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <div className="text-sm font-semibold text-slate-900">Payments</div>
          <div className="mt-1 text-xs text-slate-500">
            Payments are shown only inside invoice details.
          </div>
        </div>

        {paymentsSorted.length === 0 ? (
          <div className="px-5 py-4 text-sm text-slate-600">
            No payments recorded yet.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-12 bg-slate-50 px-5 py-3 text-xs font-semibold text-slate-700">
              <div className="col-span-4">Date</div>
              <div className="col-span-4">Method</div>
              <div className="col-span-4 text-right">Amount</div>
            </div>

            {paymentsSorted.map((p) => (
              <div
                key={p._id}
                className="grid grid-cols-12 items-start px-5 py-3 text-sm text-slate-800 border-t border-slate-200"
              >
                <div className="col-span-4">
                  <div className="font-semibold text-slate-900">
                    {formatDateTime(p.paymentDate || p.createdAt)}
                  </div>
                  {p.reference ? (
                    <div className="text-xs text-slate-500">Ref: {p.reference}</div>
                  ) : null}
                </div>

                <div className="col-span-4">
                  <div className="font-semibold text-slate-900">
                    {p.paymentMethod || "—"}
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
          </>
        )}
      </div>
    </div>
  );
}
