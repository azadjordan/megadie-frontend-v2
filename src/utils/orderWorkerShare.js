const line = (value) => String(value || "").replace(/[\r\n]+/g, " ").trim();

// This receives the purpose-built sheet, never a raw order/User/courier message.
export function buildWorkerOrderShareText(sheet) {
  if (["Cancelled", "Delivered"].includes(sheet?.status)) {
    throw new Error("Closed orders cannot be prepared or dispatched.");
  }
  const draft = Boolean(sheet.problems?.length);
  const lines = [
    line(sheet.label),
    `*${draft ? "PREPARATION DRAFT — HOLD" : "PREPARE & DELIVER"} — ORDER #${line(sheet.orderNumber)}*`,
  ];
  if (draft) lines.push("", ...sheet.problems.map((problem) => `⚠ ${line(problem)}`));
  if (sheet.notices?.length) lines.push("", ...sheet.notices.map((notice) => `⚠ ${line(notice)}`));
  lines.push("", "*1. PICK*");
  for (const pick of sheet.picks || []) {
    lines.push("", `• ${line(pick.slot)} — ${line(pick.sku)}${pick.deducted ? " (deducted)" : ""}`);
    if (pick.name) lines.push(`  ${line(pick.name)}`);
    lines.push(`  Quantity: ${pick.qty} units`);
  }
  if (!sheet.picks?.length) lines.push("No reserved slots — confirm before picking.");
  lines.push("", "*2. PACK & CHECK*", "");
  for (const item of sheet.items || []) {
    lines.push(`• ${line(item.sku)} — ${item.orderedQty} units${draft ? ` (allocated: ${item.allocatedQty})` : ""}`);
  }
  const total = (sheet.items || []).reduce((sum, item) => sum + item.orderedQty, 0);
  lines.push(`Total: ${total} units`, "", "*3. DELIVER*", "");
  const delivery = sheet.delivery?.details || {};
  lines.push(`Contact: ${line(delivery.contactName) || "Not set"}`, `Phone: ${line(delivery.phoneNumber) || "Not set"}`);
  if (delivery.secondaryPhoneNumber) lines.push(`Second phone: ${line(delivery.secondaryPhoneNumber)}`);
  if (delivery.address) lines.push(`Address: ${delivery.address.trim()}`);
  if (delivery.googleMapsUrl) lines.push(`Map: ${line(delivery.googleMapsUrl)}`);
  if (delivery.notes) lines.push(`Notes: ${delivery.notes.trim()}`);
  return lines.join("\n");
}
