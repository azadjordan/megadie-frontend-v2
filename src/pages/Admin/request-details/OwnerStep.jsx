import StepCard from "./StepCard";
import Loader from "../../../components/common/Loader";
import ErrorMessage from "../../../components/common/ErrorMessage";

export default function OwnerStep({
  userId,
  setUserId,
  selectedUser,
  originalOwnerId,
  showOwnerEditor,
  setShowOwnerEditor,
  users,
  isUsersLoading,
  isUsersError,
  usersError,
  quoteLocked,
  canUpdateOwner,
  onUpdateOwner,
  isBusy,
  isUpdating,
  showUpdateError,
  updateError,
}) {
  return (
    <StepCard
      n={1}
      title="Owner"
      subtitle="Assign (or re-assign) the owner of this quote."
      showNumber={false}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-semibold text-slate-600">Owner</div>
        <button
          type="button"
          onClick={() => {
            if (showOwnerEditor) {
              setUserId(originalOwnerId || "");
              setShowOwnerEditor(false);
              return;
            }
            setShowOwnerEditor(true);
          }}
          disabled={quoteLocked}
          className={[
            "rounded-xl px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition",
            quoteLocked
              ? "cursor-not-allowed bg-slate-100 text-slate-400 ring-slate-200"
              : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50",
          ].join(" ")}
        >
          {showOwnerEditor ? "Cancel" : "Change owner"}
        </button>
      </div>

      <div className="mt-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
        <div className="text-xs font-semibold text-slate-600">Selected user</div>
        <div className="mt-1 text-sm font-semibold text-slate-900">
          {selectedUser?.name || "-"}
        </div>
        <div className="text-xs text-slate-600">{selectedUser?.email || "-"}</div>
        <div className="text-xs text-slate-600">
          {selectedUser?.phoneNumber || "-"}
        </div>
      </div>

      {showOwnerEditor ? (
        <div className="mt-3">
          {isUsersLoading ? (
            <Loader />
          ) : isUsersError ? (
            <ErrorMessage error={usersError} />
          ) : (
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Assign user
              </label>
              <select
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                disabled={quoteLocked}
                className={[
                  "w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/20",
                  quoteLocked ? "cursor-not-allowed bg-slate-50 text-slate-400" : "",
                ].join(" ")}
              >
                <option value="">Select a user...</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name} - {u.email}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      ) : null}

      {showUpdateError ? (
        <div className="mt-3">
          <ErrorMessage error={updateError} />
        </div>
      ) : null}

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={onUpdateOwner}
          disabled={!canUpdateOwner || isBusy}
          className={[
            "rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition",
            canUpdateOwner && !isBusy
              ? "hover:bg-blue-500"
              : "cursor-not-allowed opacity-50",
          ].join(" ")}
        >
          {isUpdating ? "Updating..." : "Update Owner"}
        </button>
      </div>
    </StepCard>
  );
}
