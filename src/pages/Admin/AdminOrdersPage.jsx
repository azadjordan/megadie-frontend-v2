import { needsMapReview } from "../../utils/customerLocation";
// src/pages/Admin/AdminOrdersPage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FiRefreshCw, FiSearch } from 'react-icons/fi';
import { toast } from "react-toastify";

import Loader from "../../components/common/Loader";
import ErrorMessage from "../../components/common/ErrorMessage";
import AdminPagination from "../../components/admin/AdminPagination";
import AddPaymentModal from "../../components/admin/AddPaymentModal";
import CreateInvoiceModal from "../../components/admin/CreateInvoiceModal";
import CourierDetailsModal from "../../components/admin/CourierDetailsModal";
import SendToWorkerModal from "../../components/admin/SendToWorkerModal";
import DeliveryAssignmentDialog from '../../components/packing/DeliveryAssignmentDialog';
import AdminOrderList from "../../components/admin/AdminOrderList";
import DeleteOrderPreviewModal from "../../components/admin/DeleteOrderPreviewModal";
import DeliveryMovementModal from "../../components/admin/DeliveryMovementModal";
import { courierPickupConfig } from "../../config/courierConfig";
import { copyTextToClipboard } from "../../utils/clipboard";
import {
  buildCourierShareText,
  getCourierDeliveryProfile,
  getCourierMissingFields,
  hasCourierProfileChanges,
} from "../../utils/orderCourierShare";
import { buildAdminOrderShareText } from "../../utils/orderShare";
import { buildWorkerOrderShareText, getWorkerProblems } from "../../utils/orderWorkerShare";
import {
  ADMIN_ORDER_ACTION_IDS, ORDER_DELIVERY_EVENTS,
} from "../../utils/adminOrderActions";
import { buildPaymentDefaults } from "../../utils/paymentFormDefaults";
import {
  useDeleteOrderByAdminMutation,
  useGetOrdersAdminQuery,
  useGetOrdersWorkSummaryQuery,
  useLazyGetOrderByIdQuery,
  useLazyGetOrderFulfillmentSheetQuery,
  useUpdateOrderDeliveryMutation,
  useLazyGetOrderDeletePreviewQuery,
  useUpdateOrderByAdminMutation,
} from "../../features/orders/ordersApiSlice";
import {
  useCreateInvoiceFromOrderMutation,
  useLazyGetInvoicePdfQuery,
} from "../../features/invoices/invoicesApiSlice";
import {
  useFinalizeOrderAllocationsMutation,
} from "../../features/orderAllocations/orderAllocationsApiSlice";
import { useAddPaymentToInvoiceMutation } from "../../features/payments/paymentsApiSlice";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import useMediaQuery from "../../hooks/useMediaQuery";

