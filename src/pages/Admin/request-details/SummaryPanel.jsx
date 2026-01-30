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
  showConvertToOrder,
  onConvertToOrder,
  isCreatingOrder,
  convertDisabled,
  showShareWithClient,
  onShareWithClient,
  shareDisabled,
  lockReason,
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
      <div className="absolute right-4 top-3 hidden md:block">
        <StatusBadge status={status} />
      </div>
      <StepCard n={5} title="Quote Summary" showNumber={false}>
        <div className="mb-3 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 md:hidden">
          <span>Status</span>
          <StatusBadge status={status} />
        </div>

        <div className="-mx-4 -mb-4 mt-0 divide-y divide-slate-200 text-sm md:-mt-4">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between px-4 py-1.5"
            >
              <span
                className={
                  row.isTotal ? "font-semibold text-slate-700" : "text-slate-600"
                }
              >
                {row.label}
              </span>
              <span
                className={
                  row.isTotal ? "font-semibold text-slate-900" : "text-slate-900"
                }
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>

        {showConvertToOrder || showShareWithClient ? (
          <div className="mt-4 border-t border-slate-200 pt-4 space-y-2">
            {showConvertToOrder ? (
              <button
                type="button"
                onClick={onConvertToOrder}
                disabled={convertDisabled}
                title={convertDisabled && lockReason ? lockReason : undefined}
                className={[
                  "w-full rounded-xl px-5 py-3 text-sm font-semibold text-white transition",
                  !convertDisabled
                    ? "bg-slate-900 hover:bg-slate-800"
                    : "cursor-default bg-slate-300",
                ].join(" ")}
              >
                {isCreatingOrder ? "Converting..." : "Convert to Order"}
              </button>
            ) : null}

            {showShareWithClient ? (
              <button
                type="button"
                onClick={onShareWithClient}
                disabled={shareDisabled}
                title={shareDisabled && lockReason ? lockReason : undefined}
                className={[
                  "w-full rounded-xl px-5 py-3 text-sm font-semibold transition",
                  !shareDisabled
                    ? "bg-violet-600 text-white hover:bg-violet-500"
                    : "cursor-default bg-slate-200 text-slate-500",
                ].join(" ")}
              >
                Share with Client
              </button>
            ) : null}
          </div>
        ) : null}
      </StepCard>
    </div>
  );
}
