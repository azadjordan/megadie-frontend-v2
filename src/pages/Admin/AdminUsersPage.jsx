import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiRefreshCw, FiSettings, FiTrash2 } from "react-icons/fi";
import { toast } from "react-toastify";

import Loader from "../../components/common/Loader";
import ErrorMessage from "../../components/common/ErrorMessage";
import Pagination from "../../components/common/Pagination";
import useDebouncedValue from "../../hooks/useDebouncedValue";

import { useDeleteUserMutation, useGetUsersAdminQuery } from "../../features/users/usersApiSlice";

function getApprovalBadgeClasses(approval) {
  if (approval === "Approved") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }
  if (approval === "Rejected") {
    return "bg-rose-50 text-rose-700 ring-rose-200";
  }
  return "bg-amber-50 text-amber-700 ring-amber-200";
}

function getUserRowMeta(user, state = {}) {
  const userId = user?._id || user?.id;
  const roleLabel = user?.isAdmin ? "Admin" : "User";
  const approval = user?.approvalStatus || "Approved";
  const approvalClasses = getApprovalBadgeClasses(approval);
  const linkCounts = user?.linkCounts || {};
  const ordersCount = Number(linkCounts.orders) || 0;
  const invoicesCount = Number(linkCounts.invoices) || 0;
  const requestsCount = Number(linkCounts.requests) || 0;
  const hasLinked =
    ordersCount > 0 || invoicesCount > 0 || requestsCount > 0;
  const canDelete =
    user?.canDelete ??
    (!user?.isAdmin && approval === "Rejected" && !hasLinked);
  const rowDeleting = state.deletingId === userId;
  let deleteReason = "Delete user";
  if (user?.isAdmin) {
    deleteReason = "Admin users cannot be deleted.";
  } else if (approval !== "Rejected") {
    deleteReason = "Only rejected users can be deleted.";
  } else if (hasLinked) {
    deleteReason = "User has linked orders, invoices, or requests.";
  }
  return {
    userId,
    roleLabel,
    approval,
    approvalClasses,
    ordersCount,
    invoicesCount,
    requestsCount,
    hasLinked,
    canDelete: Boolean(canDelete),
    deleteReason,
    rowDeleting,
  };
}

export default function AdminUsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [approvalStatus, setApprovalStatus] = useState("all");
  const [sort, setSort] = useState("newest");
  const [filtersOpen, setFiltersOpen] = useState(false);
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
  const [deleteUser, { isLoading: isDeleting }] = useDeleteUserMutation();
  const [deletingId, setDeletingId] = useState(null);

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

  const onDeleteUser = async (user) => {
    const userId = user?._id || user?.id;
    if (!userId) return;
    const name = user?.name || user?.email || userId;
    // eslint-disable-next-line no-restricted-globals
    const ok = confirm(`Delete user "${name}"?`);
    if (!ok) return;
    try {
      setDeletingId(userId);
      const res = await deleteUser(userId).unwrap();
      toast.success(res?.message || "User deleted.");
    } catch (err) {
      const msg =
        err?.data?.message ||
        err?.error ||
        err?.message ||
        "Failed to delete user.";
      toast.error(msg);
    } finally {
      setDeletingId(null);
    }
  };

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
          <div className="flex items-end gap-2 md:contents">
            <div className="flex-1">
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
            <button
              type="button"
              onClick={() => setFiltersOpen((prev) => !prev)}
              className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 md:hidden"
              aria-expanded={filtersOpen}
              aria-controls="users-filters-panel"
            >
              {filtersOpen ? "Hide filters" : "Filters"}
            </button>
          </div>

          <div
            id="users-filters-panel"
            className={[
              filtersOpen ? "grid grid-cols-2 gap-2" : "hidden",
              "md:contents",
            ].join(" ")}
          >
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

            <div className="col-span-2 flex items-end md:col-auto md:justify-end">
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
                <FiRefreshCw
                  className="h-3.5 w-3.5 mr-1 text-slate-400"
                  aria-hidden="true"
                />
                Reset filters
              </button>
            </div>
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
        <div className="space-y-3">
          <div className="space-y-3 md:hidden">
            {rows.map((u) => {
              const row = getUserRowMeta(u, { deletingId });
              return (
                <div
                  key={row.userId}
                  className="rounded-2xl bg-white p-4 ring-1 ring-slate-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900">
                        {u.name || row.userId}
                      </div>
                      <div className="text-xs text-slate-500">{u.email}</div>
                    </div>
                    <span
                      className={[
                        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset",
                        row.approvalClasses,
                      ].join(" ")}
                    >
                      {row.approval}
                    </span>
                  </div>

                  <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Phone
                    </div>
                    <div className="mt-1 text-xs text-slate-700">
                      {u.phoneNumber || "—"}
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-slate-600">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Role
                    </span>
                    <div className="mt-1 font-semibold text-slate-900">
                      {row.roleLabel}
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/admin/users/${row.userId}/edit`}
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-white hover:bg-slate-800"
                        title="Edit user"
                        aria-label="Edit user"
                      >
                        <FiSettings className="h-3.5 w-3.5" />
                        Edit user
                      </Link>
                      {row.approval === "Rejected" ? (
                        <button
                          type="button"
                          onClick={() => onDeleteUser(u)}
                          disabled={!row.canDelete || row.rowDeleting || isDeleting}
                          title={row.deleteReason}
                          className={[
                            "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-semibold uppercase tracking-wider",
                            !row.canDelete || row.rowDeleting || isDeleting
                              ? "cursor-not-allowed border-slate-200 text-slate-300"
                              : "border-rose-200 text-rose-600 hover:bg-rose-50",
                          ].join(" ")}
                        >
                          <FiTrash2 className="h-3.5 w-3.5" />
                          {row.rowDeleting ? "Deleting..." : "Delete"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden overflow-hidden rounded-2xl ring-1 ring-slate-200 md:block">
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
                    const row = getUserRowMeta(u, { deletingId });

                    return (
                      <tr key={row.userId} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">
                            {u.name || row.userId}
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
                              row.approvalClasses,
                            ].join(" ")}
                          >
                            {row.approval}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {row.roleLabel}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex items-center justify-center gap-2">
                            <Link
                              to={`/admin/users/${row.userId}/edit`}
                              className="inline-flex items-center justify-center rounded-xl bg-slate-900 p-2 text-white hover:bg-slate-800"
                              title="Edit user"
                              aria-label="Edit user"
                            >
                              <FiSettings className="h-3.5 w-3.5" />
                            </Link>
                            {row.approval === "Rejected" ? (
                              <button
                                type="button"
                                onClick={() => onDeleteUser(u)}
                                disabled={!row.canDelete || row.rowDeleting || isDeleting}
                                title={row.deleteReason}
                                className={[
                                  "inline-flex items-center justify-center rounded-xl p-2 ring-1 ring-inset",
                                  !row.canDelete || row.rowDeleting || isDeleting
                                    ? "cursor-not-allowed bg-white text-slate-300 ring-slate-200"
                                    : "bg-white text-rose-600 ring-rose-200 hover:bg-rose-50",
                                ].join(" ")}
                                aria-label="Delete user"
                              >
                                <FiTrash2 className="h-3.5 w-3.5" />
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="text-xs text-slate-400">
        Tip: users page is mainly for search and quick navigation.
      </div>
    </div>
  );
}
