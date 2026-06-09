export function normalizeMinorUnitFactor(factor, fallback = 100) {
  const n = Number(factor);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function hasInvoiceBalanceFields(invoice) {
  if (!invoice || typeof invoice !== "object") return false;
  return (
    typeof invoice.balanceDueMinor === "number" ||
    (typeof invoice.amountMinor === "number" &&
      typeof invoice.paidTotalMinor === "number")
  );
}

export function getInvoiceBalanceDueMinor(invoice) {
  if (!invoice || typeof invoice !== "object") return 0;
  if (typeof invoice.balanceDueMinor === "number") {
    return Math.max(0, invoice.balanceDueMinor);
  }

  const amount =
    typeof invoice.amountMinor === "number" ? invoice.amountMinor : 0;
  const paid =
    typeof invoice.paidTotalMinor === "number" ? invoice.paidTotalMinor : 0;
  return Math.max(amount - paid, 0);
}

export function minorToMajor(amountMinor, factor = 100) {
  const amount = Number(amountMinor);
  if (!Number.isFinite(amount)) return null;
  return amount / normalizeMinorUnitFactor(factor);
}

export function formatMinorAmountInput(amountMinor, factor = 100) {
  const major = minorToMajor(amountMinor, factor);
  if (major == null) return "";
  return major.toFixed(2);
}

export function formatInvoiceMoneyMinor(
  amountMinor,
  currency = "AED",
  factor = 100,
  options = {}
) {
  const {
    maximumFractionDigits = 2,
    minimumFractionDigits,
    fallback = "",
  } = options;
  const major = minorToMajor(amountMinor, factor);
  if (major == null) return fallback;

  try {
    const formatOptions = {
      style: "currency",
      currency: currency || "AED",
      maximumFractionDigits,
    };
    if (typeof minimumFractionDigits === "number") {
      formatOptions.minimumFractionDigits = minimumFractionDigits;
    }
    return new Intl.NumberFormat(undefined, formatOptions).format(major);
  } catch {
    return String(major);
  }
}

export function formatInvoiceNumberMinor(amountMinor, factor = 100) {
  const major = minorToMajor(amountMinor, factor);
  if (major == null) return "";

  try {
    return new Intl.NumberFormat(undefined, {
      maximumFractionDigits: 0,
    }).format(major);
  } catch {
    return String(Math.round(major));
  }
}

export function getInvoicePaymentStatusLabel(status) {
  if (status === "PartiallyPaid") return "Partially paid";
  if (status === "Paid") return "Paid";
  if (status === "Unpaid") return "Unpaid";
  return "Unpaid";
}

export function isInvoiceOverdue(invoice, now = Date.now()) {
  if (!invoice || invoice.status === "Cancelled") return false;
  if (invoice.paymentStatus === "Paid") return false;

  const due = invoice.dueDate ? Date.parse(invoice.dueDate) : NaN;
  if (!Number.isFinite(due)) return false;
  return getInvoiceBalanceDueMinor(invoice) > 0 && due < now;
}

export function isInvoicePayable(invoice) {
  if (!invoice || typeof invoice !== "object") return false;
  if (invoice.status === "Cancelled") return false;
  if (invoice.paymentStatus === "Paid") return false;
  return getInvoiceBalanceDueMinor(invoice) > 0 || !hasInvoiceBalanceFields(invoice);
}
