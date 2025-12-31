export function formatDateTime(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso || "-";
  }
}

export function normalizeAvailabilityStatus(status) {
  return status === "PARTIAL" ? "SHORTAGE" : status;
}

export function money(amount, currency = "AED") {
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
}

export function moneyPlain(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "-";
  try {
    return new Intl.NumberFormat(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return n.toFixed(2);
  }
}

export function parseNullableNumber(value) {
  if (value === "" || value == null) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n;
}

export function toInputValue(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return String(n);
}

export function getId(v) {
  if (!v) return "";
  if (typeof v === "string") return v;
  return String(v._id || v.id || "");
}

export function sumItems(items) {
  return (items || []).reduce((sum, it) => {
    const qty = parseNullableNumber(it.qtyStr);
    const unit = parseNullableNumber(it.unitPriceStr);
    const q = qty == null ? 0 : qty;
    const u = unit == null ? 0 : unit;
    const availableNow = Number(it?.availableNow);
    const shortage = Number.isFinite(Number(it?.shortage))
      ? Math.max(0, Number(it.shortage))
      : Number.isFinite(availableNow)
      ? Math.max(0, q - availableNow)
      : 0;
    const availabilityQty =
      Number.isFinite(availableNow) && shortage > 0 ? Math.max(0, availableNow) : q;
    return sum + availabilityQty * u;
  }, 0);
}