function getDefaultDueDate() {
  const date = new Date();
  date.setDate(date.getDate() + 2);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function friendlyApiError(err, fallback = "Something went wrong.") {
  return String(err?.data?.message || err?.error || err?.message || fallback);
}

function ActionNeededStrip({ activeWork = 'all', counts, isLoading, isFetching, onSelect }) {
  const countColor = (key) => {
    if (!isLoading && counts?.[key] > 0) {
      if (key === 'needsAdmin') return 'bg-rose-100 text-rose-800';
      if (key === 'needsStockCheck') return 'bg-amber-100 text-amber-900';
    }
    return activeWork === key ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700';
  };
  return <nav aria-label="Order shortcuts" className="space-y-2">
    <div className="flex flex-wrap gap-x-5 gap-y-1 border-b border-slate-200">
      {ORDER_WORK_QUEUE_ITEMS.map(item => <button key={item.key} type="button" aria-pressed={activeWork === item.key} onClick={() => onSelect(item.key)} title={item.title} className={'-mb-px inline-flex min-h-11 items-center gap-2 border-b-2 py-2 text-[13px] font-semibold ' + (activeWork === item.key ? 'border-blue-600 text-blue-800' : 'border-transparent text-slate-600 hover:text-slate-900')}>
        {item.label}<span className={'rounded-md px-1.5 py-0.5 text-xs tabular-nums ' + countColor(item.key)}>{isLoading || !Number.isFinite(counts?.[item.key]) ? '—' : counts[item.key]}</span>
      </button>)}
    </div>
    <p className="text-xs text-slate-500">Counts cover all orders. Shortcuts can overlap.{isFetching && !isLoading ? ' Updating counts…' : ''}</p>
  </nav>;
}

const ORDER_STATUS_FILTER_VALUES = new Set([
  "all",
  "Processing",
  "Shipping",
  "Delivered",
  "Cancelled",
]);
const ORDER_PAYMENT_FILTER_VALUES = new Set([
  "paymentDue",
  "all",
  "noInvoice",
  "notFullyPaid",
  "Unpaid",
  "PartiallyPaid",
  "Paid",
]);
const ORDER_WORK_QUEUE_ITEMS = [
  { key: 'all', label: 'All orders', title: 'All orders, including delivered and cancelled orders.' },
  { key: 'needsAdmin', label: 'Worker help', title: 'Active worker requests for admin help.' },
  { key: 'preparation', label: 'Preparation', title: 'Orders awaiting preparation, reservations or packing.' },
  { key: 'toInvoice', label: 'To invoice', title: 'Orders whose recommended next step is creating an invoice.' },
  { key: 'toDeliver', label: 'To deliver', title: 'Orders whose recommended next step is recording delivery.' },
  { key: 'toFinalize', label: 'Finalize stock', title: 'Delivered orders ready for stock finalization.' },
  { key: 'needsStockCheck', label: 'Stock checks', title: 'Orders with unchecked stock reports, including closed orders.' },
];
const LEGACY_WORK_LABELS = { noInvoice: 'Active orders without invoice', paymentDue: 'Active unpaid invoices', needsReservation: 'Reservations needed', readyToDeliver: 'Reserved shipping orders', needsStockDeduction: 'Delivered stock not finalized' };
const ORDER_WORK_FILTER_VALUES = new Set(['all', ...ORDER_WORK_QUEUE_ITEMS.map(item => item.key), ...Object.keys(LEGACY_WORK_LABELS)]);
const ORDER_LIMIT_VALUES = new Set([10, 20, 50, 100]);
const DEFAULT_ORDER_LIMIT = 10;

function getOrderWorkLabel(work) {
  return LEGACY_WORK_LABELS[work] || ORDER_WORK_QUEUE_ITEMS.find((item) => item.key === work)?.label || "";
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
    ORDER_STATUS_FILTER_VALUES.has(statusRaw)
      ? statusRaw
      : "all";
  const paymentStatusRaw = searchParams.get("paymentStatus") || "all";
  const paymentStatus =
    ORDER_PAYMENT_FILTER_VALUES.has(paymentStatusRaw)
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
  const [copyId, setCopyId] = useState(null);
  const [workerLoadingId, setWorkerLoadingId] = useState(null);
  const [packingTarget, setPackingTarget] = useState(null);
  const [pdfId, setPdfId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deletePreviewId, setDeletePreviewId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletePreview, setDeletePreview] = useState(null);
  const [deleteConfirmValue, setDeleteConfirmValue] = useState("");
  const [deletePhysicalReturn, setDeletePhysicalReturn] = useState(false);
  const [deleteFormError, setDeleteFormError] = useState("");
  const [deleteNeedsRefresh, setDeleteNeedsRefresh] = useState(false);
  const deletingOrder = useRef(false);
  const [courierTarget, setCourierTarget] = useState(null);
  const [deliveryMode, setDeliveryMode] = useState("courier");
  const [workerSheet, setWorkerSheet] = useState(null);
  const [assignedTo, setAssignedTo] = useState("");
  const [assignedToBase, setAssignedToBase] = useState("");
  const [preparationMode, setPreparationMode] = useState("");
  const [saveCustomerLocation, setSaveCustomerLocation] = useState(false);
  const [confirmedMapLocation, setConfirmedMapLocation] = useState(false);
  const [courierLoadingId, setCourierLoadingId] = useState(null);
  const [deliveryWorking, setDeliveryWorking] = useState(false);
  const deliveryLock = useRef(false);
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
  const [deliveryAssignmentTarget, setDeliveryAssignmentTarget] = useState(null);
  const [deliverAction, setDeliverAction] = useState('departed');
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
  const isDesktopOrdersLayout = useMediaQuery("(min-width: 1280px)");
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
      },
      { resetPage: true, replace: true }
    );
  };
  const changeOrderPage = (nextPage) => {
    updateListState({ page: nextPage }, { replace: false });
    const heading = document.getElementById('orders-heading');
    heading?.focus({ preventScroll: true });
    heading?.scrollIntoView({ block: 'start' });
  };

  const [deleteOrderByAdmin, { isLoading: isDeleting }] =
    useDeleteOrderByAdminMutation();
  const [getOrderDeletePreview] = useLazyGetOrderDeletePreviewQuery();
  const [getDeliveryOrder] = useLazyGetOrderByIdQuery();
  const [getWorkerSheet] = useLazyGetOrderFulfillmentSheetQuery();
  const [updateOrderStatus, { isLoading: isUpdatingStatus }] =
    useUpdateOrderByAdminMutation();

  const [createInvoiceFromOrder, { isLoading: isCreating, error: createError }] =
    useCreateInvoiceFromOrderMutation();
  const [getInvoicePdf, { isFetching: isPdfLoading }] =
    useLazyGetInvoicePdfQuery();
  const [finalizeAllocations, { isLoading: isFinalizing }] =
    useFinalizeOrderAllocationsMutation();
  const [addPaymentToInvoice, { isLoading: isAddingPayment, error: addPaymentError }] =
    useAddPaymentToInvoiceMutation();
  const [
    updateOrderDelivery,
    {
      isLoading: isSavingDelivery,
      error: courierSaveError,
      reset: resetCourierSaveError,
    },
  ] = useUpdateOrderDeliveryMutation();
  const isSavingCourier = isSavingDelivery || Boolean(courierLoadingId) || deliveryWorking;

  const trimmedSearch = search.trim();
  const debouncedSearch = useDebouncedValue(trimmedSearch, 1000);
  const searchParam = debouncedSearch;
  const isDebouncing = trimmedSearch !== debouncedSearch;

  const {
    currentData: ordersRes,
    refetch: refetchOrders,
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
  }, { pollingInterval: 15000, skipPollingIfUnfocused: true, refetchOnFocus: true });
  const {
    data: workSummaryRes,
    isLoading: isWorkSummaryLoading,
    isFetching: isWorkSummaryFetching,
    isError: summaryError,
    refetch: refetchSummary,
  } = useGetOrdersWorkSummaryQuery(undefined, { pollingInterval: 15000, skipPollingIfUnfocused: true, refetchOnFocus: true });
  const rows = useMemo(() => ordersRes?.data || [], [ordersRes]);
  const pagination = ordersRes?.pagination;
  const totalItems =
    typeof pagination?.total === "number" ? pagination.total : rows.length;
  const activeWorkLabel = getOrderWorkLabel(work);
  useEffect(() => {
    if (!ordersRes || isDebouncing || !pagination?.totalPages || page <= pagination.totalPages) return;
    setSearchParams(buildOrderListSearchParams({ page: pagination.totalPages, limit, search, work, status, paymentStatus }), { replace: true });
  }, [ordersRes, pagination, page, limit, search, work, status, paymentStatus, setSearchParams, isDebouncing]);
  const courierMissingFields = useMemo(
    () => {
      const missing = getCourierMissingFields(courierForm);
      if (deliveryMode !== "worker") return missing;
      return preparationMode === "prepare_deliver" ? missing.filter(({ key }) => key === "addressOrLocation") : [];
    },
    [courierForm, deliveryMode, preparationMode]
  );
  const courierHasChanges = useMemo(
    () => hasCourierProfileChanges(courierBaseForm, courierForm) || (saveCustomerLocation && (deliveryMode !== "worker" || preparationMode === "prepare_deliver"))
      || (deliveryMode === "worker" && (assignedTo.trim() !== assignedToBase || preparationMode !== (workerSheet?.preparationMode || "") || (preparationMode === "prepare_deliver" && saveCustomerLocation))),
    [courierBaseForm, courierForm, deliveryMode, assignedTo, assignedToBase, preparationMode, workerSheet, saveCustomerLocation]
  );
  const customerLocation = workerSheet?.customerLocation ?? courierTarget?.customerLocation;
  const locationBases = [courierBaseForm, ...(saveCustomerLocation ? [customerLocation] : [])];
  const deliveryRequiresSave = Boolean(courierTarget && !courierTarget.resolvedDelivery?.savedToOrder);
  const deliveryReadOnly = Boolean(courierTarget && !["Processing", "Shipping"].includes(courierTarget.status));
  const effectiveWorkerSheet = useMemo(() => {
    if (!workerSheet) return null;
    const sheet = { ...workerSheet, preparationMode, assignedTo: assignedTo.trim(),
      delivery: { ...workerSheet.delivery, details: getCourierDeliveryProfile(courierForm) } };
    return { ...sheet, problems: getWorkerProblems(sheet) };
  }, [workerSheet, preparationMode, assignedTo, courierForm]);
  const courierPreviewText = useMemo(() => {
    if (!courierTarget) return "";
    if (deliveryMode === "worker" && workerSheet) {
      return buildWorkerOrderShareText(effectiveWorkerSheet);
    }
    return buildCourierShareText(courierTarget, {
      deliveryProfile: courierForm,
      pickupConfig: { ...courierPickupConfig, courierNotes: courierInstructionNotes },
    });
  }, [courierTarget, deliveryMode, workerSheet, courierForm, effectiveWorkerSheet, courierInstructionNotes]);

  function showDeliveryDialog(order, mode = "courier", sheet = null) {
    const form = getCourierDeliveryProfile(order.resolvedDelivery?.details);
    resetCourierSaveError();
    setDeliveryMode(mode);
    setWorkerSheet(sheet);
    setPreparationMode(sheet?.preparationMode || "");
    setSaveCustomerLocation(false);
    setConfirmedMapLocation(false);
    setAssignedTo(order.assignedTo || "");
    setAssignedToBase(order.assignedTo || "");
    setCourierTarget(order);
    setCourierBaseForm(form);
    setCourierForm(form);
    setCourierInstructionNotes(getDefaultCourierInstructionNotes());
  }

  function showWorkerDialog(sheet) {
    showDeliveryDialog({ _id: sheet.orderId, orderNumber: sheet.orderNumber, status: sheet.status,
      resolvedDelivery: sheet.delivery, assignedTo: sheet.assignedTo || "", customerLocation: sheet.customerLocation }, "worker", sheet);
  }

  async function onCopy(order) {
    if (!order || copyId || workerLoadingId) return;
    try {
      setCopyId(order._id);
      const text = buildAdminOrderShareText(order);
      await copyTextToClipboard(text);
      toast.success("Order copied to clipboard.");
    } catch {
      toast.error("Failed to copy order.");
    } finally {
      setCopyId(null);
    }
  }

  function openPrepareOrder(order) { setPackingTarget(order); }

  async function openLegacyPrepareOrder(order) {
    if (!order?._id || workerLoadingId || copyId || deliveryLock.current) return;
    deliveryLock.current = true;
    try {
      setWorkerLoadingId(order._id);
      const response = await getWorkerSheet(order._id, false).unwrap();
      showWorkerDialog(response.data);
    } catch (err) {
      toast.error(friendlyApiError(err, "Could not load preparation and delivery details."));
    } finally {
      setWorkerLoadingId(null);
      deliveryLock.current = false;
    }
  }

  async function openCourierModal(order) {
    if (!order?._id || deliveryLock.current) return;
    deliveryLock.current = true;
    setCourierLoadingId(order._id);
    try {
      const response = await getDeliveryOrder(order._id, false).unwrap();
      showDeliveryDialog(response.data);
    } catch (error) { toast.error(friendlyApiError(error, "Could not load order delivery details.")); }
    finally { setCourierLoadingId(null); deliveryLock.current = false; }
  }

  function closeCourierModal() {
    if (isSavingCourier) return;
    resetCourierSaveError();
    setCourierTarget(null);
    setWorkerSheet(null);
    setPreparationMode("");
    setSaveCustomerLocation(false);
    setAssignedTo("");
    setAssignedToBase("");
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

  async function submitCourierDetails(copyAfter = true, draftCopy = false) {
    const saveDefaultRequested = saveCustomerLocation && (deliveryMode !== "worker" || preparationMode === "prepare_deliver");
    if (!courierTarget || deliveryLock.current) return;
    if (deliveryMode === "worker" && !["prepare_only", "prepare_deliver"].includes(preparationMode)) {
      toast.warning("Choose Prepare Only or Prepare & Deliver."); return;
    }
    if (deliveryMode === "worker" && !assignedTo.trim()) {
      toast.warning("Assigned To is required."); return;
    }
    if (copyAfter && !draftCopy && courierMissingFields.length) {
      toast.warning("Add the required delivery fields first."); return;
    }
    if ((deliveryMode !== "worker" || preparationMode === "prepare_deliver") && needsMapReview(locationBases, courierForm) && !confirmedMapLocation) { toast.warning("Review the map pin before saving."); return; }
    deliveryLock.current = true;
    setDeliveryWorking(true);
    try {
      let finalOrder = courierTarget;
      let sheet = workerSheet;
      if (courierHasChanges || deliveryRequiresSave) {
        if (deliveryReadOnly) throw new Error("Closed orders are read-only.");
        const response = await updateOrderDelivery({ id: courierTarget._id,
          deliveryDetails: getCourierDeliveryProfile(deliveryMode === "worker" && preparationMode === "prepare_only" ? courierBaseForm : courierForm),
          expectedRevision: courierTarget.resolvedDelivery.revision,
          confirmedMapLocation,
          ...(saveDefaultRequested ? { saveCustomerLocation: true, expectedCustomerLocation: customerLocation } : {}),
          ...(deliveryMode === "worker" ? { assignedTo: assignedTo.trim(), preparationMode } : {}),
        }).unwrap();
        finalOrder = { ...courierTarget, resolvedDelivery: response.data.resolvedDelivery, assignedTo: response.data.assignedTo || "", customerLocation: response.data.customerLocation ?? courierTarget.customerLocation };
        const savedForm = getCourierDeliveryProfile(finalOrder.resolvedDelivery.details);
        setCourierTarget(finalOrder);
        setSaveCustomerLocation(false);
        setAssignedTo(finalOrder.assignedTo);
        setAssignedToBase(finalOrder.assignedTo);
        setCourierBaseForm(savedForm);
        setCourierForm(savedForm);
        if (deliveryMode === "worker") {
          try { sheet = (await getWorkerSheet(courierTarget._id, false).unwrap()).data; }
          catch (error) {
            const warning = "Could not refresh the sheet. Reload details before copying final instructions.";
            setWorkerSheet({ ...sheet, preparationProblems: [...(sheet.preparationProblems || []), warning], problems: [...sheet.problems, warning] });
            throw error;
          }
          showWorkerDialog(sheet);
        }
      }
      if (!copyAfter) {
        toast.success(saveDefaultRequested
          ? "Order details and customer default location saved."
          : deliveryMode === "worker" ? "Preparation details saved for this order." : "Delivery details saved for this order.");
        return;
      }
      if (deliveryMode === "worker" && sheet.problems.length && !draftCopy) {
        toast.warning("Details saved. Resolve the remaining issues or copy the preparation draft."); return;
      }
      const copySheet = draftCopy && !sheet.problems.length
        ? { ...sheet, preparationProblems: [...(sheet.preparationProblems || []), "Preparation draft — confirm before acting."], problems: ["Preparation draft — confirm before acting."] } : sheet;
      const text = deliveryMode === "worker" ? buildWorkerOrderShareText(copySheet)
        : buildCourierShareText(finalOrder, { pickupConfig: { ...courierPickupConfig, courierNotes: courierInstructionNotes } });
      await copyTextToClipboard(text);
      toast.success(draftCopy ? "Preparation draft copied — resolve warnings before acting." : deliveryMode === "worker" ? "Preparation message copied." : "Courier details copied.");
      closeCourierModal();
    } catch (error) {
      toast.error(friendlyApiError(error, "Could not save or copy. Your details remain available to review and retry."));
    } finally { deliveryLock.current = false; setDeliveryWorking(false); }
  }

  async function copyWorkerDraft() {
    await submitCourierDetails(true, true);
  }

  async function reloadDeliveryDetails() {
    if (!courierTarget || deliveryLock.current) return;
    if (courierHasChanges && !window.confirm("Reload details and discard your unsaved changes?")) return;
    if (deliveryMode !== "worker") { await openCourierModal(courierTarget); return; }
    deliveryLock.current = true;
    setDeliveryWorking(true);
    try { showWorkerDialog((await getWorkerSheet(courierTarget._id, false).unwrap()).data); }
    catch (error) { toast.error(friendlyApiError(error, "Could not reload this order. It may have changed or closed.")); }
    finally { deliveryLock.current = false; setDeliveryWorking(false); }
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

  function resetDeleteModal() {
    setDeleteTarget(null);
    setDeletePreview(null);
    setDeleteConfirmValue("");
    setDeletePhysicalReturn(false);
    setDeleteFormError("");
    setDeleteNeedsRefresh(false);
  }

  function closeDeleteModal() {
    if (isDeleting || deletingOrder.current) return;
    resetDeleteModal();
  }

  async function onDelete(order) {
    if (!order?._id || deleteId || deletePreviewId || isDeleting || deletingOrder.current) return;
    setDeleteTarget(order);
    setDeletePreview(null);
    setDeleteConfirmValue("");
    setDeletePhysicalReturn(false);
    setDeleteFormError("");
    setDeleteNeedsRefresh(false);
    setDeletePreviewId(order._id);
    try {
      const res = await getOrderDeletePreview(order._id).unwrap();
      setDeletePreview(res?.data || res);
    } catch (err) {
      setDeleteNeedsRefresh(true);
      setDeleteFormError(friendlyApiError(err, "Failed to prepare delete preview."));
    } finally {
      setDeletePreviewId(null);
    }
  }

  async function submitDeleteOrder() {
    if (!deleteTarget?._id || deleteId || isDeleting || deletingOrder.current || deleteNeedsRefresh || !deletePreview?.allowed) return;
    if (deletePreview.stock?.requiresPhysicalReturn && !deletePhysicalReturn) {
      setDeleteFormError("Confirm the worker has stopped and the goods are back in their original slots.");
      return;
    }
    const confirmText =
      deletePreview?.confirmText ||
      deletePreview?.order?.orderNumber ||
      deleteTarget.orderNumber ||
      deleteTarget._id;

    if (String(deleteConfirmValue).trim() !== String(confirmText).trim()) {
      setDeleteFormError("Type the order number exactly to confirm.");
      return;
    }

    setDeleteFormError("");
    deletingOrder.current = true;
    try {
      setDeleteId(deleteTarget._id);
      const res = await deleteOrderByAdmin({ id: deleteTarget._id, confirmedPhysicalReturn: deletePhysicalReturn, expectedRevision: deletePreview.order?.version }).unwrap();
      const restored = Boolean(res?.data?.stockRestored);
      toast.success(
        restored
          ? "Order deleted and stock restored."
          : "Order deleted."
      );
      resetDeleteModal();
    } catch (err) {
      const friendly = friendlyApiError(err, "Delete failed.");
      setDeleteFormError(friendly);
      setDeletePhysicalReturn(false);
      setDeleteConfirmValue("");
      setDeleteNeedsRefresh(true);
      toast.error(friendly);
    } finally {
      deletingOrder.current = false;
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

  function openDeliverModal(order, action) { if (order?._id) { setDeliverTarget(order); setDeliverAction(ORDER_DELIVERY_EVENTS[action.id]); } }
  function closeDeliverModal() { setDeliverTarget(null); }

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
    if (!paymentForm.date) {
      nextErrors.date = "Required";
    } else {
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
      case 'send-worker':
      case 'assignment': openPrepareOrder(order); break;
      case 'legacy-packing': openLegacyPrepareOrder(order); break;
      case 'delivery-details': openCourierModal(order); break;
      case 'copy-summary': onCopy(order); break;
      case 'delete-order': onDelete(order); break;
      case 'pdf': onInvoicePdf(order); break;
      case 'add-payment': openAddPayment(order); break;
      case ADMIN_ORDER_ACTION_IDS.MARK_SHIPPING:
        onMarkShipping(order);
        break;
      case ADMIN_ORDER_ACTION_IDS.MARK_OUT_FOR_DELIVERY:
      case ADMIN_ORDER_ACTION_IDS.RETURN_TO_STORE:
      case ADMIN_ORDER_ACTION_IDS.DELIVERY_HISTORY:
      case ADMIN_ORDER_ACTION_IDS.MARK_DELIVERED:
        openDeliverModal(order, action);
        break;
      case ADMIN_ORDER_ACTION_IDS.DELIVERY_ASSIGNMENT:
        setDeliveryAssignmentTarget(order._id);
        break;
      case ADMIN_ORDER_ACTION_IDS.FINALIZE_STOCK:
        onFinalizeStock(order);
        break;
      case ADMIN_ORDER_ACTION_IDS.CREATE_INVOICE:
        openCreateModal(order);
        break;
      default:
        break;
    }
  }

  function isActionBusy(order, action) {
    return busyOrderId === order._id ||
      (isCreating && createTarget?._id === order._id) ||
      (isAddingPayment && paymentTarget?.order?._id === order._id) ||
      (isSavingCourier && courierTarget?._id === order._id) ||
      workerLoadingId === order._id || copyId === order._id ||
      deleteId === order._id || deletePreviewId === order._id ||
      (action === 'delete-order' && isDeleting) || (action === 'pdf' && isPdfLoading);
  }

  return (
    <div className="space-y-5">
      <header><h1 id="orders-heading" tabIndex={-1} className="scroll-mt-20 text-2xl font-semibold tracking-tight text-slate-900 md:scroll-mt-4">Orders</h1><p className="mt-1 text-sm text-slate-500">Preparation, delivery, billing and stock at a glance.</p></header>
      <ActionNeededStrip activeWork={work} counts={workSummaryRes?.data} isLoading={isWorkSummaryLoading} isFetching={isWorkSummaryFetching} onSelect={updateWorkQueue} />
      {summaryError && <p role="alert" className="text-xs text-amber-900">Could not refresh shortcut counts. {workSummaryRes ? 'Last successful counts are shown.' : 'Counts are unavailable.'} <button type="button" onClick={refetchSummary} className="min-h-9 underline">Retry counts</button></p>}
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex min-h-11 min-w-0 w-full flex-none items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/20 sm:w-auto sm:min-w-48 sm:flex-1 sm:max-w-sm"><FiSearch className="shrink-0 text-slate-400" aria-hidden="true" /><span className="sr-only">Search orders</span><input id="orders-search" type="search" aria-label="Search orders" value={search} onChange={event => updateListState({ search: event.target.value }, { resetPage: true })} placeholder="Search client, email or order…" className="min-w-0 w-full bg-transparent py-2 text-base outline-none sm:text-sm" /></label>
        <label className="max-w-full"><span className="sr-only">Billing</span><select id="orders-payment-status" aria-label="Billing" value={paymentStatus} onChange={event => updateListState({ paymentStatus: event.target.value }, { resetPage: true })} className="min-h-11 max-w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"><option value="all">All billing</option><option value="noInvoice">No invoice</option><option value="paymentDue">Payment due</option><option value="Unpaid">Unpaid</option><option value="PartiallyPaid">Partly paid</option><option value="Paid">Paid</option>{paymentStatus === 'notFullyPaid' && <option value="notFullyPaid">Unpaid or uninvoiced (legacy)</option>}</select></label>
        <label className="max-w-full"><span className="sr-only">Order stage</span><select aria-label="Order stage" value={status} onChange={event => updateListState({ status: event.target.value }, { resetPage: true })} className="min-h-11 max-w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"><option value="all">All stages</option>{Object.entries({ Processing: 'Awaiting preparation', Shipping: 'Preparing / awaiting delivery', Delivered: 'Delivered', Cancelled: 'Cancelled' }).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        {(search || status !== 'all' || paymentStatus !== 'all' || work !== 'all') && <button type="button" onClick={() => setSearchParams(buildOrderListSearchParams({ limit }), { replace: true })} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-xs text-slate-600 underline focus-visible:outline-2 focus-visible:outline-blue-600"><FiRefreshCw aria-hidden="true" />Reset filters</button>}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
        <p aria-live="polite">{isDebouncing ? 'Searching…' : !ordersRes ? 'Loading matching orders…' : totalItems + (totalItems === 1 ? ' matching order' : ' matching orders')}{activeWorkLabel && work !== 'all' ? ' · ' + activeWorkLabel : ''}{status !== 'all' ? ' · ' + status : ''}{paymentStatus !== 'all' ? ' · ' + ({ noInvoice: 'No invoice', paymentDue: 'Payment due', notFullyPaid: 'Unpaid or uninvoiced' }[paymentStatus] || paymentStatus) : ''}{isFetching && ordersRes ? ' · Updating…' : ''}</p>
        <div className="flex w-full flex-wrap items-center gap-3 sm:ml-auto sm:w-auto">
          <label className="inline-flex items-center gap-2 text-xs text-slate-600"><span>Per page</span><select aria-label="Per page" value={limit} onChange={event => updateListState({ limit: Number(event.target.value) }, { resetPage: true })} className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">{[10,20,50,100].map(value => <option key={value} value={value}>{value}</option>)}</select></label>
          <AdminPagination pagination={pagination} onPageChange={changeOrderPage} showSinglePage={totalItems > 0} />
        </div>
      </div>
      {isError && <div role="alert" className="space-y-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900"><p>{ordersRes ? 'Could not refresh orders. Last successful results are shown.' : 'Could not load orders.'}</p><ErrorMessage error={error} /><button type="button" onClick={refetchOrders} className="min-h-11 font-medium underline">Retry orders</button></div>}
      {isDebouncing || (!ordersRes && (isLoading || isFetching)) ? <Loader /> : ordersRes && ![401,403].includes(error?.status) ? rows.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center"><p className="text-sm font-medium text-slate-800">No orders found</p><p className="mt-2 text-sm text-slate-500">{search || paymentStatus !== 'all' || status !== 'all' ? 'No orders match these filters.' : work === 'all' ? 'No orders to show yet.' : 'No orders in this shortcut.'}</p></div> : <>
        <AdminOrderList orders={rows} query={listQueryString} desktop={isDesktopOrdersLayout} onAction={onPrimaryAction} isBusy={isActionBusy} />
        <div className="flex justify-start sm:justify-end"><AdminPagination pagination={pagination} onPageChange={changeOrderPage} showSinglePage /></div>
      </> : null}

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

      <DeliveryMovementModal open={Boolean(deliverTarget)} order={deliverTarget} action={deliverAction} onClose={closeDeliverModal} />
      {deliveryAssignmentTarget && <DeliveryAssignmentDialog orderId={deliveryAssignmentTarget} onClose={() => setDeliveryAssignmentTarget(null)} />}

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

      <DeleteOrderPreviewModal
        open={Boolean(deleteTarget)}
        order={deleteTarget}
        preview={deletePreview}
        isLoading={Boolean(deletePreviewId)}
        isDeleting={Boolean(deleteId && deleteId === deleteTarget?._id)}
        confirmedPhysicalReturn={deletePhysicalReturn}
        onPhysicalReturnChange={setDeletePhysicalReturn}
        confirmValue={deleteConfirmValue}
        onConfirmValueChange={(value) => {
          setDeleteConfirmValue(value);
          setDeleteFormError("");
        }}
        onClose={closeDeleteModal}
        onSubmit={submitDeleteOrder}
        error={deleteFormError}
        needsRefresh={deleteNeedsRefresh}
        onRefresh={() => onDelete(deleteTarget)}
      />

      {packingTarget && <SendToWorkerModal orderId={packingTarget._id} onClose={() => setPackingTarget(null)} onLegacy={() => { const target = packingTarget; setPackingTarget(null); openLegacyPrepareOrder(target); }} />}

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
        onSubmit={() => submitCourierDetails(true)}
        onSaveOnly={() => submitCourierDetails(false)}
        onCopyDraft={copyWorkerDraft}
        onRefresh={reloadDeliveryDetails}
        requiresSave={deliveryRequiresSave}
        readOnly={deliveryReadOnly}
        mode={deliveryMode}
        sheet={effectiveWorkerSheet}
        preparationMode={preparationMode}
        onPreparationModeChange={setPreparationMode}
        saveCustomerLocation={saveCustomerLocation}
        onSaveCustomerLocationChange={setSaveCustomerLocation}
        onUseCustomerLocation={() => setCourierForm((form) => ({ ...form, ...customerLocation }))}
        locationBases={locationBases}
        confirmedMapLocation={confirmedMapLocation}
        onConfirmMap={setConfirmedMapLocation}
        assignedTo={assignedTo}
        onAssignedToChange={setAssignedTo}
        isSaving={isSavingCourier}
        error={courierSaveError}
      />
    </div>
  );
}
