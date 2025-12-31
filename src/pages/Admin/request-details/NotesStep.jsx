import StepCard from "./StepCard";
import ErrorMessage from "../../../components/common/ErrorMessage";

export default function NotesStep({
  clientNote,
  adminToAdminNote,
  setAdminToAdminNote,
  adminToClientNote,
  setAdminToClientNote,
  quoteLocked,
  canUpdateNotes,
  onUpdateNotes,
  isBusy,
  isUpdating,
  showUpdateError,
  updateError,
}) {
  return (
    <StepCard
      n={4}
      title="Notes"
      subtitle="Client note is read-only."
      showNumber={false}
    >
      <div className="grid grid-cols-1 gap-3">
        <div>
          <div className="mb-1 text-xs font-semibold text-slate-600">
            Client to Admin
          </div>
          <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700 ring-1 ring-slate-200">
            {clientNote || "-"}
          </div>
        </div>

        <div>
          <div className="mb-1 text-xs font-semibold text-slate-600">
            Admin to Admin (internal)
          </div>
          <textarea
            value={adminToAdminNote}
            disabled={quoteLocked}
            onChange={(e) => setAdminToAdminNote(e.target.value)}
            rows={3}
            placeholder="Internal notes for your team..."
            className={[
              "w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20",
              quoteLocked ? "cursor-not-allowed bg-slate-50 text-slate-400" : "",
            ].join(" ")}
          />
        </div>

        <div>
          <div className="mb-1 text-xs font-semibold text-slate-600">
            Admin to Client
          </div>
          <textarea
            value={adminToClientNote}
            disabled={quoteLocked}
            onChange={(e) => setAdminToClientNote(e.target.value)}
            rows={3}
            placeholder="Message to the client..."
            className={[
              "w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20",
              quoteLocked ? "cursor-not-allowed bg-slate-50 text-slate-400" : "",
            ].join(" ")}
          />
        </div>
      </div>

      {showUpdateError ? (
        <div className="mt-3">
          <ErrorMessage error={updateError} />
        </div>
      ) : null}

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={onUpdateNotes}
          disabled={!canUpdateNotes || isBusy}
          className={[
            "rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition",
            canUpdateNotes && !isBusy
              ? "hover:bg-blue-500"
              : "cursor-not-allowed opacity-50",
          ].join(" ")}
        >
          {isUpdating ? "Updating..." : "Update Notes"}
        </button>
      </div>
    </StepCard>
  );
}
