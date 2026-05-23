// src/pages/Admin/AdminRequestsPage.jsx
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiAlertTriangle,
  FiEdit2,
  FiFileText,
  FiGitMerge,
  FiRefreshCw,
  FiSend,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import { toast } from "react-toastify";

import Pagination from "../../components/common/Pagination";
import Loader from "../../components/common/Loader";
import ErrorMessage from "../../components/common/ErrorMessage";
import { copyTextToClipboard } from "../../utils/clipboard";
import { buildAdminQuoteShareText } from "../../utils/quoteShare";
import {
  useDeleteQuoteByAdminMutation,
  useGetAdminQuotesQuery,
  useLazyGetQuoteShareQuery,
  useLazyGetQuotePdfQuery,
  useMergeQuotesByAdminMutation,
} from "../../features/quotes/quotesApiSlice";

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


function StatusBadge({ status, size = "default" }) {
  const base =
    "inline-flex items-center gap-1 rounded-full font-semibold ring-1 ring-inset";
  const sizes = {
    default: "px-2.5 py-1 text-xs",
    compact: "px-2 py-0.5 text-[10px]",
  };

  const map = {
    Processing: "bg-slate-50 text-slate-700 ring-slate-200",
    Quoted: "bg-violet-50 text-violet-700 ring-violet-300",
    Confirmed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    Cancelled: "bg-rose-50 text-rose-700 ring-rose-200",
  };

  return (
    <span className={`${base} ${sizes[size] || sizes.default} ${map[status] || map.Processing}`}>
      {status}
    </span>
  );
}

function AvailabilityBadge({ status, size = "default" }) {
  const base =
    "inline-flex items-center gap-1 rounded-full font-semibold ring-1 ring-inset";
  const sizes = {
    default: "px-2.5 py-1 text-xs",
    compact: "px-2 py-0.5 text-[10px]",
  };
  const map = {
    AVAILABLE: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    SHORTAGE: "bg-amber-50 text-amber-700 ring-amber-200",
    NOT_AVAILABLE: "bg-rose-50 text-rose-700 ring-rose-200",
    NOT_CHECKED: "bg-slate-50 text-slate-600 ring-slate-200",
  };
  const labelMap = {
    AVAILABLE: "Available",
    SHORTAGE: "Shortage",
    NOT_AVAILABLE: "Not Available",
    NOT_CHECKED: "Not checked",
  };
  return (
    <span className={`${base} ${sizes[size] || sizes.default} ${map[status] || map.NOT_CHECKED}`}>
      {status === "SHORTAGE" ? <FiAlertTriangle className="h-3 w-3" /> : null}
      {labelMap[status] || labelMap.NOT_CHECKED}
    </span>
  );
}

function normalizeAvailabilityStatus(status) {
  if (status === "PARTIAL") return "SHORTAGE";
  return status;
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

function friendlyApiError(err) {
  const msg =
    err?.data?.message || err?.error || err?.message || "Something went wrong.";
  return String(msg);
}

function getId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return String(value._id || value.id || "");
}

function getQuoteNumber(value) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(-6).toUpperCase();
  const id = getId(value);
  return value.quoteNumber || (id ? id.slice(-6).toUpperCase() : "");
}

function isMergeEligible(q) {
  return (
    Boolean(q?._id) &&
    (q.status === "Processing" || q.status === "Quoted") &&
    !q.order &&
    !q.manualInvoiceId &&
    !q.mergedIntoQuote
  );
}

function getMergeDisabledReason(q) {
  if (!q) return "Request cannot be selected.";
  if (q.mergedIntoQuote) return "This request was already merged.";
  if (q.order) return "Requests with orders cannot be merged.";
  if (q.manualInvoiceId) return "Requests with manual invoices cannot be merged.";
  if (q.status !== "Processing" && q.status !== "Quoted") {
    return "Only Processing or Quoted requests can be merged.";
  }
  return "";
}

function resolveDefaultMergeTarget(quotes = []) {
  const timestamp = (q) => {
    const value = new Date(q?.updatedAt || q?.createdAt || 0).getTime();
    return Number.isFinite(value) ? value : 0;
  };
  const quoted = quotes.filter((q) => q.status === "Quoted");
  if (quoted.length === 1) return quoted[0]._id;
  if (quoted.length > 1) {
    return [...quoted].sort((a, b) => timestamp(b) - timestamp(a))[0]?._id || "";
  }
  return [...quotes].sort((a, b) => timestamp(b) - timestamp(a))[0]?._id || "";
}

