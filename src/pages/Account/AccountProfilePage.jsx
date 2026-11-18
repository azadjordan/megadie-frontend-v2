import LocationFields from "../../components/common/LocationFields";
import { needsMapReview, profileLocationPatch } from "../../utils/customerLocation";
import { useState } from "react";
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

  const loadErrMsg = error?.data?.message || error?.error;

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
          <AccountProfileForm
            key={profile?._id || profile?.email || "profile"}
            profile={profile}
            updateProfile={updateProfile}
            isSaving={isSaving}
            saveError={saveError}
            refetch={refetch}
            dispatch={dispatch}
          />
        )}
      </div>
    </div>
  );
}

function AccountProfileForm({
  profile,
  updateProfile,
  isSaving,
  saveError,
  refetch,
  dispatch,
}) {
  const profileName = profile?.name || "";
  const profilePhone = profile?.phoneNumber || "";
  const profileAddress = profile?.address || "";

  const [name, setName] = useState(profileName);
  const [phoneNumber, setPhoneNumber] = useState(profilePhone);
  const [address, setAddress] = useState(profileAddress);
  const [googleMapsUrl, setGoogleMapsUrl] = useState(profile?.deliveryGoogleMapsUrl || "");
  const [infoBase, setInfoBase] = useState(profile);
  const [confirmedMapLocation, setConfirmedMapLocation] = useState(false);
  const mapReviewPending = needsMapReview([infoBase], { address, googleMapsUrl }) && !confirmedMapLocation;
  const [saved, setSaved] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const onSave = async (e) => {
    e.preventDefault();
    if (!isEditing || isSaving || mapReviewPending) return;
    setSaved(false);

    try {
      const payload = { ...profileLocationPatch(infoBase, { address, googleMapsUrl }, confirmedMapLocation) };
      if (name.trim() !== (infoBase?.name || '')) payload.name = name.trim();
      if (phoneNumber.trim() !== (infoBase?.phoneNumber || '')) payload.phoneNumber = phoneNumber.trim();
      const res = await updateProfile(payload).unwrap();
      setInfoBase(res.data);
      dispatch(setCredentials(res.data, "profile"));
      setSaved(true);
      setIsEditing(false);
      refetch();
      setTimeout(() => setSaved(false), 1500);
    } catch {
      // inline error below
    }
  };

  const onEdit = () => {
    onCancel();
    setInfoBase(profile);
    setIsEditing(true);
    setSaved(false);
  };

  const onCancel = () => {
    setName(profileName);
    setPhoneNumber(profilePhone);
    setAddress(profileAddress);
    setGoogleMapsUrl(profile?.deliveryGoogleMapsUrl || "");
    setConfirmedMapLocation(false);
    setIsEditing(false);
    setSaved(false);
  };

  const saveErrMsg = saveError?.data?.message || saveError?.error;

  return (
    <form onSubmit={onSave} className="space-y-6">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={isEditing ? onCancel : onEdit}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {isEditing ? "Cancel Edit" : "Edit Profile"}
              </button>
            </div>
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
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 disabled:cursor-default"
                    value={profile?.email || ""}
                    disabled
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Name
                  </label>
                  <input
                    className="mt-2 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-violet-500 focus:outline-none disabled:cursor-default disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-500"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={!isEditing}
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
                    className="mt-2 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-violet-500 focus:outline-none disabled:cursor-default disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-500"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+971..."
                    disabled={!isEditing}
                  />
                </div>

                <div>
                  <div className="mb-2 text-sm font-semibold text-slate-900">Default delivery location</div>
                  <LocationFields value={isEditing ? { address, googleMapsUrl } : { address: profileAddress, googleMapsUrl: profile?.deliveryGoogleMapsUrl || '' }}
                    baseLocations={[infoBase]} onChange={(field, value) => field === 'address' ? setAddress(value) : setGoogleMapsUrl(value)}
                    disabled={!isEditing || isSaving} confirmedMapLocation={confirmedMapLocation} onConfirmMap={setConfirmedMapLocation} />
                  <p className="mt-2 text-xs text-slate-500">Used for new orders. Existing orders keep their saved delivery details.</p>
                </div>
              </div>
            </div>

            {saveErrMsg ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                {saveErrMsg}
                {isEditing && <button type="button" className="ml-3 min-h-11 font-semibold underline" onClick={async () => {
                  if (!window.confirm('Reload your profile and discard unsaved changes?')) return;
                  const result = await refetch();
                  const latest = result.data?.data;
                  if (latest) { setName(latest.name || ''); setPhoneNumber(latest.phoneNumber || ''); setAddress(latest.address || ''); setGoogleMapsUrl(latest.deliveryGoogleMapsUrl || ''); setInfoBase(latest); setConfirmedMapLocation(false); }
                }}>Reload profile</button>}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              {isEditing ? (
                <button
                  type="submit"
                  disabled={isSaving || mapReviewPending}
                  className="rounded-2xl bg-violet-600 px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-violet-200/60 hover:bg-violet-700 disabled:opacity-60"
                >
                  {isSaving ? "Saving..." : "Save changes"}
                </button>
              ) : null}
              {saved ? (
                <span className="text-sm font-medium text-violet-700">
                  Saved
                </span>
              ) : null}
            </div>
          </form>
  );
}
