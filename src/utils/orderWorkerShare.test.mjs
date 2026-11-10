import test from "node:test";
import assert from "node:assert/strict";
import { buildWorkerOrderShareText } from "./orderWorkerShare.js";
import { buildCourierShareText, getCourierMissingFields, hasCourierProfileChanges } from "./orderCourierShare.js";

const white = "RIB|GRO|1-IN|WHITE|029|A+|100YD-ROLL";
const cream = "RIB|GRO|1-IN|CREAM|815|A+|100YD-ROLL";
const details = { contactName: "Order Recipient", phoneNumber: "+123456", address: "Alain Sinaiyah", googleMapsUrl: "https://maps.app.goo.gl/8pHDhvf8hYfVStr77?g_st=ic", secondaryPhoneNumber: "PRIVATE-BACKUP-PHONE", notes: "PRIVATE-DELIVERY-NOTES" };
const sheet = { preparationMode: "prepare_deliver", assignedTo: "Ahmed", customerName: "Ahmed Trading", label: "Ahmed Trading — 9E7D51", orderNumber: "ORD-261101-9E7D51", status: "Shipping", delivery: { details }, problems: [], notices: [],
  picks: [
    { slot: "L2-AE1", sku: white, name: "FORBIDDEN-WHITE-DESCRIPTION", qty: 3 },
    { slot: "E7-AE1", sku: cream, name: "FORBIDDEN-CREAM-DESCRIPTION", qty: 2 },
    { slot: "L1-AE1", sku: white, name: "FORBIDDEN-WHITE-DESCRIPTION", qty: 5 },
  ],
  items: [{ sku: white, name: "FORBIDDEN-WHITE-NAME", orderedQty: 8, allocatedQty: 8 }, { sku: cream, name: "FORBIDDEN-CREAM-NAME", orderedQty: 2, allocatedQty: 2 }] };

const expected = `*PREPARE & DELIVER*
_Client:_ *Ahmed Trading*
_Order:_ ORD-261101-9E7D51
_Carton Tag:_ *Ahmed Trading — 9E7D51*
_Assigned To:_ *Ahmed*
*2 items — 10 units*

*1. PICK*
*01)* ${white}
   ↳ L1-AE1: *5 units*
   ↳ L2-AE1: *3 units*
*02)* ${cream}
   ↳ E7-AE1: *2 units*

*2. PACK & CHECK*
☐ *01)* ${white} — *8*
☐ *02)* ${cream} — *2*
*Total: 2 items — 10 units*

*3. DELIVER*
_Address:_ Alain Sinaiyah
_Map:_ https://maps.app.goo.gl/8pHDhvf8hYfVStr77?g_st=ic`;

test("matches the exact compact WhatsApp template, markup, and line breaks", () => {
  assert.equal(buildWorkerOrderShareText(sheet), expected);
});

test("client identity comes from the account name, including drafts and missing names", () => {
  const draft = buildWorkerOrderShareText({ ...sheet, assignedTo: "", customerName: "  أحمد\nعلي  " });
  assert.match(draft, /_Client:_ \*أحمد علي\*/);
  for (const customerName of [undefined, "", "   "]) {
    const text = buildWorkerOrderShareText({ ...sheet, customerName });
    assert.match(text, /_Client:_ \*Unknown client\*/);
    assert.doesNotMatch(text, /Order Recipient/);
  }
});

test("unassigned messages are draft previews and valid names are trimmed", () => {
  assert.equal(buildWorkerOrderShareText({ ...sheet, assignedTo: "  Ahmed  " }), expected);
  for (const assignedTo of [undefined, "", "   "]) {
    const preview = buildWorkerOrderShareText({ ...sheet, assignedTo });
    assert.match(preview, /^\*PREPARATION DRAFT — HOLD\*/);
    assert.match(preview, /_Assigned To:_ \*Required\*/);
    assert.match(preview, /Assigned To is required/);
  }
});

