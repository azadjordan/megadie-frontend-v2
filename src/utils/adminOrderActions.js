import {
  getInvoiceBalanceDueMinor,
  hasInvoiceBalanceFields,
  isInvoicePayable,
  isInvoiceOverdue,
} from "./invoiceMoney.js";
import {
  canCreateOrderInvoice,
  getOrderStatusFlags,
  isOrderStockFinalized,
} from "./adminOrderWorkflow.js";

export const ADMIN_ORDER_ACTION_IDS = Object.freeze({
  MARK_SHIPPING: "mark-shipping",
  RESERVE_STOCK: "reserve-stock",
  MARK_DELIVERED: "mark-delivered",
  MARK_OUT_FOR_DELIVERY: "mark-out-for-delivery",
  RETURN_TO_STORE: "return-to-store",
  DELIVERY_HISTORY: "delivery-history",
  DELIVERY_ASSIGNMENT: 'delivery-assignment',
  CREATE_INVOICE: "create-invoice",
  ADD_PAYMENT: "add-payment",
  FINALIZE_STOCK: "finalize-stock",
  OPEN_ORDER: "open-order",
  SEND_WORKER: 'send-worker', VIEW_PACKING: 'view-packing', REVIEW_HELP: 'review-help',
  ASSIGNMENT: 'assignment', DELIVERY_DETAILS: 'delivery-details', COPY_SUMMARY: 'copy-summary',
  LEGACY_PACKING: 'legacy-packing', REVIEW_REPORTS: 'review-reports', DELETE_ORDER: 'delete-order', PDF: 'pdf',
});

export const ADMIN_ORDER_ACTION_LABELS = Object.freeze({
  'mark-shipping': 'Start preparation', 'reserve-stock': 'Reserve stock',
  'mark-out-for-delivery': 'Mark out for delivery', 'return-to-store': 'Returned to store', 'delivery-history': 'Delivery history',
  'delivery-assignment': 'Delivery worker',
  'mark-delivered': 'Mark delivered', 'create-invoice': 'Create invoice',
  'add-payment': 'Record payment', 'finalize-stock': 'Finalize stock', 'open-order': 'Open order',
  'send-worker': 'Send to worker', 'view-packing': 'View packing', 'review-help': 'Review issue',
  assignment: 'Packing worker', 'delivery-details': 'Delivery / courier details',
  'copy-summary': 'Copy order summary', 'legacy-packing': 'Manual packing message',
  'review-reports': 'Review stock reports', 'delete-order': 'Delete order', pdf: 'View invoice PDF',
});

export const ORDER_DELIVERY_EVENTS = Object.freeze({
  'mark-out-for-delivery': 'departed', 'mark-delivered': 'delivered',
  'return-to-store': 'returned', 'delivery-history': 'history',
});

export function getOrderDeliveryActions(order) {
  const f = getAdminOrderFulfillmentState(order);
  const held = f.isShipping && Boolean(order.deliveryMovement?.departedAt && !order.deliveryMovement?.slotsReturnedAt);
  const out = held && !order.deliveryMovement.returnedAt;
  const ready = f.isShipping && !f.stockFinalized && f.isAllocated && (!order.packingSentAt || order.packedAt);
  const primary = ready || out ? buildAction(out ? 'mark-delivered' : 'mark-out-for-delivery') : null;
  const secondary = [];
  if (ready && !out) secondary.push(buildAction('mark-delivered'));
  if (out) secondary.push(buildAction('return-to-store'));
  if (order.deliveryMovement || f.isDelivered || f.isCancelled) secondary.push(buildAction('delivery-history'));
  return { primary, secondary };
}

const ALLOCATION_LABELS = {
  Unallocated: "Not reserved",
  PartiallyAllocated: "Partially reserved",
  Allocated: "Reserved",
};

function resolveEntityId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    if (value._id) return String(value._id);
    if (value.id) return String(value.id);
  }
  return "";
}

export function getOrderInvoice(order) {
  return order?.invoice && typeof order.invoice === "object"
    ? order.invoice
    : null;
}

export function getOrderInvoiceId(order) {
  return typeof order?.invoice === "string"
    ? order.invoice
    : resolveEntityId(order?.invoice);
}

function buildAction(id, overrides = {}) {
  return {
    id,
    label: ADMIN_ORDER_ACTION_LABELS[id] || "",
    enabled: true,
    reason: "",
    ...overrides,
  };
}

