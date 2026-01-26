import StepCard from "./StepCard";
import ErrorMessage from "../../../components/common/ErrorMessage";
import { moneyPlain, parseNullableNumber } from "./helpers";

export default function PricingStep({
  items,
  onUnitPriceChange,
  deliveryChargeStr,
  setDeliveryChargeStr,
  deliveryOptions,
  extraFeeStr,
  setExtraFeeStr,
  quoteLocked,
  lockReason,
  showAvailability,
  onAssignUserPrices,
  canUpdatePricing,
  onUpdatePricing,
  isBusy,
  isUpdating,
  showUpdateError,
  updateError,
}) {
  const itemRows = items.map((it, idx) => {
    const qtyInput = parseNullableNumber(it.qtyStr);
    const qty = qtyInput == null ? 0 : qtyInput;
    const availableNow = Number.isFinite(Number(it.availableNow))
      ? Number(it.availableNow)
      : null;
    const shortage = Number.isFinite(Number(it.shortage))
      ? Math.max(0, Number(it.shortage))
      : availableNow != null
      ? Math.max(0, qty - availableNow)
      : 0;
    const effectiveQty =
      Number.isFinite(availableNow) && shortage > 0
        ? Math.max(0, availableNow)
        : qty;
    const unitInput = parseNullableNumber(it.unitPriceStr);
    const lineTotal =
      unitInput == null ? null : Math.max(0, effectiveQty * unitInput);

    return {
      item: it,
      idx,
      key: String(it.productId || idx),
      effectiveQty,
      lineTotal,
    };
  });

  return (
    <StepCard
      n={3}
      title="Pricing"
      subtitle="Update unit prices and charges."
      showNumber={false}
    >
      {showAvailability ? (
        <div className="mb-3 text-xs text-slate-500">
          Totals use available quantities when shortage exists. Adjust in Quantities.
        </div>
      ) : null}

      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onAssignUserPrices}
          disabled={quoteLocked || isBusy}
          title={quoteLocked ? lockReason : undefined}
          className={[
            "w-full rounded-xl border px-4 py-2.5 text-xs font-semibold transition sm:w-auto",
            quoteLocked || isBusy
              ? "cursor-not-allowed border-slate-200 bg-white text-slate-400"
              : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50",
          ].join(" ")}
        >
          Assign User Prices
        </button>
      </div>
      <div className="mb-3 text-[11px] text-slate-500">
        Loads prices into the inputs only. Click Update Pricing to save.
      </div>

      <div className="space-y-3 md:hidden">
        {itemRows.map((row) => (
          <div
            key={row.key}
            className="rounded-xl border border-slate-200 bg-white p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-900">
                  {row.item.sku || "-"}
                </div>
                {row.item.name ? (
                  <div className="text-[11px] text-slate-500">{row.item.name}</div>
                ) : null}
              </div>
              <div className="text-right">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Qty
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900 tabular-nums">
                  {row.effectiveQty}
                </div>
              </div>
            </div>

            <div className="mt-3">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Unit Price
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={row.item.unitPriceStr}
                disabled={quoteLocked || !row.item.productId}
                title={quoteLocked ? lockReason : undefined}
                onChange={(e) => onUnitPriceChange(row.idx, e.target.value)}
                className={[
                  "mt-2 w-full rounded-xl bg-white px-2 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20",
                  quoteLocked || !row.item.productId
                    ? "cursor-not-allowed bg-slate-50 text-slate-400"
                    : "",
                ].join(" ")}
                placeholder="0.00"
              />
            </div>

            <div className="mt-3 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Line total
              </span>
              <span className="text-sm font-semibold text-slate-900">
                {Number.isFinite(row.lineTotal) ? moneyPlain(row.lineTotal) : "-"}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full table-fixed text-left text-sm">
          <thead className="text-xs font-semibold text-slate-500">
            <tr className="border-b border-slate-200">
              <th className="w-[40%] py-2 pr-3">SKU</th>
              <th className="w-[20%] py-2 pr-3 text-center">Qty</th>
              <th className="w-[20%] py-2 pr-3">Unit Price</th>
              <th className="w-[20%] py-2 pr-3 text-right">Total</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {itemRows.map((row) => (
              <tr key={row.key} className="hover:bg-slate-50">
                  <td className="py-3 pr-3">
                    <div className="text-xs font-semibold text-slate-900">
                      {row.item.sku || "-"}
                    </div>
                    {row.item.name ? (
                      <div className="text-xs text-slate-500">{row.item.name}</div>
                    ) : null}
                  </td>

                  <td className="py-3 pr-3 text-center">
                    <span className="tabular-nums text-slate-900">
                      {row.effectiveQty}
                    </span>
                  </td>

                  <td className="py-3 pr-3">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.item.unitPriceStr}
                      disabled={quoteLocked || !row.item.productId}
                      title={quoteLocked ? lockReason : undefined}
                      onChange={(e) => onUnitPriceChange(row.idx, e.target.value)}
                      className={[
                        "w-24 rounded-xl bg-white px-2 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20",
                        quoteLocked || !row.item.productId
                          ? "cursor-not-allowed bg-slate-50 text-slate-400"
                          : "",
                      ].join(" ")}
                      placeholder="0.00"
                    />
                  </td>

                  <td className="py-3 pr-3 text-right font-semibold text-slate-900">
                    {Number.isFinite(row.lineTotal)
                      ? moneyPlain(row.lineTotal)
                      : "-"}
                  </td>
                </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <label className="mb-1 block text-xs font-semibold text-slate-600">
            Delivery charge
          </label>
          <select
            value={deliveryChargeStr}
            disabled={quoteLocked}
            title={quoteLocked ? lockReason : undefined}
            onChange={(e) => setDeliveryChargeStr(e.target.value)}
            className={[
              "w-full rounded-xl bg-white px-2 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20 sm:w-32",
              quoteLocked ? "cursor-not-allowed bg-slate-50 text-slate-400" : "",
            ].join(" ")}
          >
            {(deliveryOptions || []).map((option) => (
              <option key={option} value={String(option)}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <label className="mb-1 block text-xs font-semibold text-slate-600">
            Extra fee
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={extraFeeStr}
            disabled={quoteLocked}
            title={quoteLocked ? lockReason : undefined}
            onChange={(e) => setExtraFeeStr(e.target.value)}
            className={[
              "w-full rounded-xl bg-white px-2 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20 sm:w-32",
              quoteLocked ? "cursor-not-allowed bg-slate-50 text-slate-400" : "",
            ].join(" ")}
            placeholder="0.00"
          />
        </div>
      </div>

      {showUpdateError ? (
        <div className="mt-3">
          <ErrorMessage error={updateError} />
        </div>
      ) : null}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onUpdatePricing}
          disabled={!canUpdatePricing || isBusy}
          title={quoteLocked ? lockReason : undefined}
          className={[
            "w-full rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white transition sm:w-auto",
            canUpdatePricing && !isBusy
              ? "hover:bg-blue-500"
              : "cursor-not-allowed opacity-50",
          ].join(" ")}
        >
          {isUpdating ? "Updating..." : "Update Pricing"}
        </button>
      </div>
    </StepCard>
  );
}
