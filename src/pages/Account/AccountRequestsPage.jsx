import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiCheck, FiChevronDown, FiChevronUp, FiX } from "react-icons/fi";

import Loader from "../../components/common/Loader";
import ErrorMessage from "../../components/common/ErrorMessage";
import Pagination from "../../components/common/Pagination";

import {
  useGetMyQuotesQuery,
  useCancelQuoteMutation,
  useConfirmQuoteMutation,
} from "../../features/quotes/quotesApiSlice";

function formatDate(iso) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return iso;
  }
}

function money(amount) {
  if (amount === null || amount === undefined) return "-";
  const n = Number(amount);
  if (!Number.isFinite(n)) return "-";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "AED",
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return String(n);
  }
}

function StatusBadge({ status }) {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset";
  const map = {
    Processing: "bg-amber-50 text-amber-700 ring-amber-200",
    Quoted: "bg-violet-50 text-violet-700 ring-violet-200",
    Confirmed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    Cancelled: "bg-rose-50 text-rose-700 ring-rose-200",
  };
  return (
    <span className={`${base} ${map[status] || map.Processing}`}>
      {status || "-"}
    </span>
  );
}

export default function AccountRequestsPage() {
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState("all");
  const limit = 5;

  const { data, isLoading, isError, error, refetch } = useGetMyQuotesQuery({
    page,
    limit,
    status: filterStatus === "all" ? undefined : "Quoted",
  });

  const [cancelQuote, { isLoading: isCancelling }] = useCancelQuoteMutation();
  const [confirmQuote, { isLoading: isConfirming }] = useConfirmQuoteMutation();

  const [open, setOpen] = useState({});

  const quotes = useMemo(() => data?.data || [], [data]);
  const pagination = data?.pagination;
  useEffect(() => {
    setOpen({});
  }, [page, filterStatus]);

  const toggle = (id) => setOpen((prev) => ({ ...prev, [id]: !prev[id] }));

  const onCancel = async (id) => {
    // eslint-disable-next-line no-restricted-globals
    const ok = confirm("Cancel this request?");
    if (!ok) return;
    try {
      await cancelQuote(id).unwrap();
      refetch();
    } catch (e) {
      console.error(e);
    }
  };

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
      <div className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-sm shadow-slate-200/40">
        <Loader />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <ErrorMessage error={error} />
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded-2xl border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="h-8 w-1 rounded-full bg-violet-500" aria-hidden="true" />
          <div>
            <div className="text-2xl font-semibold text-slate-900">Requests</div>
            <div className="mt-1 text-sm text-slate-600">
              Review quotes, confirm, or cancel if you need changes.
            </div>
          </div>
        </div>
        {pagination ? (
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4 border-t border-slate-100 pt-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Filter
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPage(1);
                    setFilterStatus("all");
                  }}
                  className={[
                    "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                    filterStatus === "all"
                      ? "border-violet-300 text-violet-700 hover:bg-violet-50"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50",
                  ].join(" ")}
                >
                  All requests
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPage(1);
                    setFilterStatus("Quoted");
                  }}
                  className={[
                    "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                    filterStatus === "Quoted"
                      ? "border-violet-300 text-violet-700 hover:bg-violet-50"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50",
                  ].join(" ")}
                >
                  Quoted
                </button>
              </div>
            </div>
            <Pagination
              pagination={pagination}
              onPageChange={(next) => setPage(next)}
              variant="compact"
              showSummary={false}
              showNumbers={false}
            />
          </div>
        ) : null}
      </div>

      {quotes.length === 0 ? (
        <div className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-sm shadow-slate-200/40">
          <div className="text-sm font-semibold text-slate-900">
            No requests yet
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Add products and quantities from the shop, then submit your request
            to get a quote.
          </p>
          <div className="mt-4">
            <Link
              to="/shop"
              className="inline-flex items-center rounded-2xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-violet-200/60 hover:bg-violet-700"
            >
              Go to shop
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {quotes.map((q) => {
              const status = q.status;
              const isQuoted = status === "Quoted";
              const isConfirmed = status === "Confirmed";
              const isCancelled = status === "Cancelled";

              const canCancel = status === "Processing" || isQuoted;
              const canConfirm = isQuoted;

              const requestedItems = Array.isArray(q.requestedItems)
                ? q.requestedItems
                : [];
              const itemCount = requestedItems.reduce(
                (sum, it) => sum + (Number(it?.qty) || 0),
                0
              );

              const showFullPricing = isQuoted;
              const showOnlyTotal = isConfirmed;
              const showNoPricing = status === "Processing" || isCancelled;
              const showPricingColumn = showFullPricing || showNoPricing;

              const isOpen = !!open[q._id];

              return (
                <div
                  key={q._id}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="grid gap-4 sm:grid-cols-1">
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                            Quote no
                          </div>
                          <div className="mt-1 text-lg font-semibold text-slate-900">
                            {q.quoteNumber || q._id.slice(-6).toUpperCase()}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                        <div className="rounded-2xl border border-slate-100 bg-white px-3 py-2">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                            Items
                          </div>
                          <div className="mt-1 text-sm font-semibold text-slate-900">
                            {itemCount} unit{itemCount === 1 ? "" : "s"}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-slate-100 bg-white px-3 py-2">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                            Total
                          </div>
                          <div className="mt-1 text-sm font-semibold text-slate-900">
                            {showNoPricing
                              ? "Pending"
                              : money(q.totalPrice)}
                          </div>
                        </div>
                        <div className="col-span-2 rounded-2xl border border-slate-100 bg-white px-3 py-2 md:col-span-1">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                            Status
                          </div>
                          <div className="mt-1">
                            <StatusBadge status={status} />
                          </div>
                        </div>
                        <div className="col-span-2 rounded-2xl border border-slate-100 bg-white px-3 py-2 md:col-span-1">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                            Date
                          </div>
                          <div className="mt-1 text-sm font-semibold text-slate-900">
                            {formatDate(q.createdAt)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="hidden lg:flex lg:flex-col lg:items-end lg:gap-2">
                      <button
                        type="button"
                        onClick={() => toggle(q._id)}
                        className="inline-flex w-28 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        {isOpen ? "Hide" : "Details"}
                        {isOpen ? <FiChevronUp /> : <FiChevronDown />}
                      </button>
                      {canConfirm ? (
                        <button
                          type="button"
                          onClick={() => onConfirm(q._id)}
                          disabled={isConfirming || isCancelling}
                          className="inline-flex w-28 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm shadow-emerald-100/60 transition hover:bg-emerald-600 hover:text-white disabled:opacity-60"
                        >
                          <FiCheck className="h-4 w-4" />
                          {isConfirming ? "Confirming..." : "Confirm"}
                        </button>
                      ) : null}
                      {canCancel ? (
                        <button
                          type="button"
                          onClick={() => onCancel(q._id)}
                          disabled={isCancelling || isConfirming}
                          className="inline-flex w-28 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 shadow-sm shadow-rose-100/60 transition hover:bg-rose-600 hover:text-white disabled:opacity-60"
                        >
                          <FiX className="h-4 w-4" />
                          {isCancelling ? "Cancelling..." : "Cancel"}
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {isOpen ? (
                    <div className="mt-5 space-y-4 border-t border-slate-200 pt-4">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          Requested items
                        </div>
                        <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                          <div className="grid grid-cols-12 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600">
                            <div className={showPricingColumn ? "col-span-7" : "col-span-9"}>
                              Product
                            </div>
                            <div className={showPricingColumn ? "col-span-2 text-right" : "col-span-3 text-right"}>
                              Qty
                            </div>
                            {showPricingColumn ? (
                              <div className="col-span-3 text-right">
                                {showFullPricing ? "Total" : "Pricing"}
                              </div>
                            ) : null}
                          </div>

                          {requestedItems.map((it, idx) => {
                            const name =
                              it?.product?.name ||
                              (typeof it?.product === "string"
                                ? it.product
                                : "") ||
                              "Unnamed item";
                            const qty = it?.qty ?? 0;
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
                                className="grid grid-cols-12 items-center border-t border-slate-200 px-4 py-2 text-sm text-slate-800"
                              >
                                <div className={showPricingColumn ? "col-span-7 truncate" : "col-span-9 truncate"}>
                                  {name}
                                </div>
                                <div className={showPricingColumn ? "col-span-2 text-right tabular-nums" : "col-span-3 text-right tabular-nums"}>
                                  {qty}
                                </div>
                                {showPricingColumn ? (
                                  <div className="col-span-3 text-right tabular-nums">
                                    {showFullPricing ? money(lineTotal) : "Pending"}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {(q.clientToAdminNote ||
                        (isQuoted && q.adminToClientNote)) && (
                        <div className="grid gap-3 md:grid-cols-2">
                          {q.clientToAdminNote ? (
                            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                              <div className="text-xs font-semibold text-slate-500">
                                Your note
                              </div>
                              <div className="mt-2 whitespace-pre-wrap text-sm text-slate-800">
                                {q.clientToAdminNote}
                              </div>
                            </div>
                          ) : null}
                          {isQuoted && q.adminToClientNote ? (
                            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                              <div className="text-xs font-semibold text-slate-500">
                                Seller note
                              </div>
                              <div className="mt-2 text-sm text-slate-800 whitespace-pre-wrap">
                                <span className="rounded-md bg-amber-50 px-2 py-1 box-decoration-clone">
                                  {q.adminToClientNote}
                                </span>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      )}

                      {!showNoPricing && (showFullPricing || showOnlyTotal) ? (
                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                          <div className="text-sm font-semibold text-slate-900">
                            Summary
                          </div>
                          <div className="mt-3 space-y-2 text-sm text-slate-700">
                            {showFullPricing ? (
                              <>
                                <div className="flex items-center justify-between">
                                  <span>Delivery</span>
                                  <span className="tabular-nums">
                                    {money(q.deliveryCharge)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Extra fee</span>
                                  <span className="tabular-nums">
                                    {money(q.extraFee)}
                                  </span>
                                </div>
                              </>
                            ) : null}
                            <div className="flex items-center justify-between border-t border-slate-200 pt-2">
                              <span className="font-semibold text-slate-900">
                                Total
                              </span>
                              <span className="font-semibold tabular-nums">
                                {money(q.totalPrice)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="mt-5 grid grid-cols-[1fr_auto] items-end gap-3 lg:hidden">
                    <button
                      type="button"
                      onClick={() => toggle(q._id)}
                      className="inline-flex w-28 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      {isOpen ? "Hide" : "Details"}
                      {isOpen ? <FiChevronUp /> : <FiChevronDown />}
                    </button>

                    <div className="flex flex-col items-end gap-2 sm:items-end">
                      {canConfirm ? (
                        <button
                          type="button"
                          onClick={() => onConfirm(q._id)}
                          disabled={isConfirming || isCancelling}
                          className="inline-flex w-28 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm shadow-emerald-100/60 transition hover:bg-emerald-600 hover:text-white disabled:opacity-60"
                        >
                          <FiCheck className="h-4 w-4" />
                          {isConfirming ? "Confirming..." : "Confirm"}
                        </button>
                      ) : null}
                      {canCancel ? (
                        <button
                          type="button"
                          onClick={() => onCancel(q._id)}
                          disabled={isCancelling || isConfirming}
                          className="inline-flex w-28 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 shadow-sm shadow-rose-100/60 transition hover:bg-rose-600 hover:text-white disabled:opacity-60"
                        >
                          <FiX className="h-4 w-4" />
                          {isCancelling ? "Cancelling..." : "Cancel"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {pagination ? (
            <Pagination
              pagination={pagination}
              onPageChange={(next) => setPage(next)}
              tone="violet"
            />
          ) : null}
        </>
      )}
    </div>
  );
}
