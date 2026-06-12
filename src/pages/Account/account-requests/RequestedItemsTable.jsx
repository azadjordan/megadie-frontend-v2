import { FiClock } from "react-icons/fi";

function formatNumber(amount) {
  if (amount === null || amount === undefined) return "-";
  const n = Number(amount);
  if (!Number.isFinite(n)) return "-";
  try {
    return new Intl.NumberFormat(undefined, {
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return String(n);
  }
}

export function AvailabilityBadge({ status, size = "sm", label, className = "" }) {
  const base =
    size === "md"
      ? "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-semibold ring-1 ring-inset transition-colors duration-200 ease-out"
      : "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0 text-[10px] font-semibold ring-1 ring-inset transition-colors duration-200 ease-out";
  const map = {
    AVAILABLE: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    PARTIAL: "bg-amber-50 text-amber-700 ring-amber-200",
    SHORTAGE: "bg-amber-50 text-amber-700 ring-amber-200",
    SOURCING: "bg-amber-50 text-amber-800 ring-amber-200",
    NOT_AVAILABLE: "bg-amber-50 text-amber-800 ring-amber-200",
  };
  const labelMap = {
    AVAILABLE: "Available",
    PARTIAL: "Sourcing",
    SHORTAGE: "Sourcing",
    SOURCING: "Sourcing",
    NOT_AVAILABLE: "Sourcing",
  };
  const resolvedLabel =
    label !== undefined && label !== null && label !== ""
      ? label
      : labelMap[status] || "Not available";

  return (
    <span className={`${base} ${map[status] || map.NOT_AVAILABLE} ${className}`}>
      {status === "SOURCING" || status === "SHORTAGE" || status === "PARTIAL" ? (
        <FiClock className={size === "md" ? "h-3.5 w-3.5" : "h-2.5 w-2.5"} />
      ) : null}
      {resolvedLabel}
    </span>
  );
}

export default function RequestedItemsTable({
  quoteId,
  requestedItems,
  isCancelled,
  showFullPricing,
  showPricingColumn,
}) {
  const items = Array.isArray(requestedItems) ? requestedItems : [];
  const shouldScrollItems = items.length > 5;

  return (
    <div
      className={[
        "mt-3 -mx-5 overflow-hidden rounded-none border-y border-slate-200 bg-white sm:mx-0 sm:rounded-2xl sm:border",
        shouldScrollItems ? "lg:max-h-[420px] lg:overflow-y-auto" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="grid grid-cols-12 gap-x-2 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600">
        <div className="hidden sm:block col-span-1 text-left">#</div>
        <div
          className={
            showPricingColumn
              ? "col-span-3 sm:col-span-4"
              : "col-span-4 sm:col-span-5"
          }
        >
          Product
        </div>
        <div
          className={
            showPricingColumn
              ? "col-span-3 sm:col-span-2 text-right pr-0.5 sm:pr-1"
              : "col-span-3 sm:col-span-2 text-right pr-0.5 sm:pr-1"
          }
        >
          <span className="inline-flex w-[3ch] justify-end sm:w-[4ch]">
            Qty
          </span>
        </div>
        <div
          className={
            showPricingColumn
              ? "col-span-4 sm:col-span-3 pl-2 sm:pl-3"
              : "col-span-5 sm:col-span-4 pl-2 sm:pl-3"
          }
          aria-hidden="true"
        />
        {showPricingColumn ? (
          <div className="col-span-2 text-left">
            <span className="inline-flex w-[8ch] justify-start">
              Price
            </span>
          </div>
        ) : null}
      </div>

      {items.map((it, idx) => {
        const name =
          it?.product?.name ||
          it?.productName ||
          (typeof it?.product === "string" ? it.product : "") ||
          "Unnamed item";
        const productId = it?.product?._id || it?.product;
        const productKey = String(productId);
        const qty = it?.qty ?? 0;
        const unitPrice = typeof it?.unitPrice === "number" ? it.unitPrice : null;
        const availabilityStatus = it?.availabilityStatus;
        const showAvailabilityBadge =
          !isCancelled && typeof availabilityStatus === "string";
        const availableNow =
          showAvailabilityBadge && Number.isFinite(Number(it?.availableNow))
            ? Number(it.availableNow)
            : null;
        const shortage =
          showAvailabilityBadge && Number.isFinite(Number(it?.shortage))
            ? Number(it.shortage)
            : availableNow != null
            ? Math.max(0, Number(qty || 0) - availableNow)
            : null;
        const hasItemShortage =
          showAvailabilityBadge &&
          Number.isFinite(Number(shortage)) &&
          Number(shortage) > 0;
        const requestedQty = Number(qty || 0);
        const availableQty = Number.isFinite(Number(availableNow))
          ? Number(availableNow)
          : null;
        const lineTotal =
          showFullPricing && unitPrice != null ? unitPrice * requestedQty : null;
        const showWaitingIndicator =
          !showFullPricing && !(hasItemShortage && Number(availableQty) === 0);
        const availableDisplayQty = Number.isFinite(availableQty)
          ? Math.max(0, Number(availableQty))
          : 0;
        const effectiveRequestedQty = Math.max(0, Number(requestedQty) || 0);
        const availabilityText = !showAvailabilityBadge
          ? ""
          : availableDisplayQty <= 0
          ? `Sourcing ${formatNumber(effectiveRequestedQty)}`
          : effectiveRequestedQty > availableDisplayQty
          ? `${formatNumber(availableDisplayQty)} available, sourcing ${formatNumber(
              effectiveRequestedQty
            )}`
          : `Available: ${formatNumber(availableDisplayQty)}`;
        const availabilityTextClass = effectiveRequestedQty > availableDisplayQty
          ? "text-amber-700"
          : "text-emerald-700";

        return (
          <div
            key={`${quoteId}-${productKey}-${idx}`}
            className={[
              "grid grid-cols-12 items-center gap-x-2 border-t border-slate-200 px-4 py-2 text-sm text-slate-800",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <div
              className="hidden sm:block col-span-1 text-xs font-semibold text-slate-400 tabular-nums"
            >
              {idx + 1}
            </div>
            <div
              className={[
                showPricingColumn
                  ? "col-span-3 sm:col-span-4 min-w-0"
                  : "col-span-4 sm:col-span-5 min-w-0",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className="line-clamp-4 text-[11px] sm:text-sm">
                {name}
              </div>
            </div>
            <div className="col-span-3 sm:col-span-2 flex items-center justify-end text-right overflow-visible pr-0.5 sm:pr-1">
              <div className="flex w-full items-center justify-end gap-1 sm:gap-2">
                <span className="inline-flex w-[3ch] items-center justify-end tabular-nums sm:w-[4ch]">
                  {requestedQty}
                </span>
              </div>
            </div>
            <div
              className={
                showPricingColumn
                  ? "col-span-4 sm:col-span-3 flex items-center justify-start pl-2 sm:pl-3"
                  : "col-span-5 sm:col-span-4 flex items-center justify-start pl-2 sm:pl-3"
              }
            >
              {showAvailabilityBadge ? (
                <span
                  className={[
                    "min-w-0 text-[11px] font-semibold leading-snug sm:text-xs",
                    availabilityTextClass,
                  ].join(" ")}
                >
                  {availabilityText}
                </span>
              ) : null}
            </div>
            {showPricingColumn ? (
              <div className="col-span-2 text-left tabular-nums">
                <div className="flex items-center gap-2">
                  {showFullPricing ? (
                    <span className="inline-flex w-[8ch] justify-start">
                      {Number.isFinite(Number(lineTotal))
                        ? hasItemShortage && Number(availableQty) === 0
                          ? "-"
                          : `AED ${formatNumber(lineTotal)}`
                        : "-"}
                    </span>
                  ) : showWaitingIndicator ? (
                    <span className="inline-flex w-[8ch] items-center justify-start text-slate-400">
                      <FiClock className="h-4 w-4" />
                    </span>
                  ) : (
                    <span className="inline-flex w-[8ch] justify-start">
                      -
                    </span>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
