import { FiAlertTriangle, FiClock } from "react-icons/fi";

export function StatusBadge({ status }) {
  const base =
    "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset";

  const map = {
    Processing: "bg-slate-50 text-slate-700 ring-slate-200",
    Quoted: "bg-violet-50 text-violet-700 ring-violet-300",
    Confirmed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    Cancelled: "bg-rose-50 text-rose-700 ring-rose-200",
  };

  return (
    <span className={`${base} ${map[status] || map.Processing}`}>
      {status === "Processing" ? <FiClock className="h-3 w-3" /> : null}
      {status || "-"}
    </span>
  );
}

export function AvailabilityBadge({ status, label, className = "" }) {
  const base =
    "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset";
  const map = {
    AVAILABLE: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    PARTIAL: "bg-amber-50 text-amber-700 ring-amber-200",
    SHORTAGE: "bg-amber-50 text-amber-700 ring-amber-200",
    NOT_AVAILABLE: "bg-rose-50 text-rose-700 ring-rose-200",
    NOT_CHECKED: "bg-slate-50 text-slate-600 ring-slate-200",
  };
  const labelMap = {
    AVAILABLE: "Available",
    PARTIAL: "Shortage",
    SHORTAGE: "Shortage",
    NOT_AVAILABLE: "Not available",
    NOT_CHECKED: "Not checked",
  };
  const resolvedLabel =
    label !== undefined && label !== null && label !== ""
      ? label
      : labelMap[status] || labelMap.NOT_CHECKED;
  return (
    <span className={`${base} ${map[status] || map.NOT_CHECKED} ${className}`}>
      {status === "SHORTAGE" ? <FiAlertTriangle className="h-3 w-3" /> : null}
      {resolvedLabel}
    </span>
  );
}
