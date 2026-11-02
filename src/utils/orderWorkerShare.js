const line = (value) => String(value || "").replace(/[\r\n]+/g, " ").trim();
const units = (qty) => `${qty} ${qty === 1 ? "unit" : "units"}`;
const slotSort = new Intl.Collator("en", { numeric: true });

// This receives the purpose-built sheet, never a raw order/User/courier message.
export function buildWorkerOrderShareText(sheet) {
  if (["Cancelled", "Delivered"].includes(sheet?.status)) {
    throw new Error("Closed orders cannot be prepared or dispatched.");
  }
  const items = new Map();
  for (const item of sheet.items || []) {
    const sku = line(item.sku);
    const group = items.get(sku) || { orderedQty: 0, slots: new Map() };
    group.orderedQty += item.orderedQty;
    items.set(sku, group);
  }
  for (const pick of sheet.picks || []) {
    const group = items.get(line(pick.sku));
    if (!group) continue;
    const slot = line(pick.slot);
    const allocation = group.slots.get(slot) || { qty: 0, deductedQty: 0 };
    allocation.qty += pick.qty;
    if (pick.deducted) allocation.deductedQty += pick.qty;
    group.slots.set(slot, allocation);
  }
  const total = [...items.values()].reduce((sum, item) => sum + item.orderedQty, 0);
  const summary = `${items.size} ${items.size === 1 ? "item" : "items"} — ${units(total)}`;
  const draft = Boolean(sheet.problems?.length);
  const lines = [
    `*Carton Tag: ${line(sheet.label)}*`,
    "",
    `*${draft ? "PREPARATION DRAFT — HOLD" : "PREPARE & DELIVER"} — ORDER #${line(sheet.orderNumber)}*`,
    "",
    `*${summary}*`,
  ];
  if (draft) lines.push("", ...sheet.problems.map((problem) => `⚠ ${line(problem)}`));
  if (sheet.notices?.length) lines.push("", ...sheet.notices.map((notice) => `⚠ ${line(notice)}`));
  lines.push("", "*1. PICK*");
  for (const [sku, item] of items) {
    lines.push("", `• *${sku}*`, "");
    let pickedQty = 0;
    for (const [slot, allocation] of [...item.slots].sort(([a], [b]) => slotSort.compare(a, b))) {
      const deducted = allocation.deductedQty ? ` (${allocation.deductedQty} deducted)` : "";
      lines.push(`- ${slot}: ${units(allocation.qty)}${deducted}`);
      pickedQty += allocation.qty;
    }
    if (!item.slots.size) lines.push("No reserved slots — confirm before picking.");
    lines.push(`- Total: ${units(pickedQty)}`);
  }
  lines.push("", "*2. PACK & CHECK*", "");
  for (const [sku, item] of items) {
    lines.push(`- ${sku} — ${units(item.orderedQty)}`);
  }
  lines.push("", `*Total: ${summary}*`, "", "*3. DELIVER*", "");
  const delivery = sheet.delivery?.details || {};
  if (delivery.address) lines.push(`Address: ${delivery.address.trim()}`);
  if (delivery.googleMapsUrl) lines.push("", `Map: ${line(delivery.googleMapsUrl)}`);
  return lines.join("\n");
}
