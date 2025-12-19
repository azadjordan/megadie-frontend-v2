// src/pages/Admin/AdminRequestDetailsPage.jsx
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiChevronLeft } from "react-icons/fi";

/**
 * Procedural Admin Quote Details (UI-first, temp example data)
 *
 * Flow:
 * 1) Select user
 * 2) Modify items (qty + unit price) — no add/remove
 * 3) Notes
 * 4) Answer confirmation question (required every visit) => determines status on update
 * 5) Actions (at bottom): Update Quote + Create Order (only if confirmed AND order not created)
 *
 * Updates per notes:
 * - Actions moved to bottom (after admin reviews everything).
 * - Create Order enabled only if Step 4 answered "Confirmed" AND no order exists yet.
 * - Show clear "Order already created" indicator if an order exists for this request.
 * - No link to view the created order (not referenced in model).
 */

function formatDateTime(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso || "—";
  }
}

function StatusBadge({ status }) {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset";

  const map = {
    Processing: "bg-slate-50 text-slate-700 ring-slate-200",
    Quoted: "bg-blue-50 text-blue-700 ring-blue-200",
    Confirmed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    Cancelled: "bg-rose-50 text-rose-700 ring-rose-200",
  };

  return (
    <span className={`${base} ${map[status] || map.Processing}`}>
      {status || "—"}
    </span>
  );
}

