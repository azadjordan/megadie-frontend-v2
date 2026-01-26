import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FiChevronLeft } from "react-icons/fi";
import { toast } from "react-toastify";

import Loader from "../../components/common/Loader";
import ErrorMessage from "../../components/common/ErrorMessage";
import { copyTextToClipboard } from "../../utils/clipboard";
import { buildClientShareMessage } from "../../utils/quoteShare";
import CreateManualInvoiceModal from "../../components/admin/CreateManualInvoiceModal";

import {
  useGetQuoteByIdQuery,
  useUpdateQuoteOwnerByAdminMutation,
  useUpdateQuoteQuantitiesByAdminMutation,
  useUpdateQuotePricingByAdminMutation,
  useUpdateQuoteNotesByAdminMutation,
  useUpdateQuoteStatusByAdminMutation,
  useRecheckQuoteAvailabilityByAdminMutation,
  useLazyGetQuoteStockCheckByAdminQuery,
} from "../../features/quotes/quotesApiSlice";
import { useCreateOrderFromQuoteMutation } from "../../features/orders/ordersApiSlice";
import { useGetUsersAdminQuery } from "../../features/users/usersApiSlice";
import { useLazyGetUserPricesQuery } from "../../features/userPrices/userPricesApiSlice";
import { useLazyGetPriceRulesQuery } from "../../features/priceRules/priceRulesApiSlice";
import { useCreateManualInvoiceMutation } from "../../features/invoices/invoicesApiSlice";

import OwnerStep from "./request-details/OwnerStep";
import QuantitiesStep from "./request-details/QuantitiesStep";
import PricingStep from "./request-details/PricingStep";
import NotesStep from "./request-details/NotesStep";
import StatusStep from "./request-details/StatusStep";
import SummaryPanel from "./request-details/SummaryPanel";
import { StatusBadge } from "./request-details/Badges";
import {
  formatDateTime,
  getId,
  normalizeAvailabilityStatus,
  parseNullableNumber,
  toInputValue,
} from "./request-details/helpers";

const DELIVERY_CHARGE_OPTIONS = [0, 10, 12, 15, 20, 25, 30, 35, 40, 50];
const DEFAULT_DELIVERY_CHARGE = 15;
const DEFAULT_MANUAL_CURRENCY = "AED";

const buildDeliveryOptions = (currentValue) => {
  const options = [...DELIVERY_CHARGE_OPTIONS];
  const numeric = Number(currentValue);
  if (Number.isFinite(numeric) && !options.includes(numeric)) {
    options.push(numeric);
  }
  return options.sort((a, b) => a - b);
};

