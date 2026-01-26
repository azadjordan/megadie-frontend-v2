import {
  FiCheck,
  FiChevronDown,
  FiChevronUp,
  FiClock,
  FiX,
} from "react-icons/fi";

import ErrorMessage from "../../../components/common/ErrorMessage";
import RequestedItemsTable, { AvailabilityBadge } from "./RequestedItemsTable";

function formatDate(iso) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return iso;
  }
}

function money(amount) {
  if (amount === null || amount === undefined) return "-";
  const n = Number(amount);
  if (!Number.isFinite(n)) return "-";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "AED",
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return String(n);
  }
}

function StatusBadge({ status }) {
  const base =
    "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ring-1 ring-inset";
  const map = {
    Processing: "bg-slate-50 text-slate-700 ring-slate-200",
    Quoted: "bg-violet-50 text-violet-700 ring-violet-300",
    Confirmed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    Cancelled: "bg-rose-50 text-rose-700 ring-rose-200",
  };
  const labelMap = {
    Processing: "Preparing",
  };
  return (
    <span className={`${base} ${map[status] || map.Processing}`}>
      {status === "Processing" ? <FiClock className="h-3 w-3" /> : null}
      {labelMap[status] || status || "-"}
    </span>
  );
}

export default function AccountRequestCard({
  quote,
  isOpen,
  isEditing,
  editDraft,
  editMaxHit,
  editLocalError,
  updateQuantitiesError,
  isCancelling,
  isConfirming,
  isUpdatingQuantities,
  onToggle,
  onStartEdit,
  onCancel,
  onCancelEdit,
  onConfirm,
  onConfirmQty,
  onAdjustDraftQty,
}) {
  const status = quote.status;
  const isProcessing = status === "Processing";
  const isQuoted = status === "Quoted";
  const isConfirmed = status === "Confirmed";
  const isCancelled = status === "Cancelled";
  const manualInvoiceLocked = Boolean(quote?.manualInvoiceId);
  const isLocked = Boolean(quote?.order) || manualInvoiceLocked;
  const isQtyEditLocked = Boolean(quote?.clientQtyEditLocked);

  const requestedItems = Array.isArray(quote.requestedItems)
    ? quote.requestedItems
    : [];
  const hasShortage = requestedItems.some((it) => Number(it?.shortage) > 0);
  const hasEditableQty = requestedItems.some(
    (it) => Number(it?.availableNow) > 0
  );
  const availabilityStatuses = requestedItems
    .map((it) => it?.availabilityStatus)
    .filter(Boolean);
  const totalAvailabilityCount = availabilityStatuses.length;
  const availableCount = availabilityStatuses.filter((s) => s === "AVAILABLE").length;
  const notAvailableCount = availabilityStatuses.filter(
    (s) => s === "NOT_AVAILABLE"
  ).length;
  const allNotAvailable =
    totalAvailabilityCount > 0 && notAvailableCount === totalAvailabilityCount;
  const availabilitySummary = isCancelled
    ? null
    : totalAvailabilityCount === 0
    ? null
    : notAvailableCount === totalAvailabilityCount
    ? "NOT_AVAILABLE"
    : availableCount === totalAvailabilityCount
    ? "AVAILABLE"
    : "SHORTAGE";
  const canCancel = (isProcessing || isQuoted) && !isLocked;
  const canConfirm = isQuoted && !hasShortage && !isLocked;
  const canEditQty =
    !isLocked &&
    !isCancelled &&
    !isQtyEditLocked &&
    hasEditableQty &&
    (isProcessing || isQuoted);
  const isEditingActive = isEditing && canEditQty;
  const confirmDisabled =
    !canConfirm || isConfirming || isCancelling || isEditingActive;
  const showConfirmButton =
    !isLocked && !isConfirmed && !isCancelled && !(isProcessing && allNotAvailable);
  const showConfirmButtonFinal = showConfirmButton;
  const showEditQtyAction = canEditQty && !isEditing;
  const showConfirmQtyFinal = canEditQty && isEditing;
  const confirmQtyDisabled = isUpdatingQuantities;
  const showCancelAction = canCancel;
  const showFinalDecisionCancel = showCancelAction;
  const actionButtonsCount =
    Number(showFinalDecisionCancel) + Number(showConfirmButtonFinal);
  const cancelActionLabel =
    isQuoted && !hasShortage ? "Reject Quote" : "Cancel Quote";
  const showFullPricing = isQuoted;
  const showOnlyTotal = isConfirmed;
  const showNoPricing = status === "Processing" || isCancelled;
  const showPricingColumn =
    !isCancelled && !hasShortage && (showFullPricing || showNoPricing);
  const deliveryCharge = Number(quote.deliveryCharge) || 0;
  const extraFee = Number(quote.extraFee) || 0;
  const adjustedSubtotal = showFullPricing
    ? requestedItems.reduce((sum, it) => {
        const unitPrice = Number(it?.unitPrice);
        if (!Number.isFinite(unitPrice)) return sum;
        const requestedQty = Math.max(0, Number(it?.qty) || 0);
        const availableNow = Math.max(0, Number(it?.availableNow) || 0);
        const shortage = Number(it?.shortage);
        const hasItemShortage =
          Number.isFinite(shortage) && shortage > 0 && Number.isFinite(availableNow);
        const productId = it?.product?._id || it?.product;
        const draftQty = Number(editDraft?.[quote._id]?.[String(productId)]);
        const fallbackQty = hasItemShortage ? availableNow : requestedQty;
        const nextQty = Number.isFinite(draftQty) ? draftQty : fallbackQty;
        return sum + unitPrice * nextQty;
      }, 0)
    : null;
  const adjustedTotal =
    adjustedSubtotal != null ? adjustedSubtotal + deliveryCharge + extraFee : null;
  const summaryTotal =
    showFullPricing && hasShortage && adjustedTotal != null
      ? adjustedTotal
      : quote.totalPrice;

  return (
    <div className="relative rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="absolute right-5 top-5 z-10 lg:hidden">
        <button
          type="button"
          onClick={() => onToggle(quote._id)}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          {isOpen ? "Hide" : "Details"}
          {isOpen ? <FiChevronUp /> : <FiChevronDown />}
        </button>
      </div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 pr-12 lg:pr-0">
          <div className="grid gap-4 sm:grid-cols-1">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Quote no
              </div>
              <div className="mt-1 text-lg font-semibold text-slate-900">
                {quote.quoteNumber || quote._id.slice(-6).toUpperCase()}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-100 bg-white px-3 py-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Total
              </div>
              <div className="mt-1">
                <StatusBadge status={status} />
              </div>
            </div>
            {!isCancelled ? (
              <div className="rounded-2xl border border-slate-100 bg-white px-3 py-2">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Items
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {availabilitySummary ? (
                    <AvailabilityBadge status={availabilitySummary} size="md" />
                  ) : (
                    "-"
                  )}
                </div>
              </div>
            ) : null}
            <div className="col-span-2 rounded-2xl border border-slate-100 bg-white px-3 py-2 md:col-span-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Date
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {formatDate(quote.createdAt)}
              </div>
            </div>
          </div>
        </div>

        <div className="hidden lg:flex lg:flex-col lg:items-stretch lg:gap-2">
          <button
            type="button"
            onClick={() => onToggle(quote._id)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {isOpen ? "Hide" : "Details"}
            {isOpen ? <FiChevronUp /> : <FiChevronDown />}
          </button>
        </div>
      </div>

      {isOpen ? (
        <div className="mt-5 space-y-4 border-t border-slate-200 pt-4">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold text-slate-900">
                Requested items
              </div>
              {showEditQtyAction || showConfirmQtyFinal ? (
                <div className="hidden lg:flex items-center gap-2">
                  {showEditQtyAction ? (
                    <button
                      type="button"
                      onClick={() => onStartEdit(quote._id)}
                      className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-violet-100 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm shadow-violet-100/40 transition hover:bg-violet-100"
                    >
                      Edit Qty
                    </button>
                  ) : null}
                  {showConfirmQtyFinal ? (
                    <>
                      <button
                        type="button"
                        onClick={() => onConfirmQty(quote)}
                        disabled={confirmQtyDisabled}
                        className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm shadow-violet-100/60 transition enabled:hover:bg-violet-600 enabled:hover:text-white disabled:opacity-50"
                      >
                        <FiCheck className="h-4 w-4" />
                        {confirmQtyDisabled ? "Saving..." : "Confirm Qty"}
                      </button>
                      <button
                        type="button"
                        onClick={() => onCancelEdit(quote._id)}
                        disabled={confirmQtyDisabled}
                        className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm shadow-slate-100/60 transition enabled:hover:bg-slate-50 disabled:opacity-50"
                      >
                        Cancel Edit
                      </button>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
            {!isCancelled && quote.availabilityCheckedAt ? (
              <div className="mt-1 text-xs text-slate-500">
                Availability as of{" "}
                <span className="font-semibold text-slate-700">
                  {formatDate(quote.availabilityCheckedAt)}
                </span>
              </div>
            ) : null}
            {isQtyEditLocked ? (
              <div className="mt-1 text-xs font-semibold text-slate-500">
                Quantities edited and confirmed by the client.
              </div>
            ) : null}
            {status === "Confirmed" ? (
              <div className="mt-1 text-xs font-semibold text-violet-600">
                Your Order is being Prepared...
              </div>
            ) : null}
            {isQuoted && hasShortage ? (
              <div className="mt-1 text-xs font-semibold text-violet-600">
                Please edit quantities to see prices.
              </div>
            ) : null}

            <RequestedItemsTable
              quoteId={quote._id}
              requestedItems={requestedItems}
              isEditing={isEditingActive}
              isCancelled={isCancelled}
              showFullPricing={showFullPricing}
              showPricingColumn={showPricingColumn}
              editDraft={editDraft?.[quote._id]}
              editMaxHit={editMaxHit}
              onAdjustDraftQty={onAdjustDraftQty}
            />
            {isEditing && (editLocalError || updateQuantitiesError) ? (
              <div className="mt-3">
                {editLocalError ? (
                  <div className="text-xs font-semibold text-rose-600">
                    {editLocalError}
                  </div>
                ) : null}
                {updateQuantitiesError ? (
                  <div className="mt-2">
                    <ErrorMessage error={updateQuantitiesError} />
                  </div>
                ) : null}
              </div>
            ) : null}

          </div>

          {(quote.clientToAdminNote || quote.adminToClientNote) && (
            <div className="grid gap-3 md:grid-cols-2">
              {quote.clientToAdminNote ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-semibold text-slate-500">
                    Your note
                  </div>
                  <div className="mt-2 whitespace-pre-wrap text-sm text-slate-800">
                    {quote.clientToAdminNote}
                  </div>
                </div>
              ) : null}
              {quote.adminToClientNote ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-semibold text-slate-500">
                    Seller note
                  </div>
                  <div className="mt-2 text-sm text-slate-800 whitespace-pre-wrap">
                    <span className="rounded-md bg-amber-50 px-2 py-1 box-decoration-clone">
                      {quote.adminToClientNote}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {!showNoPricing && !hasShortage && (showFullPricing || showOnlyTotal) ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-sm font-semibold text-slate-900">Summary</div>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                {showFullPricing ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span>Delivery</span>
                      <span className="tabular-nums">
                        {money(deliveryCharge)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Extra fee</span>
                      <span className="tabular-nums">{money(extraFee)}</span>
                    </div>
                  </>
                ) : null}
                <div className="flex items-center justify-between border-t border-slate-200 pt-2">
                  <span className="font-semibold text-slate-900">Total</span>
                  <span
                    className={
                      showFullPricing && hasShortage
                        ? "font-semibold text-emerald-600 tabular-nums"
                        : "font-semibold tabular-nums"
                    }
                  >
                    {money(summaryTotal)}
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          {!isEditingActive && (showFinalDecisionCancel || showConfirmButtonFinal) ? (
            <div className="mt-6 grid w-full grid-cols-2 gap-2 md:mt-8 sm:flex sm:justify-end sm:gap-2">
              {showFinalDecisionCancel ? (
                <button
                  type="button"
                  onClick={() => onCancel(quote._id)}
                  disabled={isEditingActive || isCancelling || isConfirming}
                  className={[
                    "inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-rose-100 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 shadow-sm shadow-rose-100/40 transition enabled:hover:bg-rose-100 disabled:opacity-50 disabled:cursor-default disabled:pointer-events-none sm:w-auto",
                    actionButtonsCount === 1 ? "col-span-2" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <FiX className="h-4 w-4" />
                  {isCancelling ? "Cancelling..." : cancelActionLabel}
                </button>
              ) : null}
              {showConfirmButtonFinal ? (
                <button
                  type="button"
                  onClick={() => onConfirm(quote._id)}
                  disabled={confirmDisabled}
                  className={[
                    "inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm shadow-emerald-100/40 transition enabled:hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-default disabled:pointer-events-none sm:w-auto",
                    actionButtonsCount === 1 ? "col-span-2" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {isProcessing ? (
                    <FiClock className="h-4 w-4" />
                  ) : (
                    <FiCheck className="h-4 w-4" />
                  )}
                  {isConfirming ? "Confirming..." : "Confirm Quote"}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {isOpen && (showEditQtyAction || showConfirmQtyFinal) ? (
        <div className="mt-5 grid gap-3 lg:hidden">
          <div className="flex w-full flex-col items-stretch gap-2">
            {showEditQtyAction ? (
              <button
                type="button"
                onClick={() => onStartEdit(quote._id)}
                className="inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-violet-100 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm shadow-violet-100/40 transition hover:bg-violet-100"
              >
                Edit Qty
              </button>
            ) : null}
            {showConfirmQtyFinal ? (
              <>
                <button
                  type="button"
                  onClick={() => onConfirmQty(quote)}
                  disabled={confirmQtyDisabled}
                  className="inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm shadow-violet-100/60 transition enabled:hover:bg-violet-600 enabled:hover:text-white disabled:opacity-50"
                >
                  <FiCheck className="h-4 w-4" />
                  {confirmQtyDisabled ? "Saving..." : "Confirm Qty"}
                </button>
                <button
                  type="button"
                  onClick={() => onCancelEdit(quote._id)}
                  disabled={confirmQtyDisabled}
                  className="inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm shadow-slate-100/60 transition enabled:hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel Edit
                </button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
