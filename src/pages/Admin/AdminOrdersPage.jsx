// src/pages/Admin/AdminOrdersPage.jsx
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  FiChevronDown,
  FiChevronUp,
  FiFileText,
  FiRefreshCw,
  FiSend,
  FiSettings,
  FiTrash2,
  FiTruck,
} from "react-icons/fi";
import { toast } from "react-toastify";

import Loader from "../../components/common/Loader";
import ErrorMessage from "../../components/common/ErrorMessage";
import Pagination from "../../components/common/Pagination";
import AddPaymentModal from "../../components/admin/AddPaymentModal";
import CreateInvoiceModal from "../../components/admin/CreateInvoiceModal";
import CourierDetailsModal from "../../components/admin/CourierDetailsModal";
import MarkDeliveredModal from "../../components/admin/MarkDeliveredModal";
import { courierPickupConfig } from "../../config/courierConfig";
import { copyTextToClipboard } from "../../utils/clipboard";
import {
  buildCourierShareText,
  getCourierDeliveryProfile,
  getCourierMissingFields,
  hasCourierProfileChanges,
} from "../../utils/orderCourierShare";
import { buildAdminOrderShareText } from "../../utils/orderShare";
import { getOrderTotals } from "../../utils/orderTotals";
import {
  ADMIN_ORDER_ACTION_IDS,
  getAdminOrderActionState,
} from "../../utils/adminOrderActions";
import {
  formatInvoiceMoneyMinor,
  getInvoicePaymentStatusLabel,
} from "../../utils/invoiceMoney";
import { buildPaymentDefaults } from "../../utils/paymentFormDefaults";
import {
  useDeleteOrderByAdminMutation,
  useGetOrdersAdminQuery,
  useGetOrdersWorkSummaryQuery,
  useMarkOrderDeliveredMutation,
  useUpdateOrderByAdminMutation,
} from "../../features/orders/ordersApiSlice";
import {
  useCreateInvoiceFromOrderMutation,
  useLazyGetInvoiceByIdQuery,
  useLazyGetInvoicePdfQuery,
} from "../../features/invoices/invoicesApiSlice";
import { useFinalizeOrderAllocationsMutation } from "../../features/orderAllocations/orderAllocationsApiSlice";
import { useAddPaymentToInvoiceMutation } from "../../features/payments/paymentsApiSlice";
import { useUpdateUserMutation } from "../../features/users/usersApiSlice";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import useMediaQuery from "../../hooks/useMediaQuery";

function formatDateTime(iso) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return iso;
  }
}

