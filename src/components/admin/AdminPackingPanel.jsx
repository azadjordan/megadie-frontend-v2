import { useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowRight, FiBox } from "react-icons/fi";
import { packingProgressLabel, packingSecondary } from "../../utils/packing";
import SendToWorkerModal from "./SendToWorkerModal";

export default function AdminPackingPanel({ order }) {
  const [open, setOpen] = useState(false);
  const hasHistory = Boolean(order?.packingSentAt || (order?.status === "Cancelled" && order?.packingSummary?.totalItems));
  if (!order || (!hasHistory && order.status !== "Shipping")) return null;
  return <section id="packing-progress" aria-label="Packing summary" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
    <div className="flex min-w-0 items-start gap-3"><FiBox aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-slate-400" /><div><p className="text-sm font-semibold">Packing{hasHistory && order.assignedTo ? ' · ' + order.assignedTo : ''}</p><p className="mt-1 text-xs text-slate-500">{hasHistory ? packingProgressLabel(order.packingSummary) : "Reserve the items, then assign a worker."}{order.packedAt ? <span className="ml-2 font-medium text-emerald-800">Packed</span> : order.packingSummary?.needsHelp && <span className="ml-2 font-semibold text-amber-800">Needs attention</span>}</p></div></div>
    {order.stockChecksPending > 0 && <Link to={'/admin/orders/' + order._id + '/packing#stock-reports'} className="min-h-11 content-center text-xs font-semibold text-amber-900 underline">Stock check needed ({order.stockChecksPending})</Link>}
    {hasHistory ? <Link to={'/admin/orders/' + order._id + '/packing'} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-indigo-700">View packing<FiArrowRight aria-hidden="true" /></Link>
      : <button type="button" className={packingSecondary} onClick={() => setOpen(true)}>Send to worker</button>}
    {open && <SendToWorkerModal orderId={order._id} onClose={() => setOpen(false)} />}
  </section>;
}
