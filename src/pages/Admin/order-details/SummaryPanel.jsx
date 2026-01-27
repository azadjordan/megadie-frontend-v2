import { Link } from "react-router-dom";
import StepCard from "../request-details/StepCard";
import { StatusBadge, StockBadge } from "./Badges";

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
  isStockFinalized = false,
}) {
  const money =
    typeof formatMoney === "function" ? formatMoney : (value) => String(value ?? 0);

  const clientLabel = customerName || "-";
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
      <StepCard title="Order Summary" showNumber={false}>
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

      </StepCard>
    </div>
  );
}
