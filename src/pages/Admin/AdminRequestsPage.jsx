// src/pages/Admin/AdminRequestsPage.jsx
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiAlertTriangle,
  FiCopy,
  FiEdit2,
  FiRefreshCw,
  FiTrash2,
} from "react-icons/fi";
import { toast } from "react-toastify";

import Pagination from "../../components/common/Pagination";
import Loader from "../../components/common/Loader";
import ErrorMessage from "../../components/common/ErrorMessage";

import {
  useDeleteQuoteByAdminMutation,
  useGetAdminQuotesQuery,
  useLazyGetQuoteShareQuery,
  useLazyGetQuotePdfQuery,
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

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return iso || "-";
  }
}

function StatusBadge({ status }) {
  const base =
    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset";

  const map = {
    Processing: "bg-slate-50 text-slate-700 ring-slate-200",
    Quoted: "bg-violet-50 text-violet-700 ring-violet-300",
    Confirmed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    Cancelled: "bg-rose-50 text-rose-700 ring-rose-200",
  };

  return (
    <span className={`${base} ${map[status] || map.Processing}`}>
      {status}
    </span>
  );
}

function AvailabilityBadge({ status }) {
  const base =
    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset";
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
    <span className={`${base} ${map[status] || map.NOT_CHECKED}`}>
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

function buildQuoteShareText(q) {
  const quoteNo = q?.quoteNumber || q?._id || "-";
  const createdAt = q?.createdAt ? formatDate(q.createdAt) : "-";
  const clientName = q?.user?.name || "Unnamed";
  const clientEmail = q?.user?.email || "-";
  const status = q?.status || "-";
  const items = Array.isArray(q?.requestedItems) ? q.requestedItems : [];

  const lines = [];
  lines.push(`Quote #: ${quoteNo}`);
  lines.push(`Date: ${createdAt}`);
  lines.push(`Client: ${clientName}`);
  lines.push(`Email: ${clientEmail}`);
  lines.push(`Status: ${status}`);
  lines.push("");

  lines.push("Items:");
  if (!items.length) {
    lines.push("- None");
  } else {
    items.forEach((item, idx) => {
      const qty = Number(item?.qty) || 0;
      const unit = Number(item?.unitPrice) || 0;
      const lineTotal = Math.max(0, unit * qty);
      const label = item?.product?.name || "Unnamed";
      lines.push(`${idx + 1}. ${label}`);
      lines.push(`Qty: ${qty}`);
      lines.push(`Total: ${money(lineTotal)}`);
    });
  }

  lines.push("");
  lines.push(`Delivery Charge: ${money(q?.deliveryCharge)}`);
  lines.push(`Extra Fee: ${money(q?.extraFee)}`);
  lines.push(`Total Price: ${money(q?.totalPrice)}`);

  return lines.join("\n");
}

async function copyTextToClipboard(text) {
  if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.left = "0";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  const ok = document.execCommand("copy");
  textarea.remove();

  if (!ok) {
    throw new Error("Copy failed.");
  }
}

export default function AdminRequestsPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error, isFetching } =
    useGetAdminQuotesQuery({ page });

  const [deleteQuoteByAdmin, { isLoading: isDeleting }] =
    useDeleteQuoteByAdminMutation();

  const [getQuoteShare] = useLazyGetQuoteShareQuery();
  const [getQuotePdf, { isFetching: isPdfLoading }] = useLazyGetQuotePdfQuery();

  const [deletingId, setDeletingId] = useState(null);
  const [pdfId, setPdfId] = useState(null);
  const [copyId, setCopyId] = useState(null);

  const rows = data?.data || [];
  const total = data?.total ?? rows.length;

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

  async function onDelete(q) {
    if (q.status !== "Cancelled") return;

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
    } catch (e) {
      toast.error("Failed to download PDF.");
    } finally {
      setPdfId(null);
    }
  }

  async function onCopy(q) {
    try {
      if (q.status !== "Quoted") return;
      setCopyId(q._id);
      const res = await getQuoteShare(q._id).unwrap();
      const quote = res?.data ?? res ?? q;
      const text = buildQuoteShareText(quote);
      await copyTextToClipboard(text);
      toast.success("Quote copied to clipboard.");
    } catch (e) {
      toast.error("Failed to copy quote.");
    } finally {
      setCopyId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-lg font-semibold text-slate-900">Requests</div>
          <div className="text-sm text-slate-500">
            Newest first - Review, quote, confirm, then create an order.
          </div>
        </div>
      </div>

      {/* Filters + Pagination */}
      <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <div className="h-10 rounded-xl bg-white/60 ring-1 ring-slate-200" />
          <div className="flex items-end md:justify-end">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900"
              onClick={() => setPage(1)}
            >
              <FiRefreshCw className="h-3.5 w-3.5 mr-1 text-slate-400" aria-hidden="true" />
              Reset filters
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <div>
            Showing{" "}
            <span className="font-semibold text-slate-900">{rows.length}</span> of{" "}
            <span className="font-semibold text-slate-900">{total}</span> items
            {isFetching ? <span className="ml-2">(Updating...)</span> : null}
          </div>

          <Pagination
            pagination={pagination}
            onPageChange={setPage}
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
      ) : (
        <div className="overflow-hidden rounded-2xl ring-1 ring-slate-200">
          <div className="overflow-x-auto bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
                <tr>
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
                  const hasOrder = Boolean(q.order);
                  const canPdf = q.status === "Quoted";
                  const canCopy = q.status === "Quoted";
                  const isCancelled = q.status === "Cancelled";

                  const requestedItems = Array.isArray(q.requestedItems)
                    ? q.requestedItems
                    : [];
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
                  const shortageCount = availabilityItems.filter(
                    (s) => s === "SHORTAGE"
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

                  return (
                    <tr key={q._id} className="hover:bg-slate-50">
                      {/* Quote: quoteNumber + createdAt */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">
                          {q.quoteNumber || "—"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {formatDateTime(q.createdAt)}
                        </div>
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
                        <StatusBadge status={q.status} />
                      </td>

                      {/* Availability */}
                      <td className="px-4 py-3">
                        {showAvailability ? (
                          <AvailabilityBadge status={availabilityStatus} />
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>

                      {/* Order */}
                      <td className="px-4 py-3">
                        {hasOrder ? (
                          <div className="text-xs font-semibold text-slate-700">
                            {q.order?.orderNumber}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>

                      {/* Total */}
                      <td className="px-4 py-3 text-right">
                        {(() => {
                          const availabilityTotal = getAvailabilityTotal(q);
                          const displayTotal = Number.isFinite(availabilityTotal)
                            ? availabilityTotal
                            : q.totalPrice;

                          return (
                            <>
                              <div className="font-semibold text-slate-900">
                                {money(displayTotal)}
                              </div>
                              <div className="mt-0.5 text-[10px] text-slate-500">
                                {itemsCount} items {unitsCount} units
                              </div>
                            </>
                          );
                        })()}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="grid grid-cols-2 gap-2 justify-end">
                          <button
                            type="button"
                            className={[
                              "inline-flex items-center justify-center rounded-full px-2.5 py-2 text-[11px] font-semibold uppercase tracking-wider ring-1 ring-inset transition",
                              !canCopy || rowCopy
                                ? "cursor-not-allowed bg-white text-slate-300 ring-slate-200"
                                : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50",
                            ].join(" ")}
                            disabled={!canCopy || rowCopy}
                            onClick={() => onCopy(q)}
                            title={
                              canCopy ? "Copy quote" : "Copy is available for Quoted requests only"
                            }
                          >
                            <FiCopy className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            className={[
                              "inline-flex items-center justify-center rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider ring-1 ring-inset transition",
                              !canPdf || rowPdf || isPdfLoading
                                ? "cursor-not-allowed bg-white text-slate-300 ring-slate-200"
                                : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50",
                            ].join(" ")}
                            disabled={!canPdf || rowPdf || isPdfLoading}
                            onClick={() => onPdf(q)}
                            title={
                              canPdf ? "PDF" : "PDF is available for Quoted requests only"
                            }
                          >
                            {rowPdf ? "PDF.." : "PDF"}
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
                              q.status !== "Cancelled" ||
                              rowDeleting ||
                              isDeleting
                                ? "cursor-not-allowed bg-white text-slate-300 ring-slate-200"
                                : "bg-white text-rose-600 ring-rose-200 hover:bg-rose-50",
                            ].join(" ")}
                            disabled={
                              q.status !== "Cancelled" ||
                              rowDeleting ||
                              isDeleting
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
      )}
    </div>
  );
}

