// src/pages/Account/AccountOrderDetailsPage.jsx
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiChevronLeft } from "react-icons/fi";

import Loader from "../../components/common/Loader";
import ErrorMessage from "../../components/common/ErrorMessage";

import { useGetOrderByIdQuery } from "../../features/orders/ordersApiSlice";
import useAccountHeader from "../../hooks/useAccountHeader";

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
    return iso || "";
  }
}

function StatusBadge({ status }) {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset";
  const map = {
    Processing: "bg-slate-50 text-slate-700 ring-slate-200",
    Delivered: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    Cancelled: "bg-rose-50 text-rose-800 ring-rose-200",
  };
  return (
    <span className={`${base} ${map[status] || map.Processing}`}>
      {status || "—"}
    </span>
  );
}

function MetaItem({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-semibold text-slate-600">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function BackButton({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
    >
      <FiChevronLeft className="h-4 w-4" aria-hidden="true" />
      {children}
    </button>
  );
}

export default function AccountOrderDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setAccountHeader, clearAccountHeader } = useAccountHeader();

  const { data, isLoading, isError, error, refetch } = useGetOrderByIdQuery(id);

  // ✅ handle both response shapes (if backend returns order directly)
  const order = data?.data ?? data;

  // ✅ compute invoiceId BEFORE useEffect so header can use it
  const invoiceId =
    order?.invoice?._id ||
    (typeof order?.invoice === "string" ? order.invoice : null);

  useEffect(() => {
    const backTarget = () =>
      invoiceId
        ? navigate(`/account/billing/invoices/${invoiceId}`)
        : navigate("/account/billing/invoices");

    setAccountHeader({
      back: null,
      title: "Order Details",
      subtitle: "Review items and order information.",
      right: null,
      bottom: (
        <div className="flex items-center justify-between gap-3">
          <BackButton onClick={backTarget}>
            {invoiceId ? "Back to Invoice" : "Back"}
          </BackButton>
          <span />
        </div>
      ),
    });

    return () => clearAccountHeader();
  }, [setAccountHeader, clearAccountHeader, navigate, invoiceId]);

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <Loader />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <ErrorMessage error={error} />
        <div>
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const items = Array.isArray(order?.orderItems) ? order.orderItems : [];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden">
        <div className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold text-slate-900">
                {order?.orderNumber || "Order details"}
              </h1>

              {/* ✅ Keep only status here (no dates mixed into the badge row) */}
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <StatusBadge status={order?.status} />
              </div>

              {/* ✅ Clean meta area: Created + Delivered (if available) */}
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <MetaItem
                  label="Created"
                  value={order?.createdAt ? formatDateTime(order.createdAt) : "—"}
                />
                <MetaItem
                  label="Delivered"
                  value={
                    order?.deliveredAt ? formatDateTime(order.deliveredAt) : "—"
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold text-slate-900">Items</div>
            <div className="text-xs text-slate-500">
              {items.length} item{items.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 bg-slate-50 px-5 py-3 text-xs font-semibold text-slate-700">
          <div className="col-span-9">Product</div>
          <div className="col-span-3 text-right">Qty</div>
        </div>

        {items.length === 0 ? (
          <div className="px-5 py-4 text-sm text-slate-600">No items.</div>
        ) : (
          items.map((it, idx) => {
            const name =
              it?.product?.name ||
              (typeof it?.product === "string" ? it.product : "") ||
              "—";
            const sku = it?.sku || it?.product?.sku || "";
            const qty = it?.qty ?? 0;

            return (
              <div
                key={`${order?._id || "order"}-${idx}`}
                className="grid grid-cols-12 items-center px-5 py-3 text-sm text-slate-800 border-t border-slate-200"
              >
                <div className="col-span-9 min-w-0">
                  <div className="truncate font-semibold text-slate-900">
                    {name}
                  </div>
                  {sku ? (
                    <div className="text-xs text-slate-500">SKU: {sku}</div>
                  ) : null}
                </div>
                <div className="col-span-3 text-right tabular-nums">{qty}</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
