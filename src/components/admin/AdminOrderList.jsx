import { createElement } from 'react';
import { Link } from 'react-router-dom';
import { FiAlertCircle, FiArchive, FiCheckCircle, FiClock, FiCreditCard, FiExternalLink, FiFileText, FiPackage, FiSlash, FiTruck } from 'react-icons/fi';
import { getAdminOrderActionState } from '../../utils/adminOrderActions';
import { orderDestination } from '../../utils/adminOrderListState';
import { getOrderTotals } from '../../utils/orderTotals';
import { formatInvoiceMoneyMinor, normalizeMinorUnitFactor } from '../../utils/invoiceMoney';
import AdminOrderMoreMenu from './AdminOrderMoreMenu';
import AdminOrderActionIcon from './AdminOrderActionIcon';

const focus = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600';
const button = 'inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-center text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-50 ' + focus;
const textAction = 'inline-flex min-h-11 max-w-full items-center gap-1 text-left text-[13px] font-medium text-blue-700 underline underline-offset-4 hover:text-blue-900 disabled:cursor-not-allowed disabled:opacity-50 ' + focus;
const tones = {
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
  active: 'bg-blue-50 text-blue-800 ring-blue-200',
  complete: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  followUp: 'bg-amber-50 text-amber-900 ring-amber-200',
  problem: 'bg-rose-50 text-rose-800 ring-rose-200',
};
const icons = { waiting: FiClock, reservation: FiArchive, packing: FiPackage, delivery: FiTruck, complete: FiCheckCircle, problem: FiAlertCircle, cancelled: FiSlash, invoice: FiFileText, payment: FiCreditCard };

function StatusTag({ part }) {
  return <span className={'inline-flex w-fit max-w-full items-center gap-1.5 rounded-md px-2 py-1 text-[13px] font-semibold ring-1 ring-inset ' + tones[part.tone]}>
    {createElement(icons[part.icon], { className: 'h-4 w-4 shrink-0', 'aria-hidden': true })}<span className="min-w-0 break-words">{part.label}</span>
  </span>;
}

function Part({ label, part }) {
  return <div role="group" aria-label={label} className="min-w-0 space-y-1.5">
    <p className="text-xs font-medium text-slate-500">{label}</p>
    <StatusTag part={part} />
    {part.detail && <p className="break-words text-xs leading-5 text-slate-600">{part.detail}</p>}
    {part.picking && <div role="progressbar" aria-label="Products fully picked" aria-valuemin={0} aria-valuemax={part.picking.total} aria-valuenow={part.picking.collected} aria-valuetext={`${part.picking.collected} of ${part.picking.total} products fully picked`} className="h-1.5 w-full max-w-48 overflow-hidden rounded-full bg-blue-100"><div className="h-full rounded-full bg-blue-500" style={{ width: (part.picking.collected / part.picking.total * 100) + '%' }} /></div>}
  </div>;
}

function actionHref(order, action, query) {
  if (action.id === 'open-order') return orderDestination(order._id, query, { tab: action.tab });
  if (action.id === 'reserve-stock') return orderDestination(order._id, query, { tab: 'stock' });
  if (['view-packing', 'review-help', 'review-reports'].includes(action.id)) return orderDestination(order._id, query, { packing: true, reports: action.id === 'review-reports' });
  return '';
}

