const ZWSP = "\u200B";

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

const getLineTotal = (item) => {
  if (!item) return 0;
  if (typeof item.lineTotal === "number") return item.lineTotal;
  const qty = Number(item.qty) || 0;
  const unit = Number(item.unitPrice) || 0;
  return qty * unit;
};

const computeTotal = (order) => {
  const items = Array.isArray(order?.orderItems) ? order.orderItems : [];
  const itemsTotal = items.reduce((sum, it) => sum + getLineTotal(it), 0);
  const delivery = Number(order?.deliveryCharge) || 0;
  const extra = Number(order?.extraFee) || 0;
  const computed = itemsTotal + delivery + extra;
  const stored = Number(order?.totalPrice);
  if (items.length > 0 || delivery > 0 || extra > 0) {
    return Number.isFinite(computed) ? computed : 0;
  }
  return Number.isFinite(stored) ? stored : 0;
};

export const buildAdminOrderShareText = (order) => {
  const createdAt = order?.createdAt ? formatShareDate(order.createdAt) : "-";
  const clientName = order?.user?.name || "Unnamed";
  const clientEmail = order?.user?.email || "-";
  const items = Array.isArray(order?.orderItems) ? order.orderItems : [];
  const status = order?.status || "-";
  const deliveredBy = order?.deliveredBy || "-";
  const stockFinalized = Boolean(order?.stockFinalizedAt);
  const stockStatus = stockFinalized ? "Finalized" : "Not Finalized";

  const safeDate = preventAutoLink(createdAt);
  const safeEmail = preventAutoLink(clientEmail);

  const lines = [];
  lines.push("ORDER");
  lines.push(`Date: ${safeDate}`);
  lines.push(`Client: ${clientName}`);
  lines.push(`Email: ${safeEmail}`);
  lines.push("");
  lines.push("Items:");
  if (!items.length) {
    lines.push("- None");
  } else {
    items.forEach((item, idx) => {
      const qty = Number(item?.qty) || 0;
      const label = item?.productName || item?.product?.name || "Unnamed";
      const lineTotal = getLineTotal(item);
      lines.push(`${idx + 1}. *${label}* Qty: ${qty}, ${money(lineTotal)}`);
      if (idx < items.length - 1) {
        lines.push("");
      }
    });
  }
  lines.push("");
  lines.push(`Delivery Charge: ${money(order?.deliveryCharge)}`);
  lines.push(`Extra Fee: ${money(order?.extraFee)}`);
  lines.push(`Total Price: ${money(computeTotal(order))}`);
  lines.push("");
  lines.push(`Status: ${status}`);
  lines.push(`Stock Status: ${stockStatus}`);
  lines.push(`Delivered By: ${deliveredBy}`);

  return lines.join("\n");
};
