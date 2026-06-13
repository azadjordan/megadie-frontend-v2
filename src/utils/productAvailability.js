export const PRODUCT_AVAILABILITY_STATUS = {
  CHECKING: "CHECKING",
  AVAILABLE: "AVAILABLE",
  PARTIAL: "PARTIAL",
  MAYBE: "MAYBE",
  UNAVAILABLE: "UNAVAILABLE",
};

const toWholeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.trunc(parsed));
};

export const formatUnitCount = (value) => {
  const count = toWholeNumber(value, 0);
  return `${count} unit${count === 1 ? "" : "s"}`;
};

export const getAvailableNow = (product) =>
  toWholeNumber(product?.availability?.availableNow, 0);

export const formatSourcingCount = (value) => {
  const count = toWholeNumber(value, 0);
  return `${count} more`;
};

export const resolveProductAvailability = (product, selectedQty = 1) => {
  const requestedQty = Math.max(1, toWholeNumber(selectedQty, 1));
  const availableNow = getAvailableNow(product);

  if (product?.isAvailable === false) {
    return {
      status: PRODUCT_AVAILABILITY_STATUS.UNAVAILABLE,
      label: "Unavailable",
      summary: "Unavailable",
      detail: "This product is currently unavailable.",
      availableNow,
      requestedQty,
      shortageQty: requestedQty,
    };
  }

  if (product?.availability === null) {
    return {
      status: PRODUCT_AVAILABILITY_STATUS.CHECKING,
      label: "Checking",
      summary: "Checking",
      detail: "Checking availability",
      availableNow,
      requestedQty,
      shortageQty: 0,
    };
  }

  if (availableNow >= requestedQty) {
    return {
      status: PRODUCT_AVAILABILITY_STATUS.AVAILABLE,
      label: "Available now",
      summary: `Available: ${formatUnitCount(availableNow)}`,
      detail: `${formatUnitCount(availableNow)} available`,
      availableNow,
      requestedQty,
      shortageQty: 0,
    };
  }

  if (availableNow > 0) {
    return {
      status: PRODUCT_AVAILABILITY_STATUS.PARTIAL,
      label: "Partially available",
      summary: `Available: ${formatUnitCount(availableNow)}`,
      detail: `${formatUnitCount(availableNow)} available now, request the rest`,
      availableNow,
      requestedQty,
      shortageQty: Math.max(0, requestedQty - availableNow),
    };
  }

  return {
    status: PRODUCT_AVAILABILITY_STATUS.MAYBE,
    label: "Maybe available",
    summary: "Maybe Available",
    detail: "Request and we'll confirm",
    availableNow,
    requestedQty,
    shortageQty: requestedQty,
  };
};
