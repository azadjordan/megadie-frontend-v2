import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FiChevronLeft } from "react-icons/fi";
import { toast } from "react-toastify";

import Loader from "../../components/common/Loader";
import ErrorMessage from "../../components/common/ErrorMessage";

import {
  useDeleteInvoiceByAdminMutation,
  useGetInvoiceByIdQuery,
  useUpdateInvoiceByAdminMutation,
} from "../../features/invoices/invoicesApiSlice";
import { useAddPaymentToInvoiceMutation } from "../../features/payments/paymentsApiSlice";
import AddPaymentModal from "../../components/admin/AddPaymentModal";

function formatDateTime(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return iso;
  }
}

function moneyMinor(amountMinor, currency = "AED", factor = 100) {
  if (typeof amountMinor !== "number" || !Number.isFinite(amountMinor))
    return "";

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

function toDateInputValue(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDateTimeLocalValue(input) {
  if (!input) return "";
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatAmountInput(minor, factor = 100) {
  const f = typeof factor === "number" && factor > 0 ? factor : 100;
  const major = Number(minor) / f;
  if (!Number.isFinite(major)) return "";
  return major.toFixed(2);
}

function buildPaymentDefaults(inv) {
  const factor = inv?.minorUnitFactor || 100;
  const balanceMinor = inv ? balanceDueMinor(inv) : 0;
  const amount = balanceMinor > 0 ? formatAmountInput(balanceMinor, factor) : "";

  return {
    amount,
    method: "",
    receivedBy: "",
    date: toDateTimeLocalValue(new Date()),
    reference: "",
    note: "",
  };
}

function balanceDueMinor(inv) {
  if (!inv) return 0;
  if (typeof inv.balanceDueMinor === "number") return inv.balanceDueMinor;
  const amount = typeof inv.amountMinor === "number" ? inv.amountMinor : 0;
  const paid = typeof inv.paidTotalMinor === "number" ? inv.paidTotalMinor : 0;
  return Math.max(amount - paid, 0);
}

function isOverdue(inv) {
  if (!inv || inv.status === "Cancelled") return false;
  const due = inv.dueDate ? Date.parse(inv.dueDate) : NaN;
  if (!Number.isFinite(due)) return false;
  if (inv.paymentStatus === "Paid") return false;
  return balanceDueMinor(inv) > 0 && due < Date.now();
}

function PaymentStatusBadge({ status }) {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold";

  const map = {
    Paid: "bg-emerald-50 text-emerald-800",
    PartiallyPaid: "bg-amber-50 text-amber-800",
    Unpaid: "bg-rose-50 text-rose-800",
  };

  const label =
    status === "PartiallyPaid"
      ? "Partially paid"
      : status === "Paid"
      ? "Paid"
      : "Unpaid";

  return <span className={`${base} ${map[status] || map.Unpaid}`}>{label}</span>;
}

function SmallStatusPill({ status }) {
  const label = status === "Cancelled" ? "Cancelled" : "Issued";
  const cls =
    status === "Cancelled"
      ? "bg-rose-50 text-rose-800"
      : "bg-emerald-50 text-emerald-800";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${cls}`}
    >
      {label}
    </span>
  );
}

function OverdueBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-800">
      Overdue
    </span>
  );
}

function friendlyApiError(err) {
  const msg =
    err?.data?.message || err?.error || err?.message || "Something went wrong.";
  return String(msg);
}

export default function AdminInvoiceEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    data: invoiceResult,
    isLoading,
    isError,
    error,
    isFetching,
  } = useGetInvoiceByIdQuery(id, { skip: !id });

  const invoice = invoiceResult?.data ?? invoiceResult;

  const [updateInvoiceByAdmin, { isLoading: isSaving, error: saveError }] =
    useUpdateInvoiceByAdminMutation();
  const [deleteInvoiceByAdmin, { isLoading: isDeleting }] =
    useDeleteInvoiceByAdminMutation();
  const [
    addPaymentToInvoice,
    { isLoading: isAddingPayment, error: addPaymentError },
  ] = useAddPaymentToInvoiceMutation();

  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("Issued");
  const [adminNote, setAdminNote] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [saved, setSaved] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState(() =>
    buildPaymentDefaults(invoice)
  );
  const [paymentFieldErrors, setPaymentFieldErrors] = useState({});

  useEffect(() => {
    if (!invoice) return;
    setDueDate(toDateInputValue(invoice.dueDate));
    setStatus(invoice.status || "Issued");
    setAdminNote(invoice.adminNote || "");
    setCancelReason(invoice.cancelReason || "");
    setSaved(false);
    setShowAddPayment(false);
    setPaymentForm(buildPaymentDefaults(invoice));
    setPaymentFieldErrors({});
  }, [invoice?._id, invoice?.id, invoice?.updatedAt]);

  const payments = Array.isArray(invoice?.payments) ? invoice.payments : [];
  const paymentsSorted = useMemo(() => {
    return [...payments].sort(
      (a, b) =>
        new Date(b.paymentDate || b.createdAt) -
        new Date(a.paymentDate || a.createdAt)
    );
  }, [payments]);

  const meta = useMemo(() => {
    if (!invoice) return null;
    const currency = invoice.currency || "AED";
    const factor = invoice.minorUnitFactor || 100;
    const balance = balanceDueMinor(invoice);
    return {
      currency,
      factor,
      balance,
    };
  }, [invoice]);

  const source = invoice?.source || "Order";
  const isManual = source === "Manual" || !invoice?.order;
  const manualItems = Array.isArray(invoice?.invoiceItems)
    ? invoice.invoiceItems
    : [];

  const overdue = isOverdue(invoice);
  const canAddPayment =
    invoice?.status !== "Cancelled" && invoice?.paymentStatus !== "Paid";
  const isCancelled = invoice?.status === "Cancelled";
  const canDelete = isCancelled && !isDeleting;
  const user = invoice?.user && typeof invoice.user === "object" ? invoice.user : null;
  const userId =
    typeof invoice?.user === "string"
      ? invoice.user
      : String(invoice?.user?._id || invoice?.user?.id || "");

  const updatePaymentForm = (field, value) => {
    setPaymentForm((prev) => ({ ...prev, [field]: value }));
    setPaymentFieldErrors((prev) => {
      if (!prev?.[field]) return prev;
      const { [field]: _removed, ...rest } = prev;
      return rest;
    });
  };

  const openAddPayment = () => {
    if (!canAddPayment) return;
    setPaymentForm(buildPaymentDefaults(invoice));
    setPaymentFieldErrors({});
    setShowAddPayment(true);
  };

  const closeAddPayment = () => {
    setShowAddPayment(false);
    setPaymentFieldErrors({});
  };

  const onDeleteInvoice = async () => {
    if (!invoice?._id && !invoice?.id) return;
    if (invoice?.status !== "Cancelled") return;
    const detail = invoice.order
      ? "Invoice and linked payments deleted AND Order unlinked."
      : "Invoice and linked payments deleted.";
    const ok = window.confirm(`Delete this cancelled invoice? ${detail}`);
    if (!ok) return;

    try {
      const res = await deleteInvoiceByAdmin(invoice._id || invoice.id).unwrap();
      toast.success(res?.message || detail);
      if (res?.quoteUnlinked) {
        toast.info("Related quote unlocked and can be edited now.");
      }
      navigate("/admin/invoices");
    } catch (err) {
      toast.error(friendlyApiError(err));
    }
  };

  const onSave = async () => {
    if (!invoice?._id && !invoice?.id) return;
    setSaved(false);

    const payload = {
      id: invoice._id || invoice.id,
      dueDate: dueDate || null,
      adminNote,
      status,
      cancelReason: status === "Cancelled" ? cancelReason : "",
    };

    try {
      await updateInvoiceByAdmin(payload).unwrap();
      setSaved(true);
    } catch {
      // ErrorMessage handles it
    }
  };

  const onAddPayment = async () => {
    const invoiceId = invoice?._id || invoice?.id;
    if (!invoiceId) return;

    const nextErrors = {};

    const amountValue = Number(paymentForm.amount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      nextErrors.amount = "Enter a positive amount.";
    }

    if (!paymentForm.method) {
      nextErrors.method = "Required";
    }

    if (!paymentForm.receivedBy.trim()) {
      nextErrors.receivedBy = "Required";
    }

    let paymentDateValue;
    if (paymentForm.date) {
      const parsed = new Date(paymentForm.date);
      if (Number.isNaN(parsed.getTime())) {
        nextErrors.date = "Invalid date.";
      } else {
        paymentDateValue = parsed.toISOString();
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setPaymentFieldErrors(nextErrors);
      return;
    }

    setPaymentFieldErrors({});

    try {
      await addPaymentToInvoice({
        invoiceId,
        amount: amountValue,
        paymentMethod: paymentForm.method,
        receivedBy: paymentForm.receivedBy.trim(),
        paymentDate: paymentDateValue,
        reference: paymentForm.reference.trim() || undefined,
        note: paymentForm.note.trim() || undefined,
      }).unwrap();

      setShowAddPayment(false);
      setPaymentForm(buildPaymentDefaults(invoice));
      setPaymentFieldErrors({});
    } catch {
      // ErrorMessage handles it
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
        <Loader />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
        <ErrorMessage error={error} />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
        <div className="text-sm font-semibold text-slate-900">
          Invoice not found
        </div>
        <div className="mt-1 text-sm text-slate-500">
          The invoice data is missing from the response.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AddPaymentModal
        open={showAddPayment}
        onClose={closeAddPayment}
        onSubmit={onAddPayment}
        isSaving={isAddingPayment}
        error={addPaymentError}
        form={paymentForm}
        onFieldChange={updatePaymentForm}
        fieldErrors={paymentFieldErrors}
      />

      <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => navigate("/admin/invoices")}
              className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900"
            >
              <FiChevronLeft className="h-4 w-4" />
              Back to invoices
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <div className="text-lg font-semibold text-slate-900">
                Edit Invoice
              </div>
              <span className="text-xs text-slate-400">/</span>
              <div className="text-sm font-semibold text-slate-700">
                {invoice.invoiceNumber || invoice._id}
              </div>
              <PaymentStatusBadge status={invoice.paymentStatus} />
              {overdue ? <OverdueBadge /> : null}
              {isFetching ? (
                <span className="text-xs text-slate-400">Refreshing...</span>
              ) : null}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <SmallStatusPill status={invoice.status} />
              {invoice.status === "Cancelled" ? null : (
                <span>{formatDateTime(invoice.createdAt)}</span>
              )}
            </div>
          </div>

          <button
            type="button"
            disabled={!canDelete}
            onClick={onDeleteInvoice}
            title={
              isCancelled
                ? "Delete invoice"
                : "Only cancelled invoices can be deleted"
            }
            className={[
              "rounded-xl px-4 py-2 text-xs font-semibold ring-1 transition",
              canDelete
                ? "bg-rose-50 text-rose-700 ring-rose-200 hover:bg-rose-100"
                : "cursor-not-allowed bg-slate-100 text-slate-400 ring-slate-200",
            ].join(" ")}
          >
            {isDeleting ? "Deleting..." : "Delete Invoice"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
            <div className="text-sm font-semibold text-slate-900">
              Invoice settings
            </div>
            <div className="mt-1 text-sm text-slate-500">
              Update due date, status, and internal notes.
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Due date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                />
                <div className="mt-1 text-xs text-slate-500">
                  Leave empty to clear.
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                >
                  <option value="Issued">Issued</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
                <div className="mt-1 text-xs text-slate-500">
                  Cancelled invoices can be deleted.
                </div>
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Admin note
              </label>
              <textarea
                rows={4}
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Internal notes for the team"
                className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              />
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Cancel reason
              </label>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Optional reason when cancelling"
                disabled={status !== "Cancelled"}
                className={[
                  "w-full rounded-xl px-3 py-2 text-sm ring-1",
                  status === "Cancelled"
                    ? "bg-white text-slate-900 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                    : "cursor-not-allowed bg-slate-50 text-slate-400 ring-slate-200",
                ].join(" ")}
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onSave}
                disabled={isSaving}
                className={[
                  "rounded-xl px-4 py-2 text-sm font-semibold text-white",
                  isSaving
                    ? "cursor-not-allowed bg-slate-300"
                    : "bg-slate-900 hover:bg-slate-800",
                ].join(" ")}
              >
                {isSaving ? "Saving..." : "Save changes"}
              </button>

              <Link
                to="/admin/invoices"
                className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
              >
                Cancel
              </Link>

              {saved ? (
                <span className="text-xs font-semibold text-emerald-700">
                  Saved.
                </span>
              ) : null}
            </div>

            {saveError ? (
              <div className="mt-3">
                <ErrorMessage error={saveError} />
              </div>
            ) : null}
          </div>

          {isManual ? (
            <div className="rounded-2xl bg-white ring-1 ring-slate-200 overflow-hidden">
              <div className="border-b border-slate-200 px-4 py-3">
                <div className="text-sm font-semibold text-slate-900">
                  Manual items
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  These items are stored directly on the invoice.
                </div>
              </div>
              {manualItems.length === 0 ? (
                <div className="px-4 py-4 text-sm text-slate-600">
                  No manual items recorded.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-12 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700">
                    <div className="col-span-7">Description</div>
                    <div className="col-span-2 text-right">Qty</div>
                    <div className="col-span-3 text-right">Line total</div>
                  </div>
                  {manualItems.map((item, idx) => (
                    <div
                      key={`${invoice._id}-manual-${idx}`}
                      className="grid grid-cols-12 items-start px-4 py-3 text-sm text-slate-800 border-t border-slate-200"
                    >
                      <div className="col-span-7">
                        <div className="font-semibold text-slate-900">
                          {item.description || "Item"}
                        </div>
                        {typeof item.unitPriceMinor === "number" ? (
                          <div className="text-xs text-slate-500">
                            Unit price:{" "}
                            {moneyMinor(
                              item.unitPriceMinor,
                              meta?.currency,
                              meta?.factor
                            )}
                          </div>
                        ) : null}
                      </div>
                      <div className="col-span-2 text-right tabular-nums">
                        {Number(item.qty) || 0}
                      </div>
                      <div className="col-span-3 text-right tabular-nums font-semibold text-slate-900">
                        {moneyMinor(
                          item.lineTotalMinor ?? 0,
                          meta?.currency,
                          meta?.factor
                        )}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          ) : null}

          <div className="rounded-2xl bg-white ring-1 ring-slate-200 overflow-hidden">
            <div className="border-b border-slate-200 px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Payments
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Linked payments from the invoice record.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={openAddPayment}
                  disabled={!canAddPayment}
                  className={[
                    "rounded-xl px-3 py-2 text-xs font-semibold ring-1 transition",
                    canAddPayment
                      ? "bg-slate-900 text-white ring-slate-900 hover:bg-slate-800"
                      : "cursor-not-allowed bg-slate-100 text-slate-400 ring-slate-200",
                  ].join(" ")}
                >
                  Add Payment
                </button>
              </div>
            </div>

            {paymentsSorted.length === 0 ? (
              <div className="px-4 py-4 text-sm text-slate-600">
                No payments recorded yet.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-12 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700">
                  <div className="col-span-4">Date</div>
                  <div className="col-span-5">Method</div>
                  <div className="col-span-3 text-right">Amount</div>
                </div>

                {paymentsSorted.map((p) => (
                  <div
                    key={p._id}
                    className="grid grid-cols-12 items-start px-4 py-3 text-sm text-slate-800 border-t border-slate-200"
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

                    <div className="col-span-5">
                      <div className="font-semibold text-slate-900">
                        {p.paymentMethod || ""}
                      </div>
                      {p.receivedBy ? (
                        <div className="text-xs text-slate-500">
                          Received by: {p.receivedBy}
                        </div>
                      ) : null}
                    </div>

                    <div className="col-span-3 text-right tabular-nums font-semibold text-slate-900">
                      {moneyMinor(p.amountMinor, meta?.currency, meta?.factor)}
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

        <aside className="space-y-3">
          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold text-slate-600">Customer</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">
              {user?.name || "Customer"}
            </div>
            <div className="text-xs text-slate-500">{user?.email || ""}</div>
            {user?.phoneNumber ? (
              <div className="text-xs text-slate-500">{user.phoneNumber}</div>
            ) : null}
            {userId ? (
              <div className="mt-2 text-xs text-slate-400">ID: {userId}</div>
            ) : null}
          </div>

          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold text-slate-600">
              {isManual ? "Source" : "Order"}
            </div>
            {isManual ? (
              <div className="mt-1 text-sm font-semibold text-slate-900">
                Manual invoice
              </div>
            ) : (
              <>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {invoice.order?.orderNumber || invoice.order || ""}
                </div>
                <div className="text-xs text-slate-500">
                  Status: {invoice.order?.status || "Unknown"}
                </div>
              </>
            )}
          </div>

          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold text-slate-600">Money</div>
            <div className="mt-2 space-y-1 text-sm text-slate-700">
              <div className="flex items-center justify-between">
                <span>Amount</span>
                <span className="font-semibold text-slate-900">
                  {moneyMinor(invoice.amountMinor, meta?.currency, meta?.factor)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Paid</span>
                <span className="font-semibold text-slate-900">
                  {moneyMinor(invoice.paidTotalMinor, meta?.currency, meta?.factor)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Balance</span>
                <span className="font-semibold text-slate-900">
                  {moneyMinor(meta?.balance, meta?.currency, meta?.factor)}
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
