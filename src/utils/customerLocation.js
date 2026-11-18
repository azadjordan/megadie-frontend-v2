const clean = value => typeof value === 'string' ? value.trim() : '';
export const locationOf = value => ({ address: clean(value?.address), googleMapsUrl: clean(value?.googleMapsUrl ?? value?.deliveryGoogleMapsUrl) });
export const locationChanged = (a, b) => JSON.stringify(locationOf(a)) !== JSON.stringify(locationOf(b));
export const needsMapReview = (bases, next) => bases.some(base => {
  const old = locationOf(base), current = locationOf(next);
  return old.address !== current.address && old.googleMapsUrl && old.googleMapsUrl === current.googleMapsUrl;
});
export function profileLocationPatch(base, next, confirmedMapLocation) {
  if (!locationChanged(base, next)) return {};
  const location = locationOf(next);
  return { address: location.address, deliveryGoogleMapsUrl: location.googleMapsUrl, expectedCustomerLocation: locationOf(base), confirmedMapLocation };
}
