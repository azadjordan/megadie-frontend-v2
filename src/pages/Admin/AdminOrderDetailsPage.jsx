import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FiChevronLeft } from "react-icons/fi";

import Loader from "../../components/common/Loader";
import ErrorMessage from "../../components/common/ErrorMessage";
import AdminOrderAllocation from "../../components/admin/AdminOrderAllocation";

import {
  useGetOrderByIdQuery,
  useUpdateOrderByAdminMutation,
  useMarkOrderDeliveredMutation,
} from "../../features/orders/ordersApiSlice";

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

function money(amount, currency = "AED") {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${n.toFixed(2)} ${currency}`;
  }
}

function moneyPlain(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "";
  try {
    return new Intl.NumberFormat(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return n.toFixed(2);
  }
}

function StatusBadge({ status }) {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset";

  const map = {
    Processing: "bg-slate-50 text-slate-700 ring-slate-200",
    Shipping: "bg-blue-50 text-blue-700 ring-blue-200",
    Delivered: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    Cancelled: "bg-rose-50 text-rose-700 ring-rose-200",
  };

  return (
    <span className={`${base} ${map[status] || map.Processing}`}>
      {status || "Unknown"}
    </span>
  );
}

function lineTotal(item) {
  if (!item) return 0;
  if (typeof item.lineTotal === "number") return item.lineTotal;
  const qty = Number(item.qty) || 0;
  const unit = Number(item.unitPrice) || 0;
  return qty * unit;
}

function parseNumberInput(value) {
  if (value === "" || value == null) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export default function AdminOrderDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    data: orderResult,
    isLoading,
    isError,
    error,
    isFetching,
  } = useGetOrderByIdQuery(id, { skip: !id });

  const order = orderResult?.data ?? orderResult;
  const items = Array.isArray(order?.orderItems) ? order.orderItems : [];

  const invoiceId =
    typeof order?.invoice === "string"
      ? order.invoice
      : order?.invoice?._id || "";
  const invoiceNumber = order?.invoice?.invoiceNumber || invoiceId;

  const quoteId =
    typeof order?.quote === "string" ? order.quote : order?.quote?._id || "";

  const user =
    order?.user && typeof order.user === "object" ? order.user : null;

  const itemsTotal = items.reduce((sum, it) => sum + lineTotal(it), 0);
  const delivery = Number(order?.deliveryCharge) || 0;
  const extra = Number(order?.extraFee) || 0;
  const total = Number(order?.totalPrice) || itemsTotal + delivery + extra;

  const hasInvoice = Boolean(invoiceId);

  const [status, setStatus] = useState("Processing");
  const [deliveryCharge, setDeliveryCharge] = useState("0");
  const [extraFee, setExtraFee] = useState("0");
  const [deliveredBy, setDeliveredBy] = useState("");
  const [adminToAdminNote, setAdminToAdminNote] = useState("");
  const [adminToClientNote, setAdminToClientNote] = useState("");
  const [localError, setLocalError] = useState("");
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState("allocation");

  const [updateOrderByAdmin, { isLoading: isUpdatingOrder, error: saveError }] =
    useUpdateOrderByAdminMutation();
  const [
    markOrderDelivered,
    { isLoading: isDelivering, error: deliverError },
  ] = useMarkOrderDeliveredMutation();
  const isSaving = isUpdatingOrder || isDelivering;
  const combinedError = deliverError || saveError;

  useEffect(() => {
    if (!order) return;
    setStatus(order.status || "Processing");
    setDeliveryCharge(String(Number(order.deliveryCharge ?? 0)));
    setExtraFee(String(Number(order.extraFee ?? 0)));
    setDeliveredBy(order.deliveredBy || "");
    setAdminToAdminNote(order.adminToAdminNote || "");
    setAdminToClientNote(order.adminToClientNote || "");
    setLocalError("");
    setSaved(false);
  }, [order?._id, order?.id, order?.updatedAt]);

  useEffect(() => {
    if (id) setActiveTab("allocation");
  }, [id]);

  const onSave = async () => {
    if (!order) return;
    setLocalError("");
    setSaved(false);

    if (status === "Delivered" && !deliveredBy.trim()) {
      setLocalError("Delivered by is required when marking an order as Delivered.");
      return;
    }

    const payload = {
      id: order._id || order.id,
      status,
      deliveredBy: deliveredBy.trim(),
      adminToAdminNote,
      adminToClientNote,
    };

    if (!hasInvoice) {
      const deliveryNum = parseNumberInput(deliveryCharge);
      if (deliveryNum == null) {
        setLocalError("Delivery charge must be a non-negative number.");
        return;
      }

      const extraNum = parseNumberInput(extraFee);
      if (extraNum == null) {
        setLocalError("Extra fee must be a non-negative number.");
        return;
      }

      payload.deliveryCharge = deliveryNum;
      payload.extraFee = extraNum;
    }

    try {
      if (status === "Delivered") {
        const deliverPayload = { ...payload };
        delete deliverPayload.status;
        await markOrderDelivered(deliverPayload).unwrap();
      } else {
        await updateOrderByAdmin(payload).unwrap();
      }
      setSaved(true);
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

  if (!order) {
    return (
      <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
        <div className="text-sm font-semibold text-slate-900">
          Order not found
        </div>
        <div className="mt-1 text-sm text-slate-500">
          The order data is missing from the response.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <button
          type="button"
          onClick={() => navigate("/admin/orders")}
          className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900"
        >
          <FiChevronLeft className="h-4 w-4" />
          Back to orders
        </button>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-lg font-semibold text-slate-900">
              Order Details
            </div>
            <span className="text-xs text-slate-400">/</span>
            <div className="text-sm font-semibold text-slate-700">
              {order.orderNumber || order._id}
            </div>
            <StatusBadge status={order.status} />
            {isFetching ? (
              <span className="text-xs text-slate-400">Refreshing...</span>
            ) : null}
          </div>

          <span />
        </div>

        <div className="mt-1 text-sm text-slate-500">
          Created {formatDateTime(order.createdAt)}
          {order.deliveredAt
            ? ` - Delivered ${formatDateTime(order.deliveredAt)}`
            : ""}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
        <div className="flex flex-wrap gap-2">
          {[
            { id: "general", label: "General Details" },
            { id: "allocation", label: "Allocation" },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-pressed={isActive}
                className={[
                  "inline-flex items-center rounded-xl border px-3 py-2 text-xs font-semibold transition",
                  isActive
                    ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                ].join(" ")}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "general" ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
            <div className="text-sm font-semibold text-slate-900">
              Order settings
            </div>
            <div className="mt-1 text-sm text-slate-500">
              Update status, delivery charges, and notes.
            </div>

            {hasInvoice ? (
              <div className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900 ring-1 ring-amber-200">
                This order has an invoice. Delivery and extra fees are locked.
              </div>
            ) : null}

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                >
                  <option value="Processing">Processing</option>
                  <option value="Shipping">Shipping</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Delivered by
                </label>
                <input
                  type="text"
                  value={deliveredBy}
                  onChange={(e) => setDeliveredBy(e.target.value)}
                  placeholder="Required for Delivered"
                  className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Delivery charge
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={deliveryCharge}
                  onChange={(e) => setDeliveryCharge(e.target.value)}
                  disabled={hasInvoice}
                  className={[
                    "w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20",
                    hasInvoice ? "cursor-not-allowed bg-slate-50 text-slate-400" : "",
                  ].join(" ")}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Extra fee
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={extraFee}
                  onChange={(e) => setExtraFee(e.target.value)}
                  disabled={hasInvoice}
                  className={[
                    "w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20",
                    hasInvoice ? "cursor-not-allowed bg-slate-50 text-slate-400" : "",
                  ].join(" ")}
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3">
              <div>
                <div className="mb-1 text-xs font-semibold text-slate-600">
                  Client to Admin
                </div>
                <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700 ring-1 ring-slate-200">
                  {order.clientToAdminNote || "No client note."}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Admin to Admin
                </label>
                <textarea
                  rows={3}
                  value={adminToAdminNote}
                  onChange={(e) => setAdminToAdminNote(e.target.value)}
                  placeholder="Internal notes"
                  className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Admin to Client
                </label>
                <textarea
                  rows={3}
                  value={adminToClientNote}
                  onChange={(e) => setAdminToClientNote(e.target.value)}
                  placeholder="Optional message to the client"
                  className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                />
              </div>
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

              {saved ? (
                <span className="text-xs font-semibold text-emerald-700">
                  Saved.
                </span>
              ) : null}
            </div>

            {localError ? (
              <div className="mt-3 rounded-xl bg-rose-50 p-3 text-xs text-rose-800 ring-1 ring-rose-200">
                {localError}
              </div>
            ) : null}

            {combinedError ? (
              <div className="mt-3">
                <ErrorMessage error={combinedError} />
              </div>
            ) : null}
          </div>

          <AdminOrderAllocation
            orderId={order?._id || order?.id}
            items={items}
            formatMoney={moneyPlain}
            showSlots={false}
            title="Order items"
          />
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
          </div>

          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold text-slate-600">Invoice</div>
            {invoiceId ? (
              <Link
                to={`/admin/invoices/${invoiceId}/edit`}
                className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-slate-900 hover:underline"
              >
                {invoiceNumber}
              </Link>
            ) : (
              <div className="mt-1 text-sm text-slate-500">No invoice yet.</div>
            )}
          </div>

          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold text-slate-600">Quote</div>
            {quoteId ? (
              <Link
                to={`/admin/requests/${quoteId}`}
                className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-slate-900 hover:underline"
              >
                View quote
              </Link>
            ) : (
              <div className="mt-1 text-sm text-slate-500">No quote link.</div>
            )}
          </div>

          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold text-slate-600">Totals</div>
            <div className="mt-2 space-y-1 text-sm text-slate-700">
              <div className="flex items-center justify-between">
                <span>Items</span>
                <span className="font-semibold text-slate-900">
                  {money(itemsTotal)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Delivery</span>
                <span className="font-semibold text-slate-900">
                  {money(delivery)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Extra</span>
                <span className="font-semibold text-slate-900">
                  {money(extra)}
                </span>
              </div>
              <div className="h-px bg-slate-200" />
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">Total</span>
                <span className="font-semibold text-slate-900">
                  {money(total)}
                </span>
              </div>
            </div>
          </div>
        </aside>
        </div>
      ) : null}

      {activeTab === "allocation" ? (
        <AdminOrderAllocation
          orderId={order?._id || order?.id}
          items={items}
          formatMoney={money}
          showPricing={false}
          title="Allocation"
        />
      ) : null}
    </div>
  );
}
