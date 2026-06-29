import { FiTruck, FiX } from "react-icons/fi";

import ErrorMessage from "../common/ErrorMessage";
import { courierPickupConfig } from "../../config/courierConfig";

const clean = (value) => String(value || "").trim();

function ReadOnlyLine({ label, value, missing = false }) {
  return (
    <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </div>
      <div
        className={[
          "mt-1 break-words text-sm font-medium",
          missing ? "text-amber-700" : "text-slate-900",
        ].join(" ")}
      >
        {value || "Not set"}
      </div>
    </div>
  );
}

function DeliveryField({
  id,
  label,
  value,
  onChange,
  placeholder,
  missing = false,
  missingHint = "Required",
  multiline = false,
}) {
  const className = [
    "w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 placeholder:text-slate-400 focus:outline-none focus:ring-2",
    missing
      ? "ring-amber-300 focus:ring-amber-400/50"
      : "ring-slate-200 focus:ring-slate-900/20",
  ].join(" ");

  return (
    <div>
      <label
        htmlFor={id}
        className={[
          "mb-1 block text-xs font-semibold",
          missing ? "text-amber-700" : "text-slate-600",
        ].join(" ")}
      >
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          placeholder={placeholder}
          className={`${className} resize-none`}
        />
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={className}
        />
      )}
      {missing ? (
        <div className="mt-1 text-xs font-medium text-amber-700">
          {missingHint}
        </div>
      ) : null}
    </div>
  );
}

export default function CourierDetailsModal({
  open,
  order,
  form,
  missingFields = [],
  hasChanges = false,
  previewText = "",
  onFieldChange,
  onClose,
  onSubmit,
  isSaving = false,
  error,
}) {
  if (!open) return null;

  const missingKeys = new Set(missingFields.map((field) => field.key));
  const addressOrLocationMissing = missingKeys.has("addressOrLocation");
  const user = order?.user && typeof order.user === "object" ? order.user : {};
  const orderNumber = order?.orderNumber || order?._id || "-";
  const pickupPhones = Array.isArray(courierPickupConfig.phoneNumbers)
    ? courierPickupConfig.phoneNumbers.map(clean).filter(Boolean).join(" / ")
    : "";
  const pickupWarnings = [
    !clean(courierPickupConfig.address) ? "pickup address" : "",
    !clean(courierPickupConfig.googleMapsUrl) ? "pickup map" : "",
    !pickupPhones ? "pickup phone" : "",
  ].filter(Boolean);
  const primaryDisabled = isSaving || missingFields.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-3 py-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="courier-details-title"
        className="max-h-full w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-xl ring-1 ring-slate-200"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
                <FiTruck className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <h2
                  id="courier-details-title"
                  className="text-base font-semibold text-slate-900"
                >
                  Courier details
                </h2>
                <div className="text-xs text-slate-500">Order {orderNumber}</div>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300"
            aria-label="Close courier details"
          >
            <FiX className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-4 p-4 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-4">
            <section className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
              <div className="text-sm font-semibold text-slate-900">Pickup</div>
              <div className="mt-1 text-xs text-slate-500">
                Store details used for courier pickup.
              </div>
              {pickupWarnings.length ? (
                <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
                  Missing {pickupWarnings.join(", ")} in courier config.
                </div>
              ) : null}
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <ReadOnlyLine label="Store" value={courierPickupConfig.storeName} />
                <ReadOnlyLine
                  label="Phone"
                  value={pickupPhones}
                  missing={!pickupPhones}
                />
                <ReadOnlyLine
                  label="Address"
                  value={courierPickupConfig.address}
                  missing={!clean(courierPickupConfig.address)}
                />
                <ReadOnlyLine
                  label="Maps"
                  value={courierPickupConfig.googleMapsUrl}
                  missing={!clean(courierPickupConfig.googleMapsUrl)}
                />
              </div>
            </section>

            <section className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
              <div className="text-sm font-semibold text-slate-900">Drop-off</div>
              <div className="mt-1 text-xs text-slate-500">
                Saved to the client delivery profile.
              </div>
              {missingFields.length ? (
                <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
                  Add {missingFields.map((field) => field.label).join(", ")} before
                  copying.
                </div>
              ) : null}
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ReadOnlyLine label="Client" value={user.name || "-"} />
                <DeliveryField
                  id="courier-phone"
                  label="Primary phone"
                  value={form.phoneNumber}
                  onChange={(value) => onFieldChange("phoneNumber", value)}
                  placeholder="Receiver phone"
                  missing={missingKeys.has("phoneNumber")}
                />
                <DeliveryField
                  id="courier-secondary-phone"
                  label="Secondary phone"
                  value={form.secondaryPhoneNumber}
                  onChange={(value) => onFieldChange("secondaryPhoneNumber", value)}
                  placeholder="Optional backup phone"
                />
                <DeliveryField
                  id="courier-map"
                  label="Google Maps location"
                  value={form.deliveryGoogleMapsUrl}
                  onChange={(value) => onFieldChange("deliveryGoogleMapsUrl", value)}
                  placeholder="https://maps..."
                  missing={addressOrLocationMissing}
                  missingHint="Address or map required"
                />
                <div className="sm:col-span-2">
                  <DeliveryField
                    id="courier-address"
                    label="Address"
                    value={form.address}
                    onChange={(value) => onFieldChange("address", value)}
                    placeholder="Receiver address"
                    missing={addressOrLocationMissing}
                    missingHint="Address or map required"
                    multiline
                  />
                </div>
                <div className="sm:col-span-2">
                  <DeliveryField
                    id="courier-notes"
                    label="Delivery notes"
                    value={form.deliveryNotes}
                    onChange={(value) => onFieldChange("deliveryNotes", value)}
                    placeholder="Optional notes for courier"
                    multiline
                  />
                </div>
              </div>
            </section>
          </div>

          <section className="rounded-2xl bg-slate-950 p-3 text-white">
            <div className="text-sm font-semibold">Message preview</div>
            <textarea
              readOnly
              value={previewText}
              className="mt-3 h-[28rem] w-full resize-none rounded-xl border border-white/10 bg-slate-900 px-3 py-2 font-mono text-xs leading-5 text-slate-100 outline-none"
            />
          </section>
        </div>

        {error ? (
          <div className="px-4 pb-3">
            <ErrorMessage error={error} />
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={primaryDisabled}
            title={
              missingFields.length
                ? "Add the required delivery fields first."
                : hasChanges
                ? "Save delivery details and copy courier message."
                : "Copy courier message."
            }
            className={[
              "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-white transition",
              primaryDisabled
                ? "cursor-not-allowed bg-slate-300"
                : "bg-slate-900 hover:bg-slate-800",
            ].join(" ")}
          >
            {isSaving ? "Saving..." : hasChanges ? "Save & Copy" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  );
}
