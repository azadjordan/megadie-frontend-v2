export const packingQuantity = (qty, unit) => unit && unit !== "units"
  ? `${qty} × ${unit}` : `${qty} ${qty === 1 ? "unit" : "units"}`;

export const packingError = error => error?.data?.message || error?.error || "Could not save packing progress.";
export const packingPhoneLink = value => {
  const phone = String(value || '').trim();
  if (!/^\+?[0-9][0-9 ().-]*$/.test(phone)) return '';
  const dial = phone.replace(/[ ().-]/g, '');
  return /^\+?[0-9]{3,}$/.test(dial) ? 'tel:' + dial : '';
};
export const needsPackingRefresh = error => !Number.isFinite(error?.status) || error.status === 409 || error.status >= 500;
export const packingTaskLabel = mode => mode === "prepare_deliver" ? "Pack & deliver" : "Pack only";

export const packingProgressLabel = summary => `${summary?.collectedItems || 0} of ${summary?.totalItems || 0} products complete`;
export const packingDate = value => value ? new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
export const packingButton = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50";
export const packingPrimary = packingButton + " bg-slate-900 text-white hover:bg-slate-800";
export const packingSecondary = packingButton + " border border-slate-200 bg-white text-slate-700 hover:bg-slate-50";
