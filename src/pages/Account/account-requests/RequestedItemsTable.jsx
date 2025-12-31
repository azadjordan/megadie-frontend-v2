import { FiAlertTriangle, FiClock } from "react-icons/fi";

import QuantityControlRequests from "../../../components/common/QantityControlRequests";

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
    NOT_AVAILABLE: "bg-rose-50 text-rose-700 ring-rose-200",
  };
  const labelMap = {
    AVAILABLE: "Available",
    PARTIAL: "Shortage",
    SHORTAGE: "Shortage",
    NOT_AVAILABLE: "Not Available",
  };
  const resolvedLabel =
    label !== undefined && label !== null && label !== ""
      ? label
      : labelMap[status] || "Not available";

  return (
    <span className={`${base} ${map[status] || map.NOT_AVAILABLE} ${className}`}>
      {status === "SHORTAGE" ? (
        <FiAlertTriangle
          className={size === "md" ? "h-3.5 w-3.5" : "h-2.5 w-2.5"}
        />
      ) : null}
      {resolvedLabel}
    </span>
  );
}

export default function RequestedItemsTable({
  quoteId,
  requestedItems,
  isEditing,
  isCancelled,
  showFullPricing,
  showPricingColumn,
  editDraft,
  editMaxHit,
  onAdjustDraftQty,
}) {
  const items = Array.isArray(requestedItems) ? requestedItems : [];
  const shouldScrollItems = items.length > 5;
  const draftByProduct = editDraft || {};

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
        const draftQty = Number(draftByProduct?.[productKey]);
        const fallbackQty =
          hasItemShortage && Number.isFinite(availableQty)
            ? availableQty
            : requestedQty;
        const editingQty = Number.isFinite(draftQty) ? draftQty : fallbackQty;
        const showShortageVisuals = hasItemShortage && isEditing;
        const canEditRow =
          isEditing &&
          Number.isFinite(availableQty) &&
          Number(availableQty) > 0;
        const displayQty = canEditRow ? editingQty : requestedQty;
        const isShortageStatus =
          availabilityStatus === "SHORTAGE" || availabilityStatus === "PARTIAL";
        const availabilityLabel = isShortageStatus
          ? `Only ${
              Number.isFinite(availableQty) ? formatNumber(availableQty) : "0"
            } available`
          : null;
        const lineTotal =
          showFullPricing && unitPrice != null ? unitPrice * displayQty : null;
        const showWaitingIndicator =
          !showFullPricing && !(hasItemShortage && Number(availableQty) === 0);
        const maxHitKey = `${quoteId}:${productKey}`;
        const isUnavailable =
          showAvailabilityBadge &&
          Number.isFinite(Number(availableQty)) &&
          Number(availableQty) === 0;
        const fadedClass = isUnavailable ? "opacity-50" : "";

        const showQtyControl = canEditRow;
        const controlValue = editingQty;
        const shouldShowZeroQtyNotice =
          canEditRow && Number(controlValue) === 0;
        const isOverAvailable =
          canEditRow &&
          Number.isFinite(availableQty) &&
          Number(controlValue) > Number(availableQty);
        const badgeStatus = shouldShowZeroQtyNotice
          ? "PARTIAL"
          : canEditRow && Number.isFinite(availableQty)
          ? Number(availableQty) === 0
            ? "NOT_AVAILABLE"
            : isOverAvailable
            ? "SHORTAGE"
            : "AVAILABLE"
          : availabilityStatus;
        const badgeLabel = shouldShowZeroQtyNotice
          ? "Will be Removed"
          : isOverAvailable
          ? `Only ${formatNumber(availableQty)} available`
          : showShortageVisuals && Number.isFinite(availableQty)
          ? null
          : availabilityLabel;

        return (
          <div
            key={`${quoteId}-${idx}`}
            className={[
              "grid grid-cols-12 items-center gap-x-2 border-t border-slate-200 px-4 py-2 text-sm text-slate-800",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <div
              className={[
                "hidden sm:block col-span-1 text-xs font-semibold text-slate-400 tabular-nums",
                fadedClass,
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {idx + 1}
            </div>
            <div
              className={[
                showPricingColumn
                  ? "col-span-3 sm:col-span-4 min-w-0"
                  : "col-span-4 sm:col-span-5 min-w-0",
                fadedClass,
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className="line-clamp-4 text-[11px] sm:text-sm">{name}</div>
            </div>
            <div className="col-span-3 sm:col-span-2 flex items-center justify-end text-right overflow-visible pr-0.5 sm:pr-1">
              <div className="flex w-full items-center justify-end gap-1 sm:gap-2">
                {showQtyControl ? (
                  <QuantityControlRequests
                    value={controlValue}
                    onIncrease={() =>
                      onAdjustDraftQty(
                        quoteId,
                        productKey,
                        1,
                        Number(availableQty) || 0,
                        fallbackQty
                      )
                    }
                    onDecrease={() =>
                      onAdjustDraftQty(
                        quoteId,
                        productKey,
                        -1,
                        Number(availableQty) || 0,
                        fallbackQty
                      )
                    }
                    onChangeRaw={(rawValue) => {
                      const maxQty = Number(availableQty) || 0;
                      if (!Number.isFinite(rawValue)) return;
                      const next = Math.max(0, rawValue);
                      onAdjustDraftQty(
                        quoteId,
                        productKey,
                        next - controlValue,
                        maxQty,
                        fallbackQty,
                        { allowAboveMax: true }
                      );
                    }}
                    onCommit={(rawValue) => {
                      const maxQty = Number(availableQty) || 0;
                      const next = Math.max(0, Math.min(Number(rawValue) || 0, maxQty));
                      onAdjustDraftQty(
                        quoteId,
                        productKey,
                        next - controlValue,
                        maxQty,
                        fallbackQty
                      );
                    }}
                    min={0}
                    max={Number(availableQty) || 0}
                    disableDecrease={controlValue <= 0}
                    maxHit={Boolean(editMaxHit?.[maxHitKey])}
                  />
                ) : (
                  <span
                    className={[
                      "inline-flex w-[3ch] items-center justify-end tabular-nums sm:w-[4ch]",
                      fadedClass,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {showShortageVisuals && availableQty != null ? (
                      <span className="relative inline-block px-0.5">
                        {requestedQty}
                        {Number(availableQty) === 0 ? (
                          <span className="pointer-events-none absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 rotate-[-20deg] bg-rose-500" />
                        ) : null}
                      </span>
                    ) : (
                      <span>{requestedQty}</span>
                    )}
                  </span>
                )}
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
                <AvailabilityBadge
                  status={badgeStatus}
                  label={badgeLabel}
                  className={fadedClass}
                />
              ) : null}
            </div>
            {showPricingColumn ? (
              <div
                className={[
                  "col-span-2 text-left tabular-nums",
                  fadedClass,
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
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
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
