import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";

import {
  useGetMyProfileQuery,
  useUpdateMyProfileMutation,
} from "../../features/auth/usersApiSlice";
import { setCredentials } from "../../features/auth/authSlice";

export default function AccountProfilePage() {
  const dispatch = useDispatch();

  const { data, isLoading, isError, error, refetch } = useGetMyProfileQuery();
  const [updateProfile, { isLoading: isSaving, error: saveError }] =
    useUpdateMyProfileMutation();

  const profile = data?.data;

  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setName(profile.name || "");
    setPhoneNumber(profile.phoneNumber || "");
    setAddress(profile.address || "");
  }, [profile]);

  const onSave = async (e) => {
    e.preventDefault();
    setSaved(false);

    try {
      const res = await updateProfile({ name, phoneNumber, address }).unwrap();
      dispatch(setCredentials(res.data));
      setSaved(true);
      refetch();
      setTimeout(() => setSaved(false), 1500);
    } catch {
      // inline error below
    }
  };

  const loadErrMsg = error?.data?.message || error?.error;
  const saveErrMsg = saveError?.data?.message || saveError?.error;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="h-8 w-1 rounded-full bg-violet-500" aria-hidden="true" />
          <div>
            <div className="text-2xl font-semibold text-slate-900">Profile</div>
            <div className="mt-1 text-sm text-slate-600">
              Keep your contact details up to date.
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        {isLoading ? (
          <div className="text-sm text-slate-600">Loading...</div>
        ) : isError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {loadErrMsg || "Failed to load profile."}
          </div>
        ) : (
          <form onSubmit={onSave} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="text-sm font-semibold text-slate-900">
                  Personal info
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Email
                  </label>
                  <input
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                    value={profile?.email || ""}
                    disabled
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Name
                  </label>
                  <input
                    className="mt-2 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-violet-500 focus:outline-none"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="text-sm font-semibold text-slate-900">
                  Contact
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Phone
                  </label>
                  <input
                    className="mt-2 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-violet-500 focus:outline-none"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+971..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Address
                  </label>
                  <textarea
                    className="mt-2 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-violet-500 focus:outline-none"
                    rows={4}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Street, building, city, country"
                  />
                </div>
              </div>
            </div>

            {saveErrMsg ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                {saveErrMsg}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-2xl bg-violet-600 px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-violet-200/60 hover:bg-violet-700 disabled:opacity-60"
              >
                {isSaving ? "Saving..." : "Save changes"}
              </button>
              {saved ? (
                <span className="text-sm font-medium text-violet-700">
                  Saved
                </span>
              ) : null}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
