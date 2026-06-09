import {
  formatMinorAmountInput,
  getInvoiceBalanceDueMinor,
  normalizeMinorUnitFactor,
} from "./invoiceMoney";

export function toDateTimeLocalValue(input) {
  if (!input) return "";
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function buildPaymentDefaults(invoice, options = {}) {
  const now = options.now || new Date();
  const factor = normalizeMinorUnitFactor(invoice?.minorUnitFactor);
  const balanceMinor = invoice ? getInvoiceBalanceDueMinor(invoice) : 0;
  const amount =
    balanceMinor > 0 ? formatMinorAmountInput(balanceMinor, factor) : "";

  return {
    amount,
    method: "",
    receivedBy: "",
    date: toDateTimeLocalValue(now),
    reference: "",
    note: "",
  };
}
