export function getOrderLineTotal(item) {
  if (!item) return 0;

  const line =
    typeof item.lineTotal === "number"
      ? item.lineTotal
      : (Number(item.qty) || 0) * (Number(item.unitPrice) || 0);

  return Number.isFinite(line) ? line : 0;
}

export function getOrderTotals(order, overrides = {}) {
  const items = Array.isArray(order?.orderItems) ? order.orderItems : [];
  const itemsTotal = items.reduce((sum, item) => sum + getOrderLineTotal(item), 0);

  const rawDeliveryCharge = Object.prototype.hasOwnProperty.call(
    overrides,
    "deliveryCharge"
  )
    ? overrides.deliveryCharge
    : order?.deliveryCharge;
  const rawExtraFee = Object.prototype.hasOwnProperty.call(overrides, "extraFee")
    ? overrides.extraFee
    : order?.extraFee;

  const deliveryCharge = Math.max(0, Number(rawDeliveryCharge) || 0);
  const extraFee = Math.max(0, Number(rawExtraFee) || 0);
  const computedTotal = itemsTotal + deliveryCharge + extraFee;
  const storedTotal = Number(order?.totalPrice);

  const total =
    items.length > 0 || deliveryCharge > 0 || extraFee > 0
      ? computedTotal
      : Number.isFinite(storedTotal)
      ? storedTotal
      : 0;

  return {
    itemsTotal,
    deliveryCharge,
    extraFee,
    total,
  };
}
