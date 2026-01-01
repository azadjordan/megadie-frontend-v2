import StepCard from "./StepCard";
import ErrorMessage from "../../../components/common/ErrorMessage";
import { moneyPlain, parseNullableNumber } from "./helpers";

export default function PricingStep({
  items,
  onUnitPriceChange,
  deliveryChargeStr,
  setDeliveryChargeStr,
  extraFeeStr,
  setExtraFeeStr,
  quoteLocked,
  showAvailability,
  onAssignUserPrices,
  canUpdatePricing,
  onUpdatePricing,
  isBusy,
  isUpdating,
  showUpdateError,
  updateError,
}) {
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

      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={onAssignUserPrices}
          disabled={quoteLocked || isBusy}
          className={[
            "rounded-xl border px-4 py-2 text-xs font-semibold transition",
            quoteLocked || isBusy
              ? "cursor-not-allowed border-slate-200 bg-white text-slate-400"
              : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50",
          ].join(" ")}
        >
          Assign User Prices
        </button>
      </div>

      <div className="overflow-x-auto">
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
            {items.map((it, idx) => {
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

              return (
                <tr key={`${it.productId || idx}`} className="hover:bg-slate-50">
                  <td className="py-3 pr-3">
                    <div className="text-xs font-semibold text-slate-900">
                      {it.sku || "-"}
                    </div>
                    {it.name ? (
                      <div className="text-xs text-slate-500">{it.name}</div>
                    ) : null}
                  </td>

                  <td className="py-3 pr-3 text-center">
                    <span className="tabular-nums text-slate-900">
                      {effectiveQty}
                    </span>
                  </td>

                  <td className="py-3 pr-3">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={it.unitPriceStr}
                      disabled={quoteLocked || !it.productId}
                      onChange={(e) => onUnitPriceChange(idx, e.target.value)}
                      className={[
                        "w-24 rounded-xl bg-white px-2 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20",
                        quoteLocked || !it.productId
                          ? "cursor-not-allowed bg-slate-50 text-slate-400"
                          : "",
                      ].join(" ")}
                      placeholder="0.00"
                    />
                  </td>

                  <td className="py-3 pr-3 text-right font-semibold text-slate-900">
                    {Number.isFinite(lineTotal) ? moneyPlain(lineTotal) : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <label className="mb-1 block text-xs font-semibold text-slate-600">
            Delivery charge
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={deliveryChargeStr}
            disabled={quoteLocked}
            onChange={(e) => setDeliveryChargeStr(e.target.value)}
            className={[
              "w-32 rounded-xl bg-white px-2 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20",
              quoteLocked ? "cursor-not-allowed bg-slate-50 text-slate-400" : "",
            ].join(" ")}
            placeholder="0.00"
          />
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
            onChange={(e) => setExtraFeeStr(e.target.value)}
            className={[
              "w-32 rounded-xl bg-white px-2 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20",
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

      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onUpdatePricing}
          disabled={!canUpdatePricing || isBusy}
          className={[
            "rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition",
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
