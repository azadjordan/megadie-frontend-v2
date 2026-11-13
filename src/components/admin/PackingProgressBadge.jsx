import { Link } from "react-router-dom";
import { packingProgressLabel } from "../../utils/packing";

export default function PackingProgressBadge({ order }) {
  if (!order?.packingSentAt && !order?.stockChecksPending) return null;
  return <Link to={'/admin/orders/' + order._id + '/packing'} aria-label={'View packing for ' + order.orderNumber} className="mt-2 inline-flex flex-wrap items-center gap-2 rounded-md py-1 text-xs hover:underline focus-visible:outline-2 focus-visible:outline-indigo-600">{order.packingSentAt && <span className="text-slate-600">{order.assignedTo} · {packingProgressLabel(order.packingSummary)}</span>}{order.packedAt && <span className="rounded-md bg-emerald-50 px-2 py-1 font-semibold text-emerald-800">Packed</span>}{order.packingSummary?.needsHelp && <span className="rounded-md bg-amber-50 px-2 py-1 font-semibold text-amber-900">Needs attention</span>}{order.stockChecksPending > 0 && <span className="rounded-md bg-amber-50 px-2 py-1 font-semibold text-amber-900">Stock check needed ({order.stockChecksPending})</span>}</Link>;
}
