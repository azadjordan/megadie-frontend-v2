import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiArrowLeft,
  FiCheckCircle,
  FiChevronDown,
  FiSearch,
} from "react-icons/fi";
import { toast } from "react-toastify";

import Loader from "../common/Loader";
import ErrorMessage from "../common/ErrorMessage";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import { useGetUsersAdminQuery } from "../../features/users/usersApiSlice";
import {
  useAllocateCustomerPaymentMutation,
  useGetCustomerPaymentPreviewQuery,
} from "../../features/payments/paymentsApiSlice";
import {
  formatInvoiceMoneyMinor,
  formatMinorAmountInput,
} from "../../utils/invoiceMoney";
import { toDateTimeLocalValue } from "../../utils/paymentFormDefaults";

const RECEIVED_BY_OPTIONS = [
  "Azad - Personal",
  "Momani - Personal",
  "Company Account",
];

const PAYMENT_METHODS = [
  "Cash",
  "Bank Transfer",
  "Credit Card",
  "Cheque",
  "Other",
];

function getUserId(user) {
  return user?._id || user?.id || "";
}

function getUserLabel(user) {
  const name = String(user?.name || "").trim();
  const email = String(user?.email || "").trim();
  if (name && email) return `${name} - ${email}`;
  return name || email || getUserId(user);
}

function formatDate(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return value;
  }
}

function friendlyApiError(err) {
  const msg =
    err?.data?.message || err?.error || err?.message || "Something went wrong.";
  return String(msg);
}

function parsePaymentDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

