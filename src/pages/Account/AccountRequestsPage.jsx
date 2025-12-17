// src/pages/Account/AccountRequestsPage.jsx
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import Loader from "../../components/common/Loader";
import ErrorMessage from "../../components/common/ErrorMessage";

import {
  useGetMyQuotesQuery,
  useCancelQuoteMutation,
  useConfirmQuoteMutation,
} from "../../features/quotes/quotesApiSlice";

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso || "";
  }
}

function money(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "AED",
  }).format(n);
}

function StatusBadge({ status }) {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset";
  const map = {
    Processing: "bg-slate-50 text-slate-700 ring-slate-200",
    Quoted: "bg-amber-50 text-amber-800 ring-amber-200",
    Confirmed: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    Rejected: "bg-rose-50 text-rose-800 ring-rose-200",
    Cancelled: "bg-slate-100 text-slate-700 ring-slate-200",
  };
  return (
    <span className={`${base} ${map[status] || map.Processing}`}>
      {status || "—"}
    </span>
  );
}

function StatusMessage({ status }) {
  const map = {
    Processing:
      "We’re preparing pricing for your request. You’ll be notified once it’s quoted.",
    Quoted:
      "Your quote is ready. Please confirm to proceed or cancel if needed.",
    Confirmed: "Quote is confirmed. Your order is being processed.",
    Cancelled:
      "Cancelled. If you need anything else, you can create a new request anytime.",
    Rejected: "Rejected. Please contact us if you want alternatives.",
  };
  return <p className="text-sm text-slate-600">{map[status] || ""}</p>;
}

