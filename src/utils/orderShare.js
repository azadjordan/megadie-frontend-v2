import { getOrderLineTotal, getOrderTotals } from "./orderTotals";

const ZWSP = "\u200B";
const STATUS_MARKS = {
  done: "✓",
  missing: "✕",
  progress: "•",
};

const preventAutoLink = (text) => {
  if (!text) return text;
  let result = String(text);
  result = result.replace(/(\d)(?=\d)/g, `$1${ZWSP}`);
  result = result.replace(/@/g, `${ZWSP}@${ZWSP}`);
  result = result.replace(/\.(?=[^.\s])/g, `.${ZWSP}`);
  return result;
};

const formatShareDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return iso || "-";
  }
};

const money = (amount, currency = "AED") => {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "-";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${n.toFixed(2)} ${currency}`;
  }
};

const formatPaymentStatus = (status) => {
  if (!status) return "-";
  if (status === "PartiallyPaid") return "Partially paid";
  return status;
};

const getInvoiceFromOrder = (order, invoiceDetails) => {
  if (invoiceDetails && typeof invoiceDetails === "object") return invoiceDetails;
  const invoiceValue = order?.invoice;
  return invoiceValue && typeof invoiceValue === "object" ? invoiceValue : null;
};

const getInvoiceIdFromOrder = (order) => {
  const invoiceValue = order?.invoice;
  return typeof invoiceValue === "string" ? invoiceValue : invoiceValue?._id || "";
};

const getPaymentReceivers = (invoice) => {
  const payments = Array.isArray(invoice?.payments) ? invoice.payments : [];
  const receivers = payments
    .map((payment) => String(payment?.receivedBy || "").trim())
    .filter(Boolean);

  return [...new Set(receivers)].join(", ") || "-";
};

const getPaymentMethods = (invoice) => {
  const payments = Array.isArray(invoice?.payments) ? invoice.payments : [];
  const methods = payments
    .map((payment) => String(payment?.paymentMethod || "").trim())
    .filter(Boolean);

  return [...new Set(methods)];
};

const getOrderStatusMark = (status) => {
  if (status === "Delivered") return STATUS_MARKS.done;
  if (status === "Cancelled") return STATUS_MARKS.missing;
  return STATUS_MARKS.progress;
};

const getPaymentStatusMark = (status) => {
  if (status === "Paid") return STATUS_MARKS.done;
  if (status === "PartiallyPaid") return STATUS_MARKS.progress;
  return STATUS_MARKS.missing;
};

export const buildAdminOrderShareText = (order, { invoiceDetails } = {}) => {
  const createdAt = order?.createdAt ? formatShareDate(order.createdAt) : "-";
  const orderNumber = order?.orderNumber || order?._id || "-";
  const invoice = getInvoiceFromOrder(order, invoiceDetails);
  const invoiceId = getInvoiceIdFromOrder(order) || invoice?._id || "";
  const invoiceNumber = order?.invoiceNumber || invoice?.invoiceNumber || "";
  const invoiceLabel = invoiceNumber || invoiceId || "-";
  const paymentStatus = invoice?.paymentStatus || "";
  const paymentReceivers = getPaymentReceivers(invoice);
  const paymentMethods = getPaymentMethods(invoice);
  const clientName = order?.user?.name || "Unnamed";
  const clientEmail = order?.user?.email || "-";
  const items = Array.isArray(order?.orderItems) ? order.orderItems : [];
  const status = order?.status || "-";
  const deliveredBy = order?.deliveredBy || "-";
  const stockFinalized = Boolean(order?.stockFinalizedAt);
  const stockStatus = stockFinalized ? "Deducted" : "Not deducted";
  const hasPaymentReceiver = paymentReceivers !== "-";
  const orderStatusMark = getOrderStatusMark(status);
  const paymentStatusMark = getPaymentStatusMark(paymentStatus);
  const paymentReceiverMark = hasPaymentReceiver
    ? STATUS_MARKS.done
    : STATUS_MARKS.missing;
  const stockStatusMark = stockFinalized ? STATUS_MARKS.done : STATUS_MARKS.missing;
  const deliveredByMark =
    deliveredBy !== "-"
      ? STATUS_MARKS.done
      : status === "Delivered"
      ? STATUS_MARKS.missing
      : STATUS_MARKS.progress;

  const safeDate = preventAutoLink(createdAt);
  const safeOrderNumber = preventAutoLink(orderNumber);
  const safeInvoiceLabel = preventAutoLink(invoiceLabel);
  const safeEmail = preventAutoLink(clientEmail);

  const lines = [];
  lines.push("ORDER");
  lines.push(`Order #: ${safeOrderNumber}`);
  lines.push(`Invoice #: ${safeInvoiceLabel}`);
  lines.push(`Date: ${safeDate}`);
  lines.push(`${orderStatusMark} Status: ${status}`);
  lines.push(`${deliveredByMark} Delivered by: ${deliveredBy}`);
  lines.push(`${stockStatusMark} Stock: ${stockStatus}`);
  lines.push("");
  lines.push("Client:");
  lines.push(`Name: ${clientName}`);
  lines.push(`Email: ${safeEmail}`);
  lines.push("");
  lines.push("Payment:");
  lines.push(`${paymentStatusMark} Status: ${formatPaymentStatus(paymentStatus)}`);
  if (paymentMethods.length) {
    const methodLabel = paymentMethods.length === 1 ? "Method" : "Methods";
    lines.push(`${STATUS_MARKS.done} ${methodLabel}: ${paymentMethods.join(", ")}`);
  }
  lines.push(`${paymentReceiverMark} Received by: ${paymentReceivers}`);
  lines.push("");
  lines.push("Fees:");
  lines.push(`Delivery Charge: ${money(order?.deliveryCharge)}`);
  lines.push(`Extra Fee: ${money(order?.extraFee)}`);
  lines.push(`Total: ${money(getOrderTotals(order).total)}`);
  lines.push("");
  lines.push("Items:");
  if (!items.length) {
    lines.push("- None");
  } else {
    items.forEach((item, idx) => {
      const qty = Number(item?.qty) || 0;
      const label = item?.productName || item?.product?.name || "Unnamed";
      const lineTotal = getOrderLineTotal(item);
      lines.push(`${idx + 1}. *${label}*`);
      lines.push(`   Qty: ${qty}`);
      lines.push(`   Line total: ${money(lineTotal)}`);
      if (idx < items.length - 1) {
        lines.push("");
      }
    });
  }

  return lines.join("\n");
};