function getDefaultDueDate() {
  const date = new Date();
  date.setDate(date.getDate() + 35);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
    refetch: refetchQuote,
  } = useGetQuoteByIdQuery(id, { skip: !id });

  const quote = quoteResult?.data;

  const [showOwnerEditor, setShowOwnerEditor] = useState(false);
  const [activeTab, setActiveTab] = useState("owner");

  const {
    data: usersResult,
    isLoading: isUsersLoading,
    isError: isUsersError,
    error: usersError,
  } = useGetUsersAdminQuery(
    { limit: 100, sort: "name" },
    { skip: !showOwnerEditor }
  );

  const users = usersResult?.data || usersResult?.items || [];

  const [
    updateQuoteOwnerByAdmin,
    { isLoading: isUpdatingOwner, error: updateOwnerError },
  ] = useUpdateQuoteOwnerByAdminMutation();
  const [
    updateQuoteQuantitiesByAdmin,
    { isLoading: isUpdatingQuantities, error: updateQuantitiesError },
  ] = useUpdateQuoteQuantitiesByAdminMutation();
  const [
    updateQuotePricingByAdmin,
    { isLoading: isUpdatingPricing, error: updatePricingError },
  ] = useUpdateQuotePricingByAdminMutation();
  const [
    loadUserPrices,
    { isLoading: isLoadingUserPrices },
  ] = useLazyGetUserPricesQuery();
  const [
    loadPriceRules,
    { isLoading: isLoadingPriceRules },
  ] = useLazyGetPriceRulesQuery();
  const [
    updateQuoteNotesByAdmin,
    { isLoading: isUpdatingNotes, error: updateNotesError },
  ] = useUpdateQuoteNotesByAdminMutation();
  const [
    updateQuoteStatusByAdmin,
    { isLoading: isUpdatingStatus, error: updateStatusError },
  ] = useUpdateQuoteStatusByAdminMutation();
  const [
    recheckQuoteAvailabilityByAdmin,
    { isLoading: isRecheckingAvailability },
  ] = useRecheckQuoteAvailabilityByAdminMutation();
  const [
    loadQuoteStockCheck,
    { isFetching: isCheckingStock, error: stockCheckError },
  ] = useLazyGetQuoteStockCheckByAdminQuery();
  const [createOrderFromQuote, { isLoading: isCreatingOrder }] =
    useCreateOrderFromQuoteMutation();
  const [createManualInvoice, { isLoading: isCreatingManual, error: manualCreateError }] =
    useCreateManualInvoiceMutation();
  const [isSharing, setIsSharing] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualError, setManualError] = useState("");
  const [manualForm, setManualForm] = useState({
    userId: "",
    dueDate: getDefaultDueDate(),
    currency: DEFAULT_MANUAL_CURRENCY,
    minorUnitFactor: 100,
    adminNote: "",
    quoteId: "",
  });
  const [manualItems, setManualItems] = useState([
    { id: "item-1", description: "", qty: "1", unitPrice: "" },
  ]);


  // Step 1
  const [userId, setUserId] = useState("");

  // Step 2
  const [items, setItems] = useState([]);
  const [editDraft, setEditDraft] = useState({});
  const [isEditingQty, setIsEditingQty] = useState(false);
  const [stockCheckData, setStockCheckData] = useState(null);

  // Step 3
  const [deliveryChargeStr, setDeliveryChargeStr] = useState(
    String(DEFAULT_DELIVERY_CHARGE)
  );
  const [extraFeeStr, setExtraFeeStr] = useState("0");

  // Step 4
  const [adminToAdminNote, setAdminToAdminNote] = useState("");
  const [adminToClientNote, setAdminToClientNote] = useState("");

  // Step 5

  useEffect(() => {
    if (!quote) return;

    setUserId(getId(quote.user));

    setItems(
      (quote.requestedItems || []).map((it) => {
        const product =
          typeof it.product === "object" && it.product ? it.product : null;
        return {
          productId: getId(it.product),
          sku: product?.sku || "",
          name: product?.name || it?.productName || "",
          priceRule: product?.priceRule || it?.priceRule || "",
          requestedQty: Math.max(0, Number(it.qty) || 0),
          qtyStr: toInputValue(it.qty),
          unitPriceStr: toInputValue(it.unitPrice),
          availabilityStatus: normalizeAvailabilityStatus(it.availabilityStatus),
          availableNow: it.availableNow,
          shortage: it.shortage,
        };
      })
    );

    setDeliveryChargeStr(
      toInputValue(quote.deliveryCharge) || String(DEFAULT_DELIVERY_CHARGE)
    );
    setExtraFeeStr(toInputValue(quote.extraFee));
    setAdminToAdminNote(quote.adminToAdminNote || "");
    setAdminToClientNote(quote.adminToClientNote || "");

    setEditDraft({});
    setIsEditingQty(false);
    setStockCheckData(null);
  }, [quote?.id, quote?._id, quote?.updatedAt, quote?.availabilityCheckedAt]);

  const selectedUser = useMemo(() => {
    const uid = String(userId || "");
    const fromList = users.find((u) => String(u._id || u.id) === uid) || null;
    if (fromList) return fromList;
    const fallbackUser = quote?.user;
    if (!fallbackUser) return null;
    return {
      _id: getId(fallbackUser),
      name: fallbackUser?.name || "",
      email: fallbackUser?.email || "",
      phoneNumber: fallbackUser?.phoneNumber || "",
    };
  }, [users, userId, quote?.user]);

  const manualUserOptions = useMemo(() => {
    if (selectedUser) return [selectedUser];
    if (quote?.user) return [quote.user];
    return [];
  }, [selectedUser, quote?.user]);

  const originalOwnerId = getId(quote?.user);
  const quoteId = quote?.id || quote?._id;
  const backendStatus = quote?.status || "Processing";
  const showAvailability = backendStatus !== "Cancelled";
  // keep for business logic: lock if already converted to order
  const orderCreated = Boolean(quote?.order);
  const manualInvoiceId = quote?.manualInvoiceId;
  const manualInvoiceLocked = Boolean(manualInvoiceId);
  const quoteLocked = orderCreated || manualInvoiceLocked;
  const quoteLockReason = manualInvoiceLocked
    ? "Manual invoice created — quote locked."
    : orderCreated
    ? "Order created — quote locked."
    : "";

  const stockCheckItems = Array.isArray(stockCheckData?.items)
    ? stockCheckData.items
    : [];
  const stockCheckedAt =
    showAvailability && stockCheckData?.checkedAt
      ? formatDateTime(stockCheckData.checkedAt)
      : "";
  const isCheckingAvailability = isCheckingStock || isRecheckingAvailability;
  const canCheckStock = showAvailability && Boolean(quoteId) && !quoteLocked;

  const stockCheckByProduct = useMemo(() => {
    const map = new Map();
    for (const row of stockCheckItems) {
      const productId = String(row?.productId || "");
      if (!productId) continue;
      map.set(productId, row);
    }
    return map;
  }, [stockCheckItems]);

  const hasMissingProductId = useMemo(
    () => (items || []).some((it) => !it.productId),
    [items]
  );

  const hasShortage = useMemo(
    () => (items || []).some((it) => Number(it.shortage) > 0),
    [items]
  );

  const hasAnyAvailable = useMemo(
    () =>
      (items || []).some((it) => {
        const status = normalizeAvailabilityStatus(it.availabilityStatus);
        if (status === "AVAILABLE" || status === "SHORTAGE") return true;
        return Number(it.availableNow) > 0;
      }),
    [items]
  );

  const canUpdateQtyAdmin =
    showAvailability &&
    !quoteLocked &&
    !hasMissingProductId &&
    (backendStatus === "Processing" || backendStatus === "Quoted") &&
    hasAnyAvailable;
  useEffect(() => {
    if (!canUpdateQtyAdmin && isEditingQty) {
      setIsEditingQty(false);
      setEditDraft({});
    }
  }, [canUpdateQtyAdmin, isEditingQty]);
  const updateQtyDisabled =
    !canUpdateQtyAdmin ||
    !isEditingQty ||
    isUpdatingQuantities ||
    isCheckingAvailability ||
    isUpdatingOwner ||
    isUpdatingPricing ||
    isUpdatingNotes ||
    isUpdatingStatus ||
    isCreatingOrder;

  const hasAvailabilityShortage = useMemo(() => {
    if (!showAvailability) return false;
    return (items || []).some((it) => {
      const status = normalizeAvailabilityStatus(it.availabilityStatus);
      return status === "SHORTAGE" || status === "NOT_AVAILABLE";
    });
  }, [items, showAvailability]);

  const hasAnyAvailability = useMemo(() => {
    if (!showAvailability) return true;
    return (items || []).some((it) => {
      const status = normalizeAvailabilityStatus(it.availabilityStatus);
      return status === "AVAILABLE" || status === "SHORTAGE";
    });
  }, [items, showAvailability]);

  const savedItemsTotal = useMemo(
    () =>
      (quote?.requestedItems || []).reduce((sum, it) => {
        const qty = Math.max(0, Number(it?.qty) || 0);
        const unit = Math.max(0, Number(it?.unitPrice) || 0);
        return sum + qty * unit;
      }, 0),
    [quote?.requestedItems]
  );
  const savedItemsCount = useMemo(
    () => (quote?.requestedItems || []).length,
    [quote?.requestedItems]
  );
  const savedTotalQty = useMemo(
    () =>
      (quote?.requestedItems || []).reduce(
        (sum, it) => sum + Math.max(0, Number(it?.qty) || 0),
        0
      ),
    [quote?.requestedItems]
  );
  const deliveryChargeSaved = Number.isFinite(Number(quote?.deliveryCharge))
    ? Number(quote.deliveryCharge)
    : 0;
  const extraFeeSaved = Number.isFinite(Number(quote?.extraFee))
    ? Number(quote.extraFee)
    : 0;
  const totalSaved = Number.isFinite(Number(quote?.totalPrice))
    ? Number(quote.totalPrice)
    : Math.max(0, savedItemsTotal + deliveryChargeSaved + extraFeeSaved);
  const ownerName = quote?.user?.name || "";
  const deliveryOptions = useMemo(
    () => buildDeliveryOptions(deliveryChargeStr),
    [deliveryChargeStr]
  );

  const canUpdateOwner = useMemo(() => {
    if (!quoteId || quoteLocked) return false;
    if (!userId) return false;
    return String(userId) !== String(getId(quote?.user));
  }, [quoteId, quoteLocked, userId, quote?.user]);

  const hasPricingChanges = useMemo(() => {
    if (!quote || !items.length) return false;
    const savedById = new Map(
      (quote.requestedItems || []).map((it) => [
        String(getId(it.product)),
        it,
      ])
    );

    for (const it of items) {
      const saved = savedById.get(String(it.productId || ""));
      if (!saved) return true;
      const currentUnit = parseNullableNumber(it.unitPriceStr);
      const savedUnit = parseNullableNumber(saved.unitPrice);
      if (
        currentUnit != null &&
        savedUnit != null &&
        Number(currentUnit) !== Number(savedUnit)
      ) {
        return true;
      }
    }

    const delivery = parseNullableNumber(deliveryChargeStr);
    const extra = parseNullableNumber(extraFeeStr);
    if (delivery != null && delivery !== deliveryChargeSaved) return true;
    if (extra != null && extra !== extraFeeSaved) return true;

    return false;
  }, [
    quote,
    items,
    deliveryChargeStr,
    extraFeeStr,
    deliveryChargeSaved,
    extraFeeSaved,
  ]);

  const canUpdatePricing = useMemo(() => {
    if (!quoteId || quoteLocked) return false;
    if (!items.length) return false;
    if (hasMissingProductId) return false;

    for (const it of items) {
      const qty = parseNullableNumber(it.qtyStr);
      const unit = parseNullableNumber(it.unitPriceStr);
      if (qty == null || unit == null) return false;
      if (qty < 0 || unit < 0) return false;
    }

    const delivery = parseNullableNumber(deliveryChargeStr);
    const extra = parseNullableNumber(extraFeeStr);
    if (delivery == null || extra == null) return false;
    if (delivery < 0 || extra < 0) return false;

    if (!hasPricingChanges) return false;

    return true;
  }, [
    quoteId,
    quoteLocked,
    items,
    hasMissingProductId,
    deliveryChargeStr,
    extraFeeStr,
    hasPricingChanges,
  ]);

  const canUpdateNotes = useMemo(() => {
    if (!quoteId || quoteLocked) return false;
    const currentAdminNote = quote?.adminToAdminNote || "";
    const currentClientNote = quote?.adminToClientNote || "";
    return (
      adminToAdminNote !== currentAdminNote || adminToClientNote !== currentClientNote
    );
  }, [
    quoteId,
    quoteLocked,
    adminToAdminNote,
    adminToClientNote,
    quote?.adminToAdminNote,
    quote?.adminToClientNote,
  ]);

  const canUpdateStatusFor = (nextStatus) => {
    if (!quoteId || quoteLocked) return false;
    if (!nextStatus) return false;
    if (nextStatus === backendStatus) return false;
    if (showAvailability) {
      if (nextStatus === "Quoted" && !hasAnyAvailability) return false;
      if (nextStatus === "Confirmed" && hasAvailabilityShortage) return false;
    }
    return true;
  };

  const isBusy =
    isUpdatingOwner ||
    isUpdatingQuantities ||
    isUpdatingPricing ||
    isLoadingUserPrices ||
    isLoadingPriceRules ||
    isUpdatingNotes ||
    isUpdatingStatus ||
    isCheckingAvailability ||
    isCreatingOrder;

  const showOwnerUpdateError = Boolean(updateOwnerError);
  const showUpdateQtyError = Boolean(updateQuantitiesError);
  const showPricingError = Boolean(updatePricingError);
  const showNotesError = Boolean(updateNotesError);
  const showStatusError = Boolean(updateStatusError);

  const resolveToastError = (err, fallback) => {
    let message =
      err?.data?.message || err?.error || err?.message || "";
    if (
      message ===
      "Cannot confirm while there is a shortage. Please accept the shortage or update quantities."
    ) {
      message =
        "Cannot confirm while there is a shortage. Please confirm or update quantities.";
    }
    if (!message) return fallback;
    if (message.length > 140) return `${message.slice(0, 137)}...`;
    return message;
  };

  const adjustDraftQty = (key, delta, maxQty, fallbackQty, options = {}) => {
    if (!key) return;
    const max = Math.max(0, Number(maxQty) || 0);
    const fallback = Math.max(0, Number(fallbackQty) || 0);
    setEditDraft((prev) => {
      const currentRaw = Number(prev[key]);
      const base = Number.isFinite(currentRaw)
        ? currentRaw
        : Math.min(fallback, max);
      const rawNext = base + delta;
      const upperBound = options.allowAboveMax ? Number.POSITIVE_INFINITY : max;
      const clamped = Math.max(0, Math.min(rawNext, upperBound));
      return { ...prev, [key]: clamped };
    });
  };

  const onUpdateQty = async () => {
    if (!quoteId || !canUpdateQtyAdmin || !isEditingQty) return;

    const payloadItems = items.map((it, idx) => {
      const key = String(it.productId || idx);
      const inputQty = parseNullableNumber(it.qtyStr);
      const baseQty = inputQty == null ? 0 : inputQty;
      const availableNow = Number(it.availableNow);
      const shortage = Number.isFinite(Number(it.shortage))
        ? Math.max(0, Number(it.shortage))
        : Number.isFinite(availableNow)
        ? Math.max(0, baseQty - availableNow)
        : 0;
      const hasItemShortage =
        showAvailability && Number.isFinite(shortage) && shortage > 0;
      const fallbackQty =
        hasItemShortage && Number.isFinite(availableNow)
          ? Math.max(0, availableNow)
          : baseQty;
      const draftQty = Number(editDraft[key]);
      const nextQty = Number.isFinite(draftQty) ? draftQty : fallbackQty;
      return {
        product: it.productId,
        qty: Math.max(0, nextQty),
      };
    });

    try {
      await updateQuoteQuantitiesByAdmin({
        id: quoteId,
        requestedItems: payloadItems,
      }).unwrap();
      setEditDraft({});
      setIsEditingQty(false);
      await refetchQuote();
      toast.success("Quantities updated.");
    } catch (err) {
      toast.error(resolveToastError(err, "Failed to update quantities."));
    }
  };

  const onUpdateOwner = async () => {
    if (!quoteId || !canUpdateOwner) return;

    try {
      await updateQuoteOwnerByAdmin({ id: quoteId, user: userId }).unwrap();
      await refetchQuote();
      setShowOwnerEditor(false);
      toast.success("Owner updated.");
    } catch (err) {
      toast.error(resolveToastError(err, "Failed to update owner."));
    }
  };

  const onUpdatePricing = async () => {
    if (!canUpdatePricing) return;

    if (hasMissingProductId) {
      alert(
        "One or more items are missing product IDs. This quote may reference deleted products."
      );
      return;
    }

    const payload = {
      id: quoteId,
      requestedItems: items.map((it) => ({
        product: it.productId,
        unitPrice: Number(it.unitPriceStr),
      })),
      deliveryCharge: Number(deliveryChargeStr),
      extraFee: Number(extraFeeStr),
    };

    try {
      await updateQuotePricingByAdmin(payload).unwrap();
      setEditDraft({});
      await refetchQuote();
      toast.success("Pricing updated.");
    } catch (err) {
      toast.error(resolveToastError(err, "Failed to update pricing."));
    }
  };

  const onUpdateNotes = async () => {
    if (!canUpdateNotes) return;

    try {
      await updateQuoteNotesByAdmin({
        id: quoteId,
        adminToAdminNote,
        adminToClientNote,
      }).unwrap();
      await refetchQuote();
      toast.success("Notes updated.");
    } catch (err) {
      toast.error(resolveToastError(err, "Failed to update notes."));
    }
  };

  const onUpdateStatus = async (nextStatus) => {
    const targetStatus = nextStatus;
    if (!targetStatus) return;
    if (!canUpdateStatusFor(targetStatus)) return;

    try {
      await updateQuoteStatusByAdmin({ id: quoteId, status: targetStatus }).unwrap();
      await refetchQuote();
      toast.success(`Status updated to ${targetStatus}.`);
    } catch (err) {
      toast.error(resolveToastError(err, "Failed to update status."));
    }
  };

  const onCheckStock = async () => {
    if (!quoteId || !canCheckStock) return;

    try {
      await recheckQuoteAvailabilityByAdmin(quoteId).unwrap();
      const res = await loadQuoteStockCheck(quoteId).unwrap();
      setStockCheckData(res?.data || null);
      await refetchQuote();
      toast.success("Stock checked.");
    } catch (err) {
      toast.error(resolveToastError(err, "Failed to check stock."));
    }
  };

  const canConvertToOrder =
    Boolean(quoteId) && backendStatus === "Confirmed" && !orderCreated;
  const showConvertToOrder = Boolean(quoteId) && !orderCreated;
  const convertDisabled =
    isBusy ||
    isCreatingOrder ||
    quoteLocked ||
    backendStatus !== "Confirmed";
  const canShareWithClient =
    backendStatus === "Quoted" && !orderCreated && !manualInvoiceLocked;
  const shareDisabled = !canShareWithClient || isSharing;
  const canCreateManualInvoice =
    (backendStatus === "Processing" || backendStatus === "Quoted") &&
    !orderCreated &&
    !manualInvoiceLocked &&
    backendStatus !== "Cancelled";
  const manualInvoiceDisabled =
    !canCreateManualInvoice || isBusy || isCreatingManual;
  const manualInvoiceDisabledReason = manualInvoiceLocked
    ? "Manual invoice created — quote locked."
    : orderCreated
    ? "Order already exists for this quote."
    : backendStatus === "Cancelled"
    ? "Cancelled quotes cannot be invoiced."
    : backendStatus === "Confirmed"
    ? "Confirmed quotes should be invoiced from orders."
    : "";

  const onConvertToOrder = async () => {
    if (!canConvertToOrder) return;

    try {
      const order = await createOrderFromQuote(quoteId).unwrap();
      const orderId = order?._id || order?.id;
      toast.success("Order created.");
      if (orderId) {
        navigate(`/admin/orders/${orderId}`);
      }
    } catch (err) {
      toast.error(resolveToastError(err, "Failed to convert to order."));
    }
  };

  const onUnitPriceChange = (idx, value) => {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], unitPriceStr: value };
      return next;
    });
  };

  const onToggleEditQty = () => {
    if (!isEditingQty && !canUpdateQtyAdmin) return;
    setIsEditingQty((prev) => {
      const next = !prev;
      if (!next) {
        setEditDraft({});
      }
      return next;
    });
  };

  const tabs = [
    { id: "owner", label: "Owner", number: 1 },
    { id: "quantities", label: "Quantities", number: 2 },
    { id: "pricing", label: "Pricing", number: 3 },
    { id: "notes", label: "Notes", number: 4 },
    { id: "final", label: "Final Decision", number: 5 },
  ];

  const renderActiveTab = () => {
    switch (activeTab) {
      case "owner":
        return (
          <OwnerStep
            userId={userId}
            setUserId={setUserId}
            selectedUser={selectedUser}
            originalOwnerId={originalOwnerId}
            showOwnerEditor={showOwnerEditor}
            setShowOwnerEditor={setShowOwnerEditor}
            users={users}
            isUsersLoading={isUsersLoading}
            isUsersError={isUsersError}
            usersError={usersError}
            quoteLocked={quoteLocked}
            lockReason={quoteLockReason}
            canUpdateOwner={canUpdateOwner}
            onUpdateOwner={onUpdateOwner}
            isBusy={isBusy}
            isUpdating={isUpdatingOwner}
            showUpdateError={showOwnerUpdateError}
            updateError={updateOwnerError}
          />
        );
      case "quantities":
        return (
          <QuantitiesStep
            items={items}
            showAvailability={showAvailability}
            stockCheckedAt={stockCheckedAt}
            canCheckStock={canCheckStock}
            isCheckingStock={isCheckingAvailability}
            onCheckStock={onCheckStock}
            stockCheckError={stockCheckError}
            stockCheckByProduct={stockCheckByProduct}
            canUpdateQty={canUpdateQtyAdmin}
            updateQtyDisabled={updateQtyDisabled}
            isUpdatingQty={isUpdatingQuantities}
            onUpdateQty={onUpdateQty}
            isEditingQty={isEditingQty}
            onToggleEditQty={onToggleEditQty}
            editDraft={editDraft}
            adjustDraftQty={adjustDraftQty}
            quoteLocked={quoteLocked}
            lockReason={quoteLockReason}
            showUpdateError={showUpdateQtyError}
            updateError={updateQuantitiesError}
          />
        );
      case "pricing":
        return (
          <PricingStep
            items={items}
            onUnitPriceChange={onUnitPriceChange}
            deliveryChargeStr={deliveryChargeStr}
            setDeliveryChargeStr={setDeliveryChargeStr}
            deliveryOptions={deliveryOptions}
            extraFeeStr={extraFeeStr}
            setExtraFeeStr={setExtraFeeStr}
            quoteLocked={quoteLocked}
            lockReason={quoteLockReason}
            showAvailability={showAvailability}
            onAssignUserPrices={onAssignUserPrices}
            canUpdatePricing={canUpdatePricing}
            onUpdatePricing={onUpdatePricing}
            isBusy={isBusy}
            isUpdating={isUpdatingPricing}
            showUpdateError={showPricingError}
            updateError={updatePricingError}
          />
        );
      case "notes":
        return (
          <NotesStep
            clientNote={quote.clientToAdminNote}
            adminToAdminNote={adminToAdminNote}
            setAdminToAdminNote={setAdminToAdminNote}
            adminToClientNote={adminToClientNote}
            setAdminToClientNote={setAdminToClientNote}
            quoteLocked={quoteLocked}
            lockReason={quoteLockReason}
            canUpdateNotes={canUpdateNotes}
            onUpdateNotes={onUpdateNotes}
            isBusy={isBusy}
            isUpdating={isUpdatingNotes}
            showUpdateError={showNotesError}
            updateError={updateNotesError}
          />
        );
      case "final":
        return (
          <StatusStep
            quoteLocked={quoteLocked}
            lockReason={quoteLockReason}
            showAvailability={showAvailability}
            canSetQuoted={hasAnyAvailability}
            canSetConfirmed={!hasAvailabilityShortage}
            onUpdateStatus={onUpdateStatus}
            isBusy={isBusy}
            isUpdating={isUpdatingStatus}
            showUpdateError={showStatusError}
            updateError={updateStatusError}
            currentStatus={backendStatus}
          />
        );
      default:
        return null;
    }
  };

  const onShareWithClient = async () => {
    if (!canShareWithClient || !quote) return;
    try {
      setIsSharing(true);
      const text = buildClientShareMessage(quote);
      await copyTextToClipboard(text);
      toast.success("Client message copied.");
    } catch (err) {
      toast.error(resolveToastError(err, "Failed to copy client message."));
    } finally {
      setIsSharing(false);
    }
  };

  const buildManualItemsFromQuote = (targetQuote) => {
    const requestedItems = Array.isArray(targetQuote?.requestedItems)
      ? targetQuote.requestedItems
      : [];
    const mapped = requestedItems
      .map((item, idx) => {
        const qty = Math.max(0, Number(item?.qty) || 0);
        if (qty <= 0) return null;
        const productId = item?.product?._id || item?.product || idx;
        const description =
          item?.productName || item?.product?.name || "Item";
        return {
          id: `quote-${productId}-${idx}`,
          description,
          qty: String(qty),
          unitPrice: "",
        };
      })
      .filter(Boolean);

    if (mapped.length === 0) {
      return [{ id: "item-1", description: "", qty: "1", unitPrice: "" }];
    }

    return mapped;
  };

  const openManualFromQuote = () => {
    if (!quote) return;
    const quoteUserId = getId(quote.user);
    const quoteNumber = quote?.quoteNumber || quote?._id || "";
    setManualForm({
      userId: quoteUserId || "",
      dueDate: getDefaultDueDate(),
      currency: DEFAULT_MANUAL_CURRENCY,
      minorUnitFactor: 100,
      adminNote: quoteNumber ? `Manual invoice from quote ${quoteNumber}` : "",
      quoteId: quote?._id || quote?.id || "",
    });
    setManualItems(buildManualItemsFromQuote(quote));
    setManualError("");
    setShowManualModal(true);
  };

  const closeManualModal = () => {
    setShowManualModal(false);
    setManualError("");
  };

  const updateManualField = (field, value) => {
    setManualForm((prev) => ({ ...prev, [field]: value }));
    setManualError("");
  };

  const updateManualItem = (id, field, value) => {
    setManualItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
    setManualError("");
  };

  const addManualItem = () => {
    setManualItems((prev) => [
      ...prev,
      {
        id: `item-${prev.length + 1}-${Date.now()}`,
        description: "",
        qty: "1",
        unitPrice: "",
      },
    ]);
    setManualError("");
  };

  const removeManualItem = (id) => {
    setManualItems((prev) => {
      if (prev.length <= 1) {
        const seed = prev[0] || { id: "item-1" };
        return [{ ...seed, description: "", qty: "1", unitPrice: "" }];
      }
      return prev.filter((item) => item.id !== id);
    });
    setManualError("");
  };

  const submitManualInvoice = async () => {
    const userId = manualForm.userId;
    if (!userId) {
      setManualError("Select a client.");
      return;
    }

    if (!manualForm.dueDate) {
      setManualError("Due date is required.");
      return;
    }

    const factor = Number(manualForm.minorUnitFactor) || 100;
    if (!Number.isInteger(factor) || factor <= 0) {
      setManualError("Minor unit factor must be a positive integer.");
      return;
    }

    if (!manualItems.length) {
      setManualError("Add at least one line item.");
      return;
    }

    const invoiceItems = [];
    for (let i = 0; i < manualItems.length; i += 1) {
      const item = manualItems[i];
      const description = String(item.description || "").trim();
      const qty = Number(item.qty);
      const unitPriceRaw = String(item.unitPrice ?? "").trim();

      if (!description) {
        setManualError(`Item ${i + 1}: description is required.`);
        return;
      }
      if (!Number.isFinite(qty) || !Number.isInteger(qty) || qty <= 0) {
        setManualError(`Item ${i + 1}: qty must be a positive integer.`);
        return;
      }
      if (!unitPriceRaw) {
        setManualError(`Item ${i + 1}: unit price is required.`);
        return;
      }
      const unitPrice = Number(unitPriceRaw);
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        setManualError(`Item ${i + 1}: unit price must be 0 or higher.`);
        return;
      }

      const unitPriceMinor = Math.round(unitPrice * factor);
      invoiceItems.push({
        description,
        qty,
        unitPriceMinor,
      });
    }

    try {
      await createManualInvoice({
        userId,
        dueDate: manualForm.dueDate,
        currency: manualForm.currency?.trim() || undefined,
        minorUnitFactor: factor,
        adminNote: manualForm.adminNote?.trim() || undefined,
        quoteId: manualForm.quoteId || undefined,
        invoiceItems,
      }).unwrap();

      toast.success("Manual invoice created.");
      closeManualModal();
      await refetchQuote();
    } catch (err) {
      toast.error(resolveToastError(err, "Failed to create manual invoice."));
    }
  };

  const onAssignUserPrices = async () => {
    if (quoteLocked) return;
    if (!userId) {
      toast.error("Select a user before loading prices.");
      return;
    }

    const missingRules = (items || []).filter((it) => !it.priceRule);
    if (missingRules.length) {
      toast.error(
        "Some products are missing price rules. Update the product and try again."
      );
      return;
    }

    try {
      const [userPricesRes, priceRulesRes] = await Promise.all([
        loadUserPrices(userId).unwrap(),
        loadPriceRules().unwrap(),
      ]);

      const userPrices = Array.isArray(userPricesRes?.data)
        ? userPricesRes.data
        : [];
      const priceRules = Array.isArray(priceRulesRes?.data)
        ? priceRulesRes.data
        : [];

      const priceByRule = new Map(
        userPrices.map((p) => [String(p.priceRule), p.unitPrice])
      );
      const defaultByRule = new Map(
        priceRules.map((rule) => [String(rule.code), rule.defaultPrice])
      );

      setItems((prev) =>
        prev.map((it) => {
          const rule = String(it.priceRule || "");
          if (!rule) return it;
          const resolved = priceByRule.get(rule);
          const fallback = defaultByRule.get(rule);
          const nextPrice =
            resolved == null ? (fallback == null ? null : fallback) : resolved;
          if (nextPrice == null) return it;
          return { ...it, unitPriceStr: toInputValue(nextPrice) };
        })
      );

      toast.success("User prices loaded into inputs.");
    } catch (err) {
      toast.error(resolveToastError(err, "Failed to load user prices."));
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
    <div className="space-y-4 pb-24 md:pb-0">
      <CreateManualInvoiceModal
        open={showManualModal}
        users={manualUserOptions}
        form={manualForm}
        items={manualItems}
        onClose={closeManualModal}
        onSubmit={submitManualInvoice}
        onFieldChange={updateManualField}
        onItemChange={updateManualItem}
        onAddItem={addManualItem}
        onRemoveItem={removeManualItem}
        isSaving={isCreatingManual}
        error={manualCreateError}
        formError={manualError}
        disableUserSelect
      />
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

        {manualInvoiceLocked ? (
          <div className="mt-3 rounded-xl bg-violet-50 p-3 ring-1 ring-violet-200">
            <div className="text-xs font-semibold text-violet-900">
              Manual invoice created
            </div>
            <div className="mt-1 text-xs text-violet-900/80">
              Quote is locked to prevent further changes.
            </div>
            {manualInvoiceId ? (
              <div className="mt-2">
                <Link
                  to={`/admin/invoices/${manualInvoiceId}/edit`}
                  className="inline-flex items-center rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-violet-700 ring-1 ring-violet-200 hover:bg-violet-50"
                >
                  View invoice
                </Link>
              </div>
            ) : null}
          </div>
        ) : quoteLocked ? (
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
              One or more items are missing a product reference (product may have been
              deleted). Updating is blocked until fixed.
            </div>
          </div>
        ) : null}
      </div>

        <div
          className={[
            "grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]",
            quoteLocked ? "blur-[1px] opacity-70" : "",
          ].join(" ")}
        >
        <div className="space-y-4">
          <div className="hidden rounded-2xl bg-white p-3 ring-1 ring-slate-200 md:block">
            <div className="flex flex-nowrap gap-2 overflow-x-auto md:flex-wrap">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    aria-pressed={isActive}
                    className={[
                      "inline-flex items-center gap-2 whitespace-nowrap rounded-xl border px-3 py-2 text-xs font-semibold transition",
                      isActive
                        ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "grid h-5 w-5 place-items-center rounded-md text-[11px] font-semibold",
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-slate-100 text-slate-700",
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

          {renderActiveTab()}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <SummaryPanel
            itemsCount={savedItemsCount}
            itemsTotal={savedItemsTotal}
            totalQty={savedTotalQty}
            deliveryCharge={deliveryChargeSaved}
            extraFee={extraFeeSaved}
            total={totalSaved}
            status={backendStatus}
            ownerName={ownerName}
            showConvertToOrder={showConvertToOrder}
            onConvertToOrder={onConvertToOrder}
            isCreatingOrder={isCreatingOrder}
            convertDisabled={convertDisabled}
            showShareWithClient={canShareWithClient}
            onShareWithClient={onShareWithClient}
            shareDisabled={shareDisabled}
            showManualInvoice
            onCreateManualInvoice={openManualFromQuote}
            manualInvoiceDisabled={manualInvoiceDisabled}
            manualInvoiceDisabledReason={manualInvoiceDisabledReason}
            lockReason={quoteLockReason}
          />
        </aside>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-3 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur md:hidden">
        <div className="grid grid-cols-5 gap-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-pressed={isActive}
                className={[
                  "flex flex-col items-center gap-1 rounded-xl border px-2 py-2 text-[10px] font-semibold transition",
                  isActive
                    ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                ].join(" ")}
              >
                <span
                  className={[
                    "grid h-5 w-5 place-items-center rounded-md text-[10px] font-semibold",
                    isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700",
                  ].join(" ")}
                >
                  {tab.number}
                </span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
