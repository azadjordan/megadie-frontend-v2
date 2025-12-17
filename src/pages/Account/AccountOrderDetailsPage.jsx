import { Link, useNavigate, useParams } from "react-router-dom";

import Loader from "../../components/common/Loader";
import ErrorMessage from "../../components/common/ErrorMessage";

import { useGetOrderByIdQuery } from "../../features/orders/ordersApiSlice";

function formatDate(iso) {
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
    Cancelled: "bg-slate-100 text-slate-700 ring-slate-200",
  };
  return (
    <span className={`${base} ${map[status] || map.Processing}`}>
      {status || "—"}
    </span>
  );
}

export default function AccountOrderDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, isError, error, refetch, isFetching } =
    useGetOrderByIdQuery(id);

  const order = data?.data;

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
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate("/account/orders")}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
          >
            Back
          </button>

          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
          >
            Retry
          </button>
        </div>

        <ErrorMessage error={error} />
      </div>
    );
  }

  const invoiceId =
    order?.invoice?._id || (typeof order?.invoice === "string" ? order.invoice : null);
  const invoiceNumber = order?.invoice?.invoiceNumber || null;

  const items = Array.isArray(order?.orderItems) ? order.orderItems : [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {order?.orderNumber || "Order details"}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <StatusBadge status={order?.status} />
            <div className="text-sm text-slate-600">
              Created: <span className="text-slate-900">{formatDate(order?.createdAt)}</span>
            </div>
            {order?.deliveredAt ? (
              <div className="text-sm text-slate-600">
                Delivered: <span className="text-slate-900">{formatDate(order?.deliveredAt)}</span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
          >
            Back
          </button>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-60"
          >
            {isFetching ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* Invoice link */}
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="text-sm font-semibold text-slate-900">Invoice</div>
        <div className="mt-2 text-sm text-slate-700">
          {invoiceId ? (
            <>
              <Link
                to={`/account/invoices/${invoiceId}`}
                className="font-semibold text-slate-900 hover:underline"
              >
                {invoiceNumber || "View invoice"}
              </Link>
              <span className="text-slate-500"> (payments and PDF inside)</span>
            </>
          ) : (
            <span className="text-slate-600">Not generated yet.</span>
          )}
        </div>
      </div>

      {/* Items */}
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
                key={`${order?._id}-${idx}`}
                className="grid grid-cols-12 items-center px-5 py-3 text-sm text-slate-800 border-t border-slate-200"
              >
                <div className="col-span-9 min-w-0">
                  <div className="truncate font-semibold text-slate-900">{name}</div>
                  {sku ? <div className="text-xs text-slate-500">SKU: {sku}</div> : null}
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
