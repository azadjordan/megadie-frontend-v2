export const ACTIVE_INVOICE_ORDER_STATUSES = Object.freeze([
  "Processing",
  "Shipping",
  "Delivered",
]);

function getOrderStatus(orderOrStatus) {
  if (typeof orderOrStatus === "string") {
    return orderOrStatus || "Processing";
  }

  return orderOrStatus?.status || "Processing";
}

function resolveHasInvoice(orderOrStatus, explicitHasInvoice) {
  if (typeof explicitHasInvoice === "boolean") {
    return explicitHasInvoice;
  }

  if (!orderOrStatus || typeof orderOrStatus === "string") {
    return false;
  }

  return Boolean(orderOrStatus.invoice);
}

export function getOrderStatusFlags(orderOrStatus) {
  const status = getOrderStatus(orderOrStatus);

  return {
    status,
    isProcessing: status === "Processing",
    isShipping: status === "Shipping",
    isDelivered: status === "Delivered",
    isCancelled: status === "Cancelled",
  };
}

export function canCreateOrderInvoice(orderOrStatus, explicitHasInvoice) {
  const { status, isCancelled } = getOrderStatusFlags(orderOrStatus);
  const hasInvoice = resolveHasInvoice(orderOrStatus, explicitHasInvoice);

  return (
    !hasInvoice &&
    !isCancelled &&
    ACTIVE_INVOICE_ORDER_STATUSES.includes(status)
  );
}

export function getCreateInvoiceReason(orderOrStatus, explicitHasInvoice) {
  const { status, isCancelled } = getOrderStatusFlags(orderOrStatus);
  const hasInvoice = resolveHasInvoice(orderOrStatus, explicitHasInvoice);

  if (hasInvoice) return "Invoice attached.";
  if (isCancelled) return "Invoices cannot be created for cancelled orders.";
  if (!ACTIVE_INVOICE_ORDER_STATUSES.includes(status)) {
    return "Invoices can be created once the order is active.";
  }

  return "";
}

export function isOrderStockFinalized(order, allocationState = {}) {
  return (
    Boolean(order?.stockFinalizedAt) ||
    Boolean(allocationState?.isFullyDeducted)
  );
}
