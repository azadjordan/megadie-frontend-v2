import test from 'node:test';
import assert from 'node:assert/strict';
import { getAdminOrderActionState } from './adminOrderActions.js';

const now = Date.parse('2026-11-16T08:00:00Z');
const paid = { _id: 'invoice', status: 'Issued', paymentStatus: 'Paid', amountMinor: 1000, paidTotalMinor: 1000, balanceDueMinor: 0 };
const unpaid = { ...paid, paymentStatus: 'Unpaid', paidTotalMinor: 0, balanceDueMinor: 1000, dueDate: '2026-11-18T08:00:00Z' };
const packed = { status: 'Shipping', allocationStatus: 'Allocated', packingSentAt: '2026-11-14T08:00:00Z', packedAt: '2026-11-14T09:00:00Z', assignedTo: 'Ahmed', stockChecksPending: 0 };
const delivered = { ...packed, status: 'Delivered', stockFinalizedAt: '2026-11-14T10:00:00Z', invoice: paid, listAction: null };
const state = order => getAdminOrderActionState(order, now);

test('packing and delivery are independent, retaining invoice and delivery actions', () => {
  const beforeInvoice = state(packed);
  assert.equal(beforeInvoice.preparation.label, 'Packed');
  assert.equal(beforeInvoice.preparation.tone, 'complete');
  assert.equal(beforeInvoice.delivery.label, 'Awaiting delivery');
  assert.equal(beforeInvoice.delivery.tone, 'active');
  assert.equal(beforeInvoice.primaryAction.id, 'create-invoice');
  for (const invoice of [paid, unpaid]) {
    const next = state({ ...packed, invoice });
    assert.equal(next.primaryAction.id, 'mark-out-for-delivery');
    assert.equal(next.secondaryActions.filter(a => a.id === 'create-invoice').length, 0);
    assert.ok(next.secondaryActions.some(a => a.id === 'mark-delivered'));
    assert.ok(!next.secondaryActions.some(a => a.id === 'return-to-store'));
  }
});

test('an unpaid finished order keeps finished parts green and one payment action', () => {
  const result = state({ ...delivered, invoice: unpaid });
  for (const name of ['preparation', 'delivery', 'stock']) assert.equal(result[name].tone, 'complete');
  assert.equal(result.billing.label, 'Unpaid');
  assert.equal(result.billing.tone, 'followUp');
  assert.equal(result.primaryAction.id, 'add-payment');
  assert.ok(!result.secondaryActions.some(action => action.id === 'add-payment'));
  assert.ok(!Object.hasOwn(result, 'progress'));
});

test('overdue needs a known positive balance and valid past due date, without blocking delivery', () => {
  for (const [dueDate, label] of [['2026-11-15T08:00:00Z', 'Overdue'], ['2026-11-18T08:00:00Z', 'Unpaid'], [undefined, 'Unpaid'], ['invalid', 'Unpaid']]) {
    const result = state({ ...packed, invoice: { ...unpaid, dueDate } });
    assert.equal(result.billing.label, label);
    assert.equal(result.primaryAction.id, 'mark-out-for-delivery');
    assert.equal(result.secondaryActions.filter(action => action.id === 'add-payment').length, 1);
  }
  const partial = state({ ...delivered, invoice: { ...unpaid, paymentStatus: 'PartiallyPaid', paidTotalMinor: 300, balanceDueMinor: 700 } });
  assert.equal(partial.billing.label, 'Partly paid');
  assert.equal(partial.billing.balanceDueMinor, 700);
});

test('deduction and stock reports stay independent; report review precedes payment without gating it', () => {
  const result = state({ ...delivered, invoice: unpaid, stockChecksPending: 2 });
  assert.equal(result.stock.label, 'Deducted');
  assert.equal(result.stock.tone, 'complete');
  assert.equal(result.stock.checksPending, 2);
  assert.equal(result.primaryAction.id, 'review-reports');
  assert.equal(result.secondaryActions.filter(action => action.id === 'add-payment').length, 1);
  const pending = state({ ...delivered, stockFinalizedAt: null, listAction: 'finalize-stock', stockChecksPending: 1, invoice: unpaid });
  assert.equal(pending.stock.label, 'Pending');
  assert.equal(pending.stock.tone, 'followUp');
  assert.equal(pending.primaryAction.id, 'finalize-stock');
});

test('settled and zero-value orders keep actual billing facts and quiet access', () => {
  const result = state(delivered);
  assert.equal(result.delivery.label, 'Delivered');
  assert.equal(result.billing.label, 'Paid');
  assert.equal(result.primaryAction.id, 'open-order');
  assert.equal(result.primaryAction.quiet, true);
  assert.ok(!result.secondaryActions.some(action => action.id === 'add-payment'));
  const zero = state({ ...delivered, invoice: { ...unpaid, amountMinor: 0, balanceDueMinor: 0 } });
  assert.equal(zero.billing.label, 'No balance due');
  assert.equal(zero.billing.tone, 'complete');
  assert.equal(zero.primaryAction.quiet, true);
});

