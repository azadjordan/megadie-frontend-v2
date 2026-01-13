export default function InventoryLocateModal({
  open,
  product,
  slotItems,
  slotItemsLoading,
  slotItemsError,
  slotItemsErrorMessage,
  onClose,
  formatQty,
}) {
  if (!open || !product) return null;

  const rows = Array.isArray(slotItems) ? slotItems : [];
  const qtyFormatter =
    typeof formatQty === "function" ? formatQty : (value) => value;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="locate-product-title"
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-xl ring-1 ring-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <div
              id="locate-product-title"
              className="text-sm font-semibold text-slate-900"
            >
              Locate product
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {product.sku || "SKU unavailable"}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:text-slate-900"
          >
            Close
          </button>
        </div>

        <div className="px-4 py-4">
          {slotItemsLoading ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Loading slot locations...
            </div>
          ) : slotItemsError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {slotItemsErrorMessage}
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              No slot items found for this product.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="grid grid-cols-12 gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                <div className="col-span-8">Slot</div>
                <div className="col-span-4 text-right">Qty</div>
              </div>
              {rows.map((item) => (
                <div
                  key={item.id || item._id}
                  className="grid grid-cols-12 gap-2 border-b border-slate-100 px-3 py-2 text-xs text-slate-700 last:border-b-0"
                >
                  <div className="col-span-8 font-semibold text-slate-900">
                    {item.slot?.label || "Unknown"}
                  </div>
                  <div className="col-span-4 text-right tabular-nums">
                    {qtyFormatter(item.qty)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
