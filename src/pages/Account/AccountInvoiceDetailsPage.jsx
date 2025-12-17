// src/pages/Account/AccountInvoiceDetailsPage.jsx
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

function money(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "AED" }).format(n);
}

function StatusBadge({ status }) {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset";
  const map = {
    Paid: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    "Partially Paid": "bg-amber-50 text-amber-800 ring-amber-200",
    Overdue: "bg-rose-50 text-rose-800 ring-rose-200",
    Unpaid: "bg-slate-50 text-slate-700 ring-slate-200",
  };
  return (
    <span className={`${base} ${map[status] || map.Unpaid}`}>
      {status || "Unpaid"}
    </span>
  );
}

export default function AccountInvoiceDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, isError, error, refetch, isFetching } =
    useGetInvoiceByIdQuery(id);

  // ✅ API returns: { success, message, data: invoice }
  const invoice = data?.data;
  const payments = Array.isArray(invoice?.payments) ? invoice.payments : [];

  const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
  const pdfUrl = `${apiBase}/invoices/${id}/pdf`;

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
          <button
            type="button"
            onClick={() => navigate("/account/invoices")}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
          >
            Back
          </button>

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

  if (!invoice) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate("/account/invoices")}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
          >
            Back
          </button>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-60"
          >
            {isFetching ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="text-sm font-semibold text-slate-900">Invoice not found</div>
          <p className="mt-1 text-sm text-slate-600">
            The invoice data is missing from the response.
          </p>
        </div>
      </div>
    );
  }

  // Best-effort computed display (backend returns virtuals if payments populated)
  const totalPaid =
    typeof invoice?.totalPaid === "number"
      ? invoice.totalPaid
      : payments
          .filter((p) => p?.status === "Received")
          .reduce((sum, p) => sum + (p.amount || 0), 0);

  const balanceDue =
    typeof invoice?.balanceDue === "number"
      ? invoice.balanceDue
      : Math.max((invoice?.amount || 0) - totalPaid, 0);

  const status = invoice?.status;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {invoice?.invoiceNumber || "Invoice details"}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <StatusBadge status={status} />
            <div className="text-sm text-slate-600">
              Created:{" "}
              <span className="text-slate-900">{formatDateTime(invoice?.createdAt)}</span>
            </div>
            {invoice?.dueDate ? (
              <div className="text-sm text-slate-600">
                Due: <span className="text-slate-900">{formatDate(invoice?.dueDate)}</span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
          >
            Back
          </button>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-60"
          >
            {isFetching ? "Refreshing…" : "Refresh"}
          </button>

          <a
            href={pdfUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            View PDF
          </a>
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="text-sm font-semibold text-slate-900">Summary</div>

        <div className="mt-3 grid gap-2 text-sm text-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Amount</span>
            <span className="font-semibold tabular-nums">{money(invoice?.amount)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Paid</span>
            <span className="font-semibold tabular-nums">{money(totalPaid)}</span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-slate-200">
            <span className="font-semibold text-slate-900">Balance due</span>
            <span className="font-semibold tabular-nums">{money(balanceDue)}</span>
          </div>

          {invoice?.order?.orderNumber ? (
            <div className="pt-3 text-sm text-slate-600">
              Order:{" "}
              <Link
                to="/account/orders"
                className="font-semibold text-slate-900 hover:underline"
              >
                {invoice.order.orderNumber}
              </Link>
            </div>
          ) : null}
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

        {payments.length === 0 ? (
          <div className="px-5 py-4 text-sm text-slate-600">
            No payments recorded yet.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-12 bg-slate-50 px-5 py-3 text-xs font-semibold text-slate-700">
              <div className="col-span-4">Date</div>
              <div className="col-span-3">Method</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-3 text-right">Amount</div>
            </div>

            {payments
              .slice()
              .sort((a, b) => new Date(a.paymentDate) - new Date(b.paymentDate))
              .map((p) => (
                <div
                  key={p._id}
                  className="grid grid-cols-12 items-start px-5 py-3 text-sm text-slate-800 border-t border-slate-200"
                >
                  <div className="col-span-4">
                    <div className="font-semibold text-slate-900">
                      {formatDateTime(p.paymentDate)}
                    </div>
                    {p.reference ? (
                      <div className="text-xs text-slate-500">Ref: {p.reference}</div>
                    ) : null}
                  </div>

                  <div className="col-span-3">
                    <div className="font-semibold text-slate-900">
                      {p.paymentMethod || "—"}
                    </div>
                    {p.paidTo ? (
                      <div className="text-xs text-slate-500">Paid to: {p.paidTo}</div>
                    ) : null}
                  </div>

                  <div className="col-span-2">
                    <div className="text-sm font-semibold text-slate-900">
                      {p.status || "—"}
                    </div>
                  </div>

                  <div className="col-span-3 text-right tabular-nums font-semibold text-slate-900">
                    {money(p.amount)}
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