function getItemProductId(item) {
  return getId(item?.product) || String(item?.productId || "");
}

function getItemProductName(item, productId = "") {
  return (
    item?.productName ||
    item?.product?.name ||
    (productId ? `Product ${productId.slice(-6).toUpperCase()}` : "Product")
  );
}

function buildMergePreview(quotes = [], targetId = "") {
  const productMap = new Map();
  const targetQuote =
    quotes.find((quote) => String(quote?._id) === String(targetId)) || null;
  const sourceQuotes = quotes.filter(
    (quote) => String(quote?._id) !== String(targetId)
  );

  for (const quote of quotes) {
    const quoteNumber = quote?.quoteNumber || getQuoteNumber(quote) || "Request";
    const requestedItems = Array.isArray(quote?.requestedItems)
      ? quote.requestedItems
      : [];

    for (const item of requestedItems) {
      const productId = getItemProductId(item);
      if (!productId) continue;

      const qty = Math.max(0, Number(item?.qty) || 0);
      if (qty <= 0) continue;

      const current =
        productMap.get(productId) || {
          productId,
          productName: getItemProductName(item, productId),
          sku: item?.product?.sku || "",
          totalQty: 0,
          sources: [],
        };

      current.totalQty += qty;
      current.productName =
        current.productName || getItemProductName(item, productId);
      current.sku = current.sku || item?.product?.sku || "";
      current.sources.push({
        quoteId: quote?._id,
        quoteNumber,
        qty,
      });
      productMap.set(productId, current);
    }
  }

  const products = Array.from(productMap.values()).sort((a, b) =>
    String(a.productName || a.productId).localeCompare(
      String(b.productName || b.productId)
    )
  );
  const duplicates = products.filter((item) => item.sources.length > 1);
  const totalUnits = products.reduce(
    (sum, item) => sum + Math.max(0, Number(item.totalQty) || 0),
    0
  );

  return {
    targetQuote,
    sourceQuotes,
    products,
    duplicates,
    uniqueItemCount: products.length,
    totalUnits,
  };
}

function getAvailabilityTotal(q) {
  const items = Array.isArray(q?.requestedItems) ? q.requestedItems : [];
  let subtotal = 0;
  let hasUnitPrice = false;

  for (const it of items) {
    const qty = Math.max(0, Number(it?.qty) || 0);
    const unit = Number(it?.unitPrice);
    if (!Number.isFinite(unit)) {
      continue;
    }
    hasUnitPrice = true;
    const availableNow = Number(it?.availableNow);
    const shortage = Number.isFinite(Number(it?.shortage))
      ? Math.max(0, Number(it.shortage))
      : Number.isFinite(availableNow)
      ? Math.max(0, qty - availableNow)
      : 0;
    const availabilityQty =
      Number.isFinite(availableNow) && shortage > 0 ? Math.max(0, availableNow) : qty;
    subtotal += Math.max(0, unit) * availabilityQty;
  }

  if (!hasUnitPrice) {
    return null;
  }

  const delivery = Math.max(0, Number(q?.deliveryCharge) || 0);
  const extra = Math.max(0, Number(q?.extraFee) || 0);
  return subtotal + delivery + extra;
}

