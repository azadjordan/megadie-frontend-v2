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
  const numberedItems = [...items].map(([sku, item], index) => ({
    ...item, sku, number: String(index + 1).padStart(2, "0"),
  }));
  const draft = Boolean(sheet.problems?.length);
  const lines = [
    `*${draft ? "PREPARATION DRAFT — HOLD" : "PREPARE & DELIVER"}*`,
    `_Order:_ ${line(sheet.orderNumber)}`,
    `_Carton Tag:_ *${line(sheet.label)}*`,
    `*${summary}*`,
  ];
  if (draft) lines.push("", ...sheet.problems.map((problem) => `⚠ ${line(problem)}`));
  if (sheet.notices?.length) lines.push("", ...sheet.notices.map((notice) => `⚠ ${line(notice)}`));
  lines.push("", "*1. PICK*");
  for (const item of numberedItems) {
    lines.push(`*${item.number})* ${item.sku}`);
    for (const [slot, allocation] of [...item.slots].sort(([a], [b]) => slotSort.compare(a, b))) {
      const deducted = allocation.deductedQty ? ` (${allocation.deductedQty} deducted)` : "";
      lines.push(`   ↳ ${slot}: *${units(allocation.qty)}*${deducted}`);
    }
    if (!item.slots.size) lines.push("   ↳ No reserved slots — confirm before picking.");
  }
  lines.push("", "*2. PACK & CHECK*");
  for (const item of numberedItems) {
    lines.push(`☐ *${item.number})* ${item.sku} — *${item.orderedQty}*`);
  }
  lines.push(`*Total: ${summary}*`, "", "*3. DELIVER*");
  const delivery = sheet.delivery?.details || {};
  if (delivery.address) lines.push(`_Address:_ ${line(delivery.address)}`);
  if (delivery.googleMapsUrl) lines.push(`_Map:_ ${line(delivery.googleMapsUrl)}`);
  return lines.join("\n");
}
