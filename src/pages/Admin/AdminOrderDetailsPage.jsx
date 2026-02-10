import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { FiChevronLeft } from "react-icons/fi";
import { toast } from "react-toastify";

import Loader from "../../components/common/Loader";
import ErrorMessage from "../../components/common/ErrorMessage";
import AdminOrderAllocation from "../../components/admin/AdminOrderAllocation";
import CreateInvoiceModal from "../../components/admin/CreateInvoiceModal";
import MarkDeliveredModal from "../../components/admin/MarkDeliveredModal";
import StepCard from "./request-details/StepCard";
import OrderSummaryPanel from "./order-details/SummaryPanel";
import { StatusBadge, StockBadge } from "./order-details/Badges";

import {
  useGetOrderByIdQuery,
  useUpdateOrderByAdminMutation,
  useMarkOrderDeliveredMutation,
  useCancelOrderByAdminMutation,
} from "../../features/orders/ordersApiSlice";
import { useCreateInvoiceFromOrderMutation } from "../../features/invoices/invoicesApiSlice";
import {
  useGetOrderAllocationsQuery,
  useFinalizeOrderAllocationsMutation,
} from "../../features/orderAllocations/orderAllocationsApiSlice";

function formatDateTime(iso) {
  if (!iso) return "";
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

function money(amount, currency = "AED") {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "";
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

function moneyPlain(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "";
  try {
    return new Intl.NumberFormat(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return n.toFixed(2);
  }
}

function lineTotal(item) {
  if (!item) return 0;
  if (typeof item.lineTotal === "number") return item.lineTotal;
  const qty = Number(item.qty) || 0;
  const unit = Number(item.unitPrice) || 0;
  return qty * unit;
}

function parseNumberInput(value) {
  if (value === "" || value == null) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function resolveEntityId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    if (value._id) return String(value._id);
    if (value.id) return String(value.id);
    if (typeof value.toString === "function") return String(value);
  }
  return "";
}

function getDefaultDueDate() {
  const date = new Date();
  date.setDate(date.getDate() + 35);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function AdminOrderDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    data: orderResult,
    isLoading,
    isError,
    error,
    isFetching,
  } = useGetOrderByIdQuery(id, { skip: !id });

  const order = orderResult?.data ?? orderResult;
  const items = Array.isArray(order?.orderItems) ? order.orderItems : [];

  const invoiceId =
    typeof order?.invoice === "string"
      ? order.invoice
      : order?.invoice?._id || "";
  const invoiceNumber = order?.invoice?.invoiceNumber || invoiceId;

  const quoteData = order?.quote;
  const quoteId =
    typeof quoteData === "string" ? quoteData : quoteData?._id || "";
  const quoteNumber =
    quoteData && typeof quoteData === "object" ? quoteData.quoteNumber || "" : "";

  const user =
    order?.user && typeof order.user === "object" ? order.user : null;

  const itemsTotal = items.reduce((sum, it) => sum + lineTotal(it), 0);
  const itemsCount = items.length;
  const totalQty = items.reduce((sum, it) => sum + (Number(it?.qty) || 0), 0);
  const delivery = Number(order?.deliveryCharge) || 0;
  const extra = Number(order?.extraFee) || 0;
  const total = Number(order?.totalPrice) || itemsTotal + delivery + extra;

  const orderId = order?._id || order?.id || "";
  const orderStatus = order?.status || "Processing";
  const isCancelled = orderStatus === "Cancelled";
  const hasInvoice = Boolean(invoiceId);
  const isProcessing = orderStatus === "Processing";
  const canEditNotes = isProcessing;
  const canEditFees = !hasInvoice && !isCancelled;
  const editNotice = !canEditNotes
    ? "Notes are editable only while the order is Processing."
    : !canEditFees
    ? isCancelled
      ? "Fees are locked once the order is cancelled."
      : "Fees are locked once an invoice exists."
    : "";
  const canCreateInvoice =
    ["Shipping", "Delivered"].includes(orderStatus) && !hasInvoice;
  const createInvoiceReason = hasInvoice
    ? "Invoice attached."
    : !["Shipping", "Delivered"].includes(orderStatus)
    ? "Invoices can be created once the order is Shipping or Delivered."
    : "";
  const shouldLoadAllocations =
    Boolean(orderId) &&
    (orderStatus === "Shipping" ||
      orderStatus === "Delivered" ||
      orderStatus === "Cancelled");
  const {
    data: allocationsResult,
    isLoading: isAllocationsLoading,
    isError: isAllocationsError,
  } = useGetOrderAllocationsQuery(orderId, { skip: !shouldLoadAllocations });

  const [
    finalizeAllocations,
    { isLoading: isFinalizing, error: finalizeError },
  ] = useFinalizeOrderAllocationsMutation();

  const allocations = Array.isArray(allocationsResult?.data)
    ? allocationsResult.data
    : Array.isArray(allocationsResult)
      ? allocationsResult
      : [];
  const reservedAllocations = useMemo(
    () =>
      allocations.filter(
        (row) => !row?.status || row.status === "Reserved"
      ),
    [allocations]
  );
  const deductedAllocations = useMemo(
    () => allocations.filter((row) => row?.status === "Deducted"),
    [allocations]
  );
  const hasAllocations = allocations.length > 0;
  const hasDeductedAllocations = deductedAllocations.length > 0;

  const reservedByProduct = useMemo(() => {
    const map = new Map();
    for (const row of reservedAllocations) {
      const productId = resolveEntityId(row?.product);
      if (!productId) continue;
      map.set(productId, (map.get(productId) || 0) + (Number(row?.qty) || 0));
    }
    return map;
  }, [reservedAllocations]);

  const deductedByProduct = useMemo(() => {
    const map = new Map();
    for (const row of deductedAllocations) {
      const productId = resolveEntityId(row?.product);
      if (!productId) continue;
      map.set(productId, (map.get(productId) || 0) + (Number(row?.qty) || 0));
    }
    return map;
  }, [deductedAllocations]);

  const isFullyReserved =
    items.length > 0 &&
    items.every((it) => {
      const productId = resolveEntityId(it?.product);
      const orderedQty = Number(it?.qty) || 0;
      const reservedQty = productId ? reservedByProduct.get(productId) || 0 : 0;
      return reservedQty === orderedQty;
    });

  const isFullyDeducted =
    items.length > 0 &&
    items.every((it) => {
      const productId = resolveEntityId(it?.product);
      const orderedQty = Number(it?.qty) || 0;
      const deductedQty = productId ? deductedByProduct.get(productId) || 0 : 0;
      return deductedQty === orderedQty;
    });
  const hasBlockingAllocations = allocations.some(
    (row) =>
      !row?.status || row.status === "Reserved" || row.status === "Deducted"
  );

  const allocationMetrics = useMemo(() => {
    const deductedTotals = new Map();
    let hasReservedAllocations = false;

    for (const row of allocations) {
      const productId = resolveEntityId(row?.product);
      if (!productId) continue;
      const qty = Number(row?.qty) || 0;
      if (row?.status === "Deducted") {
        deductedTotals.set(
          productId,
          (deductedTotals.get(productId) || 0) + qty
        );
      } else if (row?.status !== "Cancelled") {
        hasReservedAllocations = true;
      }
    }

    const hasAllocations = allocations.length > 0;
    let isFullyDeducted = false;

    if (hasAllocations && items.length > 0) {
      isFullyDeducted = items.every((it) => {
        const productId = resolveEntityId(it?.product);
        const orderedQty = Number(it?.qty) || 0;
        const deductedQty = productId ? deductedTotals.get(productId) || 0 : 0;
        return deductedQty === orderedQty;
      });
    }

    return { hasAllocations, hasReservedAllocations, isFullyDeducted };
  }, [allocations, items]);

  const isStockFinalized =
    Boolean(order?.stockFinalizedAt) || allocationMetrics.isFullyDeducted;
  const releaseAllowed =
    orderStatus === "Shipping" &&
    !hasInvoice &&
    !isStockFinalized &&
    !hasDeductedAllocations;
  const canAllocate = orderStatus === "Shipping" && !isStockFinalized;
  const allocationLockReason = isStockFinalized
    ? "Stock finalized."
    : orderStatus === "Cancelled"
    ? "Order is cancelled."
    : orderStatus === "Delivered"
    ? hasInvoice
      ? "Remove the invoice before adjusting reservations."
      : "Reservations are locked once delivered."
    : orderStatus !== "Shipping"
    ? "Order must be Shipping before managing allocations."
    : "";
  const hasPartialDeduction = hasDeductedAllocations && !isFullyDeducted;

  let finalizeHint = "";
  if (isAllocationsLoading) {
    finalizeHint = "Checking allocations...";
  } else if (!hasAllocations) {
    finalizeHint = "Reserve all items before finalizing stock.";
  } else if (!isFullyReserved) {
    finalizeHint = "Reserve all items before finalizing stock.";
  } else {
    finalizeHint = "Finalizing deducts reserved qty from stock.";
  }

  const canFinalize =
    orderStatus === "Delivered" &&
    hasInvoice &&
    !isFullyDeducted &&
    !hasPartialDeduction &&
    hasAllocations &&
    isFullyReserved &&
    !isAllocationsLoading;
  const finalizeTooltip = !canFinalize
    ? isStockFinalized
      ? "Stock already Finalized"
      : orderStatus !== "Delivered"
      ? "Order must be Delivered before finalizing stock."
      : !hasInvoice
      ? "Invoice required before finalizing stock."
      : hasPartialDeduction
      ? "Resolve allocations before finalizing stock."
      : finalizeHint || allocationLockReason
    : "";

  const isShipping = orderStatus === "Shipping";
  const canShip = orderStatus === "Processing";
  const shippingLockReason =
    orderStatus === "Processing"
      ? ""
      : isShipping
      ? "Order is already Shipping."
      : "Only Processing orders can mark Shipping.";

  let deliverLockReason = "";
  if (orderStatus === "Delivered") {
    deliverLockReason = "Order already delivered.";
  } else if (orderStatus !== "Shipping") {
    deliverLockReason = "Order must be Shipping before delivery.";
  } else if (isAllocationsLoading) {
    deliverLockReason = "Checking allocations...";
  } else if (isAllocationsError) {
    deliverLockReason = "Unable to load allocation status.";
  } else if (!allocationMetrics.hasAllocations) {
    deliverLockReason = "Reserve all items before delivery.";
  } else if (hasPartialDeduction) {
    deliverLockReason = "Resolve allocations before delivery.";
  } else if (!isFullyReserved && !allocationMetrics.isFullyDeducted) {
    deliverLockReason = "Reserve all items before delivery.";
  }
  const canDeliver = deliverLockReason === "";
  const needsAllocationCheck =
    orderStatus === "Shipping" || orderStatus === "Delivered" || isCancelled;
  const allocationCheckLoading = needsAllocationCheck && isAllocationsLoading;
  const allocationCheckError = needsAllocationCheck && isAllocationsError;
  const canCancelOrder =
    !isCancelled &&
    !isStockFinalized &&
    !allocationCheckLoading &&
    !allocationCheckError &&
    !hasDeductedAllocations;
  const canReopenOrder =
    isCancelled &&
    !hasInvoice &&
    !isStockFinalized &&
    !allocationCheckLoading &&
    !allocationCheckError &&
    !hasBlockingAllocations;
  const cancelReason = isStockFinalized
    ? "Stock finalized orders cannot be cancelled."
    : hasDeductedAllocations
    ? "Stock already deducted. Reverse before cancelling."
    : allocationCheckLoading
    ? "Checking allocations..."
    : allocationCheckError
    ? "Unable to load allocations."
    : "";
  const reopenReason = isStockFinalized
    ? "Stock finalized orders cannot be reopened."
    : hasInvoice
    ? "Remove the invoice before re-opening."
    : allocationCheckLoading
    ? "Checking allocations..."
    : allocationCheckError
    ? "Unable to load allocations."
    : hasBlockingAllocations
    ? "Remove allocations before re-opening."
    : "";
  const canToggleCancel = isCancelled ? canReopenOrder : canCancelOrder;
  const [deliveryCharge, setDeliveryCharge] = useState("0");
  const [extraFee, setExtraFee] = useState("0");
  const [deliveredBy, setDeliveredBy] = useState("");
  const [adminToAdminNote, setAdminToAdminNote] = useState("");
  const [adminToClientNote, setAdminToClientNote] = useState("");
  const [overviewError, setOverviewError] = useState("");
  const [shippingError, setShippingError] = useState("");
  const [deliverFormError, setDeliverFormError] = useState("");
  const [saved, setSaved] = useState(false);
  const resolveTab = (value) =>
    ["general", "invoice", "stock", "finalize"].includes(value)
      ? value
      : "general";
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(location.search);
    return resolveTab(params.get("tab"));
  });
  const [createTarget, setCreateTarget] = useState(null);
  const [isDeliverModalOpen, setIsDeliverModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    dueDate: getDefaultDueDate(),
    adminNote: "",
    currency: "AED",
    minorUnitFactor: "100",
  });
  const [createFormError, setCreateFormError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setActiveTab(resolveTab(params.get("tab")));
  }, [id, location.search]);

  const [updateOrderByAdmin, { isLoading: isSaving, error: saveError }] =
    useUpdateOrderByAdminMutation();
  const [updateOrderStatus, { isLoading: isUpdatingStatus }] =
    useUpdateOrderByAdminMutation();
  const [cancelOrderByAdmin, { isLoading: isCancelling }] =
    useCancelOrderByAdminMutation();
  const [
    markOrderDelivered,
    { isLoading: isDelivering, error: deliverError },
  ] = useMarkOrderDeliveredMutation();
  const [createInvoiceFromOrder, { isLoading: isCreating, error: createError }] =
    useCreateInvoiceFromOrderMutation();

  useEffect(() => {
    if (!order) return;
    setDeliveryCharge(String(Number(order.deliveryCharge ?? 0)));
    setExtraFee(String(Number(order.extraFee ?? 0)));
    setDeliveredBy(order.deliveredBy || "");
    setAdminToAdminNote(order.adminToAdminNote || "");
    setAdminToClientNote(order.adminToClientNote || "");
    setOverviewError("");
    setShippingError("");
    setDeliverFormError("");
    setSaved(false);
  }, [order?._id, order?.id, order?.updatedAt]);

  const openCreateModal = () => {
    if (!order) return;
    setCreateTarget(order);
    setCreateForm({
      dueDate: getDefaultDueDate(),
      adminNote: "",
      currency: "AED",
      minorUnitFactor: "100",
    });
    setCreateFormError("");
  };

  const closeCreateModal = () => {
    if (isCreating) return;
    setCreateTarget(null);
    setCreateFormError("");
  };

  const handleCreateField = (key, value) => {
    setCreateForm((prev) => ({ ...prev, [key]: value }));
    if (createFormError) setCreateFormError("");
  };

  const submitCreateInvoice = async () => {
    if (!createTarget || isCreating) return;

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

    const payload = { orderId: createTarget._id };
    payload.dueDate = dueDate;

    const adminNote = String(createForm.adminNote || "").trim();
    if (adminNote) payload.adminNote = adminNote;

    const currency = String(createForm.currency || "").trim();
    if (currency) payload.currency = currency;

    if (minorRaw) payload.minorUnitFactor = Number(minorRaw);

    try {
      await createInvoiceFromOrder(payload).unwrap();
      closeCreateModal();
    } catch {
      // ErrorMessage handles it
    }
  };

  const handleShip = async () => {
    if (!order || !canShip || isUpdatingStatus) return;
    setShippingError("");
    try {
      await updateOrderStatus({
        id: orderId,
        status: "Shipping",
      }).unwrap();
      toast.success("Order moved to Shipping.");
    } catch (err) {
      setShippingError(
        err?.data?.message || err?.error || "Failed to update shipping status."
      );
    }
  };

  const handleFinalize = async () => {
    if (!orderId || !canFinalize || isFinalizing) return;
    const confirmed = window.confirm(
      "Finalize stock for this order? This will deduct reserved qty and lock allocations."
    );
    if (!confirmed) return;

    try {
      const res = await finalizeAllocations(orderId).unwrap();
      toast.success(res?.message || "Stock finalized.");
    } catch {
      // ErrorMessage handles failure state.
    }
  };

  const handleCancel = async () => {
    if (!order || isUpdatingStatus || isCancelling) return;
    const confirmed = window.confirm(
      "Cancel this order? This will delete the invoice and payments (if any), unreserve all items, and mark the order as Cancelled."
    );
    if (!confirmed) return;
    setOverviewError("");
    try {
      const res = await cancelOrderByAdmin(orderId).unwrap();
      toast.success(res?.message || "Order cancelled.");
    } catch (err) {
      setOverviewError(
        err?.data?.message || err?.error || "Failed to cancel order."
      );
    }
  };

  const handleMakeProcessing = async () => {
    if (!order || isUpdatingStatus) return;
    const confirmed = window.confirm(
      "Move this order back to Processing?"
    );
    if (!confirmed) return;
    setOverviewError("");
    try {
      await updateOrderStatus({
        id: orderId,
        status: "Processing",
      }).unwrap();
      toast.success("Order moved back to Processing.");
    } catch (err) {
      setOverviewError(
        err?.data?.message || err?.error || "Failed to update order status."
      );
    }
  };

  const openDeliverModal = () => {
    if (!order || !canDeliver || isDelivering) return;
    setDeliverFormError("");
    setIsDeliverModalOpen(true);
  };

  const closeDeliverModal = () => {
    if (isDelivering) return;
    setIsDeliverModalOpen(false);
    setDeliverFormError("");
  };

  const handleDeliver = async () => {
    if (!order || !canDeliver || isDelivering) return;
    setDeliverFormError("");
    const name = deliveredBy.trim();
    if (!name) {
      setDeliverFormError("Delivered by is required.");
      return;
    }

    try {
      await markOrderDelivered({
        id: orderId,
        deliveredBy: name,
      }).unwrap();
      setIsDeliverModalOpen(false);
    } catch {
      // ErrorMessage handles it
    }
  };

  const onSave = async () => {
    if (!order || isSaving) return;
    if (!canEditNotes && !canEditFees) return;
    setOverviewError("");
    setSaved(false);

    const payload = {
      id: orderId,
    };

    if (canEditNotes) {
      payload.adminToAdminNote = adminToAdminNote;
      payload.adminToClientNote = adminToClientNote;
    }

    if (canEditFees) {
      const deliveryNum = parseNumberInput(deliveryCharge);
      if (deliveryNum == null) {
        setOverviewError("Delivery charge must be a non-negative number.");
        return;
      }

      const extraNum = parseNumberInput(extraFee);
      if (extraNum == null) {
        setOverviewError("Extra fee must be a non-negative number.");
        return;
      }

      payload.deliveryCharge = deliveryNum;
      payload.extraFee = extraNum;
    }

    try {
      await updateOrderByAdmin(payload).unwrap();
      setSaved(true);
    } catch {
      // ErrorMessage handles it
    }
  };

  const deliverInvoiceLockReason =
    !canDeliver && deliverLockReason
      ? deliverLockReason
      : !canCreateInvoice && createInvoiceReason
      ? createInvoiceReason
      : "";
  const finalizeStepLockReason =
    !canFinalize && finalizeTooltip ? finalizeTooltip : "";

  const tabs = [
    { id: "general", label: "Ship", shortLabel: "Ship", number: 1 },
    {
      id: "stock",
      label: "Reserve Stock",
      shortLabel: "Reserve",
      number: 2,
      locked: !canAllocate,
      lockReason: allocationLockReason,
    },
    {
      id: "invoice",
      label: "Deliver & Invoice",
      shortLabel: "Del & Inv",
      number: 3,
      locked: !canDeliver && !canCreateInvoice,
      lockReason: deliverInvoiceLockReason,
    },
    {
      id: "finalize",
      label: "Finalize Stock",
      shortLabel: "Finalize",
      number: 4,
      locked: !canFinalize,
      lockReason: finalizeStepLockReason,
    },
  ];

  const renderActiveTab = () => {
    switch (activeTab) {
      case "general":
        return (
          <div className="space-y-4 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-4 lg:space-y-0">
            <StepCard
              n={1}
              title="Ship"
              subtitle="Update notes and fees, then mark the order as Shipping."
            >
              {editNotice ? (
                <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900 ring-1 ring-amber-200">
                  {editNotice}
                </div>
              ) : null}

              <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <div>
                  <div className="mb-1 text-xs font-semibold text-slate-600">
                    Status
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-200">
                    {orderStatus}
                  </div>
                </div>

                <div>
                  <div className="mb-1 text-xs font-semibold text-slate-600">
                    Delivered by
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-200">
                    {order?.deliveredBy || "-"}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Delivery charge
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={deliveryCharge}
                    onChange={(e) => setDeliveryCharge(e.target.value)}
                    disabled={!canEditFees}
                    className={[
                      "w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20",
                      !canEditFees
                        ? "cursor-not-allowed bg-slate-50 text-slate-400"
                        : "",
                    ].join(" ")}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Extra fee
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={extraFee}
                    onChange={(e) => setExtraFee(e.target.value)}
                    disabled={!canEditFees}
                    className={[
                      "w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20",
                      !canEditFees
                        ? "cursor-not-allowed bg-slate-50 text-slate-400"
                        : "",
                    ].join(" ")}
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Admin to Admin
                  </label>
                  <textarea
                    rows={3}
                    value={adminToAdminNote}
                    onChange={(e) => setAdminToAdminNote(e.target.value)}
                    placeholder="Internal notes"
                    disabled={!canEditNotes}
                    className={[
                      "w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20",
                      !canEditNotes
                        ? "cursor-not-allowed bg-slate-50 text-slate-400"
                        : "",
                    ].join(" ")}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Admin to Client
                  </label>
                  <textarea
                    rows={3}
                    value={adminToClientNote}
                    onChange={(e) => setAdminToClientNote(e.target.value)}
                    placeholder="Optional message to the client"
                    disabled={!canEditNotes}
                    className={[
                      "w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20",
                      !canEditNotes
                        ? "cursor-not-allowed bg-slate-50 text-slate-400"
                        : "",
                    ].join(" ")}
                  />
                </div>

                <div>
                  <div className="mb-1 text-xs font-semibold text-slate-600">
                    Client to Admin
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700 ring-1 ring-slate-200">
                    {order.clientToAdminNote || "No client note."}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onSave}
                  disabled={isSaving || (!canEditNotes && !canEditFees)}
                  className={[
                    "h-10 rounded-xl px-4 py-2 text-sm font-semibold text-white",
                    isSaving || (!canEditNotes && !canEditFees)
                      ? "cursor-not-allowed bg-slate-300"
                      : "bg-slate-900 hover:bg-slate-800",
                  ].join(" ")}
                >
                  {isSaving ? "Saving..." : "Save changes"}
                </button>

                {saved ? (
                  <span className="text-xs font-semibold text-emerald-700">
                    Saved.
                  </span>
                ) : null}

                <button
                  type="button"
                  onClick={handleShip}
                  disabled={!canShip || isUpdatingStatus}
                  title={shippingLockReason || undefined}
                  className={[
                    "h-10 rounded-xl px-4 py-2 text-sm font-semibold text-white",
                    !canShip || isUpdatingStatus
                      ? "cursor-not-allowed bg-blue-200 text-blue-600"
                      : "bg-blue-600 hover:bg-blue-700",
                  ].join(" ")}
                >
                  {isUpdatingStatus ? "Updating..." : "Mark Shipping"}
                </button>
              </div>

              {shippingError ? (
                <div className="mt-2 text-[11px] text-rose-600">
                  {shippingError}
                </div>
              ) : null}

              {overviewError ? (
                <div className="mt-3 rounded-xl bg-rose-50 p-3 text-xs text-rose-800 ring-1 ring-rose-200">
                  {overviewError}
                </div>
              ) : null}

              {saveError ? (
                <div className="mt-3">
                  <ErrorMessage error={saveError} />
                </div>
              ) : null}

            </StepCard>

            <div className="lg:sticky lg:top-6 lg:self-start">
              <AdminOrderAllocation
                orderId={orderId}
                orderStatus={orderStatus}
                items={items}
                formatMoney={moneyPlain}
                showSlots={false}
                title="Order items"
              />
            </div>
          </div>
        );
      case "invoice":
        return (
          <StepCard
            n={3}
            title="Deliver & Invoice"
            subtitle="Mark the order delivered, then create the invoice."
          >
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={openDeliverModal}
                disabled={!canDeliver || isDelivering}
                title={deliverLockReason || undefined}
                className={[
                  "rounded-xl px-4 py-2 text-xs font-semibold text-white",
                  !canDeliver || isDelivering
                    ? "cursor-not-allowed bg-emerald-300"
                    : "bg-emerald-600 hover:bg-emerald-700",
                ].join(" ")}
              >
                {isDelivering ? "Delivering..." : "Mark Delivered"}
              </button>

              <button
                type="button"
                onClick={openCreateModal}
                disabled={!canCreateInvoice || isCreating}
                title={createInvoiceReason || undefined}
                className={[
                  "rounded-xl px-4 py-2 text-xs font-semibold text-white",
                  !canCreateInvoice || isCreating
                    ? "cursor-not-allowed bg-slate-300"
                    : "bg-slate-900 hover:bg-slate-800",
                ].join(" ")}
              >
                {isCreating ? "Creating..." : "Create Invoice"}
              </button>
            </div>

            {orderStatus === "Shipping" && canCreateInvoice ? (
              <div className="mt-3 text-[11px] text-slate-500">
                Invoice is typically created after delivery.
              </div>
            ) : null}
          </StepCard>
        );
      case "stock":
        return (
          <AdminOrderAllocation
            orderId={orderId}
            orderStatus={orderStatus}
            items={items}
            formatMoney={money}
            showPricing={false}
            title="Reserve Stock"
            allocationEnabled={canAllocate}
            allocationLockReason={allocationLockReason}
            allowRelease={releaseAllowed}
            mode="stock"
          />
        );
      case "finalize":
        return (
          <StepCard
            n={4}
            title="Finalize Stock"
            subtitle="Deduct reserved stock after delivery and invoice."
          >
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleFinalize}
                disabled={!canFinalize || isFinalizing}
                title={finalizeTooltip || undefined}
                className={[
                  "rounded-xl px-4 py-2 text-xs font-semibold text-white",
                  !canFinalize || isFinalizing
                    ? "cursor-not-allowed bg-slate-300"
                    : "bg-slate-900 hover:bg-slate-800",
                ].join(" ")}
              >
                {isFinalizing ? "Finalizing..." : "Finalize Stock"}
              </button>
            </div>

            {finalizeError ? (
              <div className="mt-3">
                <ErrorMessage error={finalizeError} />
              </div>
            ) : null}
          </StepCard>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
        <Loader />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
        <ErrorMessage error={error} />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
        <div className="text-sm font-semibold text-slate-900">
          Order not found
        </div>
        <div className="mt-1 text-sm text-slate-500">
          The order data is missing from the response.
        </div>
      </div>
    );
  }

  const tabsNode = (
    <div className="hidden rounded-2xl bg-white p-3 ring-1 ring-slate-200 md:block">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isLocked = Boolean(tab.locked);
          const numberClass = isActive
            ? isLocked
              ? "bg-amber-100 text-amber-700"
              : "bg-white/20 text-white"
            : isLocked
            ? "bg-slate-100 text-slate-400"
            : "bg-slate-100 text-slate-700";
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              aria-pressed={isActive}
              title={isLocked ? tab.lockReason : undefined}
              className={[
                "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition",
                isActive
                  ? isLocked
                    ? "border-amber-300 bg-amber-50 text-amber-800"
                    : "border-slate-900 bg-slate-900 text-white shadow-sm"
                  : isLocked
                  ? "border-slate-200 bg-slate-50 text-slate-400"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
              ].join(" ")}
            >
              <span
                className={[
                  "grid h-5 w-5 place-items-center rounded-md text-[11px] font-semibold",
                  numberClass,
                ].join(" ")}
              >
                {tab.number}
              </span>
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );

  const summaryPanel = (
    <OrderSummaryPanel
      orderNumber={order.orderNumber || orderId}
      invoiceId={invoiceId}
      invoiceNumber={invoiceNumber}
      quoteId={quoteId}
      quoteNumber={quoteNumber}
      customerName={user?.name || ""}
      itemsCount={itemsCount}
      totalQty={totalQty}
      itemsTotal={itemsTotal}
      deliveryCharge={delivery}
      extraFee={extra}
      total={total}
      status={orderStatus}
      formatMoney={money}
      isStockFinalized={isStockFinalized}
    />
  );

  return (
    <div className="space-y-4 pb-24 md:pb-0">
      <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <button
          type="button"
          onClick={() => navigate("/admin/orders")}
          className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900"
        >
          <FiChevronLeft className="h-4 w-4" />
          Back to orders
        </button>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-lg font-semibold text-slate-900">
              Order Details
            </div>
            <span className="text-xs text-slate-400">/</span>
            <div className="text-sm font-semibold text-slate-700">
              {order.orderNumber || order._id}
            </div>
            <StatusBadge status={order.status} />
            <StockBadge isFinalized={isStockFinalized} />
            {isFetching ? (
              <span className="text-xs text-slate-400">Refreshing...</span>
            ) : null}
          </div>

          <div className="flex items-center gap-2" />
        </div>

        <div className="mt-1 text-sm text-slate-500">
          Created {formatDateTime(order.createdAt)}
          {order.deliveredAt
            ? ` - Delivered ${formatDateTime(order.deliveredAt)}`
            : ""}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          {tabsNode}
          {renderActiveTab()}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          {summaryPanel}
          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={isCancelled ? handleMakeProcessing : handleCancel}
                disabled={(isUpdatingStatus || isCancelling) || !canToggleCancel}
                title={
                  !(isUpdatingStatus || isCancelling) && !canToggleCancel
                    ? isCancelled
                      ? reopenReason
                      : cancelReason
                    : undefined
                }
                className={[
                  "rounded-xl border px-3 py-2 text-xs font-semibold transition",
                  (isUpdatingStatus || isCancelling) || !canToggleCancel
                    ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                    : isCancelled
                    ? "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                    : "border-rose-500 bg-white text-rose-600 hover:bg-rose-50",
                ].join(" ")}
              >
                {isUpdatingStatus || isCancelling
                  ? "Updating..."
                  : isCancelled
                  ? "Make Processing"
                  : "Unreserve & Cancel"}
              </button>
            </div>
          </div>
        </aside>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-3 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur md:hidden">
        <div className="grid grid-cols-4 gap-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const isLocked = Boolean(tab.locked);
            const numberClass = isActive
              ? isLocked
                ? "bg-amber-100 text-amber-700"
                : "bg-white/20 text-white"
              : isLocked
              ? "bg-slate-100 text-slate-400"
              : "bg-slate-100 text-slate-700";
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-pressed={isActive}
                title={isLocked ? tab.lockReason : undefined}
                className={[
                  "flex flex-col items-center gap-1 rounded-xl border px-2 py-2 text-[10px] font-semibold transition",
                  isActive
                    ? isLocked
                      ? "border-amber-300 bg-amber-50 text-amber-800"
                      : "border-slate-900 bg-slate-900 text-white shadow-sm"
                    : isLocked
                    ? "border-slate-200 bg-slate-50 text-slate-400"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                ].join(" ")}
              >
                <span
                  className={[
                    "grid h-5 w-5 place-items-center rounded-md text-[10px] font-semibold",
                    numberClass,
                  ].join(" ")}
                >
                  {tab.number}
                </span>
                <span className="whitespace-nowrap text-[10px] leading-tight">
                  {tab.shortLabel || tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

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
        open={isDeliverModalOpen}
        order={order}
        deliveredBy={deliveredBy}
        onDeliveredByChange={setDeliveredBy}
        onClose={closeDeliverModal}
        onSubmit={handleDeliver}
        isSaving={isDelivering}
        error={deliverError}
        formError={deliverFormError}
      />
    </div>
  );
}
