import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

export default function AdminOrdersPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("active");
  const [sort, setSort] = useState("newest");

  const rows = useMemo(() => [], []);

  const filtered = useMemo(() => rows, [rows]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-lg font-semibold text-slate-900">Orders</div>
          <div className="text-sm text-slate-500">
            Track orders created from requests and manage fulfillment.
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
            onClick={() => {
              setQ("");
              setStatus("active");
              setSort("newest");
            }}
          >
            Reset
          </button>
          <Link
            to="/admin/orders/new"
            className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            New Order
          </Link>
        </div>
      </div>

      <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-12 md:items-center">
          <div className="md:col-span-6">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by order #, user, request #..."
              className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            />
          </div>

          <div className="md:col-span-3">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            >
              <option value="active">Active</option>
              <option value="processing">Processing</option>
              <option value="ready">Ready</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="deliverySoon">Delivery soon</option>
            </select>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-slate-200">
          <div className="text-sm font-semibold text-slate-900">No orders yet</div>
          <div className="mt-1 text-sm text-slate-500">
            Orders are typically created from approved requests.
          </div>

          <div className="mt-4 flex flex-col items-center justify-center gap-2 sm:flex-row">
            <Link
              to="/admin/requests"
              className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 sm:w-auto"
            >
              Go to requests
            </Link>
            <Link
              to="/admin/orders/new"
              className="w-full rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50 sm:w-auto"
            >
              Create an order
            </Link>
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
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Delivery</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      <Link to={`/admin/orders/${o.id}`} className="hover:underline">
                        {o.number || o.id}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{o.userName}</td>
                    <td className="px-4 py-3 text-slate-700">{o.status}</td>
                    <td className="px-4 py-3 text-slate-500">{o.deliveryDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
