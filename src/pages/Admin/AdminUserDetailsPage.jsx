import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { FiChevronLeft } from "react-icons/fi";
import { toast } from "react-toastify";

import Loader from "../../components/common/Loader";
import ErrorMessage from "../../components/common/ErrorMessage";

import {
  useGetUserByIdQuery,
  useUpdateUserMutation,
  useUpdateUserApprovalStatusMutation,
  useUpdateUserPasswordByAdminMutation,
} from "../../features/users/usersApiSlice";
import { useGetPriceRulesQuery } from "../../features/priceRules/priceRulesApiSlice";
import {
  useGetUserPricesQuery,
  useUpsertUserPriceMutation,
  useDeleteUserPriceMutation,
} from "../../features/userPrices/userPricesApiSlice";

const parsePrice = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return null;
  return num;
};

const USER_LIST_QUERY_KEYS = ["page", "search", "role", "approvalStatus", "sort"];

function buildUsersListHref(rawSearch = "") {
  const source = new URLSearchParams(rawSearch);
  const filtered = new URLSearchParams();

  for (const key of USER_LIST_QUERY_KEYS) {
    const value = source.get(key);
    if (value) filtered.set(key, value);
  }

  const qs = filtered.toString();
  return qs ? `/admin/users?${qs}` : "/admin/users";
}

