import {
  getInvoiceBalanceDueMinor,
  hasInvoiceBalanceFields,
  isInvoicePayable,
} from "./invoiceMoney";
import {
  canCreateOrderInvoice,
  getOrderStatusFlags,
  isOrderStockFinalized,
} from "./adminOrderWorkflow";

export const ADMIN_ORDER_ACTION_IDS = Object.freeze({
  MARK_SHIPPING: "mark-shipping",
  RESERVE_STOCK: "reserve-stock",
  MARK_DELIVERED: "mark-delivered",
  CREATE_INVOICE: "create-invoice",
  ADD_PAYMENT: "add-payment",
  FINALIZE_STOCK: "finalize-stock",
  OPEN_ORDER: "open-order",
});

export const ADMIN_ORDER_ACTION_LABELS = Object.freeze({
  [ADMIN_ORDER_ACTION_IDS.MARK_SHIPPING]: "Ship",
  [ADMIN_ORDER_ACTION_IDS.RESERVE_STOCK]: "Reserve",
  [ADMIN_ORDER_ACTION_IDS.MARK_DELIVERED]: "Deliver",
  [ADMIN_ORDER_ACTION_IDS.CREATE_INVOICE]: "Invoice",
  [ADMIN_ORDER_ACTION_IDS.ADD_PAYMENT]: "Pay",
  [ADMIN_ORDER_ACTION_IDS.FINALIZE_STOCK]: "Deduct",
  [ADMIN_ORDER_ACTION_IDS.OPEN_ORDER]: "Open",
});

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

export function getAdminOrderBillingState(order) {
  const invoice = getOrderInvoice(order);
  const invoiceId = getOrderInvoiceId(order);
  const hasInvoice = Boolean(invoiceId);
  const invoiceNumber = invoice?.invoiceNumber || invoiceId;
  const paymentStatus = invoice?.paymentStatus || "";
  const balanceDueMinor = invoice ? getInvoiceBalanceDueMinor(invoice) : 0;
  const hasBalanceData = hasInvoiceBalanceFields(invoice);
  const payable = isInvoicePayable(invoice);

  return {
    invoice,
    invoiceId,
    hasInvoice,
    invoiceNumber,
    paymentStatus,
    balanceDueMinor,
    hasBalanceData,
    payable,
    paymentLabel: paymentStatus === "PartiallyPaid" ? "Partially paid" : paymentStatus || "",
    invoiceLabel: invoiceNumber || "No invoice",
  };
}

export function getAdminOrderPrimaryAction(order) {
  const fulfillment = getAdminOrderFulfillmentState(order);

  if (fulfillment.isCancelled) return null;

  if (fulfillment.isProcessing) {
    return buildAction(ADMIN_ORDER_ACTION_IDS.MARK_SHIPPING);
  }

  if (fulfillment.isShipping) {
    if (fulfillment.stockFinalized) {
      return buildAction(ADMIN_ORDER_ACTION_IDS.OPEN_ORDER, {
        tone: "neutral",
        reason: "Review finalized shipping order.",
      });
    }

    if (!fulfillment.isAllocated) {
      return buildAction(ADMIN_ORDER_ACTION_IDS.RESERVE_STOCK, {
        kind: "link",
        tab: "stock",
      });
    }

    return buildAction(ADMIN_ORDER_ACTION_IDS.MARK_DELIVERED);
  }

  if (fulfillment.isDelivered) {
    if (!fulfillment.stockFinalized) {
      if (!fulfillment.isAllocated) {
        return buildAction(ADMIN_ORDER_ACTION_IDS.OPEN_ORDER, {
          tone: "neutral",
          reason: "Review stock allocations before finalizing.",
        });
      }

      return buildAction(ADMIN_ORDER_ACTION_IDS.FINALIZE_STOCK);
    }
  }

  return null;
}

export function getAdminOrderBillingAction(order) {
  const fulfillment = getAdminOrderFulfillmentState(order);
  const billing = getAdminOrderBillingState(order);

  if (fulfillment.isCancelled) return null;

  if (!billing.hasInvoice && canCreateOrderInvoice(order, billing.hasInvoice)) {
    return buildAction(ADMIN_ORDER_ACTION_IDS.CREATE_INVOICE, {
      visible: true,
      reason: "Create and send an invoice for this order.",
    });
  }

  const visible =
    billing.hasInvoice &&
    billing.paymentStatus !== "Paid" &&
    billing.invoice?.status !== "Cancelled";

  if (!visible) return null;

  return {
    id: ADMIN_ORDER_ACTION_IDS.ADD_PAYMENT,
    label: ADMIN_ORDER_ACTION_LABELS[ADMIN_ORDER_ACTION_IDS.ADD_PAYMENT],
    visible,
    enabled: visible && billing.payable,
    reason: !billing.hasInvoice
      ? "Create an invoice before recording payment."
      : billing.paymentStatus === "Paid"
      ? "Invoice is already paid."
      : billing.invoice?.status === "Cancelled"
      ? "Cancelled invoices cannot receive payments."
      : billing.payable
      ? ""
      : "No balance due.",
    needsInvoiceDetails: visible && !billing.hasBalanceData,
  };
}

export function getAdminOrderActionState(order) {
  const fulfillment = getAdminOrderFulfillmentState(order);
  const billing = getAdminOrderBillingState(order);

  return {
    fulfillment,
    billing,
    primaryAction: getAdminOrderPrimaryAction(order),
    billingAction: getAdminOrderBillingAction(order),
  };
}