export default function AccountRequestsPage() {
  const { data, isLoading, isError, error, refetch, isFetching } =
    useGetMyQuotesQuery();

  const [cancelQuote, { isLoading: isCancelling }] = useCancelQuoteMutation();
  const [confirmQuote, { isLoading: isConfirming }] = useConfirmQuoteMutation();

  // Expand/collapse per quote
  const [open, setOpen] = useState({}); // { [id]: boolean }

  const quotes = useMemo(() => data?.data || [], [data]);

  const toggle = (id) => setOpen((prev) => ({ ...prev, [id]: !prev[id] }));

  const onCancel = async (id) => {
    // eslint-disable-next-line no-restricted-globals
    const ok = confirm("Cancel this request?");
    if (!ok) return;

    try {
      await cancelQuote(id).unwrap();
      // ensure UI reflects server response / sanitization
      refetch();
    } catch (e) {
      console.error(e);
    }
  };

  // No confirm alert — confirm immediately
  const onConfirm = async (id) => {
    try {
      await confirmQuote(id).unwrap();
      refetch();
    } catch (e) {
      console.error(e);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              My Requests
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Track your quote requests and their status.
            </p>
          </div>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <Loader />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              My Requests
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Track your quote requests and their status.
            </p>
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
          >
            Retry
          </button>
        </div>

        <ErrorMessage error={error} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">My Requests</h1>
          <p className="mt-1 text-sm text-slate-600">
            Track your quote requests and their status.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-60"
          >
            {isFetching ? "Refreshing…" : "Refresh"}
          </button>

          <Link
            to="/shop"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            New request
          </Link>
        </div>
      </div>

      {quotes.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">
            No requests yet
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Add products and quantities from the shop, then submit your request
            to get a quote.
          </p>
          <div className="mt-4">
            <Link
              to="/shop"
              className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Go to shop
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {quotes.map((q) => {
            const status = q.status;
            const isProcessing = status === "Processing";
            const isQuoted = status === "Quoted";
            const isConfirmed = status === "Confirmed";
            const isCancelled = status === "Cancelled";

            const canCancel = isProcessing || isQuoted;
            const canConfirm = isQuoted;

            const showFullPricing = isQuoted; // line totals + fees + total
            const showOnlyTotal = isConfirmed; // total only
            const showNoPricing =
              isProcessing || isCancelled || status === "Rejected";

            const isOpen = !!open[q._id];
            const requestedItems = Array.isArray(q.requestedItems)
              ? q.requestedItems
              : [];

            return (
              <div
                key={q._id}
                className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"
              >
                <button
                  type="button"
                  onClick={() => toggle(q._id)}
                  className="flex w-full items-start justify-between gap-4 rounded-2xl px-5 py-4 text-left hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <StatusBadge status={status} />
                      <div className="text-sm font-semibold text-slate-900">
                        Request #{String(q._id).slice(-6).toUpperCase()}
                      </div>
                      <div className="text-xs text-slate-500">
                        {formatDate(q.createdAt)}
                      </div>
                    </div>

                    <div className="mt-2">
                      <StatusMessage status={status} />
                    </div>
                  </div>

                  <div className="shrink-0 text-sm font-semibold text-slate-900">
                    {isOpen ? "Hide" : "View"}
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-slate-200 px-5 py-4 space-y-4">
                    {/* Items */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <span>Requested items</span>
                        <span className="text-xs font-normal text-slate-600">
                          {requestedItems.length} item
                          {requestedItems.length !== 1 && "s"}
                        </span>
                      </div>

                      <div className="overflow-hidden rounded-xl border border-slate-200">
                        <div className="grid grid-cols-12 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                          <div className="col-span-8">Product</div>
                          <div className="col-span-2 text-right">Qty</div>
                          <div className="col-span-2 text-right">
                            {showFullPricing ? "Total" : ""}
                          </div>
                        </div>

                        {requestedItems.map((it, idx) => {
                          const name =
                            it?.product?.name ||
                            (typeof it?.product === "string"
                              ? it.product
                              : "") ||
                            "—";
                          const qty = it?.qty ?? 0;

                          // Intentionally NOT displaying unitPrice.
                          const unitPrice =
                            typeof it?.unitPrice === "number"
                              ? it.unitPrice
                              : null;

                          const lineTotal =
                            showFullPricing && unitPrice != null
                              ? unitPrice * Number(qty || 0)
                              : null;

                          return (
                            <div
                              key={`${q._id}-${idx}`}
                              className="grid grid-cols-12 items-center px-3 py-2 text-sm text-slate-800 border-t border-slate-200"
                            >
                              <div className="col-span-8 truncate">{name}</div>
                              <div className="col-span-2 text-right tabular-nums">
                                {qty}
                              </div>
                              <div className="col-span-2 text-right tabular-nums">
                                {showFullPricing ? money(lineTotal) || "—" : ""}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Notes */}
                    {(q.clientToAdminNote ||
                      (isQuoted && q.adminToClientNote)) && (
                      <div className="grid gap-3 md:grid-cols-2">
                        {q.clientToAdminNote ? (
                          <div className="rounded-xl border border-slate-200 p-4">
                            <div className="text-xs font-semibold text-slate-700">
                              Note you sent
                            </div>
                            <div className="mt-2 text-sm text-slate-800 whitespace-pre-wrap">
                              {q.clientToAdminNote}
                            </div>
                          </div>
                        ) : null}

                        {/* Show seller message ONLY when Quoted */}
                        {isQuoted && q.adminToClientNote ? (
                          <div className="rounded-xl border border-slate-200 p-4">
                            <div className="text-xs font-semibold text-slate-700">
                              Seller message
                            </div>
                            <div className="mt-2 text-sm text-slate-800 whitespace-pre-wrap">
                              {q.adminToClientNote}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )}

                    {/* Totals */}
                    {!showNoPricing && (showFullPricing || showOnlyTotal) ? (
                      <div className="rounded-xl border border-slate-200 p-4">
                        <div className="text-sm font-semibold text-slate-900">
                          Summary
                        </div>

                        <div className="mt-3 space-y-2 text-sm text-slate-800">
                          {/* Only show fees when Quoted */}
                          {showFullPricing ? (
                            <>
                              <div className="flex items-center justify-between">
                                <span className="text-slate-600">Delivery</span>
                                <span className="tabular-nums">
                                  {money(q.deliveryCharge) || "—"}
                                </span>
                              </div>

                              <div className="flex items-center justify-between">
                                <span className="text-slate-600">
                                  Extra fee
                                </span>
                                <span className="tabular-nums">
                                  {money(q.extraFee) || "—"}
                                </span>
                              </div>
                            </>
                          ) : null}

                          <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                            <span className="font-semibold text-slate-900">
                              Total
                            </span>
                            <span className="font-semibold tabular-nums">
                              {money(q.totalPrice) || "—"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-3">
                      {canCancel ? (
                        <button
                          type="button"
                          onClick={() => onCancel(q._id)}
                          disabled={isCancelling || isConfirming}
                          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-60"
                        >
                          {isCancelling ? "Cancelling…" : "Cancel request"}
                        </button>
                      ) : null}

                      {canConfirm ? (
                        <button
                          type="button"
                          onClick={() => onConfirm(q._id)}
                          disabled={isConfirming || isCancelling}
                          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                        >
                          {isConfirming ? "Confirming…" : "Confirm quote"}
                        </button>
                      ) : null}

                      {isCancelled ? (
                        <div className="text-sm text-slate-600">
                          This request was cancelled.
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
