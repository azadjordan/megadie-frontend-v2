const resolveOrigin = (override) => {
  if (override) return String(override).replace(/\/$/, "");
  if (typeof window === "undefined") return "";
  const origin = window?.location?.origin;
  return origin ? String(origin).replace(/\/$/, "") : "";
};

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

const positiveAmount = (amount) => {
  const n = Number(amount);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export const buildClientQuoteLink = (quoteId, originOverride) => {
  const id = String(quoteId || "").trim();
  if (!id) return "";
  const origin = resolveOrigin(originOverride);
  const base = origin || "";
  const prefix = base ? `${base}` : "";
  return `${prefix}/account/requests?quote=${encodeURIComponent(id)}`;
};

export const buildClientShareMessage = (quote, originOverride) => {
  const quoteId = quote?._id || quote?.id;
  const quoteNumber = String(quote?.quoteNumber || "").trim();
  const name = String(quote?.user?.name || "").trim();
  const link = buildClientQuoteLink(quoteId, originOverride);

  const greeting = name ? `Hi ${name}` : "Hello";
  const numberLabel = quoteNumber ? `#${quoteNumber}` : "";
  const parts = [
    `${greeting}, your quote${numberLabel ? ` ${numberLabel}` : ""} is ready.`,
  ];
  if (link) {
    parts.push(`Please confirm it here: ${link}`);
  }
  parts.push("Let us know if you need any changes.");
  return parts.join(" ");
};

export const buildAdminQuoteShareText = (quote) => {
  const quoteNo = quote?.quoteNumber || quote?._id || "-";
  const createdAt = quote?.createdAt ? formatShareDate(quote.createdAt) : "-";
  const status = quote?.status || "-";
  const clientName = quote?.user?.name || "Unnamed";
  const clientEmail = quote?.user?.email || "-";
  const items = Array.isArray(quote?.requestedItems) ? quote.requestedItems : [];
  const safeQuoteNo = preventAutoLink(quoteNo);
  const safeCreatedAt = preventAutoLink(createdAt);
  const safeStatus = preventAutoLink(status);
  const safeClientEmail = preventAutoLink(clientEmail);
  const pricedItems = items
    .map((item) => {
      const qty = Math.max(0, Number(item?.qty) || 0);
      const unitPrice = positiveAmount(item?.unitPrice);
      return {
        item,
        qty,
        unitPrice,
        lineTotal: unitPrice * qty,
        hasPrice: unitPrice > 0,
      };
    })
    .filter(({ hasPrice }) => hasPrice);
  const deliveryCharge = positiveAmount(quote?.deliveryCharge);
  const extraFee = positiveAmount(quote?.extraFee);
  const explicitTotal = positiveAmount(quote?.totalPrice);
  const calculatedTotal =
    pricedItems.reduce((sum, item) => sum + item.lineTotal, 0) +
    deliveryCharge +
    extraFee;
  const totalPrice = explicitTotal || calculatedTotal;
  const hasPricing = totalPrice > 0 || pricedItems.length > 0;

  const lines = [];
  lines.push("Request Details");
  lines.push(`Request #: ${safeQuoteNo}`);
  lines.push(`Status: ${safeStatus}`);
  lines.push(`Date: ${safeCreatedAt}`);
  lines.push(`Client: ${clientName}`);
  lines.push(`Email: ${safeClientEmail}`);
  lines.push("");

  lines.push("Items:");
  if (!items.length) {
    lines.push("- None");
  } else {
    items.forEach((item, idx) => {
      const qty = Number(item?.qty) || 0;
      const unitPrice = positiveAmount(item?.unitPrice);
      const lineTotal = Math.max(0, unitPrice * qty);
      const label = item?.product?.name || "Unnamed";
      const priceText = unitPrice > 0 ? `, ${money(lineTotal)}` : "";
      lines.push(`${idx + 1}. *${label}* Qty: ${qty}${priceText}`);
      if (idx < items.length - 1) {
        lines.push("");
      }
    });
  }

  if (hasPricing) {
    lines.push("");
    if (deliveryCharge > 0) {
      lines.push(`Delivery Charge: ${money(deliveryCharge)}`);
    }
    if (extraFee > 0) {
      lines.push(`Extra Fee: ${money(extraFee)}`);
    }
    lines.push(`Total Price: ${money(totalPrice)}`);
  }

  return lines.join("\n");
};
