import test from 'node:test';
import assert from 'node:assert/strict';
import { locationOf, locationChanged, needsMapReview, profileLocationPatch } from './customerLocation.js';

test('locations normalize profile and order fields and retain intentional blanks', () => {
  assert.deepEqual(locationOf({ address: ' A ', deliveryGoogleMapsUrl: ' https://maps.test/a ' }), { address: 'A', googleMapsUrl: 'https://maps.test/a' });
  assert.equal(locationChanged({ address: 'A' }, { address: ' A ', googleMapsUrl: '' }), false);
  assert.equal(locationOf({ googleMapsUrl: '', deliveryGoogleMapsUrl: 'old' }).googleMapsUrl, '');
});

test('retained pins need review for either the order or the optional client default', () => {
  const order = { address: 'A', googleMapsUrl: 'https://maps.test/a' };
  const defaults = { address: 'B', googleMapsUrl: 'https://maps.test/a' };
  assert.equal(Boolean(needsMapReview([order], order)), false);
  assert.equal(Boolean(needsMapReview([order, defaults], order)), true);
  assert.equal(Boolean(needsMapReview([order], { address: 'C', googleMapsUrl: '' })), false);
  assert.equal(Boolean(needsMapReview([order], { address: 'C', googleMapsUrl: 'https://maps.test/c' })), false);
});

test('unrelated profile edits omit location fields, while location edits include the original pair', () => {
  const base = { address: 'A', deliveryGoogleMapsUrl: 'https://maps.test/a' };
  assert.deepEqual(profileLocationPatch(base, base, false), {});
  assert.deepEqual(profileLocationPatch(base, { address: 'B', googleMapsUrl: '' }, false), {
    address: 'B', deliveryGoogleMapsUrl: '', expectedCustomerLocation: { address: 'A', googleMapsUrl: 'https://maps.test/a' }, confirmedMapLocation: false,
  });
});