export function getAdminOrderFulfillmentState(order) {
  const statusFlags = getOrderStatusFlags(order);
  const allocationStatus = order?.allocationStatus || "Unallocated";
  const stockFinalized = isOrderStockFinalized(order);

  return {
    ...statusFlags,
    allocationStatus,
    allocationLabel: ALLOCATION_LABELS[allocationStatus] || allocationStatus,
    stockFinalized,
    stockLabel: stockFinalized ? "Stock deducted" : "Stock not deducted",
    isAllocated: allocationStatus === "Allocated",
  };
}

export function getAdminOrderBillingState(order, now = Date.now()) {
  const invoice = getOrderInvoice(order);
  const invoiceId = getOrderInvoiceId(order);
  const hasInvoice = Boolean(invoiceId || order?.invoiceLinkMissing);
  const invoiceNumber = invoice?.invoiceNumber || invoiceId;
  const paymentStatus = invoice?.paymentStatus || "";
  const balanceDueMinor = invoice ? getInvoiceBalanceDueMinor(invoice) : 0;
  const hasBalanceData = hasInvoiceBalanceFields(invoice) && Number.isFinite(balanceDueMinor);
  const payable = !order?.invoiceLinkMissing && invoice?.status === 'Issued' && hasBalanceData && balanceDueMinor > 0 && isInvoicePayable(invoice);
  let presentation;
  if (order?.invoiceLinkMissing) presentation = display('Needs review', 'The linked invoice is unavailable.', 'problem', 'problem');
  else if (!hasInvoice) presentation = order?.stockFinalizedAt && order.status !== 'Cancelled'
    ? display('Needs review', 'Stock was deducted without a linked invoice.', 'problem', 'problem')
    : display(order?.status === 'Cancelled' ? 'Not required' : 'Not invoiced', '', order?.status !== 'Cancelled' && (order?.packedAt || order?.status === 'Delivered' || order?.listAction === 'create-invoice') ? 'followUp' : 'neutral', 'invoice');
  else if (invoice?.status === 'Cancelled') presentation = display('Invoice cancelled', '', order?.status === 'Cancelled' ? 'neutral' : 'problem', 'cancelled');
  else if (!invoice || invoice.status !== 'Issued') presentation = display('Needs review', 'Invoice details unavailable.', 'followUp', 'problem');
  else if (!hasBalanceData) presentation = display('Balance unavailable', 'Review the invoice balance.', 'followUp', 'problem');
  else if (paymentStatus === 'Paid' && balanceDueMinor > 0) presentation = display('Needs review', 'Marked Paid with an outstanding balance.', 'problem', 'problem');
  else if (balanceDueMinor === 0) presentation = display(paymentStatus === 'Paid' ? 'Paid' : 'No balance due', '', 'complete', 'complete');
  else if (isInvoiceOverdue(invoice, now)) presentation = display('Overdue', paymentStatus === 'PartiallyPaid' ? 'Partly paid' : '', 'problem', 'problem');
  else presentation = display(paymentStatus === 'PartiallyPaid' ? 'Partly paid' : 'Unpaid', '', 'followUp', 'payment');

  return {
    invoice,
    invoiceId,
    hasInvoice,
    invoiceNumber,
    paymentStatus,
    balanceDueMinor,
    hasBalanceData,
    payable,
    ...presentation,
    paymentLabel: paymentStatus === "PartiallyPaid" ? "Partially paid" : paymentStatus || "",
    invoiceLabel: invoiceNumber || "No invoice",
  };
}

function primaryId(order) {
  if (Object.hasOwn(order || {}, 'listAction')) return order.listAction;
  const f = getAdminOrderFulfillmentState(order), b = getAdminOrderBillingState(order);
  if (f.isCancelled || (f.isDelivered && f.stockFinalized)) return null;
  if ((f.stockFinalized && !f.isDelivered) || (f.isShipping && order.packedAt && !f.isAllocated) || order.invoiceLinkMissing || b.invoice?.status === 'Cancelled' || (f.isDelivered && order.packingSentAt && !order.packedAt)) return 'open-order';
  if (f.isProcessing) return 'mark-shipping';
  if (f.isShipping) {
    if (order.deliveryMovement?.departedAt && !order.deliveryMovement?.slotsReturnedAt) return order.deliveryMovement.returnedAt ? 'mark-out-for-delivery' : 'mark-delivered';
    if (order.helpRequestedItems > 0) return 'review-help';
    if (!f.isAllocated) return 'reserve-stock';
    if (!order.packingSentAt && !order.packedAt) return 'send-worker';
    if (order.packingSentAt && !order.packedAt) return 'view-packing';
    return b.hasInvoice ? 'mark-out-for-delivery' : 'create-invoice';
  }
  if (f.isDelivered) return !b.hasInvoice ? 'create-invoice' : f.isAllocated ? 'finalize-stock' : 'open-order';
  return 'open-order';
}

