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

export const buildAdminQuoteShareText = (quote, originOverride) => {
  const quoteNo = quote?.quoteNumber || quote?._id || "-";
  const createdAt = quote?.createdAt ? formatShareDate(quote.createdAt) : "-";
  const clientName = quote?.user?.name || "Unnamed";
  const clientEmail = quote?.user?.email || "-";
  const items = Array.isArray(quote?.requestedItems) ? quote.requestedItems : [];
  const quoteId = quote?._id || quote?.id;
  const link = buildClientQuoteLink(quoteId, originOverride);
  const safeQuoteNo = preventAutoLink(quoteNo);
  const safeCreatedAt = preventAutoLink(createdAt);
  const safeClientEmail = preventAutoLink(clientEmail);

  const lines = [];
  lines.push("Quote Details");
  lines.push(`Quote #: ${safeQuoteNo}`);
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
      const unit = Number(item?.unitPrice) || 0;
      const lineTotal = Math.max(0, unit * qty);
      const label = item?.product?.name || "Unnamed";
      lines.push(`${idx + 1}. *${label}* Qty: ${qty}, ${money(lineTotal)}`);
      if (idx < items.length - 1) {
        lines.push("");
      }
    });
  }

  lines.push("");
  lines.push(`Delivery Charge: ${money(quote?.deliveryCharge)}`);
  lines.push(`Extra Fee: ${money(quote?.extraFee)}`);
  lines.push(`Total Price: ${money(quote?.totalPrice)}`);
  lines.push("");
  lines.push("Please review your request.");
  lines.push(
    "If everything looks correct, reply with *Confirm* or confirm using the link below:"
  );
  lines.push("يرجى مراجعة طلبك.");
  lines.push(
    "إذا كان كل شيء صحيحًا، يرجى الرد بكلمة *تأكيد* أو يمكنك التأكيد عبر الرابط أدناه:"
  );
  if (link) {
    lines.push(link);
  }

  return lines.join("\n");
};