export default function AdminUserDetailsPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const backToUsersHref = useMemo(
    () => buildUsersListHref(location.search),
    [location.search]
  );

  const {
    data: userResult,
    isLoading,
    isError,
    error,
    isFetching,
  } = useGetUserByIdQuery(id, { skip: !id });

  const user = userResult?.data ?? userResult;
  const userId = user?._id || user?.id;

  const [updateUser, { isLoading: isSaving, error: saveError }] =
    useUpdateUserMutation();
  const [
    updateUserApprovalStatus,
    { isLoading: isUpdatingApproval, error: approvalError },
  ] = useUpdateUserApprovalStatusMutation();
  const [
    updateUserPasswordByAdmin,
    { isLoading: isUpdatingPassword, error: passwordError },
  ] = useUpdateUserPasswordByAdminMutation();
  const [upsertUserPrice, { isLoading: isUpserting, error: upsertError }] =
    useUpsertUserPriceMutation();
  const [deleteUserPrice, { isLoading: isDeleting, error: deleteError }] =
    useDeleteUserPriceMutation();

  const [activeTab, setActiveTab] = useState("info");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState("Approved");
  const [saved, setSaved] = useState(false);
  const [approvalSaved, setApprovalSaved] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [newRule, setNewRule] = useState("");
  const [newPriceStr, setNewPriceStr] = useState("");
  const [editRowId, setEditRowId] = useState(null);
  const [editPriceStr, setEditPriceStr] = useState("");

  useEffect(() => {
    if (!user) return;
    setName(user.name || "");
    setEmail(user.email || "");
    setPhoneNumber(user.phoneNumber || "");
    setAddress(user.address || "");
    setIsAdmin(Boolean(user.isAdmin));
    setApprovalStatus(user.approvalStatus || "Approved");
    setSaved(false);
    setApprovalSaved(false);
    setPassword("");
    setConfirmPassword("");
  }, [user?._id, user?.id]);

  useEffect(() => {
    if (!userId) return;
    setActiveTab("info");
    setNewRule("");
    setNewPriceStr("");
    setEditRowId(null);
    setEditPriceStr("");
  }, [userId]);

  useEffect(() => {
    if (isAdmin) {
      setApprovalStatus("Approved");
    }
  }, [isAdmin]);

  const shouldLoadPricing = Boolean(userId) && activeTab === "pricing";

  const {
    data: userPricesResult,
    isLoading: isUserPricesLoading,
    error: userPricesError,
  } = useGetUserPricesQuery(userId, { skip: !shouldLoadPricing });

  const {
    data: priceRulesResult,
    isLoading: isRulesLoading,
    error: rulesError,
  } = useGetPriceRulesQuery(undefined, { skip: !shouldLoadPricing });

  const userPrices = userPricesResult?.data || [];
  const priceRules = priceRulesResult?.data || [];

  const availableRules = useMemo(() => {
    const used = new Set(userPrices.map((p) => p.priceRule));
    return priceRules.filter((rule) => rule?.code && !used.has(rule.code));
  }, [userPrices, priceRules]);

  const hasInfoChanges = useMemo(() => {
    if (!user) return false;
    const base = {
      name: String(user.name || "").trim(),
      email: String(user.email || "").trim().toLowerCase(),
      phoneNumber: String(user.phoneNumber || "").trim(),
      address: String(user.address || "").trim(),
      isAdmin: Boolean(user.isAdmin),
    };
    const current = {
      name: String(name || "").trim(),
      email: String(email || "").trim().toLowerCase(),
      phoneNumber: String(phoneNumber || "").trim(),
      address: String(address || "").trim(),
      isAdmin: Boolean(isAdmin),
    };
    return Object.keys(base).some((key) => base[key] !== current[key]);
  }, [user, name, email, phoneNumber, address, isAdmin]);

  const canUpdateInfo = hasInfoChanges && !isSaving;
  const approvalBase = String(user?.approvalStatus || "Approved");
  const hasApprovalChanges = approvalStatus !== approvalBase;
  const canUpdateApproval =
    Boolean(userId) && hasApprovalChanges && !isUpdatingApproval && !isAdmin;

  useEffect(() => {
    if (newRule && !availableRules.some((rule) => rule.code === newRule)) {
      setNewRule("");
    }
  }, [newRule, availableRules]);

  useEffect(() => {
    if (editRowId && !userPrices.some((p) => p._id === editRowId)) {
      setEditRowId(null);
      setEditPriceStr("");
    }
  }, [editRowId, userPrices]);

  const isPricingBusy =
    isUserPricesLoading || isRulesLoading || isUpserting || isDeleting;

  const pricingError =
    userPricesError || rulesError || upsertError || deleteError;
  const newPrice = parsePrice(newPriceStr);
  const canUpdatePassword =
    password.length >= 6 &&
    confirmPassword.length >= 6 &&
    password === confirmPassword &&
    !isUpdatingPassword;

  const onSaveUserInfo = async () => {
    if (!userId || !hasInfoChanges) return;
    setSaved(false);

    const payload = {
      id: userId,
      name: name.trim(),
      email: email.trim(),
      phoneNumber: phoneNumber.trim(),
      address: address.trim(),
      isAdmin,
    };

    try {
      await updateUser(payload).unwrap();
      setSaved(true);
      toast.success("User info updated.");
    } catch {
      // ErrorMessage handles it
    }
  };

  const onUpdateApproval = async () => {
    if (!userId || !canUpdateApproval) return;
    setApprovalSaved(false);

    try {
      await updateUserApprovalStatus({
        id: userId,
        approvalStatus,
      }).unwrap();
      setApprovalSaved(true);
      toast.success("Approval status updated.");
    } catch {
      // ErrorMessage handles it
    }
  };

  const onUpdatePassword = async () => {
    if (!userId || !canUpdatePassword) return;
    try {
      await updateUserPasswordByAdmin({ id: userId, password }).unwrap();
      setPassword("");
      setConfirmPassword("");
      toast.success("Password updated.");
    } catch {
      // ErrorMessage handles it
    }
  };

  const onAddPrice = async () => {
    const price = parsePrice(newPriceStr);
    if (!userId || !newRule || price == null) return;

    try {
      await upsertUserPrice({
        userId,
        priceRule: newRule,
        unitPrice: price,
      }).unwrap();
      setNewRule("");
      setNewPriceStr("");
      toast.success(`UserPrice record added.`);
    } catch {
      // ErrorMessage handles it
    }
  };

  const onStartEdit = (row) => {
    if (!row?._id) return;
    setEditRowId(row._id);
    setEditPriceStr(String(row.unitPrice ?? ""));
  };

  const onCancelEdit = () => {
    setEditRowId(null);
    setEditPriceStr("");
  };

  const onSaveEdit = async (row) => {
    const price = parsePrice(editPriceStr);
    if (!row?._id || !userId || price == null) return;

    try {
      await upsertUserPrice({
        userId,
        priceRule: row.priceRule,
        unitPrice: price,
      }).unwrap();
      setEditRowId(null);
      setEditPriceStr("");
      toast.success(`UserPrice record updated.`);
    } catch {
      // ErrorMessage handles it
    }
  };

  const onDeletePrice = async (row) => {
    if (!row?._id || !userId) return;
    // eslint-disable-next-line no-restricted-globals
    const ok = confirm(`Delete?`);
    if (!ok) return;

    try {
      await deleteUserPrice({ id: row._id, userId }).unwrap();
      toast.success(`UserPrice record Deleted`);
    } catch {
      // ErrorMessage handles it
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
        <Loader />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
        <ErrorMessage error={error} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
        <div className="text-sm font-semibold text-slate-900">
          User not found
        </div>
        <div className="mt-1 text-sm text-slate-500">
          The user data is missing from the response.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <button
          type="button"
          onClick={() => navigate(backToUsersHref)}
          className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900"
        >
          <FiChevronLeft className="h-4 w-4" />
          Back to users
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <div className="text-lg font-semibold text-slate-900">User Details</div>
          <span className="text-xs text-slate-400">/</span>
          <div className="text-sm font-semibold text-slate-700">
            {user.name || user.email || user._id}
          </div>
          {isFetching ? (
            <span className="text-xs text-slate-400">Refreshing...</span>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
        <div className="flex flex-wrap gap-2">
          {[
            { id: "info", label: "User Info" },
            { id: "approval", label: "Approval" },
            { id: "pricing", label: "User Pricing" },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-pressed={isActive}
                className={[
                  "inline-flex items-center rounded-xl border px-3 py-2 text-xs font-semibold transition",
                  isActive
                    ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                ].join(" ")}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "info" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
            <div className="text-sm font-semibold text-slate-900">
              Basic Information
            </div>
            <div className="mt-1 text-sm text-slate-500">
              Update contact information and role.
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Phone
                </label>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <input
                id="user-admin-toggle"
                type="checkbox"
                checked={isAdmin}
                onChange={(e) => setIsAdmin(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900/20"
              />
              <label
                htmlFor="user-admin-toggle"
                className="text-sm font-semibold text-slate-700"
              >
                Admin user
              </label>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onSaveUserInfo}
                disabled={!canUpdateInfo}
                className={[
                  "rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white",
                  canUpdateInfo
                    ? "hover:bg-blue-500"
                    : "cursor-not-allowed opacity-50",
                ].join(" ")}
              >
                {isSaving ? "Saving..." : "Update Info"}
              </button>

              {saved ? (
                <span className="text-xs font-semibold text-emerald-700">
                  Saved.
                </span>
              ) : null}
            </div>

            {saveError ? (
              <div className="mt-3">
                <ErrorMessage error={saveError} />
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
            <div className="text-sm font-semibold text-slate-900">Password</div>
            <div className="mt-1 text-xs text-slate-500">
              Set a new password for this user.
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  New password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Confirm password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                />
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={onUpdatePassword}
                disabled={!canUpdatePassword}
                className={[
                  "rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white",
                  canUpdatePassword
                    ? "hover:bg-blue-500"
                    : "cursor-not-allowed opacity-50",
                ].join(" ")}
              >
                {isUpdatingPassword ? "Updating..." : "Update Password"}
              </button>
              <span className="text-xs text-slate-500">
                Passwords must match and be at least 6 characters.
              </span>
            </div>

            {passwordError ? (
              <div className="mt-3">
                <ErrorMessage error={passwordError} />
              </div>
            ) : null}
          </div>
        </div>
      ) : activeTab === "approval" ? (
        <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
          <div className="text-sm font-semibold text-slate-900">
            Approval Status
          </div>
          <div className="mt-1 text-sm text-slate-500">
            Approve, reject, or move this user back to pending.
          </div>

          <div className="mt-4 max-w-sm">
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Current status
            </label>
            <select
              value={approvalStatus}
              onChange={(e) => {
                setApprovalStatus(e.target.value);
                setApprovalSaved(false);
              }}
              disabled={isAdmin}
              className={[
                "w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20",
                isAdmin ? "cursor-not-allowed bg-slate-50 text-slate-400" : "",
              ].join(" ")}
            >
              <option value="Approved">Approved</option>
              <option value="Pending">Pending</option>
              <option value="Rejected">Rejected</option>
            </select>
            {isAdmin ? (
              <div className="mt-1 text-xs text-slate-500">
                Admin accounts are always approved.
              </div>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onUpdateApproval}
              disabled={!canUpdateApproval}
              className={[
                "rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white",
                canUpdateApproval
                  ? "hover:bg-blue-500"
                  : "cursor-not-allowed opacity-50",
              ].join(" ")}
            >
              {isUpdatingApproval ? "Saving..." : "Update Approval"}
            </button>

            {approvalSaved ? (
              <span className="text-xs font-semibold text-emerald-700">
                Saved.
              </span>
            ) : null}
          </div>

          {approvalError ? (
            <div className="mt-3">
              <ErrorMessage error={approvalError} />
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold text-slate-900">
                User Specific Pricing
              </div>
              <div className="mt-1 text-sm text-slate-500">
                Manage user-specific prices by rule.
              </div>
            </div>
            <Link
              to="/admin/price-rules"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              Manage price rules
            </Link>
          </div>

          {isUserPricesLoading || isRulesLoading ? (
            <div className="mt-4">
              <Loader />
            </div>
          ) : null}

          {pricingError ? (
            <div className="mt-3">
              <ErrorMessage error={pricingError} />
            </div>
          ) : null}

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full table-fixed text-left text-sm">
              <thead className="text-xs font-semibold text-slate-500">
                <tr className="border-b border-slate-200">
                  <th className="w-[55%] py-2 pr-3">Price Rule</th>
                  <th className="w-[25%] py-2 pr-3">Unit Price</th>
                  <th className="w-[20%] py-2 pr-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {userPrices.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="py-4 text-sm text-slate-500"
                    >
                      No user prices yet.
                    </td>
                  </tr>
                ) : (
                  userPrices.map((row) => {
                    const isEditing = editRowId === row._id;
                    const editPrice = parsePrice(editPriceStr);
                    return (
                      <tr key={row._id} className="hover:bg-slate-50">
                        <td className="py-3 pr-3 text-xs font-semibold text-slate-900">
                          {row.priceRule}
                        </td>
                        <td className="py-3 pr-3">
                          {isEditing ? (
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={editPriceStr}
                              onChange={(e) => setEditPriceStr(e.target.value)}
                              className="w-24 rounded-xl bg-white px-2 py-1.5 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                            />
                          ) : (
                            <span className="tabular-nums text-slate-900">
                              {Number(row.unitPrice).toFixed(2)}
                            </span>
                          )}
                        </td>
                        <td className="py-3 pr-3 text-right">
                          {isEditing ? (
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => onSaveEdit(row)}
                                disabled={isPricingBusy || editPrice == null}
                                className={[
                                  "rounded-lg px-2.5 py-1 text-xs font-semibold",
                                  isPricingBusy || editPrice == null
                                    ? "cursor-not-allowed bg-slate-200 text-slate-400"
                                    : "bg-slate-900 text-white hover:bg-slate-800",
                                ].join(" ")}
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={onCancelEdit}
                                disabled={isPricingBusy}
                                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => onStartEdit(row)}
                                disabled={isPricingBusy}
                                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeletePrice(row)}
                                disabled={isPricingBusy}
                                className="rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
            <div className="text-xs font-semibold text-slate-700">
              Add price
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <select
                value={newRule}
                onChange={(e) => setNewRule(e.target.value)}
                className="min-w-[220px] rounded-xl bg-white px-2 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                disabled={isPricingBusy || availableRules.length === 0}
              >
                <option value="">Select price rule</option>
                {availableRules.map((rule) => (
                  <option key={rule.code} value={rule.code}>
                    {rule.code}
                  </option>
                ))}
              </select>

              <input
                type="number"
                min="0"
                step="0.01"
                value={newPriceStr}
                onChange={(e) => setNewPriceStr(e.target.value)}
                placeholder="0.00"
                className="w-28 rounded-xl bg-white px-2 py-2 text-xs text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                disabled={isPricingBusy || availableRules.length === 0}
              />

              <button
                type="button"
                onClick={onAddPrice}
                disabled={
                  isPricingBusy ||
                  !newRule ||
                  newPrice == null
                }
                className={[
                  "rounded-xl px-3 py-2 text-xs font-semibold text-white",
                  isPricingBusy ||
                  !newRule ||
                  newPrice == null
                    ? "cursor-not-allowed bg-slate-300"
                    : "bg-slate-900 hover:bg-slate-800",
                ].join(" ")}
              >
                Add Price
              </button>
            </div>

            {!isRulesLoading &&
            !isUserPricesLoading &&
            availableRules.length === 0 ? (
              <div className="mt-2 text-xs text-slate-500">
                All price rules are already assigned.
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