export function getAdminOrderPrimaryAction(order) {
  const id = primaryId(order);
  return id ? buildAction(id, id === 'open-order' ? { label: 'Review order', tab: order.invoiceLinkMissing || order.invoice?.status === 'Cancelled' ? 'invoice' : '', reason: order.listReviewReason || 'Review order details and prerequisites.' } : {}) : null;
}

export function getAdminOrderBillingAction(order) {
  const billing = getAdminOrderBillingState(order);
  if (order.status === 'Cancelled' || !billing.payable) return null;
  return buildAction('add-payment', { visible: true });
}

function display(label, detail = '', tone = 'neutral', icon = 'waiting') {
  return { label, detail, tone, icon };
}

function preparationFor(order, f) {
  const worker = order.assignedTo || '';
  const published = Boolean(order.packingSentAt);
  if (f.isCancelled) return display('Not required', '', 'neutral', 'cancelled');
  if (f.isDelivered && published && !order.packedAt) return display('Needs review', 'Delivered without Packed confirmation.', 'problem', 'problem');
  if (f.isShipping && order.packedAt && !f.isAllocated) return display('Needs review', 'Packed with incomplete reservations.', 'problem', 'problem');
  if (f.isShipping && order.helpRequestedItems > 0) return display('Needs help', [order.helpRequestedItems + (order.helpRequestedItems === 1 ? ' product needs review' : ' products need review'), worker].filter(Boolean).join(' · '), 'problem', 'problem');
  if (order.packedAt) return display('Packed', worker, 'complete', 'complete');
  if (order.deliveryMovement?.departedAt && !order.deliveryMovement?.slotsReturnedAt) return display('Prepared', 'Manual preparation', 'complete', 'complete');
  if (f.isDelivered && !published) return display('Done', 'Manual preparation', 'complete', 'complete');
  if (f.isProcessing) return display('Not started');
  if (!f.isAllocated) return display('Needs reservation', [f.allocationStatus === 'PartiallyAllocated' ? 'Partly reserved' : '', published ? worker : ''].filter(Boolean).join(' · '), 'followUp', 'reservation');
  if (published) {
    const total = order.packingSummary?.totalItems, collected = order.packingSummary?.collectedItems;
    const known = Number.isFinite(total) && total > 0 && Number.isFinite(collected) && collected >= 0 && collected <= total;
    const result = display('Packing', [worker, known ? `${collected} of ${total} products fully picked` : 'View picking progress', order.packingSummary?.needsHelp ? 'Picking shortage' : ''].filter(Boolean).join(' · '), 'active', 'packing');
    if (known) result.picking = { total, collected };
    return result;
  }
  return display('Reserved', worker || 'Assign a worker or prepare manually', 'active', 'reservation');
}

function deliveryFor(order, f) {
  if (f.isCancelled) return display('Cancelled', '', 'neutral', 'cancelled');
  if (f.isDelivered) return display(order.deliveryMovement?.method === 'collection' ? 'Collected' : 'Delivered', order.deliveredBy || '', 'complete', 'delivery');
  if (order.deliveryMovement?.departedAt && !order.deliveryMovement?.slotsReturnedAt) return order.deliveryMovement.returnedAt
    ? display('Awaiting delivery', 'Returned to store · still packed', 'followUp', 'delivery')
    : display('Out for delivery', order.deliveryMovement.handler || '', 'active', 'delivery');
  if (f.isShipping && f.isAllocated && order.packedAt) return display('Awaiting delivery', '', 'active', 'delivery');
  return display('Pending', 'After preparation', 'neutral', 'delivery');
}