function money(amount, currency = "AED") {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${n.toFixed(2)} ${currency}`;
  }
}

function parseNonNegNumber(value) {
  if (value === "" || value == null) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, n);
}

function sumItems(items) {
  return (items || []).reduce((sum, it) => {
    const qty = parseNonNegNumber(it.qtyStr);
    const unit = parseNonNegNumber(it.unitPriceStr);
    const q = qty == null ? 0 : qty;
    const u = unit == null ? 0 : unit;
    return sum + q * u;
  }, 0);
}

function Step({ n, title, subtitle, children }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="grid h-6 w-6 place-items-center rounded-lg bg-slate-900 text-xs font-semibold text-white">
            {n}
          </div>
          <div className="text-sm font-semibold text-slate-900">{title}</div>
        </div>
        {subtitle ? (
          <div className="mt-1 text-xs text-slate-500">{subtitle}</div>
        ) : null}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export default function AdminRequestDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  /**
   * TEMP example data for UI prototyping.
   * Backend later:
   * - fetch quote by id
   * - for "order created" indicator: either
   *   a) backend includes a derived flag (orderCreated: true/false), OR
   *   b) backend provides orderId reference, OR
   *   c) backend endpoint checks existence of order by quoteId
   */
  const { quote, userOptions } = useMemo(() => {
    const userOptionsLocal = [
      {
        _id: "u1",
        name: "Ahmed Hassan",
        email: "ahmed@example.com",
        phone: "+971 50 000 0000",
      },
      {
        _id: "u2",
        name: "Sara Ali",
        email: "sara@example.com",
        phone: "+971 52 000 0000",
      },
      {
        _id: "u3",
        name: "Mohamed Youssef",
        email: "mohamed@example.com",
        phone: "+971 55 000 0000",
      },
    ];

    const examples = [
      {
        _id: "q_1001",
        createdAt: "2025-01-18T09:42:00Z",
        updatedAt: "2025-01-18T10:05:00Z",
        status: "Processing",
        deliveryCharge: 50,
        extraFee: 0,
        adminToAdminNote: "Customer prefers delivery between 2–5 PM.",
        clientToAdminNote: "Need it urgently for next week.",
        adminToClientNote: "",
        requestedItems: [
          { product: { _id: "p1", name: "Premium Dates Box (1kg)" }, qty: 2, unitPrice: 300 },
          { product: { _id: "p2", name: "Arabic Coffee Beans (500g)" }, qty: 1, unitPrice: 650 },
        ],
        user: userOptionsLocal[0],

        // TEMP indicator (since model doesn’t reference order)
        orderCreated: false,
      },
      {
        _id: "q_1003",
        createdAt: "2025-01-16T11:30:00Z",
        updatedAt: "2025-01-16T13:12:00Z",
        status: "Quoted",
        deliveryCharge: 0,
        extraFee: 0,
        adminToAdminNote: "Waiting for client confirmation via WhatsApp.",
        clientToAdminNote: "Ok, please send invoice.",
        adminToClientNote: "Sure—confirm and we’ll proceed.",
        requestedItems: [
          { product: { _id: "p3", name: "Mixed Nuts Tray (Large)" }, qty: 5, unitPrice: 400 },
        ],
        user: userOptionsLocal[2],

        // Show the “already created” state
        orderCreated: true,
      },
    ];

    return {
      quote: examples.find((x) => x._id === id) || examples[0],
      userOptions: userOptionsLocal,
    };
  }, [id]);

  // Step 1: User selection
  const [userId, setUserId] = useState(quote.user?._id || "");
  const selectedUser = useMemo(
    () => userOptions.find((u) => u._id === userId) || null,
    [userId, userOptions]
  );

  // Step 2: Items (store strings so inputs can be cleared)
  const [items, setItems] = useState(() =>
    (quote.requestedItems || []).map((it) => ({
      product: it.product,
      qtyStr: String(Number(it.qty || 0)),
      unitPriceStr: String(Number(it.unitPrice || 0)),
    }))
  );

  // Step 3: Notes
  const [adminToAdminNote, setAdminToAdminNote] = useState(
    quote.adminToAdminNote || ""
  );
  const [adminToClientNote, setAdminToClientNote] = useState(
    quote.adminToClientNote || ""
  );

  // Charges (strings to allow clearing)
  const [deliveryChargeStr, setDeliveryChargeStr] = useState(
    String(Number(quote.deliveryCharge || 0))
  );
  const [extraFeeStr, setExtraFeeStr] = useState(
    String(Number(quote.extraFee || 0))
  );

  // Step 4: Confirmation question (required every visit: NO DEFAULT)
  const [confirmationAnswer, setConfirmationAnswer] = useState("");

  // Derived status for context + actions
  const derivedStatus = useMemo(() => {
    if (confirmationAnswer === "cancelled") return "Cancelled";
    if (confirmationAnswer === "yes") return "Confirmed";
    if (confirmationAnswer === "no") return "Quoted";
    // unanswered: show doc status for context only
    return quote.status || "Processing";
  }, [confirmationAnswer, quote.status]);

  const itemsTotal = sumItems(items);
  const deliveryCharge = parseNonNegNumber(deliveryChargeStr) ?? 0;
  const extraFee = parseNonNegNumber(extraFeeStr) ?? 0;
  const totalPrice = Math.max(0, itemsTotal + deliveryCharge + extraFee);

  const canUpdateQuote = useMemo(() => {
    if (!userId) return false;
    if (!items.length) return false;
    if (confirmationAnswer === "") return false;

    for (const it of items) {
      const qty = parseNonNegNumber(it.qtyStr);
      const unit = parseNonNegNumber(it.unitPriceStr);
      if (qty == null || unit == null) return false;
      if (qty < 1) return false;
      if (unit < 0) return false;
    }
    if (parseNonNegNumber(deliveryChargeStr) == null) return false;
    if (parseNonNegNumber(extraFeeStr) == null) return false;

    return true;
  }, [userId, items, deliveryChargeStr, extraFeeStr, confirmationAnswer]);

  const finalStatus = useMemo(() => {
    if (confirmationAnswer === "yes") return "Confirmed";
    if (confirmationAnswer === "cancelled") return "Cancelled";
    if (confirmationAnswer === "no") return "Quoted";
    return quote.status || "Processing";
  }, [confirmationAnswer, quote.status]);

  const orderCreated = Boolean(quote.orderCreated);

  const canCreateOrder = finalStatus === "Confirmed" && !orderCreated;

  const onUpdateQuote = () => {
    if (!canUpdateQuote) {
      alert("Please complete the procedure before updating the quote.");
      return;
    }

    const payload = {
      user: userId,
      requestedItems: items.map((it) => ({
        product: it.product?._id,
        qty: Number(it.qtyStr),
        unitPrice: Number(it.unitPriceStr),
      })),
      deliveryCharge: Number(deliveryChargeStr),
      extraFee: Number(extraFeeStr),
      adminToAdminNote,
      adminToClientNote,
      status:
        confirmationAnswer === "yes"
          ? "Confirmed"
          : confirmationAnswer === "cancelled"
          ? "Cancelled"
          : "Quoted",
    };

    console.log("UPDATE QUOTE payload (UI only):", payload);
    alert(`Updated (UI only).\nStatus would become: ${payload.status}`);
  };

  const onCreateOrder = () => {
    if (!canCreateOrder) return;
    alert("Create order (UI only). Later: POST create order from quote.");
  };

  return (
    <div className="space-y-4">
      {/* Header (no actions on the right anymore) */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => navigate("/admin/requests")}
            className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900"
          >
            <FiChevronLeft className="h-4 w-4" />
            Back to requests
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <div className="text-lg font-semibold text-slate-900">Quote Details</div>
            <span className="text-xs text-slate-400">•</span>
            <div className="text-sm font-semibold text-slate-700">{quote._id}</div>
            <span className="text-xs text-slate-400">•</span>
            <StatusBadge status={derivedStatus} />

            <span className="text-xs text-slate-400">•</span>
            <span
              className={[
                "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
                orderCreated
                  ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                  : "bg-slate-50 text-slate-700 ring-slate-200",
              ].join(" ")}
            >
              {orderCreated ? "Order created" : "No order yet"}
            </span>
          </div>

          <div className="mt-1 text-sm text-slate-500">
            Created {formatDateTime(quote.createdAt)} • Updated {formatDateTime(quote.updatedAt)}
          </div>
        </div>
      </div>

      {/* Two-column: steps + live summary */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
        {/* Steps */}
        <div className="space-y-4">
          {/* Step 1 */}
          <Step
            n={1}
            title="Select user"
            subtitle="Pick who owns this quote. (Admins can update it if needed.)"
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">User</label>
                <select
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                >
                  <option value="">Select a user…</option>
                  {userOptions.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name} — {u.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <div className="text-xs font-semibold text-slate-600">Selected user</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {selectedUser?.name || "—"}
                </div>
                <div className="text-xs text-slate-600">{selectedUser?.email || "—"}</div>
                <div className="text-xs text-slate-600">{selectedUser?.phone || "—"}</div>
              </div>
            </div>
          </Step>

          {/* Step 2 */}
          <Step
            n={2}
            title="Modify items"
            subtitle="Update quantity and unit price for each product."
          >
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs font-semibold text-slate-500">
                  <tr className="border-b border-slate-200">
                    <th className="py-2 pr-3">Product</th>
                    <th className="py-2 pr-3">Qty</th>
                    <th className="py-2 pr-3">Unit price</th>
                    <th className="py-2 pr-3 text-right">Line total</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {items.map((it, idx) => {
                    const qty = parseNonNegNumber(it.qtyStr) ?? 0;
                    const unit = parseNonNegNumber(it.unitPriceStr) ?? 0;
                    const lineTotal = qty * unit;

                    return (
                      <tr key={`${it.product?._id || idx}`} className="hover:bg-slate-50">
                        <td className="py-3 pr-3">
                          <div className="font-semibold text-slate-900">
                            {it.product?.name || "—"}
                          </div>
                          <div className="text-xs text-slate-500">{it.product?._id || ""}</div>
                        </td>

                        <td className="py-3 pr-3">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={it.qtyStr}
                            onChange={(e) => {
                              setItems((prev) => {
                                const next = [...prev];
                                next[idx] = { ...next[idx], qtyStr: e.target.value };
                                return next;
                              });
                            }}
                            className="w-24 rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                            placeholder="Qty"
                          />
                          {it.qtyStr === "" ? (
                            <div className="mt-1 text-[11px] text-rose-600">Required</div>
                          ) : null}
                        </td>

                        <td className="py-3 pr-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={it.unitPriceStr}
                              onChange={(e) => {
                                setItems((prev) => {
                                  const next = [...prev];
                                  next[idx] = { ...next[idx], unitPriceStr: e.target.value };
                                  return next;
                                });
                              }}
                              className="w-28 rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                              placeholder="0"
                            />
                            <span className="text-xs text-slate-400">AED</span>
                          </div>
                          {it.unitPriceStr === "" ? (
                            <div className="mt-1 text-[11px] text-rose-600">Required</div>
                          ) : null}
                        </td>

                        <td className="py-3 pr-3 text-right font-semibold text-slate-900">
                          {money(lineTotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                <tfoot>
                  <tr className="border-t border-slate-200">
                    <td className="py-3 pr-3 text-sm font-semibold text-slate-700" colSpan={3}>
                      Items subtotal
                    </td>
                    <td className="py-3 pr-3 text-right text-sm font-semibold text-slate-900">
                      {money(itemsTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Charges */}
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Delivery charge
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={deliveryChargeStr}
                    onChange={(e) => setDeliveryChargeStr(e.target.value)}
                    className="w-32 rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                    placeholder="0"
                  />
                  <span className="text-xs text-slate-400">AED</span>
                </div>
                {deliveryChargeStr === "" ? (
                  <div className="mt-1 text-[11px] text-rose-600">Required</div>
                ) : null}
              </div>

              <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Extra fee
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={extraFeeStr}
                    onChange={(e) => setExtraFeeStr(e.target.value)}
                    className="w-32 rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                    placeholder="0"
                  />
                  <span className="text-xs text-slate-400">AED</span>
                </div>
                {extraFeeStr === "" ? (
                  <div className="mt-1 text-[11px] text-rose-600">Required</div>
                ) : null}
              </div>
            </div>

            <div className="mt-3 text-xs text-slate-500">
              You can clear numeric fields while editing. Update is blocked until required numbers are filled.
            </div>
          </Step>

          {/* Step 3 */}
          <Step n={3} title="Add notes" subtitle="Internal notes and customer-facing message.">
            <div className="grid grid-cols-1 gap-3">
              <div>
                <div className="mb-1 text-xs font-semibold text-slate-600">Client → Admin</div>
                <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700 ring-1 ring-slate-200">
                  {quote.clientToAdminNote || "—"}
                </div>
              </div>

              <div>
                <div className="mb-1 text-xs font-semibold text-slate-600">
                  Admin → Admin (internal)
                </div>
                <textarea
                  value={adminToAdminNote}
                  onChange={(e) => setAdminToAdminNote(e.target.value)}
                  rows={3}
                  placeholder="Internal notes for your team…"
                  className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                />
              </div>

              <div>
                <div className="mb-1 text-xs font-semibold text-slate-600">Admin → Client</div>
                <textarea
                  value={adminToClientNote}
                  onChange={(e) => setAdminToClientNote(e.target.value)}
                  rows={3}
                  placeholder="Message to the client…"
                  className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                />
              </div>
            </div>
          </Step>

          {/* Step 4 */}
          <Step
            n={4}
            title="Customer confirmation (required)"
            subtitle="Answer this every visit before updating the quote."
          >
            <div className="space-y-3">
              <div className="text-sm text-slate-700">
                Is the quote confirmed by the user yet?
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setConfirmationAnswer("no")}
                  className={[
                    "rounded-xl px-3 py-2 text-sm font-semibold ring-1 ring-inset transition",
                    confirmationAnswer === "no"
                      ? "bg-blue-50 text-blue-800 ring-blue-200"
                      : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50",
                  ].join(" ")}
                >
                  No (Quoted)
                </button>

                <button
                  type="button"
                  onClick={() => setConfirmationAnswer("yes")}
                  className={[
                    "rounded-xl px-3 py-2 text-sm font-semibold ring-1 ring-inset transition",
                    confirmationAnswer === "yes"
                      ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                      : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50",
                  ].join(" ")}
                >
                  Yes (Confirmed)
                </button>

                <button
                  type="button"
                  onClick={() => setConfirmationAnswer("cancelled")}
                  className={[
                    "rounded-xl px-3 py-2 text-sm font-semibold ring-1 ring-inset transition",
                    confirmationAnswer === "cancelled"
                      ? "bg-rose-50 text-rose-800 ring-rose-200"
                      : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50",
                  ].join(" ")}
                >
                  Cancelled
                </button>
              </div>

              {confirmationAnswer === "" ? (
                <div className="rounded-xl bg-amber-50 p-3 text-sm ring-1 ring-amber-200">
                  <div className="text-xs font-semibold text-amber-800">Action required</div>
                  <div className="mt-1 text-xs text-amber-800/80">
                    You must answer this question to enable{" "}
                    <span className="font-semibold">Update Quote</span>.
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-slate-50 p-3 text-sm ring-1 ring-slate-200">
                  <div className="text-xs font-semibold text-slate-600">Resulting status</div>
                  <div className="mt-1 flex items-center gap-2">
                    <StatusBadge status={finalStatus} />
                    <span className="text-xs text-slate-500">
                      Updating will set status to{" "}
                      <span className="font-semibold">{finalStatus}</span>.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </Step>

          {/* Bottom actions */}
          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900">Actions</div>
                <div className="mt-1 text-xs text-slate-500">
                  Update the quote first. Create order becomes available only when confirmed and not created yet.
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onUpdateQuote}
                  disabled={!canUpdateQuote}
                  className={[
                    "rounded-xl px-4 py-2 text-sm font-semibold text-white",
                    canUpdateQuote
                      ? "bg-slate-900 hover:bg-slate-800"
                      : "bg-slate-300 cursor-not-allowed",
                  ].join(" ")}
                  title={
                    canUpdateQuote
                      ? "Update Quote"
                      : "Complete all steps (including Step 4) to enable update"
                  }
                >
                  Update Quote
                </button>

                <button
                  type="button"
                  onClick={onCreateOrder}
                  disabled={!canCreateOrder}
                  className={[
                    "rounded-xl px-4 py-2 text-sm font-semibold text-white",
                    canCreateOrder
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-slate-300 cursor-not-allowed",
                  ].join(" ")}
                  title={
                    orderCreated
                      ? "Order already created for this request"
                      : finalStatus !== "Confirmed"
                      ? "Confirm the quote (Step 4) to enable Create Order"
                      : "Create an order from this quote"
                  }
                >
                  Create Order
                </button>
              </div>
            </div>

            {/* order created indicator inside actions too (very explicit) */}
            <div className="mt-3">
              {orderCreated ? (
                <div className="rounded-xl bg-emerald-50 p-3 text-sm ring-1 ring-emerald-200">
                  <div className="text-xs font-semibold text-emerald-800">
                    Order already created
                  </div>
                  <div className="mt-1 text-xs text-emerald-800/80">
                    This request has already been converted into an order. No further action is needed here.
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-slate-50 p-3 text-sm ring-1 ring-slate-200">
                  <div className="text-xs font-semibold text-slate-700">
                    No order created yet
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Once confirmed, use <span className="font-semibold">Create Order</span> to proceed.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Live summary */}
        <aside className="space-y-4">
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-sm font-semibold text-slate-900">Live summary</div>

            <div className="mt-3 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-600">Status</span>
                <StatusBadge status={derivedStatus} />
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-600">Items subtotal</span>
                <span className="font-semibold text-slate-900">{money(itemsTotal)}</span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-600">Delivery</span>
                <span className="font-semibold text-slate-900">{money(deliveryCharge)}</span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-600">Extra</span>
                <span className="font-semibold text-slate-900">{money(extraFee)}</span>
              </div>

              <div className="h-px bg-slate-200" />

              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-700 font-semibold">Total</span>
                <span className="text-slate-900 font-semibold">{money(totalPrice)}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <div className="text-xs text-slate-400">
        Procedure: Select user → modify items → notes → confirmation → actions.
      </div>
    </div>
  );
}
