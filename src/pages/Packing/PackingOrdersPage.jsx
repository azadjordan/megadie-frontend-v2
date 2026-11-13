import { useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowRight, FiBox, FiCheck, FiRefreshCw, FiTruck } from "react-icons/fi";
import { useGetPackingOrdersQuery } from "../../features/packing/packingApiSlice";
import { packingTaskLabel, packingProgressLabel, packingDate, packingSecondary } from "../../utils/packing";

const queues = [
  { key: "to_pack", title: "To pack", description: "Collect the items, then check and pack the carton.", empty: "No orders waiting to pack.", Icon: FiBox },
  { key: "ready_delivery", title: "Ready to deliver", description: "Packed orders with delivery assigned to you.", empty: "No deliveries waiting.", Icon: FiTruck },
  { key: "ready_handoff", title: "Ready for handoff", description: "Packing is complete. Keep these cartons ready for collection.", empty: "No packed orders waiting for handoff.", Icon: FiCheck },
];

function OrderCard({ order }) {
  const summary = order.summary || {};
  const started = summary.collectedItems > 0 || summary.inProgressItems > 0;
  const action = order.packedAt ? (order.preparationMode === "prepare_deliver" ? "View delivery" : "View packed order") : started ? "Continue packing" : "Open order";
  const progress = summary.totalItems ? Math.round(100 * (summary.collectedItems || 0) / summary.totalItems) : 0;
  return <article className="h-full">
    <Link to={'/packing/orders/' + order.orderId} aria-label={action + ' for ' + order.customerName + ', ' + order.orderNumber}
      className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600">
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-medium">
        <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-600">{packingTaskLabel(order.preparationMode)}</span>
        {(summary.needsHelp || order.helpRequestedItems > 0) && <span className="rounded-md bg-amber-100 px-2 py-1 text-amber-900">{order.helpRequestedItems > 0 ? 'Admin help requested' : 'Needs attention'}</span>}
        {order.packedAt && <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-800">Packed</span>}
      </div>
      <h3 className="break-words text-xl font-semibold leading-snug text-slate-900">{order.customerName}</h3>
      <p className="mt-1 break-all text-xs text-slate-500">{order.orderNumber}</p>
      <div className="mt-4"><p className="text-xs text-slate-500">Carton tag</p><p className="mt-1 break-words text-sm font-medium text-slate-900">{order.label}</p></div>
      <div className="mt-5 grow">
        <p className="text-sm font-medium text-slate-700">{packingProgressLabel(summary)}</p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true"><div className={'h-full rounded-full ' + (order.packedAt ? 'bg-emerald-500' : 'bg-indigo-500')} style={{ width: progress + '%' }} /></div>
        {summary.inProgressItems > 0 && <p className="mt-2 text-xs text-slate-500">{summary.inProgressItems} {summary.inProgressItems === 1 ? "product partially picked" : "products partially picked"}</p>}
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
        <span className="text-xs text-slate-500">{order.packedAt ? 'Packed ' : 'Assigned '}{packingDate(order.packedAt || order.sentAt)}</span>
        <span className="inline-flex min-h-8 items-center gap-2 text-sm font-semibold text-indigo-700">{action}<FiArrowRight aria-hidden="true" className="transition group-hover:translate-x-1" /></span>
      </div>
    </Link>
  </article>;
}

export default function PackingOrdersPage() {
  const [pages, setPages] = useState({});
  const query = useGetPackingOrdersQuery(pages, { pollingInterval: 15000, skipPollingIfUnfocused: true, refetchOnReconnect: true, refetchOnFocus: true });
  const groups = query.currentData?.groups;
  if ([403, 404].includes(query.error?.status)) return <p role="alert">Packing access changed. Sign out and check with an admin.</p>;
  return <div className="space-y-8">
    <header className="flex items-start justify-between gap-3">
      <div><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">My packing orders</h1><p className="mt-2 text-sm text-slate-500">Your assigned orders, from picking to handoff.</p></div>
      <button type="button" onClick={query.refetch} disabled={query.isFetching} className={packingSecondary} aria-label="Refresh orders"><FiRefreshCw aria-hidden="true" className={query.isFetching ? 'animate-spin' : ''} /><span className="hidden sm:inline">Refresh</span></button>
    </header>
    {query.isError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><p>{groups ? "Could not refresh. Your last saved order list is shown." : "Could not load your packing orders."}</p><button type="button" onClick={query.refetch} className="mt-2 min-h-11 font-semibold underline">Retry</button></div>}
    {queues.map(queue => {
      const { key, title, description, empty } = queue;
      const group = groups?.[key];
      const pagination = group?.pagination;
      return <section key={key} aria-labelledby={'queue-' + key} className="space-y-4">
        <div className="flex items-start gap-3"><span className="mt-0.5 rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500"><queue.Icon className="h-5 w-5" aria-hidden="true" /></span><div><h2 id={'queue-' + key} className="flex items-center gap-2 text-lg font-semibold">{title}{pagination && <span className="rounded-md bg-slate-200/70 px-2 py-0.5 text-xs tabular-nums text-slate-600">{pagination.total}</span>}</h2><p className="mt-1 text-sm text-slate-500">{description}</p></div></div>
        {!groups ? <div role="status" className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">{query.isError ? "Orders unavailable." : "Loading orders…"}</div>
          : !pagination?.total ? <p className="rounded-xl border border-dashed border-slate-300 px-5 py-4 text-sm text-slate-500">{empty}</p>
          : <><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{group.data.map(order => <OrderCard key={order.orderId} order={order} />)}</div>
            {!group.data.length && <p className="text-sm text-slate-500">Assignments changed. Refresh to see the latest orders.</p>}
            {(pagination.page > 1 || pagination.hasNext) && <nav aria-label={title + ' pages'} className="flex items-center justify-between gap-3"><button type="button" disabled={query.isFetching || pagination.page === 1} onClick={() => setPages({ ...pages, [key + 'Page']: pagination.page - 1 })} className={packingSecondary}>Previous</button><span className="text-sm text-slate-500">Page {pagination.page}</span><button type="button" disabled={query.isFetching || !pagination.hasNext} onClick={() => setPages({ ...pages, [key + 'Page']: pagination.page + 1 })} className={packingSecondary}>Next</button></nav>}
          </>}
      </section>;
    })}
  </div>;
}
