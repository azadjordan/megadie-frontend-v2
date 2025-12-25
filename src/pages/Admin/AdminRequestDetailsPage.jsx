// src/pages/Admin/AdminRequestDetailsPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiChevronLeft } from "react-icons/fi";

import Loader from "../../components/common/Loader";
import ErrorMessage from "../../components/common/ErrorMessage";

import {
  useGetQuoteByIdQuery,
  useUpdateQuoteByAdminMutation,
} from "../../features/quotes/quotesApiSlice";
import { useGetAdminUsersQuery } from "../../features/auth/usersApiSlice";

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
    return iso || "-";
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
      {status || "-"}
    </span>
  );
}

function money(amount, currency = "AED") {
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
}

/**
 * API may return populated docs using { id } instead of { _id }.
 * This helper safely extracts ids from either shape.
 */
function getId(v) {
  if (!v) return "";
  if (typeof v === "string") return v;
  return String(v._id || v.id || "");
}

/**
 * Note: IMPORTANT UX RULE:
 * Inputs must allow clearing completely while typing ("" is allowed),
 * and "0" is valid.
 *
 * parseNullableNumber:
 * - "" / null / undefined => null (meaning "incomplete")
 * - valid number => number
 */
function parseNullableNumber(value) {
  if (value === "" || value == null) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n;
}

function sumItems(items) {
  return (items || []).reduce((sum, it) => {
    const qty = parseNullableNumber(it.qtyStr);
    const unit = parseNullableNumber(it.unitPriceStr);
    // allow empty while typing; treat empty as 0 for preview only
    const q = qty == null ? 0 : qty;
    const u = unit == null ? 0 : unit;
    return sum + q * u;
  }, 0);
}

