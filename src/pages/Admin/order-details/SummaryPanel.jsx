import { Link } from "react-router-dom";
import StepCard from "../request-details/StepCard";
import { StatusBadge, StockBadge } from "./Badges";
import ErrorMessage from "../../../components/common/ErrorMessage";

export default function SummaryPanel({
  orderNumber,
  invoiceId,
  invoiceNumber,
  quoteId,
  quoteNumber,
  customerName,
  itemsCount,
  totalQty,
  itemsTotal,
  deliveryCharge,
  extraFee,
  total,
  status,
  formatMoney,
  canCreateInvoice,
  canShip,
  canDeliver,
  canFinalize,
  createInvoiceReason = "",
  shippingReason = "",
  deliverReason = "",
  finalizeTooltip = "",
  onCreateInvoice,
  onShip,
  onFinalize,
  onDeliver,
  onDelete,
  isCreatingInvoice,
  isUpdatingStatus,
  isFinalizing,
  isDelivering,
  isDeleting,
  shippingError,
  finalizeError,
  canDelete,
  deleteReason = "",
  isStockFinalized = false,
}) {
  const money =
    typeof formatMoney === "function" ? formatMoney : (value) => String(value ?? 0);

  const clientLabel = customerName || "-";
  const createInvoiceTooltip = !canCreateInvoice ? createInvoiceReason : "";
  const shippingTooltip = !canShip ? shippingReason : "";
  const deliverTooltip = !canDeliver ? deliverReason : "";
  const finalizeTitle =
    !canFinalize && finalizeTooltip ? finalizeTooltip : "";
  const deleteTooltip = !canDelete ? deleteReason : "";

  const rows = [
    {
      label: "Client",
      value: clientLabel,
    },
    {
      label: "Order",
      value: orderNumber || "-",
    },
    {
      label: "Invoice",
      value: invoiceId ? (
        <Link
          to={`/admin/invoices/${invoiceId}/edit`}
          className="font-semibold text-slate-900 hover:underline"
        >
          {invoiceNumber || invoiceId}
        </Link>
      ) : (
        "-"
      ),
    },
    {
      label: "Quote",
      value: quoteId ? (
        <Link
          to={`/admin/requests/${quoteId}`}
          className="font-semibold text-slate-900 hover:underline"
        >
          {quoteNumber || quoteId}
        </Link>
      ) : (
        "-"
      ),
    },
    {
      label: "Items : Units",
      value: `${Number(itemsCount) || 0} : ${Number(totalQty) || 0}`,
    },
    {
      label: "Items subtotal",
      value: money(itemsTotal),
    },
    {
      label: "Delivery",
      value: money(deliveryCharge),
    },
    {
      label: "Extra Fee",
      value: money(extraFee),
    },
    {
      label: "Total",
      value: money(total),
      isTotal: true,
    },
  ];

  return (
    <div className="relative">
      <div className="absolute right-4 top-3 flex items-center gap-2">
        <StatusBadge status={status} />
        <StockBadge isFinalized={isStockFinalized} />
      </div>
      <StepCard title="Summary" showNumber={false}>
        <div className="-mx-4 -mt-4 divide-y divide-slate-200 text-sm">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between gap-3 px-4 py-1.5"
            >
              <span
                className={
                  row.isTotal
                    ? "font-semibold text-slate-700"
                    : "text-slate-600"
                }
              >
                {row.label}
              </span>
              <span
                className={
                  row.isTotal
                    ? "font-semibold text-slate-900"
                    : "text-slate-900"
                }
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={onCreateInvoice}
            disabled={!canCreateInvoice || isCreatingInvoice}
            title={createInvoiceTooltip || undefined}
            className={[
              "w-full rounded-xl px-3 py-2 text-xs font-semibold text-white",
              !canCreateInvoice || isCreatingInvoice
                ? "cursor-not-allowed bg-slate-300"
                : "bg-slate-900 hover:bg-slate-800",
            ].join(" ")}
          >
            {isCreatingInvoice ? "Creating..." : "Create Invoice"}
          </button>

          <button
            type="button"
            onClick={onShip}
            disabled={!canShip || isUpdatingStatus}
            title={shippingTooltip || undefined}
            className={[
              "w-full rounded-xl px-3 py-2 text-xs font-semibold text-white",
              !canShip || isUpdatingStatus
                ? "cursor-not-allowed bg-blue-200 text-blue-600"
                : "bg-blue-600 hover:bg-blue-700",
            ].join(" ")}
          >
            {isUpdatingStatus ? "Updating..." : "Mark Shipping"}
          </button>
          {shippingError ? (
            <div className="text-[11px] text-rose-600">{shippingError}</div>
          ) : null}

          <div title={finalizeTitle || undefined} className="w-full">
            <button
              type="button"
              onClick={onFinalize}
              disabled={!canFinalize || isFinalizing}
              className={[
                "w-full rounded-xl px-3 py-2 text-xs font-semibold text-white",
                !canFinalize || isFinalizing
                  ? "cursor-not-allowed bg-slate-300"
                  : "bg-slate-900 hover:bg-slate-800",
              ].join(" ")}
            >
              {isFinalizing ? "Finalizing..." : "Finalize Stock"}
            </button>
          </div>
          {finalizeError ? (
            <div className="mt-1">
              <ErrorMessage error={finalizeError} />
            </div>
          ) : null}

          <button
            type="button"
            onClick={onDeliver}
            disabled={!canDeliver || isDelivering}
            title={deliverTooltip || undefined}
            className={[
              "w-full rounded-xl px-3 py-2 text-xs font-semibold text-white",
              !canDeliver || isDelivering
                ? "cursor-not-allowed bg-emerald-300"
                : "bg-emerald-600 hover:bg-emerald-700",
            ].join(" ")}
          >
            {isDelivering ? "Delivering..." : "Mark Delivered"}
          </button>

          <button
            type="button"
            onClick={onDelete}
            disabled={!canDelete || isDeleting}
            title={deleteTooltip || undefined}
            className={[
              "w-full rounded-xl px-3 py-2 text-xs font-semibold text-white",
              !canDelete || isDeleting
                ? "cursor-not-allowed bg-rose-200 text-rose-50"
                : "bg-rose-600 hover:bg-rose-700",
            ].join(" ")}
          >
            {isDeleting ? "Deleting..." : "Delete Order"}
          </button>
        </div>
      </StepCard>
    </div>
  );
}
