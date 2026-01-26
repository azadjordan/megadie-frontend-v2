import { useEffect, useMemo, useRef, useState } from "react";
import { FiChevronDown, FiFileText, FiSearch } from "react-icons/fi";
import { toast } from "react-toastify";

import Loader from "../../components/common/Loader";
import useDebouncedValue from "../../hooks/useDebouncedValue";

import { useGetUsersAdminQuery } from "../../features/users/usersApiSlice";
import {
  useGetInvoicesAdminSummaryQuery,
  useLazyGetStatementOfAccountPdfQuery,
} from "../../features/invoices/invoicesApiSlice";

function formatCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  return new Intl.NumberFormat().format(n);
}

function moneyMinorRounded(amountMinor, currency = "AED", factor = 100) {
  if (typeof amountMinor !== "number" || !Number.isFinite(amountMinor))
    return "";

  const f = typeof factor === "number" && factor > 0 ? factor : 100;
  const major = amountMinor / f;

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(major);
  } catch {
    return `${Math.round(major)} ${currency}`;
  }
}

function friendlyApiError(err) {
  const msg =
    err?.data?.message || err?.error || err?.message || "Something went wrong.";
  return String(msg);
}

export default function AdminFinancePage() {
  const [selectedUser, setSelectedUser] = useState(null);
  const [soaUserId, setSoaUserId] = useState(null);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const dropdownRef = useRef(null);

  const trimmedSearch = userSearch.trim();
  const debouncedSearch = useDebouncedValue(trimmedSearch, 600);
  const isDebouncing = trimmedSearch !== debouncedSearch;

  const {
    data: usersData,
    isLoading: usersLoading,
    isError: usersError,
    error: usersErrorMessage,
  } = useGetUsersAdminQuery({
    page: 1,
    limit: 100,
    search: debouncedSearch,
    role: "all",
    sort: "name",
    approvalStatus: "all",
  }, {
    skip: !userDropdownOpen,
  });

  const users = useMemo(
    () => usersData?.data || usersData?.items || [],
    [usersData]
  );

  const selectedUserId = selectedUser?._id || selectedUser?.id || "";
  const selectedUserLabel = useMemo(() => {
    if (!selectedUserId) return "All clients";
    const name = String(selectedUser?.name || "").trim();
    const email = String(selectedUser?.email || "").trim();
    if (name && email) return `${name} - ${email}`;
    return name || email || selectedUserId;
  }, [selectedUserId, selectedUser]);

  const {
    data: summaryData,
    isLoading: summaryLoading,
    isError: summaryError,
  } = useGetInvoicesAdminSummaryQuery(
    selectedUserId ? { user: selectedUserId } : undefined
  );

  const [getStatementOfAccountPdf, { isFetching: isSoaLoading }] =
    useLazyGetStatementOfAccountPdfQuery();

  const unpaidSummary = summaryData?.unpaidTotalMinor ?? 0;
  const overdueSummary = summaryData?.overdueTotalMinor ?? 0;
  const unpaidCount = summaryData?.unpaidCount ?? 0;
  const overdueCount = summaryData?.overdueCount ?? 0;
  const summaryCurrency = summaryData?.currency || "AED";
  const summaryFactor = summaryData?.minorUnitFactor || 100;

  const userOptions = useMemo(() => {
    if (!selectedUserId) return users;
    const exists = users.some(
      (user) => String(user?._id || user?.id) === String(selectedUserId)
    );
    if (exists) return users;
    return selectedUser ? [selectedUser, ...users] : users;
  }, [users, selectedUser, selectedUserId]);

  const handleSoa = async () => {
    if (!selectedUserId) return;
    const user = userOptions.find(
      (u) => String(u._id || u.id) === String(selectedUserId)
    );

    try {
      setSoaUserId(selectedUserId);
      const blob = await getStatementOfAccountPdf(selectedUserId).unwrap();
      const safeName = String(user?.name || selectedUserId)
        .trim()
        .replace(/[^A-Za-z0-9_-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "");
      const dateTag = new Date().toISOString().slice(0, 10);
      const fileName = `soa-${safeName || selectedUserId}-${dateTag}.pdf`;
      const url = window.URL.createObjectURL(blob);
      const newTab = window.open(url, "_blank", "noopener,noreferrer");

      if (!newTab) {
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
      }

      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (err) {
      toast.error(friendlyApiError(err));
    } finally {
      setSoaUserId(null);
    }
  };

  useEffect(() => {
    if (!userDropdownOpen) return;
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [userDropdownOpen]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-lg font-semibold text-slate-900">Finance</div>
          <div className="text-sm text-slate-500">
            Track balances and generate statements of account.
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
          {selectedUserId ? "Client scoped" : "All clients"}
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold text-slate-600">Unpaid balance</div>
          <div className="mt-2 text-lg font-semibold text-slate-900 tabular-nums">
            {summaryLoading
              ? "..."
              : summaryError
              ? "--"
              : moneyMinorRounded(unpaidSummary, summaryCurrency, summaryFactor)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {summaryLoading
              ? "Loading..."
              : summaryError
              ? "Unavailable"
              : `${formatCount(unpaidCount)} invoice${unpaidCount === 1 ? "" : "s"}`}
          </div>
        </div>

        <div className="rounded-2xl bg-rose-50/70 p-4 ring-1 ring-rose-100">
          <div className="text-xs font-semibold text-rose-700">Overdue balance</div>
          <div className="mt-2 text-lg font-semibold text-rose-800 tabular-nums">
            {summaryLoading
              ? "..."
              : summaryError
              ? "--"
              : moneyMinorRounded(overdueSummary, summaryCurrency, summaryFactor)}
          </div>
          <div className="mt-1 text-xs text-rose-700">
            {summaryLoading
              ? "Loading..."
              : summaryError
              ? "Unavailable"
              : `${formatCount(overdueCount)} overdue`}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold text-slate-600">Scope</div>
          <div className="mt-2 text-sm font-semibold text-slate-900">
            {selectedUserId ? "Selected client" : "All clients"}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {selectedUserId
              ? selectedUserLabel
              : "Summary reflects company-wide balances."}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
          <div className="text-sm font-semibold text-slate-900">
            Client scope
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Choose a client to scope balances and generate an SOA.
          </div>

          <div className="mt-4 max-w-xl">
            <label
              htmlFor="finance-user-select"
              className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
            >
              Client
            </label>
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                id="finance-user-select"
                onClick={() => setUserDropdownOpen((open) => !open)}
                className="flex w-full items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              >
                <span className="truncate">{selectedUserLabel}</span>
                <FiChevronDown className="h-4 w-4 text-slate-400" />
              </button>

              {userDropdownOpen ? (
                <div className="absolute z-30 mt-2 w-full rounded-xl bg-white p-2 shadow-xl ring-1 ring-slate-200">
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
                    <FiSearch className="h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Search clients..."
                      className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                    />
                  </div>

                  <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-slate-100 bg-white">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUser(null);
                        setUserSearch("");
                        setUserDropdownOpen(false);
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      <span>All clients</span>
                      {!selectedUserId ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                          Selected
                        </span>
                      ) : null}
                    </button>

                    {usersLoading || isDebouncing ? (
                      <Loader />
                    ) : usersError ? (
                      <div className="px-3 py-2 text-xs text-rose-600">
                        {friendlyApiError(usersErrorMessage)}
                      </div>
                    ) : users.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-slate-500">
                        No clients found.
                      </div>
                    ) : (
                      userOptions.map((user) => {
                        const userId = user._id || user.id;
                        const label = user.name
                          ? `${user.name}${user.email ? ` - ${user.email}` : ""}`
                          : user.email || userId;
                        const isSelected =
                          String(userId) === String(selectedUserId);
                        return (
                          <button
                            type="button"
                            key={userId}
                            onClick={() => {
                              setSelectedUser(user);
                              setUserSearch("");
                              setUserDropdownOpen(false);
                            }}
                            className={[
                              "flex w-full items-center justify-between px-3 py-2 text-left text-xs",
                              isSelected
                                ? "bg-slate-100 text-slate-900"
                                : "text-slate-600 hover:bg-slate-50",
                            ].join(" ")}
                          >
                            <span className="truncate">{label}</span>
                            {isSelected ? (
                              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] text-slate-600">
                                Selected
                              </span>
                            ) : null}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : null}
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Open the dropdown to search up to 100 clients.
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
          <div className="text-sm font-semibold text-slate-900">
            Statement of Account (SOA)
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Generate a PDF statement for the selected client.
          </div>
          <div className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
            {selectedUserId
              ? `Ready for ${selectedUserLabel}.`
              : "Select a client to enable SOA."}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSoa}
              disabled={!selectedUserId || (isSoaLoading && soaUserId === selectedUserId)}
              className={[
                "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold",
                selectedUserId
                  ? "bg-violet-600 text-white hover:bg-violet-500"
                  : "cursor-not-allowed bg-slate-100 text-slate-400",
              ].join(" ")}
            >
              <FiFileText className="h-4 w-4" />
              {isSoaLoading && soaUserId === selectedUserId
                ? "Generating..."
                : "Generate SOA"}
            </button>
            {!selectedUserId ? (
              <span className="text-xs text-slate-500">
                Select a client first.
              </span>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
