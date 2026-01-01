import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import Loader from "../../components/common/Loader";
import ErrorMessage from "../../components/common/ErrorMessage";
import Pagination from "../../components/common/Pagination";
import AccountRequestCard from "./account-requests/AccountRequestCard";

import {
  useGetMyQuotesQuery,
  useCancelQuoteMutation,
  useConfirmQuoteMutation,
  useUpdateQuoteQuantitiesMutation,
} from "../../features/quotes/quotesApiSlice";


export default function AccountRequestsPage() {
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState("all");
  const limit = 3;

  const { data, isLoading, isError, error, refetch } = useGetMyQuotesQuery({
    page,
    limit,
    status: filterStatus === "all" ? undefined : "Quoted",
  });

  const [cancelQuote, { isLoading: isCancelling }] = useCancelQuoteMutation();
  const [confirmQuote, { isLoading: isConfirming }] = useConfirmQuoteMutation();
  const [
    updateQuoteQuantities,
    { isLoading: isUpdatingQuantities, error: updateQuantitiesError },
  ] = useUpdateQuoteQuantitiesMutation();

  const [open, setOpen] = useState({});
  const [editingQuoteId, setEditingQuoteId] = useState(null);
  const [editDraft, setEditDraft] = useState({});
  const [editLocalError, setEditLocalError] = useState("");
  const [editMaxHit, setEditMaxHit] = useState({});
  const maxHitTimers = useRef({});

  const quotes = useMemo(() => data?.data || [], [data]);
  const pagination = data?.pagination;
  useEffect(() => {
    setOpen({});
    setEditingQuoteId(null);
    setEditDraft({});
    setEditLocalError("");
    setEditMaxHit({});
  }, [page, filterStatus]);

  const toggle = (id) =>
    setOpen((prev) => {
      const nextOpen = !prev[id];
      if (!nextOpen) {
        setEditingQuoteId((current) => (current === id ? null : current));
        setEditDraft((current) => {
          if (!current[id]) return current;
          const next = { ...current };
          delete next[id];
          return next;
        });
        setEditLocalError("");
      }
      return { ...prev, [id]: nextOpen };
    });

  useEffect(
    () => () => {
      Object.values(maxHitTimers.current).forEach(clearTimeout);
      maxHitTimers.current = {};
    },
    []
  );

  const triggerMaxHit = (key) => {
    if (!key) return;
    setEditMaxHit((prev) => ({ ...prev, [key]: true }));
    const timers = maxHitTimers.current;
    if (timers[key]) clearTimeout(timers[key]);
    timers[key] = setTimeout(() => {
      setEditMaxHit((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      delete timers[key];
    }, 1500);
  };

  const adjustDraftQty = (
    quoteId,
    productId,
    delta,
    maxQty,
    fallbackQty,
    options = {}
  ) => {
    if (!quoteId || !productId) return;
    const key = `${quoteId}:${productId}`;
    setEditingQuoteId(quoteId);
    setEditDraft((prev) => {
      const quoteDraft = prev[quoteId] ? { ...prev[quoteId] } : {};
      const max = Math.max(0, Number(maxQty) || 0);
      const fallback = Math.max(0, Number(fallbackQty) || 0);
      const currentRaw = Number(quoteDraft[productId]);
      const base = Number.isFinite(currentRaw)
        ? currentRaw
        : Math.min(fallback, max);
      const rawNext = base + delta;
      const upperBound = options.allowAboveMax ? Number.POSITIVE_INFINITY : max;
      const clamped = Math.max(0, Math.min(rawNext, upperBound));
      if (delta > 0 && rawNext >= max) {
        triggerMaxHit(key);
      }
      quoteDraft[productId] = clamped;
      return { ...prev, [quoteId]: quoteDraft };
    });
    setEditLocalError("");
  };

  const buildQuantityPayload = (quote) => {
    const items = Array.isArray(quote?.requestedItems)
      ? quote.requestedItems
      : [];
    return items.map((it) => {
      const productId = it?.product?._id || it?.product;
      const draftQty = Number(editDraft?.[quote._id]?.[String(productId)]);
      const requestedQty = Math.max(0, Number(it?.qty) || 0);
      const availableNow = Math.max(0, Number(it?.availableNow) || 0);
      const shortage = Number(it?.shortage);
      const hasItemShortage =
        Number.isFinite(shortage) && shortage > 0 && Number.isFinite(availableNow);
      const fallbackQty = hasItemShortage ? availableNow : requestedQty;
      const nextQty = Number.isFinite(draftQty) ? draftQty : fallbackQty;
      return {
        product: productId,
        qty: nextQty,
      };
    });
  };

  const applyQuantityUpdate = async (quote, { refetchAfter = true } = {}) => {
    if (!quote?._id) return false;
    setEditingQuoteId(quote._id);
    const payloadItems = buildQuantityPayload(quote);

    const hasAnyQty = payloadItems.some((item) => Number(item.qty) > 0);
    if (!hasAnyQty) {
      setEditLocalError("At least one item must remain.");
      return false;
    }

    try {
      await updateQuoteQuantities({
        id: quote._id,
        requestedItems: payloadItems,
      }).unwrap();
      setEditingQuoteId(null);
      setEditDraft((current) => {
        if (!current[quote._id]) return current;
        const next = { ...current };
        delete next[quote._id];
        return next;
      });
      setEditLocalError("");
      setEditMaxHit({});
      if (refetchAfter) {
        refetch();
      }
      return true;
    } catch (e) {
      const status = e?.status || e?.originalStatus;
      const message = String(e?.data?.message || e?.error || "");
      if (status === 409 && message.toLowerCase().includes("locked")) {
        setEditLocalError(message);
        refetch();
      }
      console.error(e);
      return false;
    }
  };

  const onConfirmQty = async (quote) => {
    await applyQuantityUpdate(quote);
  };

  const onCancelEdit = (quoteId) => {
    if (!quoteId) return;
    setEditingQuoteId((current) => (current === quoteId ? null : current));
    setEditDraft((current) => {
      if (!current[quoteId]) return current;
      const next = { ...current };
      delete next[quoteId];
      return next;
    });
    setEditLocalError("");
    setEditMaxHit((current) => {
      const prefix = `${quoteId}:`;
      const next = {};
      Object.entries(current).forEach(([key, value]) => {
        if (!key.startsWith(prefix)) {
          next[key] = value;
        }
      });
      return next;
    });
  };

  const onCancel = async (id) => {
    // eslint-disable-next-line no-restricted-globals
    const ok = confirm("Cancel this quote?");
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
            {quotes.map((quote) => (
              <AccountRequestCard
                key={quote._id}
                quote={quote}
                isOpen={!!open[quote._id]}
                isEditing={editingQuoteId === quote._id}
                editDraft={editDraft}
                editMaxHit={editMaxHit}
                editLocalError={editLocalError}
                updateQuantitiesError={updateQuantitiesError}
                isCancelling={isCancelling}
                isConfirming={isConfirming}
                isUpdatingQuantities={isUpdatingQuantities}
                onToggle={toggle}
                onStartEdit={setEditingQuoteId}
                onCancel={onCancel}
                onCancelEdit={onCancelEdit}
                onConfirm={onConfirm}
                onConfirmQty={onConfirmQty}
                onAdjustDraftQty={adjustDraftQty}
              />
            ))}
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