function stockFor(order, f, operationalAction) {
  const checksKnown = Number.isInteger(order.stockChecksPending) && order.stockChecksPending >= 0;
  let result;
  if (f.stockFinalized && !f.isDelivered && !f.isCancelled) result = display('Needs review', 'Stock deducted before delivery.', 'problem', 'problem');
  else if (f.stockFinalized) result = display('Deducted', '', 'complete', 'complete');
  else if (f.isCancelled) result = display('Not required', '', 'neutral', 'cancelled');
  else result = display('Pending', operationalAction?.id === 'finalize-stock' ? '' : !f.isDelivered ? 'After delivery' : !order.invoice ? 'After invoice' : !f.isAllocated ? 'Reservations need review' : 'After packing confirmation', operationalAction?.id === 'finalize-stock' ? 'followUp' : 'neutral', 'reservation');
  return { ...result, checksKnown, checksPending: checksKnown ? order.stockChecksPending : null };
}

function reviewAction(reason, tab = '') {
  return buildAction('open-order', { label: 'Review order', reason, tab });
}

export function getAdminOrderActionState(order, now = Date.now()) {
  const fulfillment = getAdminOrderFulfillmentState(order);
  const billing = getAdminOrderBillingState(order, now);
  const operational = getAdminOrderPrimaryAction(order);
  const preparation = preparationFor(order, fulfillment);
  const delivery = deliveryFor(order, fulfillment);
  const stock = stockFor(order, fulfillment, operational);
  const published = Boolean(order.packingSentAt);
  const inDelivery = Boolean(order.deliveryMovement?.departedAt && !order.deliveryMovement?.slotsReturnedAt);
  const active = !fulfillment.isCancelled && !fulfillment.isDelivered && !fulfillment.stockFinalized;
  let primaryAction = operational;

  // Overdue payment is a billing warning, not a fulfillment gate. Structural
  // inconsistencies still need review, even if the server has no routine action.
  if (billing.tone === 'problem' && billing.label !== 'Overdue') primaryAction = reviewAction(billing.detail || billing.label, 'invoice');
  else if (preparation.tone === 'problem') primaryAction = preparation.label === 'Needs help' ? buildAction('review-help') : reviewAction(preparation.detail, 'stock');
  else if (stock.tone === 'problem') primaryAction = reviewAction(stock.detail, 'stock');
  else if (!fulfillment.isCancelled && order.listReviewReason) primaryAction = reviewAction(order.listReviewReason, operational?.tab);
  else if (!operational) {
    if (stock.checksPending > 0) primaryAction = buildAction('review-reports');
    else if (!fulfillment.isCancelled && billing.hasInvoice && (!billing.hasBalanceData || billing.invoice?.status !== 'Issued')) primaryAction = reviewAction(billing.detail || 'Review billing.', 'invoice');
    else if (!stock.checksKnown) primaryAction = reviewAction('Stock check status unavailable.', 'stock');
    else if (!fulfillment.isCancelled && billing.payable) primaryAction = buildAction('add-payment');
    else primaryAction = buildAction('open-order', { quiet: true });
  }

  const secondary = [buildAction('open-order')];
  if (active && fulfillment.isShipping) secondary.push(buildAction('delivery-assignment'));
  const paymentAction = getAdminOrderBillingAction(order);
  if (paymentAction) secondary.push(paymentAction);
  if (active && !inDelivery && fulfillment.isShipping) secondary.push(buildAction('assignment', { label: published ? 'Packing worker' : 'Send to worker' }));
  if (published || stock.checksPending > 0) secondary.push(buildAction('view-packing', { label: active ? 'View packing' : 'Packing history' }));
  secondary.push(buildAction('delivery-details'), buildAction('copy-summary'));
  if (active && !inDelivery && !published) secondary.push(buildAction('legacy-packing'));
  if (!billing.hasInvoice && canCreateOrderInvoice(order, false)) secondary.push(buildAction('create-invoice'));
  const deliveryActions = getOrderDeliveryActions(order);
  if (deliveryActions.primary) secondary.push(deliveryActions.primary);
  secondary.push(...deliveryActions.secondary);
  secondary.push(buildAction('delete-order', { danger: true }));
  const seen = new Set(primaryAction ? [primaryAction.id, ...(primaryAction.id === 'send-worker' ? ['assignment'] : [])] : []);
  return {
    fulfillment, preparation, delivery, billing, stock, primaryAction,
    secondaryActions: secondary.filter(action => { if (seen.has(action.id)) return false; seen.add(action.id); return true; }),
  };
}
