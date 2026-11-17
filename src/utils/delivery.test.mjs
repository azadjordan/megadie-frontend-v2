import test from 'node:test';
import assert from 'node:assert/strict';
import { deliveryMapAction } from './delivery.js';

test('directions preserve the saved Google destination and place identity over a less precise address', () => {
  const action = deliveryMapAction({ address: 'Old address', googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=25.123%2C55.456&query_place_id=ChIJ-test' });
  const url = new URL(action.href);
  assert.equal(action.label, 'Get directions'); assert.equal(url.searchParams.get('destination'), '25.123,55.456');
  assert.equal(url.searchParams.get('destination_place_id'), 'ChIJ-test');
});
test('opaque saved pins open unchanged without inventing coordinates or using a competing address', () => {
  const pin = 'https://maps.app.goo.gl/AbCdEf';
  assert.deepEqual(deliveryMapAction({ googleMapsUrl: pin, address: 'Less precise address' }), { href: pin, label: 'Open map' });
});
test('address directions encode reserved characters and missing destinations create no link', () => {
  const address = 'Shop #3 & 4, Al Ain + Gate B';
  assert.equal(new URL(deliveryMapAction({ address }).href).searchParams.get('destination'), address);
  assert.equal(deliveryMapAction({ address: '   ' }), null);
});
test('unsafe links cannot become executable navigation targets or trusted Google destinations', () => {
  for (const googleMapsUrl of ['javascript:alert(1)', 'http://unsafe.test', 'https://user:password@example.com']) assert.equal(deliveryMapAction({ googleMapsUrl }), null);
  const url = 'https://www.google.com.attacker.test/?q=Wrong+place';
  assert.deepEqual(deliveryMapAction({ googleMapsUrl: url }), { href: url, label: 'Open map' });
});
