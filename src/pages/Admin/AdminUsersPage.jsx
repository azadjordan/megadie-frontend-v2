import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

export default function AdminUsersPage() {
  const [q, setQ] = useState("");
  const [role, setRole] = useState("all");
  const [sort, setSort] = useState("newest");

  // Placeholder rows (wire later)
  const rows = useMemo(() => [], []);

  const filtered = useMemo(() => {
    // Later: filter by q/role/sort
    return rows;
  }, [rows]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-lg font-semibold text-slate-900">Users</div>
          <div className="text-sm text-slate-500">
            Search users and jump to their requests, orders, and invoices.
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
            onClick={() => {
              setQ("");
              setRole("all");
              setSort("newest");
            }}
          >
            Reset
          </button>

          <Link
            to="/admin/users/new"
            className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            New User
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
              placeholder="Search by name, email, phone..."
              className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            />
          </div>

          <div className="md:col-span-3">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            >
              <option value="all">All roles</option>
              <option value="user">Users</option>
              <option value="admin">Admins</option>
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
              <option value="name">Name</option>
            </select>
          </div>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-slate-200">
          <div className="text-sm font-semibold text-slate-900">No users found</div>
          <div className="mt-1 text-sm text-slate-500">
            When users register, they’ll appear here. Use this page to quickly jump
            to their activity.
          </div>

          <div className="mt-4 flex flex-col items-center justify-center gap-2 sm:flex-row">
            <Link
              to="/admin/users/new"
              className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 sm:w-auto"
            >
              Create a user
            </Link>
            <Link
              to="/admin"
              className="w-full rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50 sm:w-auto"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl ring-1 ring-slate-200">
          <div className="overflow-x-auto bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Quick links</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      <Link to={`/admin/users/${u.id}`} className="hover:underline">
                        {u.name || u.id}
                      </Link>
                      {u.phone ? (
                        <div className="mt-0.5 text-xs font-normal text-slate-500">
                          {u.phone}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{u.email}</td>
                    <td className="px-4 py-3 text-slate-700">{u.role}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          to={`/admin/requests?user=${u.id}`}
                          className="rounded-lg bg-white px-2 py-1 text-xs font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
                        >
                          Requests
                        </Link>
                        <Link
                          to={`/admin/orders?user=${u.id}`}
                          className="rounded-lg bg-white px-2 py-1 text-xs font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
                        >
                          Orders
                        </Link>
                        <Link
                          to={`/admin/invoices?user=${u.id}`}
                          className="rounded-lg bg-white px-2 py-1 text-xs font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
                        >
                          Invoices
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="text-xs text-slate-400">
        Tip: users page is mainly for search + quick navigation (keep it simple).
      </div>
    </div>
  );
}
