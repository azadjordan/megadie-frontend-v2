function pad2(value) {
  return String(value).padStart(2, "0");
}

export function toDateInputValue(value = new Date()) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return [
    date.getFullYear(),
    pad2(date.getMonth() + 1),
    pad2(date.getDate()),
  ].join("-");
}

export function getTodayDateInputValue() {
  return toDateInputValue(new Date());
}

function parseDateInputValue(value) {
  if (!value) return null;
  const parts = String(value).slice(0, 10).split("-");
  if (parts.length !== 3) return null;

  const [year, month, day] = parts.map(Number);
  if (!year || !month || !day) return null;

  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function addCalendarMonthsClampedInput(value, months = 1) {
  const source = parseDateInputValue(value);
  if (!source) return "";

  const year = source.getUTCFullYear();
  const month = source.getUTCMonth();
  const day = source.getUTCDate();
  const target = new Date(Date.UTC(year, month + months, 1));
  const lastDayOfTargetMonth = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)
  ).getUTCDate();

  target.setUTCDate(Math.min(day, lastDayOfTargetMonth));
  return toDateInputValue(target);
}

export function getInvoiceDateValue(invoice) {
  return invoice?.invoiceDate || invoice?.createdAt || "";
}