test("omits all product names/descriptions, contacts, notes, store and financial details", () => {
  const text = buildWorkerOrderShareText({ ...sheet, store: { address: "PRIVATE-STORE" }, totalPrice: 999999,
    adminToAdminNote: "SECRET-NOTE", invoice: "SECRET-INVOICE", user: { email: "SECRET-EMAIL" } });
  assert.doesNotMatch(text, /FORBIDDEN|PRIVATE|SECRET|999999|Order Recipient|\+123456|Contact:|Phone:|Notes:|SKUs?/);
  assert.match(text, /_Address:_ Alain Sinaiyah/);
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
  assert.match(text, /↳ A1-AE1: \*1 unit\*/);
  assert.doesNotMatch(text, /_Address:_|Contact:|Phone:/);
  const three = buildWorkerOrderShareText({ ...one, items: [{ sku: white, orderedQty: 3 }], picks: ["A10-AE1", "A2-AE1", "A1-AE1"].map((slot) => ({ sku: white, slot, qty: 1 })) });
  assert.ok(three.indexOf("↳ A1-AE1") < three.indexOf("↳ A2-AE1"));
  assert.ok(three.indexOf("↳ A2-AE1") < three.indexOf("↳ A10-AE1"));
});

test("drafts retain quantity warnings without adding SKU totals in PICK", () => {
  const text = buildWorkerOrderShareText({ ...sheet, problems: ["Ordered 8, allocated 3. Confirm before picking."], notices: ["Stock already deducted — verify physical collection"],
    picks: [{ sku: white, slot: "L1-AE1", qty: 3, deducted: true }], delivery: { details: {} } });
  assert.match(text, /PREPARATION DRAFT — HOLD/);
  assert.match(text, /Ordered 8, allocated 3/);
  assert.match(text, /verify physical collection/);
  assert.match(text, /↳ L1-AE1: \*3 units\* \(3 deducted\)/);
  assert.ok(text.includes(`☐ *01)* ${white} — *8*`));
  assert.doesNotMatch(text.split("*1. PICK*")[1].split("*2. PACK & CHECK*")[0], /Total:/);
  assert.match(text, /Total: 2 items — 10 units/);
  assert.doesNotMatch(text, /Contact:|Phone:|Notes:/);
});

test("item numbers stay aligned across sections after 09 and 99", () => {
  const items = Array.from({ length: 105 }, (_, index) => ({ sku: `ITEM-${index + 1}`, orderedQty: 1 }));
  const text = buildWorkerOrderShareText({ ...sheet, items, picks: [...items].reverse().map(({ sku }) => ({ sku, slot: "A1-AE1", qty: 1 })) });
  for (const index of [0, 8, 9, 98, 99, 104]) {
    const number = String(index + 1).padStart(2, "0");
    assert.ok(text.includes(`\n*${number})* ITEM-${index + 1}\n   ↳ A1-AE1: *1 unit*`));
    assert.ok(text.includes(`\n☐ *${number})* ITEM-${index + 1} — *1*`));
  }
  assert.match(text, /105 items — 105 units/);
});

test("multiline delivery addresses remain compact and location-only", () => {
  const text = buildWorkerOrderShareText({ ...sheet, delivery: { details: { address: "Building 1\r\nArea\n\nCity" } } });
  assert.ok(text.endsWith("*3. DELIVER*\n_Address:_ Building 1 Area City"));
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


test("preparation-only has its own heading and excludes every delivery field", () => {
  const text = buildWorkerOrderShareText({ ...sheet, preparationMode: "prepare_only" });
  assert.equal(text, expected.split("\n\n*3. DELIVER*")[0].replace("*PREPARE & DELIVER*", "*PREPARE ONLY*"));
  assert.doesNotMatch(text, /DELIVER|Address|Map|Alain|https:|Recipient|123456/);
  const noLocation = { ...sheet, preparationMode: "prepare_only", delivery: { savedToOrder: false, details: {} } };
  assert.ok(buildWorkerOrderShareText(noLocation).startsWith("*PREPARE ONLY*"));
  assert.match(buildWorkerOrderShareText({ ...noLocation, problems: ["Reservations incomplete"] }), /_Task:_ PREPARE ONLY/);
  const deliveryMissing = buildWorkerOrderShareText({ ...noLocation, preparationMode: "prepare_deliver" });
  assert.match(deliveryMissing, /PREPARATION DRAFT/);
  assert.match(deliveryMissing, /location is missing/);
});

test("an unselected task remains a draft without revealing delivery information", () => {
  const text = buildWorkerOrderShareText({ ...sheet, preparationMode: "" });
  assert.match(text, /Choose Prepare Only or Prepare & Deliver/);
  assert.doesNotMatch(text, /Alain|maps.app|\*3. DELIVER/);
});
