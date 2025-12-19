import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

export default function AdminInvoicesPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("unpaid");
  const [sort, setSort] = useState("newest");

  const rows = useMemo(() => [], []);
  const filtered = useMemo(() => rows, [rows]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-lg font-semibold text-slate-900">Invoices</div>
          <div className="text-sm text-slate-500">
            Create/update invoices and record payments.
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
            onClick={() => {
              setQ("");
              setStatus("unpaid");
              setSort("newest");
            }}
          >
            Reset
          </button>
          <Link
            to="/admin/invoices/new"
            className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            New Invoice
          </Link>
        </div>
      </div>

      <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-12 md:items-center">
          <div className="md:col-span-6">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by invoice #, user, order #..."
              className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            />
          </div>

          <div className="md:col-span-3">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            >
              <option value="unpaid">Unpaid</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="all">All</option>
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
              <option value="dueSoon">Due soon</option>
            </select>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-slate-200">
          <div className="text-sm font-semibold text-slate-900">No invoices yet</div>
          <div className="mt-1 text-sm text-slate-500">
            Create invoices after an order is confirmed.
          </div>

          <div className="mt-4 flex flex-col items-center justify-center gap-2 sm:flex-row">
            <Link
              to="/admin/invoices/new"
              className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 sm:w-auto"
            >
              Create an invoice
            </Link>
            <Link
              to="/admin/orders"
              className="w-full rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50 sm:w-auto"
            >
              View orders
            </Link>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl ring-1 ring-slate-200">
          <div className="overflow-x-auto bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
                <tr>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      <Link to={`/admin/invoices/${inv.id}`} className="hover:underline">
                        {inv.number || inv.id}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{inv.userName}</td>
                    <td className="px-4 py-3 text-slate-700">{inv.status}</td>
                    <td className="px-4 py-3 text-slate-500">{inv.balance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="text-xs text-slate-400">
        Tip: keep invoice actions safe — confirmation on delete, and show payment history clearly.
      </div>
    </div>
  );
}
