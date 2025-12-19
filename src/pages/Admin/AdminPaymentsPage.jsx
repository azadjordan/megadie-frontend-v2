import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

export default function AdminPaymentsPage() {
  const [q, setQ] = useState("");
  const [method, setMethod] = useState("all");
  const [sort, setSort] = useState("newest");

  // Placeholder rows (wire later)
  const rows = useMemo(() => [], []);

  const filtered = useMemo(() => {
    // Later: filter by q/method/sort
    return rows;
  }, [rows]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-lg font-semibold text-slate-900">Payments</div>
          <div className="text-sm text-slate-500">
            Track recorded payments and jump to the linked invoice.
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
            onClick={() => {
              setQ("");
              setMethod("all");
              setSort("newest");
            }}
          >
            Reset
          </button>

          <Link
            to="/admin/payments/new"
            className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Add Payment
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-12 md:items-center">
          <div className="md:col-span-6">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by invoice #, user, payment reference..."
              className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            />
          </div>

          <div className="md:col-span-3">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            >
              <option value="all">All methods</option>
              <option value="cash">Cash</option>
              <option value="bank">Bank transfer</option>
              <option value="card">Card</option>
              <option value="other">Other</option>
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
              <option value="amountHigh">Amount (high)</option>
              <option value="amountLow">Amount (low)</option>
            </select>
          </div>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-slate-200">
          <div className="text-sm font-semibold text-slate-900">No payments yet</div>
          <div className="mt-1 text-sm text-slate-500">
            Add payments when money is received. Each payment should be linked to an invoice.
          </div>

          <div className="mt-4 flex flex-col items-center justify-center gap-2 sm:flex-row">
            <Link
              to="/admin/payments/new"
              className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 sm:w-auto"
            >
              Add a payment
            </Link>
            <Link
              to="/admin/invoices"
              className="w-full rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50 sm:w-auto"
            >
              View invoices
            </Link>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl ring-1 ring-slate-200">
          <div className="overflow-x-auto bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
                <tr>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      <Link to={`/admin/payments/${p.id}`} className="hover:underline">
                        {p.reference || p.id}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <Link to={`/admin/invoices/${p.invoiceId}`} className="hover:underline">
                        {p.invoiceNumber || p.invoiceId}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{p.userName}</td>
                    <td className="px-4 py-3 text-slate-700">{p.paymentMethod}</td>
                    <td className="px-4 py-3 text-slate-700">{p.amount}</td>
                    <td className="px-4 py-3 text-slate-500">{p.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="text-xs text-slate-400">
        Tip: keep payments immutable once recorded; if a mistake happens, add an adjusting entry (later) or admin-only correction flow.
      </div>
    </div>
  );
}
