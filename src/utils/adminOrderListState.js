export const ORDER_LIST_QUERY_KEYS = ['page', 'search', 'status', 'paymentStatus', 'work', 'limit'];
export function orderListParams(raw = '') {
  const source = new URLSearchParams(raw), result = new URLSearchParams();
  for (const key of ORDER_LIST_QUERY_KEYS) if (source.get(key)) result.set(key, source.get(key));
  return result;
}
export function orderListHref(raw = '') {
  const query = orderListParams(raw).toString();
  return '/admin/orders' + (query ? '?' + query : '');
}
export function orderDestination(orderId, raw = '', { packing = false, tab = '', reports = false } = {}) {
  const params = orderListParams(raw);
  if (tab) params.set('tab', tab);
  const query = params.toString();
  return '/admin/orders/' + orderId + (packing ? '/packing' : '') + (query ? '?' + query : '') + (reports ? '#stock-reports' : '');
}