export default function ReceiveCustomerPaymentModal({
  open,
  onClose,
  initialCustomer,
  onCompleted,
}) {
  const backdropMouseDown = useRef(false);
  const dropdownRef = useRef(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [receivedBy, setReceivedBy] = useState("");
  const [paymentDate, setPaymentDate] = useState(() =>
    toDateTimeLocalValue(new Date())
  );
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [confirming, setConfirming] = useState(false);

  const initialCustomerId = getUserId(initialCustomer);
  useEffect(() => {
    if (!open) return;
    setSelectedCustomer(initialCustomerId ? initialCustomer : null);
    setCustomerDropdownOpen(false);
    setCustomerSearch("");
    setAmount("");
    setPaymentMethod("");
    setReceivedBy("");
    setPaymentDate(toDateTimeLocalValue(new Date()));
    setReference("");
    setNote("");
    setFieldErrors({});
    setConfirming(false);
  }, [open, initialCustomerId, initialCustomer]);

  useEffect(() => {
    if (!customerDropdownOpen) return;
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setCustomerDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [customerDropdownOpen]);

  const customerId = getUserId(selectedCustomer);
  const trimmedSearch = customerSearch.trim();
  const debouncedSearch = useDebouncedValue(trimmedSearch, 500);
  const debouncedAmount = useDebouncedValue(amount.trim(), 300);
  const isSearching = trimmedSearch !== debouncedSearch;

  const {
    data: usersData,
    isLoading: usersLoading,
    isError: usersError,
    error: usersErrorMessage,
  } = useGetUsersAdminQuery(
    {
      page: 1,
      limit: 20,
      search: debouncedSearch,
      role: "user",
      approvalStatus: "Approved",
      sort: "name",
    },
    { skip: !open || !customerDropdownOpen }
  );

  const users = useMemo(
    () => usersData?.data || usersData?.items || [],
    [usersData]
  );

  const userOptions = useMemo(() => {
    if (!customerId) return users;
    const exists = users.some((user) => String(getUserId(user)) === String(customerId));
    return exists ? users : [selectedCustomer, ...users].filter(Boolean);
  }, [users, selectedCustomer, customerId]);

  const {
    data: preview,
    isLoading: previewLoading,
    isFetching: previewFetching,
    isError: previewIsError,
    error: previewError,
  } = useGetCustomerPaymentPreviewQuery(
    { userId: customerId, amount: debouncedAmount },
    { skip: !open || !customerId }
  );

  const [allocateCustomerPayment, { isLoading: isSaving, error: saveError }] =
    useAllocateCustomerPaymentMutation();

  if (!open) return null;

  const currency = preview?.currency || "AED";
  const factor = preview?.minorUnitFactor || 100;
  const previewCustomerId = getUserId(preview?.customer);
  const isAmountSettling = amount.trim() !== debouncedAmount;
  const previewMatchesCustomer =
    !preview?.customer || String(previewCustomerId) === String(customerId);
  const previewIsCurrent =
    Boolean(customerId) &&
    !previewLoading &&
    !previewFetching &&
    !isAmountSettling &&
    previewMatchesCustomer;
  const previewAmountError = previewIsCurrent ? preview?.amountError : "";
  const allocatedRows = (preview?.allocations || []).filter(
    (allocation) => (allocation?.appliedMinor || 0) > 0
  );
  const hasPreviewAmount = previewIsCurrent && Number(debouncedAmount) > 0;
  const canReview = Boolean(
    customerId &&
      previewIsCurrent &&
      preview?.canAllocate &&
      paymentMethod &&
      receivedBy &&
      paymentDate &&
      !previewFetching &&
      !isSaving
  );

  const money = (amountMinor, options) =>
    formatInvoiceMoneyMinor(amountMinor, currency, factor, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      ...options,
    });

  const setField = (field, value) => {
    setConfirming(false);
    if (field === "amount") setAmount(value);
    if (field === "paymentMethod") setPaymentMethod(value);
    if (field === "receivedBy") setReceivedBy(value);
    if (field === "paymentDate") setPaymentDate(value);
    if (field === "reference") setReference(value);
    if (field === "note") setNote(value);
    setFieldErrors((prev) => {
      if (!prev?.[field]) return prev;
      const { [field]: _removed, ...rest } = prev;
      return rest;
    });
  };

  const validateForReview = () => {
    const nextErrors = {};
    const amountValue = Number(amount);
    if (!customerId) nextErrors.customer = "Select a customer.";
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      nextErrors.amount = "Enter a positive amount.";
    }
    if (!previewIsCurrent) {
      nextErrors.amount = "Wait for the allocation preview to update.";
    }
    if (previewAmountError) nextErrors.amount = previewAmountError;
    if (previewIsCurrent && preview?.unpaidTotalMinor <= 0) {
      nextErrors.amount = "This customer has no unpaid balance.";
    }
    if (!paymentMethod) nextErrors.paymentMethod = "Required";
    if (!receivedBy) nextErrors.receivedBy = "Required";
    if (!parsePaymentDate(paymentDate)) nextErrors.paymentDate = "Invalid date.";

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleReview = () => {
    if (!previewIsCurrent) return;
    if (!validateForReview()) return;
    if (!preview?.canAllocate) {
      setFieldErrors((prev) => ({
        ...prev,
        amount: preview?.amountError || "Payment cannot be allocated.",
      }));
      return;
    }
    setConfirming(true);
  };

  const handleSubmit = async () => {
    if (!customerId || isSaving) return;
    const paymentDateValue = parsePaymentDate(paymentDate);
    if (!paymentDateValue) {
      setFieldErrors((prev) => ({ ...prev, paymentDate: "Invalid date." }));
      setConfirming(false);
      return;
    }

    try {
      const res = await allocateCustomerPayment({
        userId: customerId,
        amount: Number(amount),
        paymentMethod,
        receivedBy,
        paymentDate: paymentDateValue,
        reference: reference.trim() || undefined,
        note: note.trim() || undefined,
      }).unwrap();
      toast.success(res?.message || "Customer payment recorded.");
      onCompleted?.(res?.data);
      onClose();
    } catch {
      setConfirming(false);
    }
  };

  const fieldClass = (hasError) =>
    [
      "w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 focus:outline-none focus:ring-2",
      hasError
        ? "ring-rose-300 focus:ring-rose-200"
        : "ring-slate-200 focus:ring-slate-900/20",
    ].join(" ");

  const renderAllocationRows = () => {
    if (!customerId) {
      return (
        <div className="rounded-xl bg-slate-50 px-3 py-3 text-xs text-slate-500">
          Select a customer to see unpaid invoices.
        </div>
      );
    }

    if (previewLoading || previewFetching || isAmountSettling || !previewMatchesCustomer) {
      return (
        <div className="rounded-xl bg-slate-50 p-4">
          <Loader />
        </div>
      );
    }

    if (previewIsError) {
      return <ErrorMessage error={previewError} />;
    }

    if (!preview?.unpaidInvoiceCount) {
      return (
        <div className="rounded-xl bg-slate-50 px-3 py-3 text-xs text-slate-500">
          This customer has no unpaid issued invoices.
        </div>
      );
    }

    const rows = hasPreviewAmount ? allocatedRows : preview.allocations || [];
    return (
      <div className="overflow-hidden rounded-xl ring-1 ring-slate-200">
        <div className="max-h-72 overflow-auto bg-white">
          <table className="min-w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Invoice</th>
                <th className="px-3 py-2">Due</th>
                <th className="px-3 py-2 text-right">Balance</th>
                <th className="px-3 py-2 text-right">Applied</th>
                <th className="px-3 py-2 text-right">After</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((allocation) => (
                <tr key={allocation.invoice} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-semibold text-slate-900">
                    {allocation.invoiceNumber || String(allocation.invoice).slice(-6)}
                  </td>
                  <td className="px-3 py-2 text-slate-500">
                    {formatDate(allocation.dueDate)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                    {money(allocation.balanceDueMinor)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-900">
                    {money(allocation.appliedMinor || 0)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                    {money(allocation.balanceAfterMinor)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onMouseDown={(e) => {
        backdropMouseDown.current = e.target === e.currentTarget;
      }}
      onMouseUp={(e) => {
        if (backdropMouseDown.current && e.target === e.currentTarget && !isSaving) {
          onClose();
        }
        backdropMouseDown.current = false;
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="receive-customer-payment-title"
    >
      <div
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <div
              id="receive-customer-payment-title"
              className="text-sm font-semibold text-slate-900"
            >
              Receive customer payment
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Apply one received amount across this customer's unpaid invoices.
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300"
          >
            Close
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-4">
          {confirming ? (
            <div className="space-y-4">
              <div className="rounded-xl bg-emerald-50 px-4 py-3 ring-1 ring-emerald-100">
                <div className="flex items-start gap-2">
                  <FiCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <div>
                    <div className="text-sm font-semibold text-emerald-900">
                      Confirm payment allocation
                    </div>
                    <div className="mt-1 text-xs text-emerald-800">
                      Record {money(preview?.amountMinor || 0)} from{" "}
                      {getUserLabel(selectedCustomer)} and apply it to{" "}
                      {allocatedRows.length} invoice
                      {allocatedRows.length === 1 ? "" : "s"}.
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 px-3 py-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Balance before
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900 tabular-nums">
                    {money(preview?.unpaidTotalMinor || 0)}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Payment
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900 tabular-nums">
                    {money(preview?.amountMinor || 0)}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Balance after
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900 tabular-nums">
                    {money(preview?.balanceAfterPaymentMinor || 0)}
                  </div>
                </div>
              </div>

              {renderAllocationRows()}

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSaving}
                  className={[
                    "rounded-xl px-4 py-2 text-sm font-semibold text-white",
                    isSaving
                      ? "cursor-not-allowed bg-slate-300"
                      : "bg-slate-900 hover:bg-slate-800",
                  ].join(" ")}
                >
                  {isSaving ? "Recording..." : "Confirm & Record Payment"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  <FiArrowLeft className="h-4 w-4" />
                  Back
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Customer
                  </label>
                  <div className="relative" ref={dropdownRef}>
                    <button
                      type="button"
                      onClick={() => setCustomerDropdownOpen((open) => !open)}
                      className={[
                        "flex w-full items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 transition hover:bg-slate-50 focus:outline-none focus:ring-2",
                        fieldErrors.customer
                          ? "ring-rose-300 focus:ring-rose-200"
                          : "ring-slate-200 focus:ring-slate-900/20",
                      ].join(" ")}
                    >
                      <span className="truncate">
                        {customerId ? getUserLabel(selectedCustomer) : "Select customer"}
                      </span>
                      <FiChevronDown className="h-4 w-4 text-slate-400" />
                    </button>

                    {customerDropdownOpen ? (
                      <div className="absolute z-40 mt-2 w-full rounded-xl bg-white p-2 shadow-xl ring-1 ring-slate-200">
                        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
                          <FiSearch className="h-4 w-4 text-slate-400" />
                          <input
                            type="text"
                            value={customerSearch}
                            onChange={(e) => setCustomerSearch(e.target.value)}
                            placeholder="Search approved customers..."
                            className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                          />
                        </div>

                        <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-slate-100 bg-white">
                          {usersLoading || isSearching ? (
                            <Loader />
                          ) : usersError ? (
                            <div className="px-3 py-2 text-xs text-rose-600">
                              {friendlyApiError(usersErrorMessage)}
                            </div>
                          ) : userOptions.length === 0 ? (
                            <div className="px-3 py-2 text-xs text-slate-500">
                              No approved customers found.
                            </div>
                          ) : (
                            userOptions.map((user) => {
                              const optionId = getUserId(user);
                              const selected = String(optionId) === String(customerId);
                              return (
                                <button
                                  type="button"
                                  key={optionId}
                                  onClick={() => {
                                    setSelectedCustomer(user);
                                    setCustomerSearch("");
                                    setCustomerDropdownOpen(false);
                                    setConfirming(false);
                                    setFieldErrors((prev) => {
                                      const { customer: _removed, ...rest } = prev;
                                      return rest;
                                    });
                                  }}
                                  className={[
                                    "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs",
                                    selected
                                      ? "bg-slate-100 text-slate-900"
                                      : "text-slate-600 hover:bg-slate-50",
                                  ].join(" ")}
                                >
                                  <span className="truncate">{getUserLabel(user)}</span>
                                  {selected ? (
                                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] text-slate-600">
                                      Selected
                                    </span>
                                  ) : null}
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                  {fieldErrors.customer ? (
                    <div className="mt-1 text-xs font-semibold text-rose-600">
                      {fieldErrors.customer}
                    </div>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <label className="block text-xs font-semibold text-slate-600">
                        Amount
                      </label>
                      {preview?.unpaidTotalMinor > 0 ? (
                        <button
                          type="button"
                          onClick={() =>
                            setField(
                              "amount",
                              formatMinorAmountInput(
                                preview.unpaidTotalMinor,
                                preview.minorUnitFactor || 100
                              )
                            )
                          }
                          className="text-[11px] font-semibold text-violet-600 hover:text-violet-700"
                        >
                          Use full balance
                        </button>
                      ) : null}
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setField("amount", e.target.value)}
                      placeholder="0.00"
                      className={fieldClass(fieldErrors.amount || previewAmountError)}
                    />
                    {fieldErrors.amount || previewAmountError ? (
                      <div className="mt-1 text-xs font-semibold text-rose-600">
                        {fieldErrors.amount || previewAmountError}
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      Payment received date
                    </label>
                    <input
                      type="datetime-local"
                      value={paymentDate}
                      onChange={(e) => setField("paymentDate", e.target.value)}
                      className={fieldClass(fieldErrors.paymentDate)}
                    />
                    {fieldErrors.paymentDate ? (
                      <div className="mt-1 text-xs font-semibold text-rose-600">
                        {fieldErrors.paymentDate}
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      Method
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setField("paymentMethod", e.target.value)}
                      className={fieldClass(fieldErrors.paymentMethod)}
                    >
                      <option value="" disabled>
                        Select method
                      </option>
                      {PAYMENT_METHODS.map((method) => (
                        <option key={method} value={method}>
                          {method}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.paymentMethod ? (
                      <div className="mt-1 text-xs font-semibold text-rose-600">
                        {fieldErrors.paymentMethod}
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      Received by
                    </label>
                    <select
                      value={receivedBy}
                      onChange={(e) => setField("receivedBy", e.target.value)}
                      className={fieldClass(fieldErrors.receivedBy)}
                    >
                      <option value="" disabled>
                        Select receiver
                      </option>
                      {RECEIVED_BY_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.receivedBy ? (
                      <div className="mt-1 text-xs font-semibold text-rose-600">
                        {fieldErrors.receivedBy}
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      Reference
                    </label>
                    <input
                      type="text"
                      value={reference}
                      onChange={(e) => setField("reference", e.target.value)}
                      placeholder="Optional transfer or cheque reference"
                      className={fieldClass(false)}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      Note
                    </label>
                    <input
                      type="text"
                      value={note}
                      onChange={(e) => setField("note", e.target.value)}
                      placeholder="Optional internal note"
                      className={fieldClass(false)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Unpaid balance
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-900 tabular-nums">
	                      {previewLoading
                        ? "..."
                        : money(preview?.unpaidTotalMinor || 0)}
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Applied
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-900 tabular-nums">
                      {!previewIsCurrent
                        ? "..."
                        : money(preview?.appliedTotalMinor || 0)}
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Balance after
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-900 tabular-nums">
                      {!previewIsCurrent
                        ? "..."
                        : money(preview?.balanceAfterPaymentMinor || 0)}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleReview}
                    disabled={!canReview}
                    className={[
                      "rounded-xl px-4 py-2 text-sm font-semibold text-white",
                      canReview
                        ? "bg-slate-900 hover:bg-slate-800"
                        : "cursor-not-allowed bg-slate-300",
                    ].join(" ")}
                  >
                    Review Allocation
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSaving}
                    className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Allocation preview
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Oldest unpaid invoices are applied first.
                  </div>
                </div>
                {renderAllocationRows()}
              </div>
            </div>
          )}

          {saveError ? (
            <div className="mt-3">
              <ErrorMessage error={saveError} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
