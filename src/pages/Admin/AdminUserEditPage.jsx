import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FiChevronLeft } from "react-icons/fi";

import Loader from "../../components/common/Loader";
import ErrorMessage from "../../components/common/ErrorMessage";

import {
  useGetUserByIdQuery,
  useUpdateUserMutation,
} from "../../features/users/usersApiSlice";

export default function AdminUserEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    data: userResult,
    isLoading,
    isError,
    error,
    isFetching,
  } = useGetUserByIdQuery(id, { skip: !id });

  const user = userResult?.data ?? userResult;

  const [updateUser, { isLoading: isSaving, error: saveError }] =
    useUpdateUserMutation();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    setName(user.name || "");
    setEmail(user.email || "");
    setPhoneNumber(user.phoneNumber || "");
    setAddress(user.address || "");
    setIsAdmin(Boolean(user.isAdmin));
    setSaved(false);
  }, [user?._id, user?.id]);

  const onSave = async () => {
    const userId = user?._id || user?.id;
    if (!userId) return;
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
          onClick={() => navigate("/admin/users")}
          className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900"
        >
          <FiChevronLeft className="h-4 w-4" />
          Back to users
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <div className="text-lg font-semibold text-slate-900">Edit User</div>
          <span className="text-xs text-slate-400">/</span>
          <div className="text-sm font-semibold text-slate-700">
            {user.name || user.email || user._id}
          </div>
          {isFetching ? (
            <span className="text-xs text-slate-400">Refreshing...</span>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <div className="text-sm font-semibold text-slate-900">
          User details
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
            onClick={onSave}
            disabled={isSaving}
            className={[
              "rounded-xl px-4 py-2 text-sm font-semibold text-white",
              isSaving
                ? "cursor-not-allowed bg-slate-300"
                : "bg-slate-900 hover:bg-slate-800",
            ].join(" ")}
          >
            {isSaving ? "Saving..." : "Save changes"}
          </button>

          <Link
            to="/admin/users"
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
          >
            Cancel
          </Link>

          {saved ? (
            <span className="text-xs font-semibold text-emerald-700">Saved.</span>
          ) : null}
        </div>

        {saveError ? (
          <div className="mt-3">
            <ErrorMessage error={saveError} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