function Identity({ order, query }) {
  const date = new Date(order.createdAt);
  const items = Array.isArray(order.orderItems) ? order.orderItems : [];
  const products = new Set(items.map(item => String(item.product?._id || item.product?.id || item.product || item.sku))).size;
  const units = items.reduce((sum, item) => sum + (Number.isFinite(Number(item.qty)) && Number(item.qty) > 0 ? Number(item.qty) : 0), 0);
  return <div className="min-w-0 space-y-1">
    <Link to={orderDestination(order._id, query)} className={'break-words text-sm font-semibold text-blue-800 underline decoration-blue-200 underline-offset-4 hover:decoration-blue-700 ' + focus}>{order.user?.name || 'Client unavailable'}</Link>
    <p className="break-all text-xs text-slate-600">{order.orderNumber || order._id}</p>
    {Number.isFinite(date.getTime()) && <time dateTime={order.createdAt} title={date.toLocaleString()} className="block text-xs text-slate-600">{date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time>}
    <p className="text-xs leading-5 tabular-nums text-slate-600"><span className="whitespace-nowrap">{products.toLocaleString()} {products === 1 ? 'item' : 'items'}</span>{' · '}<span className="whitespace-nowrap" title="Total ordered quantity in each product’s selling unit">{units.toLocaleString()} {units === 1 ? 'unit' : 'units'}</span></p>
  </div>;
}

function Billing({ order, state, onAction, isBusy, labeled = false }) {
  const b = state.billing;
  const totalMinor = Math.round(getOrderTotals(order).total * 100);
  const hasDue = b.invoice?.status === 'Issued' && b.hasBalanceData && b.balanceDueMinor > 0;
  const currency = b.invoice?.currency || 'AED';
  const factor = normalizeMinorUnitFactor(b.invoice?.minorUnitFactor);
  const total = formatInvoiceMoneyMinor(totalMinor, 'AED', 100);
  const amount = hasDue ? formatInvoiceMoneyMinor(b.balanceDueMinor, currency, factor) : total;
  const showTotal = hasDue && (currency !== 'AED' || b.balanceDueMinor / factor !== totalMinor / 100);
  const dueDate = hasDue && b.invoice?.dueDate ? new Date(b.invoice.dueDate) : null;
  return <div role="group" aria-label="Billing" className="min-w-0 space-y-1.5">
    {labeled && <p className="text-xs font-medium text-slate-500">Billing</p>}
    <StatusTag part={b} />
    <p className="break-words text-sm font-semibold tabular-nums text-slate-900"><span className="mr-1 text-xs font-normal text-slate-600">{hasDue ? 'Due' : 'Total'}</span>{amount}</p>
    {showTotal && <p className="break-words text-xs tabular-nums text-slate-600">Total {total}</p>}
    {b.detail && <p className="break-words text-xs leading-5 text-slate-600">{b.detail}</p>}
    {dueDate && Number.isFinite(dueDate.getTime()) && <p className="text-xs text-slate-600">Due {dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: dueDate.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' })}</p>}
    {b.invoiceId && <button type="button" className={textAction} aria-label={'Open PDF for invoice ' + b.invoiceLabel} disabled={isBusy(order, 'pdf')} onClick={() => onAction(order, { id: 'pdf' })}><AdminOrderActionIcon id="pdf" busy={isBusy(order, 'pdf')} /><span className="min-w-0 break-all">{b.invoiceLabel}</span><FiExternalLink aria-hidden="true" className="h-3.5 w-3.5 shrink-0" /></button>}
  </div>;
}

function Stock({ order, state, query, labeled = false }) {
  const stock = state.stock;
  return <div role="group" aria-label="Stock" className="min-w-0 space-y-1.5">
    {labeled && <p className="text-xs font-medium text-slate-500">Stock</p>}
    <StatusTag part={stock} />
    {stock.detail && <p className="break-words text-xs leading-5 text-slate-600">{stock.detail}</p>}
    {stock.checksPending > 0 && <Link to={orderDestination(order._id, query, { packing: true, reports: true })} className={'inline-flex min-h-11 max-w-full items-center gap-1.5 text-xs font-medium text-amber-900 underline underline-offset-4 hover:text-amber-950 ' + focus}><AdminOrderActionIcon id="review-reports" /><span>{stock.checksPending} {stock.checksPending === 1 ? 'report needs' : 'reports need'} checking</span></Link>}
    {!stock.checksKnown && <p className="text-xs text-amber-900">Check status unavailable</p>}
  </div>;
}

function Actions({ order, state, query, onAction, isBusy }) {
  const action = state.primaryAction;
  const href = action && actionHref(order, action, query);
  const color = action?.quiet ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50' : 'bg-blue-700 text-white hover:bg-blue-800';
  const busy = action && isBusy(order, action.id);
  const content = action && <><AdminOrderActionIcon id={action.id} busy={busy} /><span className="min-w-0">{busy ? 'Working…' : action.label}</span></>;
  return <div className="flex flex-wrap items-start justify-end gap-2">
    {action && (href && !busy ? <Link to={href} title={action.reason || undefined} className={button + ' ' + color}>{content}</Link> : <button type="button" className={button + ' ' + color} title={action.reason || undefined} disabled={busy} onClick={() => onAction(order, action)}>{content}</button>)}
    <AdminOrderMoreMenu label={(order.user?.name || 'Client unavailable') + ' · ' + (order.orderNumber || order._id)} items={state.secondaryActions.map(item => ({ ...item, href: actionHref(order, item, query), disabled: isBusy(order, item.id) }))} onAction={item => onAction(order, item)} />
  </div>;
}

export default function AdminOrderList({ orders, query, desktop, onAction, isBusy }) {
  const rows = orders.map(order => ({ order, state: getAdminOrderActionState(order) }));
  if (!desktop) return <div className="grid gap-3">{rows.map(({ order, state }) => <article key={order._id} aria-label={'Order ' + (order.orderNumber || order._id)} className="min-w-0 space-y-4 rounded-xl border border-slate-200 bg-white p-4">
    <Identity order={order} query={query} />
    <div className="grid min-w-0 grid-cols-2 items-start gap-x-4 gap-y-5">
      <Part label="Preparation" part={state.preparation} /><Part label="Delivery" part={state.delivery} />
      <Billing order={order} state={state} onAction={onAction} isBusy={isBusy} labeled /><Stock order={order} state={state} query={query} labeled />
    </div>
    <div className="border-t border-slate-100 pt-3"><Actions order={order} state={state} query={query} onAction={onAction} isBusy={isBusy} /></div>
  </article>)}</div>;
  return <div className="overflow-hidden rounded-xl border border-slate-200 bg-white"><table className="w-full table-fixed text-left" aria-label="Admin orders">
    <colgroup><col className="w-[22%]" /><col className="w-[22%]" /><col className="w-[22%]" /><col className="w-[15%]" /><col className="w-[19%]" /></colgroup>
    <thead><tr className="bg-slate-50 text-xs text-slate-600">{['Order / client', 'Preparation & delivery', 'Billing', 'Stock', 'Next action'].map((label, index) => <th key={label} scope="col" className={'border-b border-slate-200 px-3 py-3 font-semibold ' + (index === 4 ? 'text-right' : '')}>{label}</th>)}</tr></thead>
    <tbody>{rows.map(({ order, state }) => <tr key={order._id} className="odd:bg-white even:bg-slate-50 hover:bg-slate-100/80 focus-within:bg-slate-100/80 transition-colors">
      <td className="border-b border-slate-100 px-3 py-4 align-top"><Identity order={order} query={query} /></td>
      <td className="space-y-4 border-b border-slate-100 px-3 py-4 align-top"><Part label="Preparation" part={state.preparation} /><Part label="Delivery" part={state.delivery} /></td>
      <td className="border-b border-slate-100 px-3 py-4 align-top"><Billing order={order} state={state} onAction={onAction} isBusy={isBusy} /></td>
      <td className="border-b border-slate-100 px-3 py-4 align-top"><Stock order={order} state={state} query={query} /></td>
      <td className="border-b border-slate-100 px-3 py-4 align-top"><Actions order={order} state={state} query={query} onAction={onAction} isBusy={isBusy} /></td>
    </tr>)}</tbody>
  </table></div>;
}
