// src/pages/Admin/AdminOrdersPage.jsx
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { FiSettings, FiTrash2, FiRefreshCw } from "react-icons/fi";

import Loader from "../../components/common/Loader";
import ErrorMessage from "../../components/common/ErrorMessage";
import Pagination from "../../components/common/Pagination";
import MarkDeliveredModal from "../../components/admin/MarkDeliveredModal";
import CreateInvoiceModal from "../../components/admin/CreateInvoiceModal";

import {
  useDeleteOrderByAdminMutation,
  useGetOrdersAdminQuery,
  useMarkOrderDeliveredMutation,
  useUpdateOrderByAdminMutation,
} from "../../features/orders/ordersApiSlice";
import { useCreateInvoiceFromOrderMutation } from "../../features/invoices/invoicesApiSlice";
import useDebouncedValue from "../../hooks/useDebouncedValue";

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

function formatItemCount(items) {
  const count = Array.isArray(items) ? items.length : null;
  if (count == null) return "-";
  return `${count} item${count === 1 ? "" : "s"}`;
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

function InvoiceCell({ order, onCreateInvoice }) {
  const hasInvoice = Boolean(order?.invoice);
  const canCreate =
    !hasInvoice &&
    ["Shipping", "Delivered"].includes(order?.status || "");

  const invoiceNo =
    order?.invoice?.invoiceNumber || order?.invoice?.number || order?.invoice?._id;

  if (hasInvoice) {
    return (
      <div className="text-[10px] font-semibold text-slate-500">
        {invoiceNo ? String(invoiceNo) : "Invoice"}
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={!canCreate}
      className={[
        "inline-flex h-6 w-20 items-center justify-center rounded-md text-[10px] font-semibold ring-1 transition",
        canCreate
          ? "bg-violet-600 text-white ring-violet-600 hover:bg-violet-700"
          : "bg-violet-600 text-white opacity-50 ring-violet-600 cursor-not-allowed",
      ].join(" ")}
      onClick={() => {
        if (!canCreate || !onCreateInvoice) return;
        onCreateInvoice(order);
      }}
      title={
        canCreate
          ? "Create invoice"
          : hasInvoice && invoiceNo
          ? `Invoice ${invoiceNo}`
          : "Invoice can be created only for Shipping or Delivered orders."
      }
    >
      Invoice
    </button>
  );
}

function ActionsCell({ order, className, onDelete, isDeleting }) {
  const canDelete = order.status === "Cancelled" && !order.invoice;
  const classes = className || "flex items-center justify-center gap-2";

  return (
    <div className={classes}>
      {/* Edit */}
      <Link
        to={`/admin/orders/${order._id}`}
        className="inline-flex items-center justify-center rounded-xl bg-slate-900 p-2 text-white ring-1 ring-slate-900 hover:bg-slate-800"
        title="Open order"
        aria-label="Open order"
      >
        <FiSettings className="h-4 w-4" />
      </Link>

      {/* Delete */}
      <button
        type="button"
        disabled={!canDelete || isDeleting}
        className={[
          "inline-flex items-center justify-center rounded-xl p-2 ring-1 transition",
          canDelete && !isDeleting
            ? "bg-white text-rose-600 ring-slate-200 hover:bg-rose-50"
            : "bg-white text-slate-300 ring-slate-200 cursor-not-allowed",
        ].join(" ")}
        title={
          isDeleting
            ? "Deleting..."
            : canDelete
            ? "Delete order"
            : "Only cancelled orders without invoices can be deleted"
        }
        aria-label="Delete order"
        onClick={() => {
          if (!canDelete || !onDelete || isDeleting) return;
          onDelete();
        }}
      >
        <FiTrash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function AdminOrdersPage() {
  // Note: Server-side filters (must match backend query params)
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  // Note: Pagination (server-side)
  const [page, setPage] = useState(1);

  const trimmedSearch = search.trim();
  const debouncedSearch = useDebouncedValue(trimmedSearch, 500);
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
    status,
    search: searchParam,
  });

  const rows = useMemo(() => ordersRes?.data || [], [ordersRes]);
  const pagination = ordersRes?.pagination;
  const totalItems =
    typeof pagination?.total === "number" ? pagination.total : rows.length;

  const [deletingId, setDeletingId] = useState(null);
  const [deliveringId, setDeliveringId] = useState(null);
  const [shippingId, setShippingId] = useState(null);
  const [deliverTarget, setDeliverTarget] = useState(null);
  const [deliveredBy, setDeliveredBy] = useState("");
  const [deliverFormError, setDeliverFormError] = useState("");
  const [createTarget, setCreateTarget] = useState(null);
  const [createForm, setCreateForm] = useState({
    dueDate: "",
    adminNote: "",
    currency: "AED",
    minorUnitFactor: "100",
  });
  const [createFormError, setCreateFormError] = useState("");
  const [deleteOrderByAdmin, { isLoading: isDeleting }] =
    useDeleteOrderByAdminMutation();
  const [markOrderDelivered, { isLoading: isDelivering }] =
    useMarkOrderDeliveredMutation();
  const [updateOrderByAdmin, { isLoading: isShipping }] =
    useUpdateOrderByAdminMutation();
  const [createInvoiceFromOrder, { isLoading: isCreating, error: createError }] =
    useCreateInvoiceFromOrderMutation();

  const handleDelete = async (order) => {
    if (!order) return;
    if (order.status !== "Cancelled" || order.invoice) return;

    const ok = window.confirm(
      "Delete this cancelled order? This will also remove its invoice and payments."
    );
    if (!ok) return;

    try {
      setDeletingId(order._id);
      const res = await deleteOrderByAdmin(order._id).unwrap();
      toast.success(res?.message || "Order deleted.");
    } catch (err) {
      toast.error(err?.data?.message || err?.error || "Delete failed.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleMarkDelivered = async (order) => {
    if (
      !order ||
      order.status !== "Shipping"
    ) {
      return;
    }

    setDeliverTarget(order);
    setDeliveredBy(order.deliveredBy || "");
    setDeliverFormError("");
  };

  const handleMarkShipping = async (order) => {
    if (!order || order.status !== "Processing") return;

    try {
      setShippingId(order._id);
      await updateOrderByAdmin({
        id: order._id,
        status: "Shipping",
      }).unwrap();
    } catch (err) {
      toast.error(err?.data?.message || err?.error || "Failed to mark shipping.");
    } finally {
      setShippingId(null);
    }
  };
  const closeDeliverModal = () => {
    if (isDelivering) return;
    setDeliverTarget(null);
    setDeliveredBy("");
    setDeliverFormError("");
  };

  const confirmDeliver = async () => {
    if (!deliverTarget) return;
    const name = deliveredBy.trim();
    if (!name) {
      setDeliverFormError("Delivered by is required.");
      return;
    }

    try {
      setDeliveringId(deliverTarget._id);
      await markOrderDelivered({
        id: deliverTarget._id,
        deliveredBy: name,
      }).unwrap();
      closeDeliverModal();
    } catch (err) {
      setDeliverFormError(
        err?.data?.message || err?.error || "Failed to mark delivered."
      );
    } finally {
      setDeliveringId(null);
    }
  };

  const openCreateModal = (order) => {
    if (!order) return;
    setCreateTarget(order);
    setCreateForm({
      dueDate: "",
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
      // ErrorMessage will show it
    }
  };


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

      <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_200px_auto] md:items-end">
          <div>
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
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by user name, email, or order #"
              className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            />
          </div>

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
                setStatus(e.target.value);
                setPage(1);
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

          <div className="flex items-end md:justify-end">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900"
              onClick={() => {
                setSearch("");
                setStatus("all");
                setPage(1);
              }}
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
            <span className="font-semibold text-slate-900">{totalItems}</span>{" "}
            items
            {isDebouncing ? <span className="ml-2">(Searching...)</span> : null}
            {isFetching ? <span className="ml-2">(Updating)</span> : null}
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
        <Loader />
      ) : isError ? (
        <ErrorMessage error={error} />
      ) : rows.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-slate-200">
          <div className="text-sm font-semibold text-slate-900">No orders found</div>
          <div className="mt-1 text-sm text-slate-500">
            Try changing the status filter or clearing the user filter.
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl ring-1 ring-slate-200">
          <div className="overflow-x-auto bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Workflow</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {rows.map((o) => (
                  <tr key={o._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link
                        to={`/admin/orders/${o._id}`}
                        className="font-semibold text-slate-900 hover:underline"
                      >
                        {o.orderNumber || o._id}
                      </Link>
                      <div className="mt-0.5 text-xs text-slate-500">
                        Created: {formatDateTime(o.createdAt)}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-slate-700">
                      <div className="font-medium text-slate-900">
                        {o.user?.name || "-"}
                      </div>
                      <div className="text-xs text-slate-500">{o.user?.email || ""}</div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <StatusBadge status={o.status} size="compact" />
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-col items-center gap-2">
                        {o.status === "Processing" ? (
                          <button
                            type="button"
                            className={[
                              "inline-flex h-6 w-20 items-center justify-center rounded-md text-[10px] font-semibold ring-1 transition",
                              isShipping && shippingId === o._id
                                ? "cursor-not-allowed bg-blue-600 text-white opacity-50 ring-blue-600"
                                : "bg-blue-600 text-white ring-blue-600 hover:bg-blue-700",
                            ].join(" ")}
                            disabled={isShipping && shippingId === o._id}
                            onClick={() => handleMarkShipping(o)}
                            title="Mark Shipping"
                          >
                            {isShipping && shippingId === o._id ? "Shipping..." : "Ship"}
                          </button>
                        ) : null}
                        {o.status === "Shipping" ? (
                          <button
                            type="button"
                            className={[
                              "inline-flex h-6 w-20 items-center justify-center rounded-md text-[10px] font-semibold ring-1 transition",
                              isDelivering && deliveringId === o._id
                                ? "cursor-not-allowed bg-emerald-600 text-white opacity-50 ring-emerald-600"
                                : "bg-emerald-600 text-white ring-emerald-600 hover:bg-emerald-700",
                            ].join(" ")}
                            disabled={isDelivering && deliveringId === o._id}
                            onClick={() => handleMarkDelivered(o)}
                            title="Mark Delivered"
                          >
                            {isDelivering && deliveringId === o._id
                              ? "Delivering..."
                              : "Deliver"}
                          </button>
                        ) : null}
                        <InvoiceCell order={o} onCreateInvoice={openCreateModal} />
                      </div>
                    </td>

                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {formatMoney(o.totalPrice)}
                      <div className="mt-0.5 text-xs font-normal text-slate-500">
                        {formatItemCount(o.orderItems)}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <ActionsCell
                          order={o}
                          onDelete={() => handleDelete(o)}
                          isDeleting={isDeleting && deletingId === o._id}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <MarkDeliveredModal
        open={Boolean(deliverTarget)}
        order={deliverTarget}
        deliveredBy={deliveredBy}
        onDeliveredByChange={setDeliveredBy}
        onClose={closeDeliverModal}
        onSubmit={confirmDeliver}
        isSaving={isDelivering}
        error={null}
        formError={deliverFormError}
      />

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
    </div>
  );
}