function getRowMeta(q, state = {}) {
  const { deletingId, pdfId, copyId } = state;
  const hasOrder = Boolean(q.order);
  const canPdf = q.status === "Quoted";
  const canCopy = q.status === "Quoted" || q.status === "Confirmed";
  const isCancelled = q.status === "Cancelled";
  const isMergedSource = Boolean(q.mergedIntoQuote);
  const mergedFromSnapshots = Array.isArray(q.mergedFromQuoteSnapshots)
    ? q.mergedFromQuoteSnapshots
    : [];
  const mergedFromCount =
    mergedFromSnapshots.length ||
    (Array.isArray(q.mergedFromQuotes) ? q.mergedFromQuotes.length : 0);
  const canDelete = isCancelled || isMergedSource;

  const requestedItems = Array.isArray(q.requestedItems) ? q.requestedItems : [];
  const itemsCount = requestedItems.length;
  const unitsCount = requestedItems.reduce(
    (sum, item) => sum + Math.max(0, Number(item?.qty) || 0),
    0
  );
  const availabilityItems = requestedItems
    .map((it) => normalizeAvailabilityStatus(it?.availabilityStatus))
    .filter(Boolean);
  const showAvailability = !isCancelled;
  const hasAvailability = showAvailability && availabilityItems.length > 0;
  const notAvailableCount = availabilityItems.filter(
    (s) => s === "NOT_AVAILABLE"
  ).length;
  const availableCount = availabilityItems.filter(
    (s) => s === "AVAILABLE"
  ).length;
  const totalAvailabilityCount = availabilityItems.length;
  const availabilityStatus = !showAvailability
    ? null
    : !hasAvailability
    ? "NOT_CHECKED"
    : notAvailableCount === totalAvailabilityCount
    ? "NOT_AVAILABLE"
    : availableCount === totalAvailabilityCount
    ? "AVAILABLE"
    : "SHORTAGE";

  const rowDeleting = deletingId === q._id;
  const rowPdf = pdfId === q._id;
  const rowCopy = copyId === q._id;
  const availabilityTotal = getAvailabilityTotal(q);
  const displayTotal = Number.isFinite(availabilityTotal)
    ? availabilityTotal
    : q.totalPrice;

  return {
    hasOrder,
    canPdf,
    canCopy,
    isCancelled,
    isMergedSource,
    mergedFromCount,
    canDelete,
    itemsCount,
    unitsCount,
    showAvailability,
    availabilityStatus,
    rowDeleting,
    rowPdf,
    rowCopy,
    displayTotal,
  };
}

