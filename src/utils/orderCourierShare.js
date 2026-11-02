import { courierPickupConfig } from "../config/courierConfig.js";
import { getOrderTotals } from "./orderTotals.js";

const clean = (value) => String(value || "").trim();

const formatPhoneForCourier = (value) => {
  const phone = clean(value);
  const digits = phone.replace(/\D/g, "");
  if (/^0\d{9}$/.test(digits)) {
    return `+971 ${digits.slice(1, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  return phone;
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

const getPhoneValues = (phones = []) =>
  phones.map(formatPhoneForCourier).filter(Boolean);

export const getCourierDeliveryProfile = (value = {}) => ({
  contactName: clean(value?.contactName),
  phoneNumber: clean(value?.phoneNumber),
  secondaryPhoneNumber: clean(value?.secondaryPhoneNumber),
  address: clean(value?.address),
  googleMapsUrl: clean(value?.googleMapsUrl),
  notes: clean(value?.notes),
});

export const hasCourierProfileChanges = (base = {}, current = {}) => {
  const baseProfile = getCourierDeliveryProfile(base);
  const currentProfile = getCourierDeliveryProfile(current);
  return Object.keys(baseProfile).some(
    (key) => baseProfile[key] !== currentProfile[key]
  );
};

export const getCourierMissingFields = (profile = {}) => {
  const normalized = getCourierDeliveryProfile(profile);
  const missing = [];

  if (!normalized.contactName) {
    missing.push({ key: "contactName", label: "Recipient name", message: "Recipient name is required." });
  }

  if (!normalized.phoneNumber) {
    missing.push({
      key: "phoneNumber",
      label: "Primary phone",
      message: "Primary phone is required.",
    });
  }

  if (!normalized.address && !normalized.googleMapsUrl) {
    missing.push({
      key: "addressOrLocation",
      label: "Address or Google Maps location",
      message: "Add an address or Google Maps location.",
    });
  }

  return missing;
};

export const buildCourierShareText = (
  order,
  { pickupConfig = courierPickupConfig, deliveryProfile } = {}
) => {
  const delivery = getCourierDeliveryProfile(deliveryProfile || order?.resolvedDelivery?.details || order?.deliveryDetails);
  const pickup = {
    storeName: clean(pickupConfig.storeName) || "Megadie",
    address: clean(pickupConfig.address),
    googleMapsUrl: clean(pickupConfig.googleMapsUrl),
    courierNotes: Array.isArray(pickupConfig.courierNotes)
      ? pickupConfig.courierNotes.map(clean).filter(Boolean)
      : clean(pickupConfig.courierNote)
      ? [clean(pickupConfig.courierNote)]
      : [],
    phoneNumbers: Array.isArray(pickupConfig.phoneNumbers)
      ? pickupConfig.phoneNumbers
      : [],
  };
  const orderNumber = clean(order?.orderNumber) || clean(order?._id) || "-";
  const clientName = delivery.contactName || "Unnamed";
  const total = getOrderTotals(order).total;

  const lines = [];
  const pickupPhones = getPhoneValues(pickup.phoneNumbers);
  lines.push("🚚 COURIER DELIVERY");
  lines.push("━━━━━━━━━━━━");
  lines.push("");
  lines.push("_PICKUP_");
  lines.push(`🏷️ ${pickup.storeName}`);
  if (pickupPhones.length) {
    pickupPhones.forEach((phone) => lines.push(`📞 ${phone}`));
  } else {
    lines.push("📞 -");
  }
  if (pickup.address) lines.push(`📍 ${pickup.address}`);
  if (pickup.googleMapsUrl) lines.push(pickup.googleMapsUrl);
  lines.push("");
  lines.push("_DROP-OFF_");
  lines.push(`🏷️ ${clientName}`);
  lines.push(`📞 ${formatPhoneForCourier(delivery.phoneNumber) || "-"}`);
  if (delivery.secondaryPhoneNumber) {
    lines.push(`📞 ${formatPhoneForCourier(delivery.secondaryPhoneNumber)}`);
  }
  if (delivery.address) lines.push(`📍 ${delivery.address}`);
  if (delivery.googleMapsUrl) {
    lines.push(delivery.googleMapsUrl);
  }
  if (delivery.notes) {
    lines.push(`📝 ${delivery.notes}`);
  }
  lines.push("");
  lines.push("_ORDER_");
  lines.push(`# ${orderNumber}`);
  lines.push(`💰 Order total: ${money(total)}`);
  if (pickup.courierNotes.length) {
    lines.push("");
    lines.push("_NOTES_");
    pickup.courierNotes.forEach((note, index) => {
      lines.push(`${index + 1}. ${note}`);
    });
  }

  return lines.join("\n");
};