function Step({ n, title, subtitle, children }) {
  return (
    <section className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
      <header className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="grid h-6 w-6 place-items-center rounded-lg bg-slate-900 text-xs font-semibold text-white">
            {n}
          </div>
          <div className="text-sm font-semibold text-slate-900">{title}</div>
        </div>
        {subtitle ? <div className="mt-1 text-xs text-slate-500">{subtitle}</div> : null}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

function StatusChoiceButton({ disabled, active, tone, onClick, children }) {
  const tones = {
    slate: active
      ? "bg-slate-900 text-white ring-slate-900"
      : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50",
    blue: active
      ? "bg-blue-50 text-blue-800 ring-blue-200"
      : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50",
    emerald: active
      ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
      : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50",
    rose: active
      ? "bg-rose-50 text-rose-800 ring-rose-200"
      : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50",
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "rounded-xl px-3 py-2 text-sm font-semibold ring-1 ring-inset transition",
        tones[tone] || tones.slate,
        disabled ? "cursor-not-allowed opacity-60" : "",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export default function AdminRequestDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    data: quoteResult,
    isLoading: isQuoteLoading,
    isError: isQuoteError,
    error: quoteError,
    isFetching: isQuoteFetching,
  } = useGetQuoteByIdQuery(id, { skip: !id });

  const quote = quoteResult?.data;

  const {
    data: usersResult,
    isLoading: isUsersLoading,
    isError: isUsersError,
    error: usersError,
  } = useGetAdminUsersQuery();

  const users = usersResult?.data || [];

  const [updateQuoteByAdmin, { isLoading: isUpdating, error: updateError }] =
    useUpdateQuoteByAdminMutation();

  // Step 1
  const [userId, setUserId] = useState("");

  // Step 2: qty + unit price only
  // Each item: { productId, sku, qtyStr, unitPriceStr }
  const [items, setItems] = useState([]);

  // Step 2 (charges) - allow "" while typing
  const [deliveryChargeStr, setDeliveryChargeStr] = useState("0");
  const [extraFeeStr, setExtraFeeStr] = useState("0");

  // Step 3
  const [adminToAdminNote, setAdminToAdminNote] = useState("");
  const [adminToClientNote, setAdminToClientNote] = useState("");

  // Step 4 (required deliberate decision)
  const [statusDecision, setStatusDecision] = useState("");

  // Init from quote
  useEffect(() => {
    if (!quote) return;

    setUserId(getId(quote.user));

    setItems(
      (quote.requestedItems || []).map((it) => {
        const productId = getId(it.product);
        const sku =
          typeof it.product === "object" && it.product ? it.product.sku || "" : "";
        return {
          productId,
          sku,
          qtyStr: String(Number(it.qty ?? 0)),
          unitPriceStr: String(Number(it.unitPrice ?? 0)),
        };
      })
    );

    setDeliveryChargeStr(String(Number(quote.deliveryCharge ?? 0)));
    setExtraFeeStr(String(Number(quote.extraFee ?? 0)));
    setAdminToAdminNote(quote.adminToAdminNote || "");
    setAdminToClientNote(quote.adminToClientNote || "");

    // must be chosen deliberately each visit/update session
    setStatusDecision("");
  }, [quote?.id, quote?._id]);

  const selectedUser = useMemo(() => {
    const uid = String(userId || "");
    return users.find((u) => String(u._id || u.id) === uid) || null;
  }, [users, userId]);

  const backendStatus = quote?.status || "Processing";

  // keep for business logic: lock if already converted to order
  const orderCreated = Boolean(quote?.order);
  const quoteLocked = orderCreated;

  const hasMissingProductId = useMemo(
    () => (items || []).some((it) => !it.productId),
    [items]
  );

  // Preview totals treat empty as 0 (UX), but update validation treats empty as invalid (incomplete)
  const itemsTotal = sumItems(items);

  const deliveryChargePreview = parseNullableNumber(deliveryChargeStr) ?? 0;
  const extraFeePreview = parseNullableNumber(extraFeeStr) ?? 0;
  const totalPreview = Math.max(0, itemsTotal + deliveryChargePreview + extraFeePreview);

  const canUpdateQuote = useMemo(() => {
    const quoteId = quote?.id || quote?._id;
    if (!quoteId) return false;
    if (quoteLocked) return false;

    // Step 1
    if (!userId) return false;

    // Step 2
    if (!items.length) return false;
    if (hasMissingProductId) return false;

    for (const it of items) {
      const qty = parseNullableNumber(it.qtyStr);
      const unit = parseNullableNumber(it.unitPriceStr);

      // Note: allow 0, but do NOT allow empty at save time
      if (qty == null || unit == null) return false;

      // Note: allow 0 for qty/unitPrice
      if (qty < 0) return false;
      if (unit < 0) return false;
    }

    // Note: charges can be 0; but cannot be empty at save time
    const delivery = parseNullableNumber(deliveryChargeStr);
    const extra = parseNullableNumber(extraFeeStr);
    if (delivery == null || extra == null) return false;
    if (delivery < 0 || extra < 0) return false;

    // Step 4 required deliberate decision
    if (!statusDecision) return false;

    return true;
  }, [
    quote?.id,
    quote?._id,
    quoteLocked,
    userId,
    items,
    hasMissingProductId,
    deliveryChargeStr,
    extraFeeStr,
    statusDecision,
  ]);

  const onUpdateQuote = async () => {
    if (!canUpdateQuote) return;

    if (hasMissingProductId) {
      alert(
        "One or more items are missing product IDs. This quote may reference deleted products."
      );
      return;
    }

    const quoteId = quote?.id || quote?._id;

    const payload = {
      id: quoteId,
      user: userId,
      requestedItems: items.map((it) => ({
        product: it.productId,
        qty: Number(it.qtyStr), // "" won't pass canUpdateQuote
        unitPrice: Number(it.unitPriceStr),
      })),
      deliveryCharge: Number(deliveryChargeStr),
      extraFee: Number(extraFeeStr),
      adminToAdminNote,
      adminToClientNote,
      status: statusDecision,
    };

    try {
      await updateQuoteByAdmin(payload).unwrap();
      setStatusDecision(""); // must be re-chosen on next update
    } catch {
      // ErrorMessage will show it
    }
  };

  if (isQuoteLoading) {
    return (
      <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
        <Loader />
      </div>
    );
  }

  if (isQuoteError) {
    return (
      <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
        <ErrorMessage error={quoteError} />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
        <div className="text-sm text-slate-700">Quote not found.</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <button
          type="button"
          onClick={() => navigate("/admin/requests")}
          className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900"
        >
          <FiChevronLeft className="h-4 w-4" />
          Back to requests
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <div className="text-lg font-semibold text-slate-900">Quote Details</div>

          <span className="text-xs text-slate-400">&bull;</span>
          <div className="text-sm font-semibold text-slate-700">
            {quote?.id || quote?._id}
          </div>

          <span className="text-xs text-slate-400">&bull;</span>
          <StatusBadge status={backendStatus} />

          {isQuoteFetching ? (
            <>
              <span className="text-xs text-slate-400">&bull;</span>
              <span className="text-xs text-slate-400">Refreshing...</span>
            </>
          ) : null}
        </div>

        <div className="mt-1 text-sm text-slate-500">
          Created {formatDateTime(quote.createdAt)} &bull; Updated{" "}
          {formatDateTime(quote.updatedAt)}
        </div>

        {quoteLocked ? (
          <div className="mt-3 rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200">
            <div className="text-xs font-semibold text-amber-900">Locked</div>
            <div className="mt-1 text-xs text-amber-900/80">
              This quote already has an order, so editing is disabled.
            </div>
          </div>
        ) : null}

        {hasMissingProductId ? (
          <div className="mt-3 rounded-xl bg-rose-50 p-3 ring-1 ring-rose-200">
            <div className="text-xs font-semibold text-rose-800">Data issue</div>
            <div className="mt-1 text-xs text-rose-800/80">
              One or more items are missing a product reference (product may have been deleted).
              Updating is blocked until fixed.
            </div>
          </div>
        ) : null}
      </div>

      {/* Layout */}
      <div
        className={[
          "grid grid-cols-1 gap-4 lg:grid-cols-[1fr_380px]",
          quoteLocked ? "blur-[1px] opacity-70" : "",
        ].join(" ")}
      >
        {/* Steps */}
        <div className="space-y-4">
          {/* Step 1 */}
          <Step
            n={1}
            title="Select user"
            subtitle="Assign (or re-assign) the owner of this quote."
          >
            {isUsersLoading ? (
              <Loader />
            ) : isUsersError ? (
              <ErrorMessage error={usersError} />
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    User
                  </label>
                  <select
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    disabled={quoteLocked}
                    className={[
                      "w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20",
                      quoteLocked ? "cursor-not-allowed bg-slate-50 text-slate-400" : "",
                    ].join(" ")}
                  >
                    <option value="">Select a user...</option>
                    {users.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name} - {u.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                  <div className="text-xs font-semibold text-slate-600">
                    Selected user
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {selectedUser?.name || "-"}
                  </div>
                  <div className="text-xs text-slate-600">{selectedUser?.email || "-"}</div>
                  <div className="text-xs text-slate-600">
                    {selectedUser?.phoneNumber || "-"}
                  </div>
                </div>
              </div>
            )}
          </Step>

          {/* Step 2 */}
          <Step n={2} title="Pricing & quantities" subtitle="All values can be 0.">
            <div className="overflow-x-auto">
              <table className="min-w-full table-fixed text-left text-sm">
                <thead className="text-xs font-semibold text-slate-500">
                  <tr className="border-b border-slate-200">
                    <th className="w-[62%] py-2 pr-3">SKU</th>
                    <th className="w-[12%] py-2 pr-3">Qty</th>
                    <th className="w-[12%] py-2 pr-3">Unit</th>
                    <th className="w-[14%] py-2 pr-3 text-right">Total</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {items.map((it, idx) => {
                    const qty = parseNullableNumber(it.qtyStr) ?? 0;
                    const unit = parseNullableNumber(it.unitPriceStr) ?? 0;
                    const lineTotal = qty * unit;

                    return (
                      <tr key={`${it.productId || idx}`} className="hover:bg-slate-50">
                        <td className="py-3 pr-3">
                          <div className="text-xs font-semibold text-slate-900">
                            {it.sku || "-"}
                          </div>
                        </td>

                        <td className="py-3 pr-3">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={it.qtyStr}
                            disabled={quoteLocked || !it.productId}
                            onChange={(e) => {
                              setItems((prev) => {
                                const next = [...prev];
                                next[idx] = { ...next[idx], qtyStr: e.target.value };
                                return next;
                              });
                            }}
                            className={[
                              "w-16 rounded-xl bg-white px-2 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20",
                              quoteLocked || !it.productId
                                ? "cursor-not-allowed bg-slate-50 text-slate-400"
                                : "",
                            ].join(" ")}
                            placeholder="0"
                          />
                        </td>

                        <td className="py-3 pr-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={it.unitPriceStr}
                            disabled={quoteLocked || !it.productId}
                            onChange={(e) => {
                              setItems((prev) => {
                                const next = [...prev];
                                next[idx] = { ...next[idx], unitPriceStr: e.target.value };
                                return next;
                              });
                            }}
                            className={[
                              "w-24 rounded-xl bg-white px-2 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20",
                              quoteLocked || !it.productId
                                ? "cursor-not-allowed bg-slate-50 text-slate-400"
                                : "",
                            ].join(" ")}
                            placeholder="0.00"
                          />
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
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={deliveryChargeStr}
                  disabled={quoteLocked}
                  onChange={(e) => setDeliveryChargeStr(e.target.value)}
                  className={[
                    "w-32 rounded-xl bg-white px-2 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20",
                    quoteLocked ? "cursor-not-allowed bg-slate-50 text-slate-400" : "",
                  ].join(" ")}
                  placeholder="0.00"
                />
              </div>

              <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Extra fee
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={extraFeeStr}
                  disabled={quoteLocked}
                  onChange={(e) => setExtraFeeStr(e.target.value)}
                  className={[
                    "w-32 rounded-xl bg-white px-2 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20",
                    quoteLocked ? "cursor-not-allowed bg-slate-50 text-slate-400" : "",
                  ].join(" ")}
                  placeholder="0.00"
                />
              </div>
            </div>
          </Step>

          {/* Step 3 */}
          <Step n={3} title="Notes" subtitle="Client note is read-only. Admin notes are optional.">
            <div className="grid grid-cols-1 gap-3">
              <div>
                <div className="mb-1 text-xs font-semibold text-slate-600">
                  Client to Admin
                </div>
                <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700 ring-1 ring-slate-200">
                  {quote.clientToAdminNote || "-"}
                </div>
              </div>

              <div>
                <div className="mb-1 text-xs font-semibold text-slate-600">
                  Admin to Admin (internal)
                </div>
                <textarea
                  value={adminToAdminNote}
                  disabled={quoteLocked}
                  onChange={(e) => setAdminToAdminNote(e.target.value)}
                  rows={3}
                  placeholder="Internal notes for your team..."
                  className={[
                    "w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20",
                    quoteLocked ? "cursor-not-allowed bg-slate-50 text-slate-400" : "",
                  ].join(" ")}
                />
              </div>

              <div>
                <div className="mb-1 text-xs font-semibold text-slate-600">
                  Admin to Client
                </div>
                <textarea
                  value={adminToClientNote}
                  disabled={quoteLocked}
                  onChange={(e) => setAdminToClientNote(e.target.value)}
                  rows={3}
                  placeholder="Message to the client..."
                  className={[
                    "w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20",
                    quoteLocked ? "cursor-not-allowed bg-slate-50 text-slate-400" : "",
                  ].join(" ")}
                />
              </div>
            </div>
          </Step>

          {/* Step 4 */}
          <Step
            n={4}
            title="Set quote status (required)"
            subtitle="Choose the new status to send when you update."
          >
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
                <StatusChoiceButton
                  disabled={quoteLocked}
                  active={statusDecision === "Processing"}
                  tone="slate"
                  onClick={() => setStatusDecision("Processing")}
                >
                  Processing
                </StatusChoiceButton>

                <StatusChoiceButton
                  disabled={quoteLocked}
                  active={statusDecision === "Quoted"}
                  tone="blue"
                  onClick={() => setStatusDecision("Quoted")}
                >
                  Quoted
                </StatusChoiceButton>

                <StatusChoiceButton
                  disabled={quoteLocked}
                  active={statusDecision === "Confirmed"}
                  tone="emerald"
                  onClick={() => setStatusDecision("Confirmed")}
                >
                  Confirmed
                </StatusChoiceButton>

                <StatusChoiceButton
                  disabled={quoteLocked}
                  active={statusDecision === "Cancelled"}
                  tone="rose"
                  onClick={() => setStatusDecision("Cancelled")}
                >
                  Cancelled
                </StatusChoiceButton>
              </div>

              {!statusDecision && !quoteLocked ? (
                <div className="rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200">
                  <div className="text-xs font-semibold text-amber-800">
                    Action required
                  </div>
                  <div className="mt-1 text-xs text-amber-800/80">
                    Choose a status before updating the quote.
                  </div>
                </div>
              ) : null}
            </div>
          </Step>
        </div>

        {/* Summary + Actions */}
        <aside className="space-y-4">
          <Step n={5} title="Summary" subtitle="Review totals.">
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-600">Items subtotal</span>
                <span className="font-semibold text-slate-900">{money(itemsTotal)}</span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-600">Delivery</span>
                <span className="font-semibold text-slate-900">
                  {money(deliveryChargePreview)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-600">Extra</span>
                <span className="font-semibold text-slate-900">
                  {money(extraFeePreview)}
                </span>
              </div>

              <div className="h-px bg-slate-200" />

              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-slate-700">Total (preview)</span>
                <span className="font-semibold text-slate-900">{money(totalPreview)}</span>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {updateError ? <ErrorMessage error={updateError} /> : null}

              <button
                type="button"
                onClick={onUpdateQuote}
                disabled={!canUpdateQuote || isUpdating}
                className={[
                  "w-full rounded-xl px-4 py-2 text-sm font-semibold text-white",
                  canUpdateQuote && !isUpdating
                    ? "bg-slate-900 hover:bg-slate-800"
                    : "cursor-not-allowed bg-slate-300",
                ].join(" ")}
                title={
                  quoteLocked
                    ? "Quote locked (order exists)"
                    : !statusDecision
                    ? "Choose a status in Step 4"
                    : hasMissingProductId
                    ? "Missing product references"
                    : "Update quote"
                }
              >
                {isUpdating ? "Updating..." : "Update Quote"}
              </button>

              {quoteLocked ? (
                <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-700 ring-1 ring-slate-200">
                  This quote has already been converted to an order. Editing is disabled.
                </div>
              ) : null}
            </div>
          </Step>
        </aside>
      </div>

      <div className="text-xs text-slate-400">
        Flow: user to items & charges to notes to status to summary to update.
      </div>
    </div>
  );
}



