import { orderDestination } from '../../utils/adminOrderListState';
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FiArrowRight, FiBox, FiUserCheck } from "react-icons/fi";
import { packingProgressLabel, packingSecondary } from "../../utils/packing";
import SendToWorkerModal from "./SendToWorkerModal";

export default function AdminPackingPanel({ order }) {
  const { search } = useLocation();
  const [open, setOpen] = useState(false);
  const live = Boolean(order?.packingSentAt);
  const hasHistory = Boolean(live || order?.packingSummary?.totalItems);
  if (!order || (!hasHistory && order.status !== "Shipping")) return null;
  return <section id="packing-progress" aria-label="Packing summary" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
    <div className="flex min-w-0 items-start gap-3"><FiBox aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-slate-400" /><div><p className="text-sm font-semibold">Packing{live && order.assignedTo ? ' · ' + order.assignedTo : ''}</p><p className="mt-1 text-xs text-slate-500">{live || order.status !== 'Shipping' ? packingProgressLabel(order.packingSummary) : order.allocationStatus === 'Allocated' ? 'Reservations ready. Prepare manually or assign a worker.' : 'Reserve the items, then prepare manually or assign a worker.'}{order.packedAt ? <span className="ml-2 font-medium text-emerald-800">Packed</span> : live && order.packingSummary?.needsHelp && <span className="ml-2 font-semibold text-amber-800">Needs attention</span>}</p></div></div>
    {order.stockChecksPending > 0 && <Link to={orderDestination(order._id, search, { packing: true, reports: true })} className="min-h-11 content-center text-xs font-semibold text-amber-900 underline">Stock check needed ({order.stockChecksPending})</Link>}
    <div className="flex flex-wrap items-center gap-2">
      {hasHistory && <Link to={orderDestination(order._id, search, { packing: true })} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-indigo-700">{live || order.status !== 'Shipping' ? 'View packing' : 'Packing history'}<FiArrowRight aria-hidden="true" /></Link>}
      {order.status === 'Shipping' && <button type="button" className={packingSecondary} onClick={() => setOpen(true)}><FiUserCheck aria-hidden="true" />{live ? 'Worker assignment' : 'Send to worker'}</button>}
    </div>
    {open && <SendToWorkerModal orderId={order._id} onClose={() => setOpen(false)} />}
  </section>;
}
