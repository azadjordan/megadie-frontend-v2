export function StatusBadge({ status }) {
  const base =
    "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset";

  const map = {
    Processing: "bg-slate-50 text-slate-700 ring-slate-200",
    Shipping: "bg-blue-50 text-blue-700 ring-blue-200",
    Delivered: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    Cancelled: "bg-rose-50 text-rose-700 ring-rose-200",
  };

  return (
    <span className={`${base} ${map[status] || map.Processing}`}>
      {status || "-"}
    </span>
  );
}

export function StockBadge({ isFinalized }) {
  if (!isFinalized) return null;
  return (
    <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset bg-emerald-50 text-emerald-700 ring-emerald-200">
      Finalized
    </span>
  );
}
