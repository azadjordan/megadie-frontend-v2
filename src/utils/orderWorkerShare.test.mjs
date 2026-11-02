import test from "node:test";
import assert from "node:assert/strict";
import { buildWorkerOrderShareText } from "./orderWorkerShare.js";
import { buildCourierShareText, getCourierMissingFields, hasCourierProfileChanges } from "./orderCourierShare.js";

const details = { contactName: "Order Recipient", phoneNumber: "+123456", address: "Customer destination", googleMapsUrl: "https://maps.app.goo.gl/customer", secondaryPhoneNumber: "", notes: "Receiving hours" };
const sheet = { label: "ABC-023AD", orderNumber: "ORD-261102-023AD", status: "Shipping", delivery: { details }, problems: [], notices: [],
  picks: [{ slot: "A2-AE1", sku: "SKU1", name: "Grosgrain", qty: 4 }, { slot: "B1-AE1", sku: "SKU2", name: "Satin", qty: 2 }],
  items: [{ sku: "SKU1", orderedQty: 4, allocatedQty: 4 }, { sku: "SKU2", orderedQty: 2, allocatedQty: 2 }] };

test("compact label is the first line and picking, packing and customer destination follow", () => {
  const text = buildWorkerOrderShareText(sheet);
  assert.equal(text.split("\n")[0], "ABC-023AD");
  assert.doesNotMatch(text.split("\n")[0], /[.\s]/);
  assert.ok(text.indexOf("*1. PICK*") < text.indexOf("*2. PACK & CHECK*"));
  assert.ok(text.indexOf("*2. PACK & CHECK*") < text.indexOf("*3. DELIVER*"));
  assert.match(text, /A2-AE1 — SKU1/);
  assert.match(text, /Total: 6 units/);
  assert.match(text, /Contact: Order Recipient/);
  assert.match(text, /Address: Customer destination/);
  assert.match(text, /Map: https:\/\/maps.app.goo.gl\/customer/);
  assert.doesNotMatch(text, /Second phone|Carton label|PICKUP|Megadie UAE/);
});

test("staff formatter never forwards store details, financials, account or internal notes", () => {
  const text = buildWorkerOrderShareText({ ...sheet, store: { address: "PRIVATE-STORE" }, totalPrice: 999999,
    adminToAdminNote: "SECRET-NOTE", invoice: "SECRET-INVOICE", user: { email: "SECRET-EMAIL" } });
  assert.doesNotMatch(text, /PRIVATE-STORE|999999|SECRET/);
  assert.match(text, /Order Recipient/);
});

test("draft and deducted notices are explicit; optional empty details are omitted", () => {
  const text = buildWorkerOrderShareText({ ...sheet, problems: ["SKU1: short by 1"], notices: ["Stock already deducted — verify physical collection"],
    delivery: { details: { contactName: "Desk", phoneNumber: "+123" } } });
  assert.match(text, /PREPARATION DRAFT — HOLD/);
  assert.match(text, /short by 1/);
  assert.match(text, /verify physical collection/);
  assert.match(text, /allocated: 4/);
  assert.doesNotMatch(text, /Address:|Map:|Notes:|Second phone:/);
});

test("closed orders cannot produce new preparation instructions", () => {
  for (const status of ["Delivered", "Cancelled"]) assert.throws(() => buildWorkerOrderShareText({ ...sheet, status }), /Closed orders/);
});

test("Courier uses the same explicit destination and preserves its external pickup and totals", () => {
  const order = { orderNumber: sheet.orderNumber, user: { name: "Wrong live name", address: "WRONG live address" },
    resolvedDelivery: { details }, orderItems: [{ qty: 2, unitPrice: 10 }] };
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
  assert.equal(hasCourierProfileChanges(details, { ...details, address: "  Customer destination  " }), false);
});
