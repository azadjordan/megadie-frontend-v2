import StepCard from "./StepCard";
import { StatusBadge } from "./Badges";
import { money } from "./helpers";

export default function SummaryPanel({
  itemsCount,
  itemsTotal,
  totalQty,
  deliveryCharge,
  extraFee,
  total,
  status,
  ownerName,
  }) {
  const rows = [
    {
      label: "Client",
      value: ownerName || "-",
    },
    {
      label: "Items : Units",
      value: `${Number(itemsCount) || 0} : ${totalQty}`,
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
      <div className="absolute right-4 top-3">
        <StatusBadge status={status} />
      </div>
      <StepCard n={5} title="Summary" showNumber={false}>
        <div className="-mx-4 -mb-4 -mt-4 divide-y divide-slate-200 text-sm">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between px-4 py-1.5"
            >
              <span className={row.isTotal ? "font-semibold text-slate-700" : "text-slate-600"}>
                {row.label}
              </span>
              <span className={row.isTotal ? "font-semibold text-slate-900" : "text-slate-900"}>
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </StepCard>
    </div>
  );
}
