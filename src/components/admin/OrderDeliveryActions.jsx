import { getOrderDeliveryActions } from '../../utils/adminOrderActions';
import AdminOrderMoreMenu from './AdminOrderMoreMenu';
import AdminOrderActionIcon from './AdminOrderActionIcon';

export default function OrderDeliveryActions({ order, onAction }) {
  const { primary, secondary } = getOrderDeliveryActions(order);
  if (!primary && !secondary.length) return null;
  return <div className="flex flex-wrap items-center gap-2">
    {primary && <button type="button" onClick={() => onAction(primary)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"><AdminOrderActionIcon id={primary.id} />{primary.label}</button>}
    {secondary.length > 0 && <AdminOrderMoreMenu label={'delivery · ' + order.orderNumber} items={secondary} onAction={onAction} />}
  </div>;
}
