const labels = { waiting: 'Waiting for packing', ready: 'Ready to deliver', out: 'Out for delivery', returned: 'Back in store', delivered: 'Delivered', cancelled: 'Cancelled' };
export const deliveryLabel = task => !task.worker && task.status === 'Shipping' && ['ready', 'returned'].includes(task.deliveryState)
  ? 'Waiting for delivery assignment' : labels[task.deliveryState] || 'Delivery';
export const deliveryTone = task => task.deliveryState === 'delivered' ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : task.deliveryState === 'returned' ? 'bg-amber-50 text-amber-900 ring-amber-200' : task.deliveryState === 'waiting' || task.deliveryState === 'cancelled' ? 'bg-slate-100 text-slate-700 ring-slate-200' : 'bg-blue-50 text-blue-800 ring-blue-200';

export function deliveryMapAction(delivery) {
  if (!delivery) return null;
  // Shared map links are often opaque short URLs. Open their exact pin rather
  // than inventing a directions destination from the URL or a less precise address.
  if (delivery.googleMapsUrl) {
    try {
      const url = new URL(delivery.googleMapsUrl);
      if (url.protocol === 'https:' && !url.username && !url.password) {
        const googleMap = url.hostname === 'maps.google.com' || (['www.google.com', 'google.com'].includes(url.hostname) && url.pathname.startsWith('/maps'));
        const destination = googleMap ? url.searchParams.get('destination') || url.searchParams.get('query') || url.searchParams.get('q') : null;
        if (destination && !/^https?:/i.test(destination)) {
          const directions = new URL('https://www.google.com/maps/dir/');
          directions.searchParams.set('api', '1'); directions.searchParams.set('destination', destination);
          const place = url.searchParams.get('destination_place_id') || url.searchParams.get('query_place_id');
          if (place) directions.searchParams.set('destination_place_id', place);
          return { href: directions.href, label: 'Get directions' };
        }
        return { href: url.href, label: 'Open map' };
      }
    }
    catch { /* Fall back to a saved address. */ }
  }
  return delivery.address?.trim() ? { href: 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(delivery.address.trim()), label: 'Get directions' } : null;
}
