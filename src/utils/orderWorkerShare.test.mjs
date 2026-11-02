import test from "node:test";
import assert from "node:assert/strict";
import { buildWorkerOrderShareText } from "./orderWorkerShare.js";
import { buildCourierShareText, getCourierMissingFields, hasCourierProfileChanges } from "./orderCourierShare.js";

const white = "RIB|GRO|1-IN|WHITE|029|A+|100YD-ROLL";
const cream = "RIB|GRO|1-IN|CREAM|815|A+|100YD-ROLL";
const details = { contactName: "Order Recipient", phoneNumber: "+123456", address: "Alain Sinaiyah", googleMapsUrl: "https://maps.app.goo.gl/8pHDhvf8hYfVStr77?g_st=ic", secondaryPhoneNumber: "PRIVATE-BACKUP-PHONE", notes: "PRIVATE-DELIVERY-NOTES" };
const sheet = { label: "ASPP-9E7D51", orderNumber: "ORD-261101-9E7D51", status: "Shipping", delivery: { details }, problems: [], notices: [],
  picks: [
    { slot: "L2-AE1", sku: white, name: "FORBIDDEN-WHITE-DESCRIPTION", qty: 3 },
    { slot: "E7-AE1", sku: cream, name: "FORBIDDEN-CREAM-DESCRIPTION", qty: 2 },
    { slot: "L1-AE1", sku: white, name: "FORBIDDEN-WHITE-DESCRIPTION", qty: 5 },
  ],
  items: [{ sku: white, name: "FORBIDDEN-WHITE-NAME", orderedQty: 8, allocatedQty: 8 }, { sku: cream, name: "FORBIDDEN-CREAM-NAME", orderedQty: 2, allocatedQty: 2 }] };

const expected = `*Carton Tag: ASPP-9E7D51*

*PREPARE & DELIVER — ORDER #ORD-261101-9E7D51*

*2 items — 10 units*

*1. PICK*

• *${white}*

- L1-AE1: 5 units
- L2-AE1: 3 units
- Total: 8 units

• *${cream}*

- E7-AE1: 2 units
- Total: 2 units

*2. PACK & CHECK*

- ${white} — 8 units
- ${cream} — 2 units

*Total: 2 items — 10 units*

*3. DELIVER*

Address: Alain Sinaiyah

Map: https://maps.app.goo.gl/8pHDhvf8hYfVStr77?g_st=ic`;

test("matches the requested SKU-first message with carton tag and both order summaries", () => {
  assert.equal(buildWorkerOrderShareText(sheet), expected);
});

test("omits all product names/descriptions, contacts, notes, store and financial details", () => {
  const text = buildWorkerOrderShareText({ ...sheet, store: { address: "PRIVATE-STORE" }, totalPrice: 999999,
    adminToAdminNote: "SECRET-NOTE", invoice: "SECRET-INVOICE", user: { email: "SECRET-EMAIL" } });
  assert.doesNotMatch(text, /FORBIDDEN|PRIVATE|SECRET|999999|Order Recipient|\+123456|Contact:|Phone:|Notes:|SKUs?/);
  assert.match(text, /Address: Alain Sinaiyah/);
});

test("aggregates repeated SKUs and repeated slots without mutating the response", () => {
  const duplicate = { ...sheet,
    items: [{ sku: white, orderedQty: 3 }, { sku: cream, orderedQty: 2 }, { sku: white, orderedQty: 5 }],
    picks: [{ slot: "E7-AE1", sku: cream, qty: 2 }, { slot: "L2-AE1", sku: white, qty: 3 },
      { slot: "L1-AE1", sku: white, qty: 2 }, { slot: "L1-AE1", sku: white, qty: 3 }],
  };
  const before = structuredClone(duplicate);
  assert.equal(buildWorkerOrderShareText(duplicate), expected);
  assert.deepEqual(duplicate, before);
});

test("naturally sorts each SKU's slots and handles one item and one unit", () => {
  const one = { ...sheet, items: [{ sku: white, orderedQty: 1 }], picks: [{ sku: white, slot: "A1-AE1", qty: 1 }], delivery: { details: { googleMapsUrl: details.googleMapsUrl } } };
  const text = buildWorkerOrderShareText(one);
  assert.match(text, /\*1 item — 1 unit\*/);
  assert.match(text, /- Total: 1 unit/);
  assert.doesNotMatch(text, /Address:|Contact:|Phone:/);
  const three = buildWorkerOrderShareText({ ...one, items: [{ sku: white, orderedQty: 3 }], picks: ["A10-AE1", "A2-AE1", "A1-AE1"].map((slot) => ({ sku: white, slot, qty: 1 })) });
  assert.ok(three.indexOf("- A1-AE1") < three.indexOf("- A2-AE1"));
  assert.ok(three.indexOf("- A2-AE1") < three.indexOf("- A10-AE1"));
});

test("drafts retain quantity warnings and distinguish picked totals from expected packing totals", () => {
  const text = buildWorkerOrderShareText({ ...sheet, problems: ["Ordered 8, allocated 3. Confirm before picking."], notices: ["Stock already deducted — verify physical collection"],
    picks: [{ sku: white, slot: "L1-AE1", qty: 3, deducted: true }], delivery: { details: {} } });
  assert.match(text, /PREPARATION DRAFT — HOLD/);
  assert.match(text, /Ordered 8, allocated 3/);
  assert.match(text, /verify physical collection/);
  assert.match(text, /- L1-AE1: 3 units \(3 deducted\)\n- Total: 3 units/);
  assert.ok(text.includes(`- ${white} — 8 units`));
  assert.match(text, /Total: 2 items — 10 units/);
  assert.doesNotMatch(text, /Contact:|Phone:|Notes:/);
});

test("closed orders cannot produce new preparation instructions", () => {
  for (const status of ["Delivered", "Cancelled"]) assert.throws(() => buildWorkerOrderShareText({ ...sheet, status }), /Closed orders/);
});

test("Courier uses the same explicit destination and preserves its external pickup and totals", () => {
  const courierDetails = { ...details, address: "Customer destination" };
  const order = { orderNumber: sheet.orderNumber, user: { name: "Wrong live name", address: "WRONG live address" },
    resolvedDelivery: { details: courierDetails }, orderItems: [{ qty: 2, unitPrice: 10 }] };
  const text = buildCourierShareText(order);
  assert.match(text, /Order Recipient/);
  assert.match(text, /Customer destination/);
  assert.match(text, /Order total:/);
  assert.match(text, /_PICKUP_/);
  assert.doesNotMatch(text, /Wrong live|WRONG live/);
  assert.doesNotMatch(buildCourierShareText({ ...order, resolvedDelivery: { details: {} } }), /WRONG live/);
});

test("delivery form recognizes contact, address/map completeness and notes-only edits", () => {
  assert.deepEqual(getCourierMissingFields(details), []);
  assert.equal(getCourierMissingFields({ phoneNumber: "123", googleMapsUrl: "https://maps.example" })[0].key, "contactName");
  assert.ok(hasCourierProfileChanges(details, { ...details, notes: "New hours" }));
  assert.equal(hasCourierProfileChanges(details, { ...details, address: "  Alain Sinaiyah  " }), false);
});