function getDefaultDueDate() {
  const date = new Date();
  date.setDate(date.getDate() + 35);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function friendlyApiError(err, fallback = "Something went wrong.") {
  return String(err?.data?.message || err?.error || err?.message || fallback);
}

function formatMoney(amount) {
  const n = Number(amount || 0);
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

function formatOrderItemSummary(items) {
  if (!Array.isArray(items)) return "-";
  const lineCount = items.length;
  const unitCount = items.reduce((sum, item) => {
    const qty = Number(item?.qty);
    return sum + (Number.isFinite(qty) ? Math.max(0, qty) : 0);
  }, 0);

  return `${lineCount} line${lineCount === 1 ? "" : "s"}, ${unitCount} unit${
    unitCount === 1 ? "" : "s"
  }`;
}

function getOrderTotal(order) {
  return getOrderTotals(order).total;
}

function getOrderRowMeta(order) {
  const actionState = getAdminOrderActionState(order);
  const isFinalized = Boolean(order?.stockFinalizedAt);
  const orderNumber = order?.orderNumber || order?._id || "-";
  const itemCountLabel = formatOrderItemSummary(order?.orderItems);
  const total = getOrderTotal(order);
  return { actionState, isFinalized, orderNumber, itemCountLabel, total };
}

function getStatusAccentClass(status) {
  const map = {
    Processing: "bg-slate-300",
    Shipping: "bg-blue-400",
    Delivered: "bg-emerald-400",
    Cancelled: "bg-rose-400",
  };
  return map[status] || map.Processing;
}

function PaymentBadge({ status, hasInvoice = true, size = "default" }) {
  const base =
    "inline-flex items-center rounded-full font-semibold ring-1 ring-inset";
  const sizes = {
    default: "px-2.5 py-1 text-xs",
    compact: "px-2 py-0.5 text-[10px]",
  };
  const map = {
    Paid: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    PartiallyPaid: "bg-amber-50 text-amber-700 ring-amber-200",
    Unpaid: "bg-rose-50 text-rose-700 ring-rose-200",
    empty: "bg-slate-50 text-slate-500 ring-slate-200",
  };
  const key = hasInvoice && status ? status : "empty";
  const label = hasInvoice ? getInvoicePaymentStatusLabel(status) : "No invoice";
  return (
    <span className={`${base} ${sizes[size] || sizes.default} ${map[key] || map.empty}`}>
      {label}
    </span>
  );
}

function StatusBadge({ status, size = "default" }) {
  const base =
    "inline-flex items-center rounded-full font-semibold ring-1 ring-inset";

  const sizes = {
    default: "px-2.5 py-1 text-xs",
    compact: "px-2 py-0.5 text-[10px]",
  };

  const map = {
    Processing: "bg-slate-50 text-slate-700 ring-slate-200",
    Shipping: "bg-blue-50 text-blue-700 ring-blue-200",
    Delivered: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    Cancelled: "bg-rose-50 text-rose-700 ring-rose-200",
  };

  return (
    <span
      className={`${base} ${sizes[size] || sizes.default} ${
        map[status] || map.Processing
      }`}
    >
      {status}
    </span>
  );
}

function StockBadge({ finalized, size = "default" }) {
  const base =
    "inline-flex items-center rounded-full font-semibold ring-1 ring-inset";
  const sizes = {
    default: "px-2.5 py-1 text-xs",
    compact: "px-2 py-0.5 text-[10px]",
  };
  if (!finalized) {
    return (
      <span
        className={`${base} ${
          sizes[size] || sizes.default
        } bg-amber-50 text-amber-700 ring-amber-200`}
      >
        Not deducted
      </span>
    );
  }
  return (
    <span
      className={`${base} ${sizes[size] || sizes.default} bg-emerald-50 text-emerald-700 ring-emerald-200`}
    >
      Deducted
    </span>
  );
}

function AllocationBadge({ status, size = "default" }) {
  const base =
    "inline-flex items-center rounded-full font-semibold ring-1 ring-inset";
  const sizes = {
    default: "px-2.5 py-1 text-xs",
    compact: "px-2 py-0.5 text-[10px]",
  };
  const map = {
    Allocated: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    PartiallyAllocated: "bg-amber-50 text-amber-700 ring-amber-200",
    Unallocated: "bg-slate-50 text-slate-600 ring-slate-200",
  };
  const labels = {
    Allocated: "Reserved",
    PartiallyAllocated: "Partially reserved",
    Unallocated: "Not reserved",
  };

  return (
    <span className={`${base} ${sizes[size] || sizes.default} ${map[status] || map.Unallocated}`}>
      {labels[status] || status || "Not reserved"}
    </span>
  );
}

function buildOrderDetailsHref(orderId, listQueryString = "", tab = "") {
  const params = new URLSearchParams(listQueryString);
  if (tab) params.set("tab", tab);
  const qs = params.toString();
  return qs ? `/admin/orders/${orderId}?${qs}` : `/admin/orders/${orderId}`;
}

function formatBillingBalance(billing) {
  if (!billing?.hasInvoice) return "No invoice yet";
  if (!billing.hasBalanceData) return "Balance unavailable";
  if (billing.balanceDueMinor <= 0) return "Paid in full";

  const invoice = billing.invoice || {};
  return `Bal: ${formatInvoiceMoneyMinor(
    billing.balanceDueMinor,
    invoice.currency || "AED",
    invoice.minorUnitFactor || 100
  )}`;
}

function InvoicePdfButton({
  billing,
  isBusy = false,
  isActive = false,
  iconOnly = false,
  onClick,
}) {
  if (!billing?.hasInvoice || !billing.invoiceId) return null;

  const disabled = isBusy || isActive;
  const label = isActive ? "PDF.." : "PDF";
  const className = iconOnly
    ? [
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 transition hover:bg-indigo-100",
        disabled
          ? "cursor-not-allowed border-slate-200 bg-white text-slate-300 hover:bg-white"
          : "",
      ].join(" ")
    : [
        "inline-flex h-7 shrink-0 items-center justify-center gap-1 rounded-full px-2.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset transition",
        disabled
          ? "cursor-not-allowed bg-white text-slate-300 ring-slate-200"
          : "bg-indigo-50 text-indigo-700 ring-indigo-200 hover:bg-indigo-100",
      ].join(" ");

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title="Open invoice PDF"
      aria-label={`Open PDF for invoice ${billing.invoiceLabel}`}
      className={className}
    >
      <FiFileText className="h-3.5 w-3.5" aria-hidden="true" />
      {iconOnly ? <span className="sr-only">{label}</span> : label}
    </button>
  );
}

function PrimaryActionControl({
  action,
  order,
  orderId,
  listQueryString,
  compact = false,
  isBusy = false,
  onAction,
}) {
  if (!action) return null;

  const isLinkAction =
    action.id === ADMIN_ORDER_ACTION_IDS.RESERVE_STOCK ||
    action.id === ADMIN_ORDER_ACTION_IDS.OPEN_ORDER;
  const href = buildOrderDetailsHref(
    orderId,
    listQueryString,
    action.tab || (action.id === ADMIN_ORDER_ACTION_IDS.RESERVE_STOCK ? "stock" : "")
  );
  const className = compact
    ? "inline-flex h-8 items-center justify-center rounded-lg bg-slate-900 px-3 text-[11px] font-semibold uppercase tracking-wider text-white hover:bg-slate-800"
    : "inline-flex items-center justify-center rounded-xl bg-slate-900 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-white hover:bg-slate-800";

  if (isLinkAction) {
    return (
      <Link to={href} className={className} title={action.reason || action.label}>
        {action.label}
      </Link>
    );
  }

  const enabled = action.enabled !== false && !isBusy;
  if (enabled) {
    return (
      <button
        type="button"
        onClick={() => onAction?.(order, action)}
        title={action.reason || action.label}
        className={className}
      >
        {isBusy ? "Working..." : action.label}
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled
      title={action.reason || action.label}
      className={[
        compact
          ? "inline-flex h-8 items-center justify-center rounded-lg px-3 text-[11px]"
          : "inline-flex items-center justify-center rounded-xl px-3 py-2 text-[11px]",
        "cursor-not-allowed bg-slate-100 font-semibold uppercase tracking-wider text-slate-400 ring-1 ring-inset ring-slate-200",
      ].join(" ")}
    >
      {action.label}
    </button>
  );
}

function BillingActionControl({
  action,
  order,
  compact = false,
  isBusy = false,
  onAction,
}) {
  if (!action?.visible) return null;
  const enabled = action.enabled !== false && !isBusy;

  if (enabled) {
    return (
      <button
        type="button"
        onClick={() => onAction?.(order, action)}
        title={action.reason || action.label}
        className={[
          compact
            ? "inline-flex h-8 items-center justify-center rounded-lg px-3 text-[11px]"
            : "inline-flex items-center justify-center rounded-xl px-3 py-2 text-[11px]",
          "bg-white font-semibold uppercase tracking-wider text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50",
        ].join(" ")}
      >
        {isBusy ? "Working..." : action.label}
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled
      title={action.reason || action.label}
      className={[
        compact
          ? "inline-flex h-8 items-center justify-center rounded-lg px-3 text-[11px]"
          : "inline-flex items-center justify-center rounded-xl px-3 py-2 text-[11px]",
        "cursor-not-allowed bg-white font-semibold uppercase tracking-wider text-slate-400 ring-1 ring-inset ring-slate-200",
      ].join(" ")}
    >
      {action.label}
    </button>
  );
}

function ActionNeededStrip({
  activeWork = "all",
  counts = {},
  isLoading = false,
  isFetching = false,
  onSelect,
}) {
  return (
    <section className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-slate-900">
            Action needed
          </div>
          <div className="text-xs text-slate-500">
            Daily order queues that need attention.
          </div>
        </div>
        {isFetching && !isLoading ? (
          <div className="text-xs font-medium text-slate-400">Updating</div>
        ) : null}
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {ORDER_WORK_QUEUE_ITEMS.map((item) => {
          const active = activeWork === item.key;
          const rawCount = counts?.[item.key];
          const count =
            typeof rawCount === "number" && Number.isFinite(rawCount)
              ? rawCount
              : 0;
          const faded = !active && count === 0;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelect?.(active ? "all" : item.key)}
              title={item.title}
              className={[
                "inline-flex min-w-[8.5rem] shrink-0 items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-xs ring-1 ring-inset transition",
                active
                  ? "bg-slate-900 text-white ring-slate-900"
                  : "bg-slate-50 text-slate-700 ring-slate-200 hover:bg-white hover:text-slate-900",
                faded ? "opacity-55" : "",
              ].join(" ")}
            >
              <span className="font-semibold">{item.label}</span>
              <span
                className={[
                  "rounded-full px-2 py-0.5 text-xs font-bold",
                  active ? "bg-white/15 text-white" : "bg-white text-slate-900",
                ].join(" ")}
              >
                {isLoading ? "-" : count}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

const ORDER_STATUS_FILTER_VALUES = new Set([
  "all",
  "Processing",
  "Shipping",
  "Delivered",
  "Cancelled",
]);
const ORDER_PAYMENT_FILTER_VALUES = new Set([
  "all",
  "noInvoice",
  "notFullyPaid",
  "Unpaid",
  "PartiallyPaid",
  "Paid",
]);
const ORDER_WORK_QUEUE_ITEMS = [
  {
    key: "noInvoice",
    label: "No Invoice",
    title: "Active orders without an invoice.",
  },
  {
    key: "paymentDue",
    label: "Not Paid",
    title: "Active orders with unpaid or partially paid invoices.",
  },
  {
    key: "needsReservation",
    label: "Reserve Stock",
    title: "Shipping orders that are not fully reserved.",
  },
  {
    key: "readyToDeliver",
    label: "Deliver",
    title: "Shipping orders that are fully reserved and ready to deliver.",
  },
  {
    key: "needsStockDeduction",
    label: "Deduct Stock",
    title: "Delivered orders that still need stock deducted.",
  },
];
const ORDER_WORK_FILTER_VALUES = new Set([
  "all",
  ...ORDER_WORK_QUEUE_ITEMS.map((item) => item.key),
]);
const ORDER_LIMIT_VALUES = new Set([10, 20, 50, 100]);
const DEFAULT_ORDER_LIMIT = 10;

function getOrderWorkLabel(work) {
  return ORDER_WORK_QUEUE_ITEMS.find((item) => item.key === work)?.label || "";
}

function getDefaultCourierInstructionNotes() {
  if (Array.isArray(courierPickupConfig.courierNotes)) {
    return courierPickupConfig.courierNotes.map((note) => String(note || ""));
  }
  if (courierPickupConfig.courierNote) {
    return [String(courierPickupConfig.courierNote || "")];
  }
  return [];
}

function parsePositiveInt(raw, fallback = 1) {
  const n = Number.parseInt(String(raw ?? ""), 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return n;
}

function parseOrderLimit(raw) {
  const value = parsePositiveInt(raw, DEFAULT_ORDER_LIMIT);
  return ORDER_LIMIT_VALUES.has(value) ? value : DEFAULT_ORDER_LIMIT;
}

function readOrderListState(searchParams) {
  const page = parsePositiveInt(searchParams.get("page"), 1);
  const search = searchParams.get("search") || "";
  const workRaw = searchParams.get("work") || "all";
  const work = ORDER_WORK_FILTER_VALUES.has(workRaw) ? workRaw : "all";
  const statusRaw = searchParams.get("status") || "all";
  const status =
    work === "all" && ORDER_STATUS_FILTER_VALUES.has(statusRaw)
      ? statusRaw
      : "all";
  const paymentStatusRaw = searchParams.get("paymentStatus") || "all";
  const paymentStatus =
    work === "all" && ORDER_PAYMENT_FILTER_VALUES.has(paymentStatusRaw)
      ? paymentStatusRaw
      : "all";
  const limit = parseOrderLimit(searchParams.get("limit"));
  return { page, search, status, paymentStatus, work, limit };
}

function buildOrderListSearchParams(nextState = {}) {
  const params = new URLSearchParams();
  const page = parsePositiveInt(nextState.page, 1);
  const search = String(nextState.search || "");
  const status = String(nextState.status || "all");
  const paymentStatus = String(nextState.paymentStatus || "all");
  const work = String(nextState.work || "all");
  const limit = parseOrderLimit(nextState.limit);

  if (page > 1) params.set("page", String(page));
  if (search) params.set("search", search);
  if (status !== "all") params.set("status", status);
  if (paymentStatus !== "all") params.set("paymentStatus", paymentStatus);
  if (work !== "all") params.set("work", work);
  if (limit !== DEFAULT_ORDER_LIMIT) params.set("limit", String(limit));

  return params;
}

export default function AdminOrdersPage() {
  // Note: Server-side filters (must match backend query params)
  const [searchParams, setSearchParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [copyId, setCopyId] = useState(null);
  const [pdfId, setPdfId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [courierTarget, setCourierTarget] = useState(null);
  const [courierBaseForm, setCourierBaseForm] = useState(() =>
    getCourierDeliveryProfile()
  );
  const [courierForm, setCourierForm] = useState(() =>
    getCourierDeliveryProfile()
  );
  const [courierInstructionNotes, setCourierInstructionNotes] = useState(() =>
    getDefaultCourierInstructionNotes()
  );
  const [busyOrderId, setBusyOrderId] = useState("");
  const [deliverTarget, setDeliverTarget] = useState(null);
  const [deliveredBy, setDeliveredBy] = useState("");
  const [deliverFormError, setDeliverFormError] = useState("");
  const [createTarget, setCreateTarget] = useState(null);
  const [createForm, setCreateForm] = useState({
    dueDate: getDefaultDueDate(),
    adminNote: "",
    currency: "AED",
    minorUnitFactor: "100",
  });
  const [createFormError, setCreateFormError] = useState("");
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [paymentForm, setPaymentForm] = useState(() => buildPaymentDefaults(null));
  const [paymentFieldErrors, setPaymentFieldErrors] = useState({});

  const listState = readOrderListState(searchParams);
  const { page, search, status, paymentStatus, work, limit } = listState;
  const listQueryString = buildOrderListSearchParams(listState).toString();
  const isDesktopOrdersLayout = useMediaQuery("(min-width: 768px)");
  const updateListState = (updates = {}, { resetPage = false, replace = true } = {}) => {
    const next = {
      ...listState,
      ...updates,
    };
    if (resetPage) next.page = 1;
    setSearchParams(buildOrderListSearchParams(next), { replace });
  };
  const updateWorkQueue = (nextWork) => {
    updateListState(
      {
        work: nextWork,
        status: "all",
        paymentStatus: "all",
      },
      { resetPage: true, replace: true }
    );
  };

  const [deleteOrderByAdmin, { isLoading: isDeleting }] =
    useDeleteOrderByAdminMutation();
  const [updateOrderStatus, { isLoading: isUpdatingStatus }] =
    useUpdateOrderByAdminMutation();
  const [
    markOrderDelivered,
    { isLoading: isDelivering, error: deliverError },
  ] = useMarkOrderDeliveredMutation();
  const [createInvoiceFromOrder, { isLoading: isCreating, error: createError }] =
    useCreateInvoiceFromOrderMutation();
  const [getInvoiceById] = useLazyGetInvoiceByIdQuery();
  const [getInvoicePdf, { isFetching: isPdfLoading }] =
    useLazyGetInvoicePdfQuery();
  const [finalizeAllocations, { isLoading: isFinalizing }] =
    useFinalizeOrderAllocationsMutation();
  const [addPaymentToInvoice, { isLoading: isAddingPayment, error: addPaymentError }] =
    useAddPaymentToInvoiceMutation();
  const [
    updateUserDelivery,
    {
      isLoading: isSavingCourier,
      error: courierSaveError,
      reset: resetCourierSaveError,
    },
  ] = useUpdateUserMutation();

  const trimmedSearch = search.trim();
  const debouncedSearch = useDebouncedValue(trimmedSearch, 1000);
  const searchParam = debouncedSearch;
  const isDebouncing = trimmedSearch !== debouncedSearch;

  const {
    data: ordersRes,
    isLoading,
    isFetching,
    isError,
    error,
  } = useGetOrdersAdminQuery({
    page,
    limit,
    status,
    paymentStatus,
    work,
    search: searchParam,
  });
  const {
    data: workSummaryRes,
    isLoading: isWorkSummaryLoading,
    isFetching: isWorkSummaryFetching,
  } = useGetOrdersWorkSummaryQuery();
  const rows = useMemo(() => ordersRes?.data || [], [ordersRes]);
  const workSummary = workSummaryRes?.data || {};
  const pagination = ordersRes?.pagination;
  const totalItems =
    typeof pagination?.total === "number" ? pagination.total : rows.length;
  const activeWorkLabel = getOrderWorkLabel(work);
  const courierMissingFields = useMemo(
    () => getCourierMissingFields(courierForm),
    [courierForm]
  );
  const courierHasChanges = useMemo(
    () => hasCourierProfileChanges(courierBaseForm, courierForm),
    [courierBaseForm, courierForm]
  );
  const courierPreviewOrder = useMemo(() => {
    if (!courierTarget) return null;
    const user =
      courierTarget.user && typeof courierTarget.user === "object"
        ? courierTarget.user
        : {};
    return {
      ...courierTarget,
      user: {
        ...user,
        ...courierForm,
      },
    };
  }, [courierTarget, courierForm]);
  const courierPreviewText = useMemo(
    () =>
      courierPreviewOrder
        ? buildCourierShareText(courierPreviewOrder, {
            deliveryProfile: courierForm,
            pickupConfig: {
              ...courierPickupConfig,
              courierNotes: courierInstructionNotes,
            },
          })
        : "",
    [courierPreviewOrder, courierForm, courierInstructionNotes]
  );

  async function onCopy(order) {
    if (!order || copyId) return;
    try {
      setCopyId(order._id);
      const invoice =
        order?.invoice && typeof order.invoice === "object" ? order.invoice : null;
      const invoiceId =
        invoice?._id || (typeof order?.invoice === "string" ? order.invoice : "");
      let invoiceDetails = null;
      let missedInvoiceDetails = false;

      if (invoiceId) {
        try {
          invoiceDetails = await getInvoiceById(invoiceId).unwrap();
        } catch {
          missedInvoiceDetails = true;
        }
      }

      const text = buildAdminOrderShareText(order, { invoiceDetails });
      await copyTextToClipboard(text);
      if (missedInvoiceDetails) {
        toast.warning("Order copied without payment receiver details.");
      } else {
        toast.success("Order copied to clipboard.");
      }
    } catch {
      toast.error("Failed to copy order.");
    } finally {
      setCopyId(null);
    }
  }

  function openCourierModal(order) {
    if (!order?._id || isSavingCourier) return;
    const form = getCourierDeliveryProfile(order.user || {});
    resetCourierSaveError();
    setCourierTarget(order);
    setCourierBaseForm(form);
    setCourierForm(form);
    setCourierInstructionNotes(getDefaultCourierInstructionNotes());
  }

  function closeCourierModal() {
    if (isSavingCourier) return;
    resetCourierSaveError();
    setCourierTarget(null);
    setCourierBaseForm(getCourierDeliveryProfile());
    setCourierForm(getCourierDeliveryProfile());
    setCourierInstructionNotes(getDefaultCourierInstructionNotes());
  }

  function updateCourierField(field, value) {
    setCourierForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function updateCourierInstructionNote(index, value) {
    setCourierInstructionNotes((prev) =>
      prev.map((note, noteIndex) => (noteIndex === index ? value : note))
    );
  }

  function resetCourierInstructionNotes() {
    setCourierInstructionNotes(getDefaultCourierInstructionNotes());
  }

  async function submitCourierDetails() {
    if (!courierTarget || isSavingCourier) return;
    if (courierMissingFields.length) {
      toast.warning("Add the required delivery fields first.");
      return;
    }

    try {
      let finalOrder = courierPreviewOrder;

      if (courierHasChanges) {
        const user = courierTarget.user;
        const userId =
          user && typeof user === "object" ? user._id : String(user || "");

        if (!userId) {
          toast.error("Client details are missing for this order.");
          return;
        }

        const normalizedForm = getCourierDeliveryProfile(courierForm);
        const res = await updateUserDelivery({
          id: userId,
          ...normalizedForm,
        }).unwrap();
        const updatedUser = res?.data || {};
        finalOrder = {
          ...courierTarget,
          user: {
            ...(user && typeof user === "object" ? user : {}),
            ...normalizedForm,
            ...updatedUser,
          },
        };
      }

      const text = buildCourierShareText(finalOrder, {
        deliveryProfile: finalOrder?.user || courierForm,
        pickupConfig: {
          ...courierPickupConfig,
          courierNotes: courierInstructionNotes,
        },
      });
      await copyTextToClipboard(text);
      toast.success(
        courierHasChanges
          ? "Courier details saved and copied."
          : "Courier details copied."
      );
      closeCourierModal();
    } catch (err) {
      toast.error(friendlyApiError(err, "Failed to copy courier details."));
    }
  }

  async function onInvoicePdf(order) {
    const invoice =
      order?.invoice && typeof order.invoice === "object" ? order.invoice : null;
    const invoiceId =
      invoice?._id || (typeof order?.invoice === "string" ? order.invoice : "");

    if (!invoiceId || pdfId || isPdfLoading) return;

    try {
      setPdfId(invoiceId);
      const blob = await getInvoicePdf(invoiceId).unwrap();
      const fileName = invoice?.invoiceNumber
        ? `invoice-${invoice.invoiceNumber}.pdf`
        : `invoice-${invoiceId}.pdf`;
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
    } catch (err) {
      toast.error(friendlyApiError(err, "Failed to open invoice PDF."));
    } finally {
      setPdfId(null);
    }
  }

  async function onDelete(order) {
    if (!order || deleteId || isDeleting) return;
    const confirmed = window.confirm(
      "Delete this cancelled order? This will delete its quote, invoice, payments, and allocations."
    );
    if (!confirmed) return;
    try {
      setDeleteId(order._id);
      await deleteOrderByAdmin(order._id).unwrap();
      toast.success("Order deleted.");
    } catch (e) {
      const msg = e?.data?.message || e?.error || "Delete failed.";
      const friendly =
        /allocation/i.test(msg) || /reserve/i.test(msg)
          ? "Cannot delete: remove reservations/allocations first."
          : msg;
      toast.error(friendly);
    } finally {
      setDeleteId(null);
    }
  }

  async function onMarkShipping(order) {
    if (!order?._id || busyOrderId || isUpdatingStatus) return;
    setBusyOrderId(order._id);
    try {
      await updateOrderStatus({
        id: order._id,
        status: "Shipping",
      }).unwrap();
      toast.success("Order moved to Shipping.");
    } catch (err) {
      toast.error(friendlyApiError(err, "Failed to update shipping status."));
    } finally {
      setBusyOrderId("");
    }
  }

  function openDeliverModal(order) {
    if (!order?._id || isDelivering) return;
    setDeliverTarget(order);
    setDeliveredBy(order.deliveredBy || "");
    setDeliverFormError("");
  }

  function closeDeliverModal() {
    if (isDelivering) return;
    setDeliverTarget(null);
    setDeliveredBy("");
    setDeliverFormError("");
  }

  async function submitDeliver() {
    if (!deliverTarget?._id || isDelivering) return;
    const name = deliveredBy.trim();
    if (!name) {
      setDeliverFormError("Delivered by is required.");
      return;
    }

    setDeliverFormError("");
    try {
      await markOrderDelivered({
        id: deliverTarget._id,
        deliveredBy: name,
      }).unwrap();
      toast.success("Order marked delivered.");
      closeDeliverModal();
    } catch {
      // ErrorMessage in the modal displays the API error.
    }
  }

  function openCreateModal(order) {
    if (!order?._id || isCreating) return;
    setCreateTarget(order);
    setCreateForm({
      dueDate: getDefaultDueDate(),
      adminNote: "",
      currency: "AED",
      minorUnitFactor: "100",
    });
    setCreateFormError("");
  }

  function closeCreateModal() {
    if (isCreating) return;
    setCreateTarget(null);
    setCreateFormError("");
  }

  function handleCreateField(key, value) {
    setCreateForm((prev) => ({ ...prev, [key]: value }));
    if (createFormError) setCreateFormError("");
  }

  async function submitCreateInvoice() {
    if (!createTarget?._id || isCreating) return;

    const dueDate = String(createForm.dueDate || "").trim();
    if (!dueDate) {
      setCreateFormError("Due date is required.");
      return;
    }

    const minorRaw = String(createForm.minorUnitFactor || "").trim();
    if (minorRaw) {
      const minorValue = Number(minorRaw);
      if (!Number.isInteger(minorValue) || minorValue <= 0) {
        setCreateFormError("Minor unit factor must be a positive integer.");
        return;
      }
    }

    const payload = {
      orderId: createTarget._id,
      dueDate,
    };

    const adminNote = String(createForm.adminNote || "").trim();
    if (adminNote) payload.adminNote = adminNote;

    const currency = String(createForm.currency || "").trim();
    if (currency) payload.currency = currency;

    if (minorRaw) payload.minorUnitFactor = Number(minorRaw);

    try {
      await createInvoiceFromOrder(payload).unwrap();
      toast.success("Invoice created.");
      closeCreateModal();
    } catch {
      // ErrorMessage in the modal displays the API error.
    }
  }

  async function onFinalizeStock(order) {
    if (!order?._id || busyOrderId || isFinalizing) return;
    const confirmed = window.confirm(
      "Finalize stock for this order? This will deduct reserved qty and lock allocations."
    );
    if (!confirmed) return;

    setBusyOrderId(order._id);
    try {
      const res = await finalizeAllocations(order._id).unwrap();
      toast.success(res?.message || "Stock finalized.");
    } catch (err) {
      toast.error(friendlyApiError(err, "Failed to finalize stock."));
    } finally {
      setBusyOrderId("");
    }
  }

  function openAddPayment(order) {
    const invoice =
      order?.invoice && typeof order.invoice === "object" ? order.invoice : null;
    if (!order?._id || !invoice?._id) {
      toast.error("Invoice details are missing for this order.");
      return;
    }
    if (invoice.status === "Cancelled") {
      toast.error("Cancelled invoices cannot receive payments.");
      return;
    }
    if (invoice.paymentStatus === "Paid") {
      toast.info("Invoice is already paid.");
      return;
    }

    setPaymentTarget({ order, invoice });
    setPaymentForm(buildPaymentDefaults(invoice));
    setPaymentFieldErrors({});
  }

  function closeAddPayment() {
    if (isAddingPayment) return;
    setPaymentTarget(null);
    setPaymentFieldErrors({});
  }

  function updatePaymentForm(field, value) {
    setPaymentForm((prev) => ({ ...prev, [field]: value }));
    setPaymentFieldErrors((prev) => {
      if (!prev?.[field]) return prev;
      const { [field]: _removed, ...rest } = prev;
      return rest;
    });
  }

  async function submitAddPayment() {
    const invoiceId = paymentTarget?.invoice?._id;
    const orderId = paymentTarget?.order?._id;
    if (!invoiceId || !orderId || isAddingPayment) return;

    const nextErrors = {};
    const amountValue = Number(paymentForm.amount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      nextErrors.amount = "Enter a positive amount.";
    }

    if (!paymentForm.method) {
      nextErrors.method = "Required";
    }

    if (!paymentForm.receivedBy.trim()) {
      nextErrors.receivedBy = "Required";
    }

    let paymentDateValue;
    if (paymentForm.date) {
      const parsed = new Date(paymentForm.date);
      if (Number.isNaN(parsed.getTime())) {
        nextErrors.date = "Invalid date.";
      } else {
        paymentDateValue = parsed.toISOString();
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setPaymentFieldErrors(nextErrors);
      return;
    }

    setPaymentFieldErrors({});
    try {
      await addPaymentToInvoice({
        invoiceId,
        orderId,
        amount: amountValue,
        paymentMethod: paymentForm.method,
        receivedBy: paymentForm.receivedBy.trim(),
        paymentDate: paymentDateValue,
        reference: paymentForm.reference.trim() || undefined,
        note: paymentForm.note.trim() || undefined,
      }).unwrap();

      toast.success("Payment recorded.");
      closeAddPayment();
    } catch {
      // ErrorMessage in the modal displays the API error.
    }
  }

  function onPrimaryAction(order, action) {
    if (!order?._id || !action?.id) return;
    switch (action.id) {
      case ADMIN_ORDER_ACTION_IDS.MARK_SHIPPING:
        onMarkShipping(order);
        break;
      case ADMIN_ORDER_ACTION_IDS.MARK_DELIVERED:
        openDeliverModal(order);
        break;
      case ADMIN_ORDER_ACTION_IDS.FINALIZE_STOCK:
        onFinalizeStock(order);
        break;
      default:
        break;
    }
  }

  function onBillingAction(order, action) {
    if (!order?._id || !action?.id) return;
    switch (action.id) {
      case ADMIN_ORDER_ACTION_IDS.CREATE_INVOICE:
        openCreateModal(order);
        break;
      case ADMIN_ORDER_ACTION_IDS.ADD_PAYMENT:
        openAddPayment(order);
        break;
      default:
        break;
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-lg font-semibold text-slate-900">Orders</div>
          <div className="text-sm text-slate-500">
            Track orders created from quotes and manage fulfillment.
          </div>
        </div>
      </div>

      <ActionNeededStrip
        activeWork={work}
        counts={workSummary}
        isLoading={isWorkSummaryLoading}
        isFetching={isWorkSummaryFetching}
        onSelect={updateWorkQueue}
      />

      <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(220px,1fr)_160px_180px_130px_auto] md:items-end">
          <div className="flex items-end gap-2 md:contents">
            <div className="flex-1">
              <label
                htmlFor="orders-search"
                className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
              >
                Search
              </label>
              <input
                id="orders-search"
                value={search}
                onChange={(e) => {
                  updateListState(
                    { search: e.target.value },
                    { resetPage: true, replace: true }
                  );
                }}
                placeholder="Search by user name, email, or order #"
                className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              />
            </div>
            <button
              type="button"
              onClick={() => setFiltersOpen((prev) => !prev)}
              className="inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 md:hidden"
              aria-expanded={filtersOpen}
              aria-controls="orders-filters-panel"
            >
              <span>{filtersOpen ? "Hide filters" : "Filters"}</span>
              {filtersOpen ? (
                <FiChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <FiChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>
          </div>

          <div
            id="orders-filters-panel"
            className={[
              filtersOpen ? "grid grid-cols-2 gap-2" : "hidden",
              "md:contents",
            ].join(" ")}
          >
            <div>
              <label
                htmlFor="orders-status"
                className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
              >
                Status
              </label>
              <select
                id="orders-status"
                value={status}
                onChange={(e) => {
                  updateListState(
                    { status: e.target.value, work: "all" },
                    { resetPage: true, replace: true }
                  );
                }}
                className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              >
                <option value="all">All statuses</option>
                <option value="Processing">Processing</option>
                <option value="Shipping">Shipping</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="orders-payment-status"
                className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
              >
                Payment
              </label>
              <select
                id="orders-payment-status"
                value={paymentStatus}
                onChange={(e) => {
                  updateListState(
                    { paymentStatus: e.target.value, work: "all" },
                    { resetPage: true, replace: true }
                  );
                }}
                className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              >
                <option value="all">All payments</option>
                <option value="noInvoice">No invoice</option>
                <option value="notFullyPaid">Not fully paid</option>
                <option value="Unpaid">Unpaid</option>
                <option value="PartiallyPaid">Partially paid</option>
                <option value="Paid">Paid</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="orders-limit"
                className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
              >
                Per page
              </label>
              <select
                id="orders-limit"
                value={limit}
                onChange={(e) => {
                  updateListState(
                    { limit: Number(e.target.value) || DEFAULT_ORDER_LIMIT },
                    { resetPage: true, replace: true }
                  );
                }}
                className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              >
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
              </select>
            </div>

            <div className="col-span-2 flex items-end md:col-auto md:justify-end">
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                onClick={() => {
                  setSearchParams(new URLSearchParams(), { replace: true });
                }}
              >
                <FiRefreshCw
                  className="h-3.5 w-3.5 mr-1 text-slate-400"
                  aria-hidden="true"
                />
                Reset filters
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <div>
            Showing{" "}
            <span className="font-semibold text-slate-900">{rows.length}</span> of{" "}
            <span className="font-semibold text-slate-900">{totalItems}</span>{" "}
            items
            {activeWorkLabel ? (
              <>
                {" "}
                in{" "}
                <span className="font-semibold text-slate-900">
                  {activeWorkLabel}
                </span>
              </>
            ) : null}
            {isDebouncing ? <span className="ml-2">(Searching...)</span> : null}
            {isFetching ? <span className="ml-2">(Updating)</span> : null}
          </div>

          <Pagination
            pagination={pagination}
            onPageChange={(nextPage) =>
              updateListState({ page: nextPage }, { replace: false })
            }
            variant="compact"
          />
        </div>
      </div>

      {/* States */}
      {isLoading ? (
        <Loader />
      ) : isError ? (
        <ErrorMessage error={error} />
      ) : rows.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-slate-200">
          <div className="text-sm font-semibold text-slate-900">No orders found</div>
          <div className="mt-1 text-sm text-slate-500">
            Try changing the filters or clearing the action queue.
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {!isDesktopOrdersLayout ? (
            <div className="grid grid-cols-1 gap-3">
	  {rows.map((o) => {
	    const row = getOrderRowMeta(o);
	    const rowCopy = copyId === o._id;
	    const rowCourier = courierTarget?._id === o._id;
	    const rowDelete = deleteId === o._id;
    const state = row.actionState;
    const fulfillment = state.fulfillment;
    const billing = state.billing;
    const canDelete = o.status === "Cancelled" && !row.isFinalized;
    const deleteHint =
      o.status !== "Cancelled"
        ? "Cancel order before deleting."
        : row.isFinalized
        ? "Stock finalized orders cannot be deleted."
        : "Delete order";
    return (
      <div
        key={o._id}
        className="relative rounded-2xl bg-white p-4 ring-1 ring-slate-200"
      >
        <span
          aria-hidden="true"
          className={`absolute left-0 top-4 bottom-4 w-1 rounded-r-full ${getStatusAccentClass(
            o.status
          )}`}
        />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-900">
              {row.orderNumber}
            </div>
            <div className="text-xs text-slate-500">
              {formatDateTime(o.createdAt)}
            </div>
          </div>
          <StatusBadge status={o.status} />
        </div>

        <div className="mt-3 border-y border-slate-100 py-3 text-center">
          <div className="truncate text-sm font-semibold text-slate-900">
            {o.user?.name || "-"}
          </div>
          <div className="truncate text-xs text-slate-500">
            {o.user?.email || ""}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 text-xs">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Fulfillment
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <StatusBadge status={fulfillment.status} size="compact" />
              <AllocationBadge status={fulfillment.allocationStatus} size="compact" />
              <StockBadge finalized={fulfillment.stockFinalized} size="compact" />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Billing
              </div>
              <InvoicePdfButton
                billing={billing}
                isBusy={isPdfLoading}
                isActive={pdfId === billing.invoiceId}
                onClick={() => onInvoicePdf(o)}
              />
            </div>
            <div className="mt-1 min-w-0">
              <span className="block truncate text-xs font-semibold text-slate-900">
                {billing.invoiceLabel}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <PaymentBadge
                status={billing.paymentStatus}
                hasInvoice={billing.hasInvoice}
                size="compact"
              />
              <span className="text-xs text-slate-500">
                {formatBillingBalance(billing)}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-end justify-between gap-3 text-xs">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Total
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-900">
              {formatMoney(row.total)}
            </div>
            <div className="text-xs text-slate-600">
              {row.itemCountLabel}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          <PrimaryActionControl
            action={state.primaryAction}
            order={o}
            orderId={o._id}
            listQueryString={listQueryString}
            isBusy={busyOrderId === o._id}
            onAction={onPrimaryAction}
          />
          <BillingActionControl
            action={state.billingAction}
            order={o}
            isBusy={
              (isAddingPayment && paymentTarget?.order?._id === o._id) ||
              (isCreating && createTarget?._id === o._id)
            }
            onAction={onBillingAction}
          />
	          <button
	            type="button"
	            className={[
	              "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-semibold uppercase tracking-wider ring-1 ring-inset transition",
	              rowCourier && isSavingCourier
	                ? "cursor-not-allowed bg-white text-slate-300 ring-slate-200"
	                : "bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100",
	            ].join(" ")}
	            disabled={rowCourier && isSavingCourier}
	            onClick={() => openCourierModal(o)}
	            title="Courier details"
	          >
	            <FiTruck className="h-3.5 w-3.5" />
	            Courier
	          </button>
	          <button
	            type="button"
	            className={[
	              "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-semibold uppercase tracking-wider ring-1 ring-inset transition",
              rowCopy
                ? "cursor-not-allowed bg-white text-slate-300 ring-slate-200"
                : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50",
            ].join(" ")}
            disabled={rowCopy}
            onClick={() => onCopy(o)}
            title="Copy order"
          >
            <FiSend className="h-3.5 w-3.5" />
            Copy
          </button>
          <Link
            to={buildOrderDetailsHref(o._id, listQueryString)}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
            aria-label="Open order"
            title="Open order"
          >
            <FiSettings className="h-3.5 w-3.5" />
            Open
          </Link>
          <button
            type="button"
            className={[
              "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-semibold uppercase tracking-wider ring-1 ring-inset transition",
              !canDelete || rowDelete || isDeleting
                ? "cursor-not-allowed bg-white text-slate-300 ring-slate-200"
                : "bg-white text-rose-600 ring-rose-200 hover:bg-rose-50",
            ].join(" ")}
            disabled={!canDelete || rowDelete || isDeleting}
            onClick={() => onDelete(o)}
            title={deleteHint}
          >
            <FiTrash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      </div>
    );
  })}
</div>
          ) : (
            <div className="overflow-hidden rounded-2xl ring-1 ring-slate-200">
            <div className="overflow-x-auto bg-white">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Order</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Fulfillment</th>
                    <th className="px-4 py-3">Billing</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
	                  {rows.map((o) => {
	                    const row = getOrderRowMeta(o);
	                    const rowCopy = copyId === o._id;
	                    const rowCourier = courierTarget?._id === o._id;
	                    const rowDelete = deleteId === o._id;
                    const state = row.actionState;
                    const fulfillment = state.fulfillment;
                    const billing = state.billing;
                    const canDelete =
                      o.status === "Cancelled" && !row.isFinalized;
                    const deleteHint =
                      o.status !== "Cancelled"
                        ? "Cancel order before deleting."
                        : row.isFinalized
                        ? "Stock finalized orders cannot be deleted."
                        : "Delete order";
                    return (
                      <tr key={o._id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">
                            {row.orderNumber}
                          </div>
                          <div className="mt-0.5 text-xs text-slate-500">
                            Created: {formatDateTime(o.createdAt)}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-slate-700">
                          <div className="font-medium text-slate-900">
                            {o.user?.name || "-"}
                          </div>
                          <div className="text-xs text-slate-500">
                            {o.user?.email || ""}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <StatusBadge status={fulfillment.status} size="compact" />
                            <AllocationBadge
                              status={fulfillment.allocationStatus}
                              size="compact"
                            />
                            <StockBadge
                              finalized={fulfillment.stockFinalized}
                              size="compact"
                            />
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {fulfillment.stockLabel}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="min-w-0">
                            <span className="block truncate text-xs font-semibold text-slate-900">
                              {billing.invoiceLabel}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <PaymentBadge
                              status={billing.paymentStatus}
                              hasInvoice={billing.hasInvoice}
                              size="compact"
                            />
                            <span className="text-xs text-slate-500">
                              {formatBillingBalance(billing)}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {formatMoney(row.total)}
                          <div className="mt-0.5 text-xs font-normal text-slate-500">
                            {row.itemCountLabel}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center justify-center gap-2">
                            <PrimaryActionControl
                              action={state.primaryAction}
                              order={o}
                              orderId={o._id}
                              listQueryString={listQueryString}
                              isBusy={busyOrderId === o._id}
                              onAction={onPrimaryAction}
                              compact
                            />
                            <BillingActionControl
                              action={state.billingAction}
                              order={o}
                              isBusy={
                                (isAddingPayment && paymentTarget?.order?._id === o._id) ||
                                (isCreating && createTarget?._id === o._id)
                              }
                              onAction={onBillingAction}
                              compact
                            />
	                            <InvoicePdfButton
	                              billing={billing}
	                              isBusy={isPdfLoading}
	                              isActive={pdfId === billing.invoiceId}
	                              onClick={() => onInvoicePdf(o)}
	                              iconOnly
	                            />
	                            <button
	                              type="button"
	                              className={[
	                                "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
	                                rowCourier && isSavingCourier
	                                  ? "cursor-not-allowed border-slate-200 bg-white text-slate-300 hover:bg-white"
	                                  : "",
	                              ].join(" ")}
	                              disabled={rowCourier && isSavingCourier}
	                              onClick={() => openCourierModal(o)}
	                              aria-label="Courier details"
	                              title="Courier details"
	                            >
	                              <FiTruck className="h-4 w-4" />
	                            </button>
	                            <button
	                              type="button"
	                              className={[
                                "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                                rowCopy ? "cursor-not-allowed text-slate-300" : "",
                              ].join(" ")}
                              disabled={rowCopy}
                              onClick={() => onCopy(o)}
                              aria-label="Copy order"
                              title="Copy order"
                            >
                              <FiSend className="h-4 w-4" />
                            </button>
                            <Link
                              to={buildOrderDetailsHref(o._id, listQueryString)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                              aria-label="Open order"
                              title="Open order"
                            >
                              <FiSettings className="h-4 w-4" />
                            </Link>
                            <button
                              type="button"
                              className={[
                                "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-rose-600 hover:bg-rose-50",
                                !canDelete || rowDelete || isDeleting
                                  ? "cursor-not-allowed text-slate-300 hover:bg-white"
                                  : "",
                              ].join(" ")}
                              disabled={!canDelete || rowDelete || isDeleting}
                              onClick={() => onDelete(o)}
                              aria-label="Delete order"
                              title={deleteHint}
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
      )}

      <CreateInvoiceModal
        open={Boolean(createTarget)}
        order={createTarget}
        form={createForm}
        onFieldChange={handleCreateField}
        onClose={closeCreateModal}
        onSubmit={submitCreateInvoice}
        isSaving={isCreating}
        error={createError}
        formError={createFormError}
      />

      <MarkDeliveredModal
        open={Boolean(deliverTarget)}
        order={deliverTarget}
        deliveredBy={deliveredBy}
        onDeliveredByChange={setDeliveredBy}
        onClose={closeDeliverModal}
        onSubmit={submitDeliver}
        isSaving={isDelivering}
        error={deliverError}
        formError={deliverFormError}
      />

      <AddPaymentModal
        open={Boolean(paymentTarget)}
        onClose={closeAddPayment}
        onSubmit={submitAddPayment}
        isSaving={isAddingPayment}
        error={addPaymentError}
        form={paymentForm}
        onFieldChange={updatePaymentForm}
        fieldErrors={paymentFieldErrors}
      />

      <CourierDetailsModal
        open={Boolean(courierTarget)}
        order={courierTarget}
        form={courierForm}
        missingFields={courierMissingFields}
        hasChanges={courierHasChanges}
        courierNotes={courierInstructionNotes}
        previewText={courierPreviewText}
        onFieldChange={updateCourierField}
        onCourierNoteChange={updateCourierInstructionNote}
        onCourierNotesReset={resetCourierInstructionNotes}
        onClose={closeCourierModal}
        onSubmit={submitCourierDetails}
        isSaving={isSavingCourier}
        error={courierSaveError}
      />
    </div>
  );
}