function MergeRequestsModal({
  open,
  quotes,
  targetId,
  onTargetChange,
  onClose,
  onSubmit,
  isSubmitting,
}) {
  if (!open) return null;

  const customer = quotes[0]?.user || null;
  const preview = buildMergePreview(quotes, targetId);
  const targetLabel =
    preview.targetQuote?.quoteNumber ||
    getQuoteNumber(preview.targetQuote) ||
    "Selected final quote";
  const sourceLabels = preview.sourceQuotes
    .map((quote) => quote?.quoteNumber || getQuoteNumber(quote))
    .filter(Boolean);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-3 py-3 sm:px-4 sm:py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="merge-requests-title"
    >
      <div className="flex max-h-[calc(100vh-1.5rem)] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl ring-1 ring-slate-200 sm:max-h-[calc(100vh-3rem)]">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <div
              id="merge-requests-title"
              className="text-base font-semibold text-slate-900"
            >
              Merge requests
            </div>
            <div className="mt-1 break-words text-sm text-slate-500">
              {customer?.name || "Customer"}{" "}
              {customer?.email ? `- ${customer.email}` : ""}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
            aria-label="Close"
            title="Close"
          >
            <FiX className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4 sm:px-5">
          <section>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Selected requests
            </div>
            <div className="mt-2 divide-y divide-slate-200 rounded-xl border border-slate-200">
              {quotes.map((q) => {
                const row = getRowMeta(q);
                return (
                  <div
                    key={q._id}
                    className="grid gap-3 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900">
                        {q.quoteNumber || "Request"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {formatDateTime(q.createdAt)}
                      </div>
                    </div>
                    <StatusBadge status={q.status} size="compact" />
                    <div className="text-xs font-semibold text-slate-600 sm:text-right">
                      {row.itemsCount} items - {row.unitsCount} units
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Final quote
            </div>
            <div className="mt-2 space-y-2">
              {quotes.map((q) => {
                const checked = String(targetId) === String(q._id);
                return (
                  <label
                    key={q._id}
                    className={[
                      "flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition",
                      checked
                        ? "border-violet-300 bg-violet-50"
                        : "border-slate-200 bg-white hover:bg-slate-50",
                    ].join(" ")}
                  >
                    <input
                      type="radio"
                      name="mergeTarget"
                      checked={checked}
                      onChange={() => onTargetChange(q._id)}
                      className="mt-1 h-4 w-4 border-slate-300 text-violet-600 focus:ring-violet-500"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-slate-900">
                        {q.quoteNumber || "Request"}
                      </span>
                      <span className="block text-xs text-slate-500">
                        Use this as the final quote
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </section>

          <section className="space-y-4 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Merge preview
            </div>

            <div className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
              <div className="rounded-lg bg-white p-3 ring-1 ring-slate-200">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Final quote
                </div>
                <div className="mt-1 break-words font-semibold text-slate-900">
                  {targetLabel}
                </div>
              </div>
              <div className="rounded-lg bg-white p-3 ring-1 ring-slate-200">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Result
                </div>
                <div className="mt-1 font-semibold text-slate-900">
                  {preview.uniqueItemCount} unique item
                  {preview.uniqueItemCount === 1 ? "" : "s"},{" "}
                  {preview.totalUnits} unit
                  {preview.totalUnits === 1 ? "" : "s"}
                </div>
              </div>
              <div className="rounded-lg bg-white p-3 ring-1 ring-slate-200">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Duplicates
                </div>
                <div className="mt-1 font-semibold text-slate-900">
                  {preview.duplicates.length} product
                  {preview.duplicates.length === 1 ? "" : "s"} combined
                </div>
              </div>
              <div className="rounded-lg bg-white p-3 ring-1 ring-slate-200">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Source requests
                </div>
                <div className="mt-1 break-words font-semibold text-slate-900">
                  {sourceLabels.length > 0 ? sourceLabels.join(", ") : "-"}
                </div>
              </div>
            </div>

            {preview.duplicates.length > 0 ? (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Duplicate products
                </div>
                <div className="mt-2 max-h-48 space-y-2 overflow-y-auto pr-1">
                  {preview.duplicates.slice(0, 5).map((item) => (
                    <div
                      key={item.productId}
                      className="rounded-lg bg-white p-3 text-sm ring-1 ring-slate-200"
                    >
                      <div className="break-words font-semibold text-slate-900">
                        {item.sku || item.productId.slice(-6).toUpperCase()}
                      </div>
                      <div className="mt-1 break-words text-xs text-slate-600">
                        {item.sources
                          .map(
                            (source) =>
                              `${source.quoteNumber}: ${source.qty} unit${
                                source.qty === 1 ? "" : "s"
                              }`
                          )
                          .join(" + ")}{" "}
                        ={" "}
                        <span className="font-semibold text-slate-900">
                          {item.totalQty} unit{item.totalQty === 1 ? "" : "s"}
                        </span>
                      </div>
                    </div>
                  ))}
                  {preview.duplicates.length > 5 ? (
                    <div className="text-xs font-semibold text-slate-500">
                      +{preview.duplicates.length - 5} more duplicate product
                      {preview.duplicates.length - 5 === 1 ? "" : "s"}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="rounded-lg bg-white p-3 text-sm text-slate-700 ring-1 ring-slate-200">
                No duplicate products found. All selected products will be
                added as separate lines.
              </div>
            )}

            <div className="rounded-lg bg-white p-3 text-sm text-slate-700 ring-1 ring-slate-200">
              <span className="font-semibold text-slate-900">{targetLabel}</span>{" "}
              will return to Processing, availability will be recalculated, and{" "}
              {sourceLabels.length > 0 ? sourceLabels.join(", ") : "the source requests"}{" "}
              will be marked as merged/cancelled.
            </div>
          </section>
        </div>

        <div className="sticky bottom-0 flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-white px-4 py-3 sm:px-5 sm:py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting || !targetId}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
          >
            <FiGitMerge className="h-4 w-4" />
            {isSubmitting ? (
              "Merging..."
            ) : (
              <>
                <span className="sm:hidden">Merge</span>
                <span className="hidden sm:inline">Merge requests</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminRequestsPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error, isFetching, refetch } =
    useGetAdminQuotesQuery({ page });

  const [deleteQuoteByAdmin, { isLoading: isDeleting }] =
    useDeleteQuoteByAdminMutation();
  const [mergeQuotesByAdmin, { isLoading: isMerging }] =
    useMergeQuotesByAdminMutation();

  const [getQuoteShare] = useLazyGetQuoteShareQuery();
  const [getQuotePdf, { isFetching: isPdfLoading }] = useLazyGetQuotePdfQuery();

  const [deletingId, setDeletingId] = useState(null);
  const [pdfId, setPdfId] = useState(null);
  const [copyId, setCopyId] = useState(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [mergeTargetId, setMergeTargetId] = useState("");
  const rows = useMemo(() => data?.data || [], [data?.data]);
  const total = data?.total ?? rows.length;

  const selectedRows = useMemo(() => {
    const byId = new Map(rows.map((row) => [String(row._id), row]));
    return selectedIds.map((id) => byId.get(String(id))).filter(Boolean);
  }, [rows, selectedIds]);

  const selectedUserIds = useMemo(
    () =>
      new Set(
        selectedRows.map((row) => getId(row.user)).filter(Boolean)
      ),
    [selectedRows]
  );
  const selectedSameCustomer =
    selectedRows.length > 0 && selectedUserIds.size === 1;
  const selectedCustomer = selectedRows[0]?.user || null;
  const canOpenMerge = selectedRows.length >= 2 && selectedSameCustomer;

  const pagination = useMemo(() => {
    if (data?.pagination) return data.pagination;

    const totalPages = data?.pages || 1;
    return {
      page,
      totalPages,
      hasPrev: page > 1,
      hasNext: page < totalPages,
    };
  }, [data, page]);

  function onPageChange(nextPage) {
    setSelectedIds([]);
    setMergeModalOpen(false);
    setMergeTargetId("");
    setPage(nextPage);
  }

  function clearSelection() {
    setSelectedIds([]);
    setMergeModalOpen(false);
    setMergeTargetId("");
  }

  function startMergeMode() {
    setSelectionMode(true);
  }

  function cancelMergeMode() {
    setSelectionMode(false);
    clearSelection();
  }

  function toggleSelected(q) {
    if (!selectionMode) return;
    if (!isMergeEligible(q)) return;
    const id = String(q._id);
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function openMergeModal() {
    if (!canOpenMerge) return;
    setMergeTargetId(resolveDefaultMergeTarget(selectedRows));
    setMergeModalOpen(true);
  }

  function closeMergeModal() {
    if (isMerging) return;
    setMergeModalOpen(false);
  }

  async function onMergeSelected() {
    if (!canOpenMerge || !mergeTargetId) return;

    try {
      const res = await mergeQuotesByAdmin({
        quoteIds: selectedRows.map((row) => row._id),
        targetQuoteId: mergeTargetId,
      }).unwrap();
      toast.success(res?.message || "Requests merged.");
      clearSelection();
      setSelectionMode(false);
      await refetch();
    } catch (e) {
      toast.error(friendlyApiError(e));
    }
  }

  async function onDelete(q) {
    if (q.status !== "Cancelled" && !q.mergedIntoQuote) return;

    const ok = window.confirm(
      `Delete this quote?`
    );
    if (!ok) return;

    try {
      setDeletingId(q._id);
      const res = await deleteQuoteByAdmin(q._id).unwrap();
      toast.success(res?.message || "Quote deleted.");
    } catch (e) {
      toast.error(friendlyApiError(e));
    } finally {
      setDeletingId(null);
    }
  }

  async function onPdf(q) {
    try {
      setPdfId(q._id);
      const blob = await getQuotePdf(q._id).unwrap();
      const fileName = q.quoteNumber
        ? `quote-${q.quoteNumber}.pdf`
        : `quote-${q._id}.pdf`;
      const url = window.URL.createObjectURL(blob);
      const newTab = window.open(url, "_blank", "noopener,noreferrer");

      if (!newTab) {
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
      }

      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch {
      toast.error("Failed to download PDF.");
    } finally {
      setPdfId(null);
    }
  }

  async function onCopy(q) {
    try {
      if (q.status !== "Quoted" && q.status !== "Confirmed") return;
      setCopyId(q._id);
      const res = await getQuoteShare(q._id).unwrap();
      const quote = res?.data ?? res ?? q;
      const text = buildAdminQuoteShareText(quote);
      await copyTextToClipboard(text);
      toast.success("Quote copied to clipboard.");
    } catch {
      toast.error("Failed to copy quote.");
    } finally {
      setCopyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <MergeRequestsModal
        open={mergeModalOpen}
        quotes={selectedRows}
        targetId={mergeTargetId}
        onTargetChange={setMergeTargetId}
        onClose={closeMergeModal}
        onSubmit={onMergeSelected}
        isSubmitting={isMerging}
      />

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-lg font-semibold text-slate-900">Requests</div>
          <div className="text-sm text-slate-500">
            Newest first - Review, quote, confirm, then create an order.
          </div>
        </div>
        {selectionMode ? (
          <button
            type="button"
            onClick={cancelMergeMode}
            disabled={isMerging}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <FiX className="h-3.5 w-3.5" />
            <span className="sm:hidden">Cancel</span>
            <span className="hidden sm:inline">Cancel merge</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={startMergeMode}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
          >
            <FiGitMerge className="h-3.5 w-3.5" />
            <span className="sm:hidden">Merge</span>
            <span className="hidden sm:inline">Merge requests</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <div className="h-10 rounded-xl bg-white/60 ring-1 ring-slate-200" />
          <div className="flex items-end md:justify-end">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900"
              onClick={() => onPageChange(1)}
            >
              <FiRefreshCw className="h-3.5 w-3.5 mr-1 text-slate-400" aria-hidden="true" />
              Reset filters
            </button>
          </div>
        </div>
      </div>

      {selectionMode ? (
        <div className="sticky top-2 z-20 rounded-2xl bg-white p-3 shadow-lg shadow-slate-200/60 ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900">
                {selectedRows.length > 0
                  ? `${selectedRows.length} request${selectedRows.length === 1 ? "" : "s"} selected`
                  : "Select requests to merge"}
              </div>
              <div className="mt-0.5 text-xs text-slate-500">
                {selectedRows.length < 2
                  ? "Select at least 2 requests to merge."
                  : selectedSameCustomer
                  ? selectedCustomer?.name || selectedCustomer?.email || "Same customer"
                  : "Requests must belong to the same customer."}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={clearSelection}
                disabled={isMerging || selectedRows.length === 0}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <FiX className="h-3.5 w-3.5" />
                Clear
              </button>
              <button
                type="button"
                onClick={cancelMergeMode}
                disabled={isMerging}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={openMergeModal}
                disabled={!canOpenMerge || isMerging}
                title={
                  canOpenMerge
                    ? "Merge selected requests"
                    : "Select at least 2 requests from the same customer"
                }
                className={[
                  "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition",
                  canOpenMerge && !isMerging
                    ? "bg-slate-900 text-white hover:bg-slate-800"
                    : "cursor-not-allowed bg-slate-100 text-slate-400",
                ].join(" ")}
              >
                <FiGitMerge className="h-3.5 w-3.5" />
                <span className="sm:hidden">Merge</span>
                <span className="hidden sm:inline">Merge requests</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Pagination */}
      <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <div>
            Showing{" "}
            <span className="font-semibold text-slate-900">{rows.length}</span> of{" "}
            <span className="font-semibold text-slate-900">{total}</span> items
            {isFetching ? <span className="ml-2">(Updating...)</span> : null}
          </div>

          <Pagination
            pagination={pagination}
            onPageChange={onPageChange}
            variant="compact"
          />
        </div>
      </div>

      {/* States */}
      {isLoading ? (
        <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
          <Loader />
        </div>
      ) : isError ? (
        <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
          <ErrorMessage error={error} />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-slate-200">
          <div className="text-sm font-semibold text-slate-900">
            No requests found
          </div>
          <div className="mt-1 text-sm text-slate-500">
            Requests will appear here once clients submit them.
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-3 md:hidden">
            {rows.map((q) => {
              const row = getRowMeta(q, { deletingId, pdfId, copyId });
              const rowSelected = selectedIds.includes(String(q._id));
              const mergeEligible = isMergeEligible(q);
              const mergeDisabledReason = getMergeDisabledReason(q);

              return (
                <div
                  key={q._id}
                  className={[
                    "rounded-2xl p-4 ring-1 transition",
                    rowSelected
                      ? "bg-violet-50 ring-2 ring-violet-400"
                      : "bg-white ring-slate-200",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      {selectionMode ? (
                        <input
                          type="checkbox"
                          checked={rowSelected}
                          disabled={!mergeEligible}
                          onChange={() => toggleSelected(q)}
                          title={
                            mergeEligible
                              ? "Select request"
                              : mergeDisabledReason
                          }
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label={`Select ${q.quoteNumber || "request"}`}
                        />
                      ) : null}
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900">
                          {q.quoteNumber || "—"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {formatDateTime(q.createdAt)}
                        </div>
                        {row.isMergedSource ? (
                          <div className="mt-1 text-[11px] font-semibold text-violet-700">
                            Merged into {getQuoteNumber(q.mergedIntoQuote)}
                          </div>
                        ) : row.mergedFromCount > 0 ? (
                          <div className="mt-1 text-[11px] font-semibold text-slate-500">
                            Merged from {row.mergedFromCount} request
                            {row.mergedFromCount === 1 ? "" : "s"}
                          </div>
                        ) : null}
                        {selectionMode && rowSelected ? (
                          <div className="mt-1 inline-flex rounded-md bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700">
                            Selected
                          </div>
                        ) : null}
                        {selectionMode && !mergeEligible ? (
                          <div className="mt-1 text-[11px] font-semibold text-slate-500">
                            Cannot merge: {mergeDisabledReason}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <StatusBadge status={q.status} />
                  </div>

                  <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2">
                    <div className="text-xs font-semibold text-slate-900">
                      {q.user?.name || "—"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {q.user?.email || "—"}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Availability
                      </div>
                      <div className="mt-1">
                        {row.showAvailability ? (
                          <AvailabilityBadge status={row.availabilityStatus} />
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Order
                      </div>
                      <div className="mt-1 text-xs font-semibold text-slate-700">
                        {row.hasOrder ? q.order?.orderNumber : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Items
                      </div>
                      <div className="mt-1 text-xs text-slate-600">
                        {row.itemsCount} items · {row.unitsCount} units
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Total
                      </div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">
                        {money(row.displayTotal)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className={[
                        "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-semibold uppercase tracking-wider ring-1 ring-inset transition",
                        !row.canCopy || row.rowCopy
                          ? "cursor-not-allowed bg-white text-slate-300 ring-slate-200"
                          : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50",
                      ].join(" ")}
                      disabled={!row.canCopy || row.rowCopy}
                      onClick={() => onCopy(q)}
                      title={
                        row.canCopy
                          ? "Copy quote"
                          : "Copy is available for Quoted or Confirmed requests only"
                      }
                    >
                      <FiSend className="h-3.5 w-3.5" />
                      Copy
                    </button>
                    <button
                      type="button"
                      className={[
                        "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-semibold uppercase tracking-wider ring-1 ring-inset transition",
                        !row.canPdf || row.rowPdf || isPdfLoading
                          ? "cursor-not-allowed bg-white text-slate-300 ring-slate-200"
                          : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50",
                      ].join(" ")}
                      disabled={!row.canPdf || row.rowPdf || isPdfLoading}
                      onClick={() => onPdf(q)}
                      title={
                        row.canPdf
                          ? "PDF"
                          : "PDF is available for Quoted requests only"
                      }
                    >
                      <FiFileText className="h-3.5 w-3.5" />
                      {row.rowPdf ? "PDF.." : "PDF"}
                    </button>
                    <Link
                      to={`/admin/requests/${q._id}`}
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-white hover:bg-slate-800"
                      title="Quote"
                    >
                      <FiEdit2 className="h-3.5 w-3.5" />
                      Quote
                    </Link>
                    <button
                      type="button"
                      className={[
                        "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-semibold uppercase tracking-wider ring-1 ring-inset",
                        !row.canDelete || row.rowDeleting || isDeleting
                          ? "cursor-not-allowed bg-white text-slate-300 ring-slate-200"
                          : "bg-white text-rose-600 ring-rose-200 hover:bg-rose-50",
                      ].join(" ")}
                      disabled={!row.canDelete || row.rowDeleting || isDeleting}
                      onClick={() => onDelete(q)}
                      title="Delete"
                    >
                      <FiTrash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden overflow-hidden rounded-2xl ring-1 ring-slate-200 md:block">
            <div className="overflow-x-auto bg-white">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
                  <tr>
                    {selectionMode ? (
                      <th className="w-10 px-4 py-3">
                        <span className="sr-only">Select</span>
                      </th>
                    ) : null}
                    <th className="px-4 py-3">Quote</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 w-36">Availability</th>
                    <th className="px-4 py-3">Order</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {rows.map((q) => {
                    const row = getRowMeta(q, {
                      deletingId,
                      pdfId,
                      copyId,
                    });
                    const rowSelected = selectedIds.includes(String(q._id));
                    const mergeEligible = isMergeEligible(q);

                    return (
                      <tr
                        key={q._id}
                        className={
                          rowSelected ? "bg-violet-50/60" : "hover:bg-slate-50"
                        }
                      >
                        {selectionMode ? (
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={rowSelected}
                              disabled={!mergeEligible}
                              onChange={() => toggleSelected(q)}
                              title={
                                mergeEligible
                                  ? "Select request"
                                  : getMergeDisabledReason(q)
                              }
                              className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
                              aria-label={`Select ${q.quoteNumber || "request"}`}
                            />
                          </td>
                        ) : null}
                        {/* Quote: quoteNumber + createdAt */}
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">
                            {q.quoteNumber || "—"}
                          </div>
                          <div className="text-xs text-slate-500">
                            {formatDateTime(q.createdAt)}
                          </div>
                          {row.isMergedSource ? (
                            <div className="mt-1 text-[11px] font-semibold text-violet-700">
                              Merged into {getQuoteNumber(q.mergedIntoQuote)}
                            </div>
                          ) : row.mergedFromCount > 0 ? (
                            <div className="mt-1 text-[11px] font-semibold text-slate-500">
                              Merged from {row.mergedFromCount} request
                              {row.mergedFromCount === 1 ? "" : "s"}
                            </div>
                          ) : null}
                        </td>

                        {/* User */}
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">
                            {q.user?.name || "—"}
                          </div>
                          <div className="text-xs text-slate-500">
                            {q.user?.email || "—"}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <StatusBadge status={q.status} size="compact" />
                        </td>

                        {/* Availability */}
                        <td className="px-4 py-3">
                          {row.showAvailability ? (
                            <AvailabilityBadge status={row.availabilityStatus} size="compact" />
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>

                        {/* Order */}
                        <td className="px-4 py-3">
                          {row.hasOrder ? (
                            <div className="text-xs font-semibold text-slate-700">
                              {q.order?.orderNumber}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>

                        {/* Total */}
                        <td className="px-4 py-3 text-right">
                          <div className="font-semibold text-slate-900">
                            {money(row.displayTotal)}
                          </div>
                          <div className="mt-0.5 text-[10px] text-slate-500">
                            {row.itemsCount} items {row.unitsCount} units
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <button
                              type="button"
                              className={[
                                "inline-flex items-center justify-center rounded-full px-2.5 py-2 text-[11px] font-semibold uppercase tracking-wider ring-1 ring-inset transition",
                                !row.canCopy || row.rowCopy
                                  ? "cursor-not-allowed bg-white text-slate-300 ring-slate-200"
                                  : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50",
                              ].join(" ")}
                              disabled={!row.canCopy || row.rowCopy}
                              onClick={() => onCopy(q)}
                              title={
                                row.canCopy
                                  ? "Copy quote"
                                  : "Copy is available for Quoted or Confirmed requests only"
                              }
                            >
                              <FiSend className="h-3.5 w-3.5" />
                            </button>

                            <button
                              type="button"
                              className={[
                                "inline-flex items-center justify-center rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider ring-1 ring-inset transition",
                                !row.canPdf || row.rowPdf || isPdfLoading
                                  ? "cursor-not-allowed bg-white text-slate-300 ring-slate-200"
                                  : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50",
                              ].join(" ")}
                              disabled={!row.canPdf || row.rowPdf || isPdfLoading}
                              onClick={() => onPdf(q)}
                              title={
                                row.canPdf
                                  ? "PDF"
                                  : "PDF is available for Quoted requests only"
                              }
                            >
                              {row.rowPdf ? "PDF.." : "PDF"}
                            </button>

                            <Link
                              to={`/admin/requests/${q._id}`}
                              className="inline-flex items-center justify-center rounded-xl bg-slate-900 p-2 text-white hover:bg-slate-800"
                              title="Quote"
                            >
                              <FiEdit2 className="h-4 w-4" />
                            </Link>

                            <button
                              type="button"
                              className={[
                                "inline-flex items-center justify-center rounded-xl p-2 ring-1 ring-inset",
                                !row.canDelete || row.rowDeleting || isDeleting
                                  ? "cursor-not-allowed bg-white text-slate-300 ring-slate-200"
                                  : "bg-white text-rose-600 ring-rose-200 hover:bg-rose-50",
                              ].join(" ")}
                              disabled={
                                !row.canDelete || row.rowDeleting || isDeleting
                              }
                              onClick={() => onDelete(q)}
                              title="Delete"
                            >
                              <FiTrash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
