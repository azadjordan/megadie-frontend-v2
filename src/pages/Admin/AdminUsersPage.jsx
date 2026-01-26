import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiRefreshCw, FiSettings } from "react-icons/fi";

import Loader from "../../components/common/Loader";
import ErrorMessage from "../../components/common/ErrorMessage";
import Pagination from "../../components/common/Pagination";
import useDebouncedValue from "../../hooks/useDebouncedValue";

import { useGetUsersAdminQuery } from "../../features/users/usersApiSlice";

export default function AdminUsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [approvalStatus, setApprovalStatus] = useState("all");
  const [sort, setSort] = useState("newest");
  const trimmedSearch = search.trim();
  const debouncedSearch = useDebouncedValue(trimmedSearch, 1000);
  const isDebouncing = trimmedSearch !== debouncedSearch;

  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
  } = useGetUsersAdminQuery({
    page,
    search: debouncedSearch,
    role,
    sort,
    approvalStatus,
  });

  const rows = useMemo(() => data?.data || data?.items || [], [data]);
  const total = data?.pagination?.total ?? data?.total ?? rows.length;

  const pagination = useMemo(() => {
    if (!data) return null;
    if (data.pagination) return data.pagination;

    const cur = data.page || 1;
    const totalPages = data.pages || 1;
    return {
      page: cur,
      totalPages,
      hasPrev: cur > 1,
      hasNext: cur < totalPages,
    };
  }, [data]);


  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-lg font-semibold text-slate-900">Users</div>
          <div className="text-sm text-slate-500">
            Search users and jump to their requests, orders, and invoices.
          </div>
        </div>

      </div>

      <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_180px_180px_auto] md:items-end">
          <div>
            <label
              htmlFor="users-search"
              className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
            >
              Search
            </label>
            <input
              id="users-search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name, email, phone..."
              className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            />
          </div>

          <div>
            <label
              htmlFor="users-role"
              className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
            >
              Role
            </label>
            <select
              id="users-role"
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            >
              <option value="all">All roles</option>
              <option value="user">Users</option>
              <option value="admin">Admins</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="users-approval"
              className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
            >
              Approval
            </label>
            <select
              id="users-approval"
              value={approvalStatus}
              onChange={(e) => {
                setApprovalStatus(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            >
              <option value="all">All approvals</option>
              <option value="Approved">Approved</option>
              <option value="Pending">Pending</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="users-sort"
              className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
            >
              Sort
            </label>
            <select
              id="users-sort"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="name">Name</option>
            </select>
          </div>

          <div className="flex items-end md:justify-end">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900"
              onClick={() => {
                setSearch("");
                setRole("all");
                setApprovalStatus("all");
                setSort("newest");
                setPage(1);
              }}
            >
              <FiRefreshCw className="h-3.5 w-3.5 mr-1 text-slate-400" aria-hidden="true" />
              Reset filters
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <div>
            Showing{" "}
            <span className="font-semibold text-slate-900">{rows.length}</span> of{" "}
            <span className="font-semibold text-slate-900">{total}</span> items
            {isDebouncing ? <span className="ml-2">(Searching...)</span> : null}
            {isFetching ? <span className="ml-2">(Updating)</span> : null}
          </div>

          {pagination ? (
            <Pagination
              pagination={pagination}
              onPageChange={setPage}
              variant="compact"
            />
          ) : null}
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
          <Loader />
        </div>
      ) : isError ? (
        <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
          <ErrorMessage error={error} />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-slate-200">
          <div className="text-sm font-semibold text-slate-900">
            No users found
          </div>
          <div className="mt-1 text-sm text-slate-500">
            When users register, they&apos;ll appear here. Use this page to
            quickly jump to their activity.
          </div>

          <div className="mt-4 flex flex-col items-center justify-center gap-2 sm:flex-row">
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
                  <th className="px-4 py-3">Approval</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {rows.map((u) => {
                  const userId = u._id || u.id;
                  const roleLabel = u.isAdmin ? "Admin" : "User";
                  const approval = u.approvalStatus || "Approved";

                  return (
                    <tr key={userId} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">
                          {u.name || userId}
                        </div>
                        {u.phoneNumber ? (
                          <div className="mt-0.5 text-xs text-slate-500">
                            {u.phoneNumber}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{u.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={[
                            "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset",
                            approval === "Approved"
                              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                              : approval === "Rejected"
                              ? "bg-rose-50 text-rose-700 ring-rose-200"
                              : "bg-amber-50 text-amber-700 ring-amber-200",
                          ].join(" ")}
                        >
                          {approval}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{roleLabel}</td>
                      <td className="px-4 py-3 text-center">
                        <Link
                          to={`/admin/users/${userId}/edit`}
                          className="inline-flex items-center justify-center rounded-xl bg-slate-900 p-2 text-white hover:bg-slate-800"
                          title="Edit user"
                          aria-label="Edit user"
                        >
                          <FiSettings className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="text-xs text-slate-400">
        Tip: users page is mainly for search and quick navigation.
      </div>
    </div>
  );
}