test('missing or inconsistent facts stay local and require review after deduction', async t => {
  const cases = [
    ['packing confirmation', { packedAt: null }, 'preparation', 'problem'],
    ['missing invoice', { invoiceLinkMissing: true, invoice: null }, 'billing', 'problem'],
    ['missing invoice reference', { invoice: null }, 'billing', 'problem'],
    ['cancelled invoice', { invoice: { ...paid, status: 'Cancelled' } }, 'billing', 'problem'],
    ['Paid with balance', { invoice: { ...paid, balanceDueMinor: 1000 } }, 'billing', 'problem'],
    ['balance unavailable', { invoice: { _id: 'invoice', status: 'Issued' } }, 'billing', 'followUp'],
    ['invoice details unavailable', { invoice: { ...paid, status: undefined } }, 'billing', 'followUp'],
    ['nonfinite balance', { invoice: { ...paid, balanceDueMinor: NaN } }, 'billing', 'followUp'],
    ['premature deduction', { status: 'Shipping' }, 'stock', 'problem'],
  ];
  for (const [name, overrides, part, tone] of cases) await t.test(name, () => {
    const result = state({ ...delivered, ...overrides });
    assert.equal(result[part].tone, tone);
    assert.equal(result.primaryAction.id, 'open-order');
    assert.equal(result.primaryAction.quiet, undefined);
    assert.ok(!result.secondaryActions.some(action => action.id === 'add-payment'));
  });
  const unknownChecks = state({ ...delivered, stockChecksPending: undefined });
  assert.equal(unknownChecks.stock.checksKnown, false);
  assert.equal(unknownChecks.stock.checksPending, null);
  assert.equal(unknownChecks.primaryAction.tab, 'stock');
});

test('manual preparation, reservations, picking and cancellation retain their own facts', () => {
  assert.equal(state({ status: 'Processing' }).preparation.label, 'Not started');
  assert.equal(state({ ...packed, packedAt: null, allocationStatus: 'PartiallyAllocated' }).preparation.label, 'Needs reservation');
  assert.equal(state({ ...packed, packedAt: null, packingSentAt: null }).preparation.label, 'Reserved');
  const picking = state({ ...packed, packedAt: null, packingSummary: { totalItems: 2, collectedItems: 2 } });
  assert.equal(picking.preparation.label, 'Packing');
  assert.deepEqual(picking.preparation.picking, { total: 2, collected: 2 });
  assert.equal(picking.delivery.label, 'Pending');
  assert.equal(state({ ...packed, packedAt: null }).preparation.picking, undefined);
  const manual = state({ ...delivered, packedAt: null, packingSentAt: null });
  assert.equal(manual.preparation.label, 'Done');
  assert.equal(manual.preparation.detail, 'Manual preparation');
  const cancelled = state({ ...delivered, status: 'Cancelled', invoice: { ...paid, status: 'Cancelled' }, stockChecksPending: 1 });
  assert.equal(cancelled.delivery.label, 'Cancelled');
  assert.equal(cancelled.billing.label, 'Invoice cancelled');
  assert.equal(cancelled.billing.tone, 'neutral');
  assert.equal(cancelled.primaryAction.id, 'review-reports');
});

test('worker help is explicit, and primary actions and aliases are absent from More', () => {
  const help = state({ ...packed, packedAt: null, helpRequestedItems: 1 });
  assert.equal(help.preparation.label, 'Needs help');
  assert.equal(help.primaryAction.id, 'review-help');
  const shortage = state({ ...packed, packedAt: null, packingSummary: { needsHelp: true } });
  assert.equal(shortage.primaryAction.id, 'view-packing');
  assert.equal(shortage.preparation.tone, 'active');
  const assign = state({ ...packed, packedAt: null, packingSentAt: null });
  assert.equal(assign.primaryAction.id, 'send-worker');
  assert.ok(!assign.secondaryActions.some(a => ['send-worker', 'assignment'].includes(a.id)));
  for (const order of [packed, delivered, { ...packed, invoice: paid }, { ...delivered, invoice: unpaid }]) {
    const result = state(order);
    assert.ok(!result.secondaryActions.some(a => a.id === result.primaryAction.id));
  }
});

test('courier, company and returned cartons keep delivery separate from completed preparation', () => {
  const movement = { method: 'courier', handler: 'Courier A', departedAt: '2026-11-16T08:00:00Z' };
  const manual = { status: 'Shipping', allocationStatus: 'Allocated', stockChecksPending: 0, deliveryMovement: movement };
  const courier = state(manual);
  assert.equal(courier.preparation.label, 'Prepared'); assert.equal(courier.delivery.label, 'Out for delivery');
  assert.equal(courier.delivery.tone, 'active'); assert.equal(courier.primaryAction.label, 'Mark delivered');
  assert.ok(courier.secondaryActions.some(a => a.id === 'return-to-store'));
  assert.ok(!courier.secondaryActions.some(a => a.id === 'mark-out-for-delivery'));
  assert.ok(!courier.secondaryActions.some(a => ['assignment', 'legacy-packing'].includes(a.id)));
  const company = state({ ...manual, deliveryMovement: { ...movement, method: 'company', handler: 'Owner' } });
  assert.equal(company.delivery.label, 'Out for delivery'); assert.equal(company.delivery.detail, 'Owner');
  const returned = state({ ...manual, deliveryMovement: { ...movement, returnedAt: '2026-11-16T09:00:00Z' } });
  assert.equal(returned.delivery.label, 'Awaiting delivery'); assert.equal(returned.delivery.tone, 'followUp');
  assert.equal(returned.primaryAction.label, 'Mark out for delivery'); assert.equal(returned.preparation.tone, 'complete');
  const collection = state({ ...delivered, deliveryMovement: { method: 'collection' } });
  assert.equal(collection.delivery.label, 'Collected'); assert.equal(collection.delivery.tone, 'complete');
});
