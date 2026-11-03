import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { FiClipboard, FiRefreshCw, FiTruck, FiX } from "react-icons/fi";

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
    "w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:bg-slate-50 disabled:text-slate-500",
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

function CourierNoteField({ index, value, onChange, disabled = false }) {
  return (
    <div className="flex gap-2">
      <div className="mt-7 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
        {index + 1}
      </div>
      <div className="min-w-0 flex-1">
        <label
          htmlFor={`courier-instruction-${index}`}
          className="mb-1 block text-xs font-semibold text-slate-600"
        >
          Note {index + 1}
        </label>
        <textarea
          id={`courier-instruction-${index}`}
          value={value}
          onChange={(e) => onChange(index, e.target.value)}
          disabled={disabled}
          rows={2}
          className="w-full resize-none rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
        />
      </div>
    </div>
  );
}

export default function CourierDetailsModal({
  open,
  order,
  form,
  missingFields = [],
  hasChanges = false,
  requiresSave = false,
  readOnly = false,
  mode = "courier",
  sheet,
  preparationMode = "",
  onPreparationModeChange,
  saveCustomerLocation = false,
  onSaveCustomerLocationChange,
  onUseCustomerLocation,
  assignedTo = "",
  onAssignedToChange,
  courierNotes = [],
  previewText = "",
  onFieldChange,
  onCourierNoteChange,
  onCourierNotesReset,
  onClose,
  onSubmit,
  onSaveOnly,
  onCopyDraft,
  onRefresh,
  isSaving = false,
  error,
}) {
  const dialog = useRef(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    dialog.current?.querySelector("button")?.focus();
    return () => { if (previous?.isConnected) previous.focus(); };
  }, [open]);
  if (!open) return null;
  const worker = mode === "worker";
  const assignmentMissing = worker && !assignedTo.trim();
  const taskMissing = worker && !["prepare_only", "prepare_deliver"].includes(preparationMode);
  const showDelivery = !worker || preparationMode === "prepare_deliver";
  const customerLocation = sheet?.customerLocation;
  const canUseCustomerLocation = worker && Boolean(customerLocation?.address || customerLocation?.googleMapsUrl)
    && (clean(customerLocation.address) !== clean(form.address) || clean(customerLocation.googleMapsUrl) !== clean(form.googleMapsUrl));
  const needsSave = hasChanges || requiresSave;
  function onKeyDown(event) {
    if (event.key === "Escape" && !isSaving) { event.stopPropagation(); onClose(); }
    if (event.key !== "Tab") return;
    const nodes = [...dialog.current.querySelectorAll("button:not(:disabled), input:not(:disabled), textarea:not(:disabled), a[href]")];
    const first = nodes[0], last = nodes.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }

  const missingKeys = new Set(missingFields.map((field) => field.key));
  const addressOrLocationMissing = missingKeys.has("addressOrLocation");
  const orderNumber = order?.orderNumber || order?._id || "-";
  const pickupPhones = Array.isArray(courierPickupConfig.phoneNumbers)
    ? courierPickupConfig.phoneNumbers.map(clean).filter(Boolean).join(" / ")
    : "";
  const pickupWarnings = [
    !clean(courierPickupConfig.address) ? "pickup address" : "",
    !clean(courierPickupConfig.googleMapsUrl) ? "pickup map" : "",
    !pickupPhones ? "pickup phone" : "",
  ].filter(Boolean);
  const defaultLocationMissing = worker && saveCustomerLocation && showDelivery && addressOrLocationMissing;
  const primaryDisabled = isSaving || assignmentMissing || taskMissing || missingFields.length > 0 || (readOnly && requiresSave) || (worker && sheet?.problems?.length > 0 && !needsSave);

  return createPortal(
    <div onKeyDown={onKeyDown} className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 px-3 py-6">
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="courier-details-title"
        className="max-h-full w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-xl ring-1 ring-slate-200"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
                {worker ? <FiClipboard className="h-4 w-4" aria-hidden="true" /> : <FiTruck className="h-4 w-4" aria-hidden="true" />}
              </span>
              <div>
                <h2
                  id="courier-details-title"
                  className="text-base font-semibold text-slate-900"
                >
                  {worker ? "Prepare Order" : "Courier details"}
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
            aria-label={worker ? "Close prepare order" : "Close courier details"}
          >
            <FiX className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-4 p-4 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-4">
            {!worker && (
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
            )}

            {worker && <fieldset disabled={readOnly || isSaving} className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
              <legend className="px-1 text-sm font-semibold text-slate-900">Task</legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {[["prepare_only", "Prepare Only"], ["prepare_deliver", "Prepare & Deliver"]].map(([value, label]) => (
                  <label key={value} className={`flex cursor-pointer items-center gap-2 rounded-xl p-3 text-sm font-semibold ring-1 ${preparationMode === value ? "bg-indigo-50 text-indigo-800 ring-indigo-300" : "text-slate-700 ring-slate-200"}`}>
                    <input type="radio" required name="preparation-mode" value={value} checked={preparationMode === value} onChange={() => onPreparationModeChange(value)} />
                    {label}
                  </label>
                ))}
              </div>
              <p className={`mt-2 text-xs ${taskMissing ? "text-amber-700" : "text-slate-500"}`}>{taskMissing ? "Choose a task before saving or copying." : preparationMode === "prepare_only" ? "Picking and packing only. No delivery information is shared." : "Picking, packing, and delivery to the destination below."}</p>
            </fieldset>}

            {worker && <section className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
              <label htmlFor="order-assigned-to" className="mb-2 block text-sm font-semibold text-slate-900">Assigned To</label>
              <input id="order-assigned-to" required aria-required="true" aria-invalid={assignmentMissing} aria-describedby="order-assigned-to-hint" value={assignedTo} onChange={(event) => onAssignedToChange(event.target.value)} maxLength={120} disabled={readOnly || isSaving} placeholder="e.g. Ahmed"
                className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-50" />
              <p id="order-assigned-to-hint" className={`mt-2 text-xs ${assignmentMissing ? "text-amber-700" : "text-slate-500"}`}>{assignmentMissing ? "Assigned To is required before saving or copying." : "Saved on this order for the person responsible for this task."}</p>
            </section>}

            {showDelivery && <section className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-semibold text-slate-900">Delivery for this order</div>
                {canUseCustomerLocation && <button type="button" onClick={onUseCustomerLocation} disabled={readOnly || isSaving} className="rounded-lg px-2 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200 disabled:opacity-50">Use customer&apos;s default</button>}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {readOnly ? "This order is closed. Delivery details are read-only." : worker ? "An address or map is sufficient. Save as the customer’s default below to reuse it on future orders." : "Changes apply to this order only. An address or map is sufficient."}
              </div>
              {requiresSave && !readOnly && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">Suggested from customer profile — review and save for this order.</p>}
              {readOnly && !order?.resolvedDelivery?.details && <p className="mt-3 text-sm text-amber-800">Historical delivery details are unavailable.</p>}
              {missingFields.length ? (
                <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
                  Add {missingFields.map((field) => field.label).join(", ")} before
                  copying.
                </div>
              ) : null}
              <fieldset disabled={readOnly || isSaving} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {!worker && <>
                <DeliveryField id="courier-contact-name" label="Recipient name" value={form.contactName}
                  onChange={(value) => onFieldChange("contactName", value)} missing={missingKeys.has("contactName")} />
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
                </>}
                <div className={worker ? "sm:col-span-2" : ""}>
                <DeliveryField
                  id="courier-map"
                  label="Google Maps location"
                  value={form.googleMapsUrl}
                  onChange={(value) => onFieldChange("googleMapsUrl", value)}
                  placeholder="https://maps..."
                  missing={addressOrLocationMissing}
                  missingHint="Address or map required"
                />
                </div>
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
                {!worker && (
                <div className="sm:col-span-2">
                  <DeliveryField
                    id="courier-notes"
                    label="Delivery notes"
                    value={form.notes}
                    onChange={(value) => onFieldChange("notes", value)}
                    placeholder="Optional notes for courier"
                    multiline
                  />
                </div>
                )}
              </fieldset>
              {worker && !readOnly && <label className="mt-3 flex items-start gap-2 text-xs text-slate-700">
                <input type="checkbox" checked={saveCustomerLocation} onChange={(event) => onSaveCustomerLocationChange(event.target.checked)} disabled={isSaving} className="mt-0.5" />
                <span>Save as customer&apos;s default location<span className="mt-1 block text-slate-500">Updates the customer’s address and map for future orders. Other existing orders keep their locations.</span></span>
              </label>}
            </section>}

            {!worker && (
            <section className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-900">
                  Courier instructions
                </div>
                <button
                  type="button"
                  onClick={onCourierNotesReset}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300"
                >
                  <FiRefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  Reset
                </button>
              </div>
              <div className="mt-3 space-y-3">
                {courierNotes.map((note, index) => (
                  <CourierNoteField
                    key={index}
                    index={index}
                    value={note}
                    onChange={onCourierNoteChange}
                    disabled={isSaving}
                  />
                ))}
              </div>
            </section>
            )}
          </div>

          <section className="rounded-2xl bg-slate-950 p-3 text-white">
            <div className="text-sm font-semibold">Message preview</div>
            {worker && <p className="mt-2 text-xs text-slate-300">Items, slots, and quantities come from the order&apos;s reservations. <Link to={`/admin/orders/${order?._id}`} className="underline underline-offset-2">View order and reservations</Link></p>}
            {worker && sheet?.generatedAt && <p className="mt-1 text-xs text-slate-300">Loaded {new Date(sheet.generatedAt).toLocaleString()}</p>}
            {worker && sheet?.problems?.length > 0 && <ul className="mt-2 list-disc pl-4 text-xs text-amber-200">{sheet.problems.map((problem) => <li key={problem}>{problem}</li>)}</ul>}
            {worker && sheet?.problems?.length > 0 && <p className="mt-2 text-xs text-amber-200">Review the warnings before copying. Slot and quantity issues can be resolved in the order reservation panel.</p>}
            <textarea
              aria-label="Message preview"
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
            Close
          </button>
          {onRefresh && <button type="button" onClick={onRefresh} disabled={isSaving} className="rounded-xl px-3 py-2 text-sm ring-1 ring-slate-300">Reload details</button>}
          {!readOnly && needsSave && <button type="button" onClick={onSaveOnly} disabled={isSaving || assignmentMissing || taskMissing || defaultLocationMissing} className="rounded-xl px-3 py-2 text-sm ring-1 ring-slate-300">{saveCustomerLocation && showDelivery ? "Save details" : "Save for this order"}</button>}
          {worker && sheet?.problems?.length > 0 && <button type="button" onClick={onCopyDraft} disabled={isSaving || assignmentMissing || taskMissing || defaultLocationMissing} className="rounded-xl px-3 py-2 text-sm ring-1 ring-slate-300">{needsSave ? "Save & Copy Draft" : "Copy preparation draft"}</button>}
          <button
            type="button"
            onClick={onSubmit}
            disabled={primaryDisabled}
            title={
              missingFields.length
                ? "Add the required delivery fields first."
                : needsSave
                ? "Save details and copy the message."
                : worker ? "Copy preparation message." : "Copy courier message."
            }
            className={[
              "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-white transition",
              primaryDisabled
                ? "cursor-not-allowed bg-slate-300"
                : "bg-slate-900 hover:bg-slate-800",
            ].join(" ")}
          >
            {isSaving ? "Saving..." : needsSave && !readOnly ? "Save & Copy" : "Copy"}
          </button>
        </div>
      </div>
    </div>, document.body
  );
}
