// src/pages/Admin/AdminRequestsPage.jsx
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import Pagination from "../../components/common/Pagination";

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
    return iso || "—";
  }
}

function StatusBadge({ status }) {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset";

  const map = {
    Processing: "bg-slate-50 text-slate-700 ring-slate-200",
    Quoted: "bg-blue-50 text-blue-700 ring-blue-200",
    Confirmed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    Cancelled: "bg-rose-50 text-rose-700 ring-rose-200",
  };

  return (
    <span className={`${base} ${map[status] || map.Processing}`}>
      {status}
    </span>
  );
}

function money(amount, currency = "AED") {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";
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

export default function AdminRequestsPage() {
  const [page, setPage] = useState(1);

  /**
   * TEMP EXAMPLE DATA
   * Remove this array once backend is wired.
   * Shape mirrors Quote model + populated user.
   */
  const rows = useMemo(
    () => [
      {
        _id: "q_1001",
        createdAt: "2025-01-18T09:42:00Z",
        status: "Processing",
        totalPrice: 1250,
        requestedItems: [
          { qty: 2, unitPrice: 300 },
          { qty: 1, unitPrice: 650 },
        ],
        user: {
          name: "Ahmed Hassan",
          email: "ahmed@example.com",
        },
      },
      {
        _id: "q_1002",
        createdAt: "2025-01-17T16:10:00Z",
        status: "Quoted",
        totalPrice: 980,
        requestedItems: [
          { qty: 1, unitPrice: 500 },
          { qty: 2, unitPrice: 240 },
        ],
        user: {
          name: "Sara Ali",
          email: "sara@example.com",
        },
      },
      {
        _id: "q_1003",
        createdAt: "2025-01-16T11:30:00Z",
        status: "Confirmed",
        totalPrice: 2150,
        orderId: "ord_3001",
        requestedItems: [
          { qty: 5, unitPrice: 400 },
        ],
        user: {
          name: "Mohamed Youssef",
          email: "mohamed@example.com",
        },
      },
      {
        _id: "q_1004",
        createdAt: "2025-01-15T08:05:00Z",
        status: "Cancelled",
        totalPrice: 0,
        requestedItems: [{ qty: 1, unitPrice: 0 }],
        user: {
          name: "Lina Farouk",
          email: "lina@example.com",
        },
      },
    ],
    []
  );

  const totalPages = 1;
  const totalItems = rows.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-lg font-semibold text-slate-900">Requests</div>
          <div className="text-sm text-slate-500">
            Newest first • Review, quote, confirm, then create an order.
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            to="/admin/requests/new"
            className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
          >
            New Request
          </Link>
        </div>
      </div>

      {/* Filters placeholder */}
      <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
        <div className="h-10 rounded-xl bg-white/60 ring-1 ring-slate-200" />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl ring-1 ring-slate-200">
        <div className="overflow-x-auto bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
              <tr>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {rows.map((q) => {
                const itemCount = q.requestedItems.reduce(
                  (sum, it) => sum + it.qty,
                  0
                );
                const hasOrder = Boolean(q.orderId);

                return (
                  <tr key={q._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700">
                      {formatDateTime(q.createdAt)}
                    </td>

                    <td className="px-4 py-3">
                      <StatusBadge status={q.status} />
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">
                        {q.user.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {q.user.email}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={[
                          "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
                          hasOrder
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                            : "bg-slate-50 text-slate-700 ring-slate-200",
                        ].join(" ")}
                      >
                        {hasOrder ? "Created" : "Not created"}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-slate-700">{itemCount}</td>

                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {money(q.totalPrice)}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/admin/requests/${q._id}`}
                        className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                      >
                        Details
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3">
          <div className="text-sm text-slate-500">
            Showing {rows.length} request(s)
          </div>

          <Pagination
            page={page}
            pages={totalPages}
            onPageChange={(p) => setPage(p)}
          />
        </div>
      </div>
    </div>
  );
}
