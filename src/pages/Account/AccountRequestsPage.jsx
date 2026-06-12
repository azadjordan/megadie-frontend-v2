import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import Loader from "../../components/common/Loader";
import ErrorMessage from "../../components/common/ErrorMessage";
import Pagination from "../../components/common/Pagination";
import AccountRequestCard from "./account-requests/AccountRequestCard";

import {
  useGetQuoteByIdQuery,
  useGetMyQuotesQuery,
  useCancelQuoteMutation,
  useConfirmQuoteMutation,
} from "../../features/quotes/quotesApiSlice";

const getQuoteId = (quote) => {
  const id = quote?._id || quote?.id;
  return id ? String(id) : "";
};

export default function AccountRequestsPage() {
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState("all");
  const limit = 3;
  const [searchParams] = useSearchParams();

  const { data, isLoading, isError, error, refetch } = useGetMyQuotesQuery({
    page,
    limit,
    status: filterStatus === "all" ? undefined : "Quoted",
  });
  const deepLinkIdRaw = searchParams.get("quote");
  const deepLinkId = deepLinkIdRaw ? String(deepLinkIdRaw) : "";
  const {
    data: deepLinkResult,
    isLoading: isDeepLinkLoading,
    isError: isDeepLinkError,
    error: deepLinkError,
  } = useGetQuoteByIdQuery(deepLinkId, { skip: !deepLinkId });

  const [cancelQuote, { isLoading: isCancelling }] = useCancelQuoteMutation();
  const [confirmQuote, { isLoading: isConfirming }] = useConfirmQuoteMutation();

  const [open, setOpen] = useState({});
  const [cancelPrompt, setCancelPrompt] = useState(null);
  const [cancelPromptError, setCancelPromptError] = useState("");

  const quotes = useMemo(
    () => (Array.isArray(data?.data) ? data.data : []),
    [data]
  );
  const deepLinkQuote = deepLinkResult?.data;
  const displayQuotes = useMemo(() => {
    if (!deepLinkQuote) return quotes;
    const deepLinkQuoteId = getQuoteId(deepLinkQuote);
    const exists = quotes.some((q) => getQuoteId(q) === deepLinkQuoteId);
    return exists ? quotes : [deepLinkQuote, ...quotes];
  }, [quotes, deepLinkQuote]);
  const pagination = data?.pagination;
  const showPagination = Boolean(pagination) && quotes.length > 0;
  const showControls = displayQuotes.length > 0;
  const autoOpenQuoteId = getQuoteId(deepLinkQuote);

  const resetRequestInteraction = () => {
    setOpen({});
    setCancelPrompt(null);
    setCancelPromptError("");
  };

  const toggle = (id) =>
    setOpen((prev) => {
      if (!id) return prev;
      const currentOpen =
        prev[id] ?? (autoOpenQuoteId ? id === autoOpenQuoteId : false);
      return { ...prev, [id]: !currentOpen };
    });

  const onCancel = (id) => {
    if (!id) return;
    const target = displayQuotes.find((quote) => getQuoteId(quote) === id);
    const requestedItems = Array.isArray(target?.requestedItems)
      ? target.requestedItems
      : [];
    const hasShortage = requestedItems.some((item) => Number(item?.shortage) > 0);
    const actionLabel =
      target?.status === "Quoted" && !hasShortage
        ? "Reject quote"
        : "Cancel quote";
    const quoteNumber =
      target?.quoteNumber ||
      (getQuoteId(target) ? getQuoteId(target).slice(-6).toUpperCase() : "");
    setCancelPrompt({
      quoteId: id,
      quoteNumber,
      actionLabel,
    });
    setCancelPromptError("");
  };

  const closeCancelPrompt = () => {
    setCancelPrompt(null);
    setCancelPromptError("");
  };

  const confirmCancelPrompt = async () => {
    if (!cancelPrompt?.quoteId) return;
    try {
      await cancelQuote(cancelPrompt.quoteId).unwrap();
      closeCancelPrompt();
      refetch();
    } catch (e) {
      setCancelPromptError(
        e?.data?.message || e?.error || "Unable to cancel quote."
      );
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
      </div>

      {showControls ? (
        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Filter
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    resetRequestInteraction();
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
                    resetRequestInteraction();
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
            {showPagination ? (
              <Pagination
                pagination={pagination}
                onPageChange={(next) => {
                  resetRequestInteraction();
                  setPage(next);
                }}
                variant="compact"
                showSummary={false}
                showNumbers={false}
              />
            ) : null}
          </div>
        </div>
      ) : null}

      {displayQuotes.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
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
          {deepLinkId && (isDeepLinkLoading || isDeepLinkError) ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              {isDeepLinkLoading ? (
                "Loading shared quote..."
              ) : (
                <ErrorMessage error={deepLinkError} />
              )}
            </div>
          ) : null}
          <div className="space-y-4">
            {displayQuotes.map((quote, index) => {
              const quoteId = getQuoteId(quote);
              return (
                <AccountRequestCard
                  key={quoteId || `quote-${index}`}
                  quote={quote}
                  isOpen={
                    open[quoteId] ??
                    (Boolean(autoOpenQuoteId) && quoteId === autoOpenQuoteId)
                  }
                  isCancelling={isCancelling}
                  isConfirming={isConfirming}
                  onToggle={toggle}
                  onCancel={onCancel}
                  onConfirm={onConfirm}
                />
              );
            })}
          </div>

        </>
      )}

      {cancelPrompt ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={closeCancelPrompt}
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-quote-title"
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-xl ring-1 ring-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <div
                  id="cancel-quote-title"
                  className="text-sm font-semibold text-slate-900"
                >
                  {cancelPrompt.actionLabel || "Cancel quote"}?
                </div>
              </div>
              <button
                type="button"
                onClick={closeCancelPrompt}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:text-slate-900"
              >
                Close
              </button>
            </div>
            <div className="px-4 py-4">
              {cancelPromptError ? (
                <div className="mt-1 text-xs font-semibold text-rose-600">
                  {cancelPromptError}
                </div>
              ) : null}
              <div
                className={`${
                  cancelPromptError ? "mt-4" : "mt-2"
                } flex flex-wrap justify-end gap-2`}
              >
                <button
                  type="button"
                  onClick={closeCancelPrompt}
                  disabled={isCancelling}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Keep quote
                </button>
                <button
                  type="button"
                  onClick={confirmCancelPrompt}
                  disabled={isCancelling}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  {isCancelling
                    ? "Cancelling..."
                    : cancelPrompt.actionLabel || "Cancel quote"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
