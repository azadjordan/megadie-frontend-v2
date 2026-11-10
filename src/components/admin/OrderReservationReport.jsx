export default function OrderReservationReport({ result, onReview, canReview, busy }) {
  if (!result) return null;
  const issues = result.issues || [];
  const success = result.type === "success";
  return (
    <section
      role={success ? "status" : "alert"}
      aria-label="Order reservation result"
      className={`mt-4 rounded-xl p-4 ring-1 ring-inset ${success ? "bg-emerald-50 text-emerald-950 ring-emerald-200" : "bg-amber-50 text-amber-950 ring-amber-200"}`}
    >
      <h3 className="text-sm font-semibold">{result.title}</h3>
      <p className="mt-1 text-xs">{result.message}</p>
      {result.stale && <p className="mt-2 text-xs font-medium">Reservations changed since this report. Check again for current availability.</p>}
      {issues.length > 0 && (
        <div className="mt-4 space-y-3">
          <div aria-hidden="true" className="hidden grid-cols-[minmax(0,2fr)_repeat(5,minmax(0,1fr))] gap-2 text-right text-[11px] font-medium text-amber-800 sm:grid">
            <span className="text-left">Item / issue</span><span>Ordered</span><span>Reserved</span><span>Needed</span><span>Available</span><span>Short</span>
          </div>
          {issues.map((issue, index) => (
            <article key={`${issue.productId || "order"}-${index}`} aria-label={issue.sku || "Reservation issue"} className="grid gap-3 border-t border-amber-200 pt-3 sm:grid-cols-[minmax(0,2fr)_repeat(5,minmax(0,1fr))] sm:gap-2">
              <div className="min-w-0">
                <div className="break-words text-xs font-semibold">{issue.sku || "Order reservation"}</div>
                <p className="mt-1 break-words text-xs">{issue.message}</p>
                {issue.productId && canReview(issue.productId) && <button type="button" onClick={() => onReview(issue.productId)} disabled={busy} className="mt-2 min-h-10 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Review item</button>}
              </div>
              {[["Ordered", "orderedQty"], ["Already reserved", "reservedQty"], ["Still needed", "neededQty"], ["Available in recommended slots", "availableQty"], ["Short", "shortageQty"]].map(([label, key]) => (
                <div key={key} className="flex justify-between gap-3 text-xs sm:block sm:text-right">
                  <span className="text-amber-800 sm:sr-only">{label}</span>
                  <span className={`tabular-nums ${key === "shortageQty" && issue[key] > 0 ? "font-semibold text-rose-700" : ""}`}>{issue[key] ?? "—"}</span>
                </div>
              ))}
            </article>
          ))}
          <p className="text-xs text-amber-800">Available quantities refer to valid recommended slots. Existing reserved slots are kept unchanged. Resolve these issues, then check the whole order again.</p>
        </div>
      )}
    </section>
  );
}
