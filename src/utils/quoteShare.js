const resolveOrigin = (override) => {
  if (override) return String(override).replace(/\/$/, "");
  if (typeof window === "undefined") return "";
  const origin = window?.location?.origin;
  return origin ? String(origin).replace(/\/$/, "") : "";
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
